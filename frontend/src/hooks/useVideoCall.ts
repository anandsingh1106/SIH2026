import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';

/**
 * Peer-to-peer video consultation over WebRTC.
 *
 * Signalling (the offer/answer/ICE exchange that lets two browsers find each
 * other) rides on a Supabase Realtime broadcast channel, so no extra signalling
 * server is needed. Media itself never touches Supabase — it flows directly
 * between the two peers.
 *
 * Both sides join the same channel, named after the appointment. The side that
 * arrives second sees the first already present and makes the offer, which
 * avoids both peers offering at once (glare).
 */

export type CallStatus =
  | 'idle'
  | 'requesting-media'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'error';

export interface UseVideoCallOptions {
  /** Shared room key — both sides must pass the same value. */
  roomId: string;
  /** Distinguishes the two sides in logs and presence. */
  role: 'doctor' | 'patient';
  /** Start the call as soon as the hook mounts. */
  autoStart?: boolean;
}

// Public STUN only. On the same machine or the same LAN this is enough; two
// peers on different networks behind strict NATs would additionally need a
// TURN relay, which requires a credentialled server.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export function useVideoCall({ roomId, role, autoStart = false }: UseVideoCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  /** True when this browser could not open a camera (e.g. another tab holds it). */
  const [mediaDenied, setMediaDenied] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const politeRef = useRef(false);
  const startedRef = useRef(false);
  /** ICE candidates that arrive before the remote description is set. */
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const send = useCallback((event: string, payload: unknown) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;

    if (channelRef.current) {
      getSupabase().removeChannel(channelRef.current);
      channelRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    startedRef.current = false;
    pendingCandidates.current = [];
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) send('ice', { candidate: e.candidate.toJSON(), from: role });
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0] ?? null);
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          setStatus('connected');
          break;
        case 'failed':
          setError('The connection dropped. Both sides may be on networks that need a relay server.');
          setStatus('error');
          break;
        case 'disconnected':
          setStatus('waiting');
          break;
        default:
          break;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [role, send]);

  /** Adds a candidate now, or queues it until the remote description exists. */
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;

    if (!pc.remoteDescription) {
      pendingCandidates.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // A candidate can legitimately fail once the connection is already up.
    }
  }, []);

  const drainCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const queued = pendingCandidates.current;
    pendingCandidates.current = [];
    for (const c of queued) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        // Ignore — see above.
      }
    }
  }, []);

  const makeOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    setStatus('connecting');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send('offer', { sdp: pc.localDescription, from: role });
  }, [role, send]);

  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!isSupabaseConfigured()) {
      setError('Live calling needs Supabase Realtime, which is not configured in this environment.');
      setStatus('error');
      return;
    }

    setError(null);
    setStatus('requesting-media');

    // Try camera + mic, then fall back to audio only, then to receive-only.
    // Two tabs on one machine usually cannot both hold the same camera, which
    // is exactly the demo-on-one-laptop case.
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        setIsVideoOn(false);
        setMediaDenied(true);
      } catch {
        setMediaDenied(true);
        setIsVideoOn(false);
        setIsMicOn(false);
      }
    }

    if (stream) {
      localStreamRef.current = stream;
      setLocalStream(stream);
    }

    const pc = createPeerConnection();

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } else {
      // With no local media we still need to negotiate, or there is nothing to
      // receive either.
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    const supabase = getSupabase();
    const channel = supabase.channel(`call:${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: role } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from === role) return;
        const peer = pcRef.current;
        if (!peer) return;
        await peer.setRemoteDescription(payload.sdp);
        await drainCandidates();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        send('answer', { sdp: peer.localDescription, from: role });
        setStatus('connecting');
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from === role) return;
        const peer = pcRef.current;
        if (!peer || peer.signalingState === 'stable') return;
        await peer.setRemoteDescription(payload.sdp);
        await drainCandidates();
      })
      .on('broadcast', { event: 'ice' }, async ({ payload }) => {
        if (payload.from === role) return;
        await addIceCandidate(payload.candidate);
      })
      .on('broadcast', { event: 'bye' }, ({ payload }) => {
        if (payload.from === role) return;
        setRemoteStream(null);
        setStatus('waiting');
      })
      .on('presence', { event: 'sync' }, () => {
        const peers = Object.keys(channel.presenceState());
        // Someone else is already here, so this side offers. The first arrival
        // stays quiet and waits to be called.
        if (peers.length > 1 && !politeRef.current) {
          politeRef.current = true;
          void makeOffer();
        }
      });

    await channel.subscribe(async (state) => {
      if (state === 'SUBSCRIBED') {
        await channel.track({ role, joinedAt: Date.now() });
        setStatus((s) => (s === 'connected' ? s : 'waiting'));
      } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
        setError('Could not reach the signalling channel.');
        setStatus('error');
      }
    });
  }, [addIceCandidate, createPeerConnection, drainCandidates, makeOffer, role, roomId, send]);

  const hangUp = useCallback(() => {
    send('bye', { from: role });
    cleanup();
    setStatus('ended');
  }, [cleanup, role, send]);

  const toggleMic = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) return;
    const next = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = next));
    setIsMicOn(next);
  }, []);

  const toggleVideo = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (!tracks.length) return;
    const next = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = next));
    setIsVideoOn(next);
  }, []);

  useEffect(() => {
    if (autoStart) void start();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  return {
    status,
    error,
    localStream,
    remoteStream,
    isMicOn,
    isVideoOn,
    mediaDenied,
    start,
    hangUp,
    toggleMic,
    toggleVideo,
  };
}
