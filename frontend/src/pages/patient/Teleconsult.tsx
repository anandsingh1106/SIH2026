import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { VideoStreamTile } from '../../components/healthcare/VideoStreamTile';
import { appointmentsApi, Appointment } from '../../services/api/appointmentsApi';
import { useVideoCall } from '../../hooks/useVideoCall';
import { useToast } from '../../hooks/useToast';

const initials = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

const STATUS_LABEL: Record<string, string> = {
  idle: 'NOT STARTED',
  'requesting-media': 'ASKING FOR CAMERA…',
  waiting: 'WAITING FOR DOCTOR',
  connecting: 'CONNECTING…',
  connected: '🔴 LIVE CONSULTATION',
  ended: 'CALL ENDED',
  error: 'CONNECTION PROBLEM',
};

export const PatientTeleconsult: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ sender: 'patient' | 'doctor'; text: string; time: string }[]>([]);
  const [msgInput, setMsgInput] = useState('');

  const call = useVideoCall({
    roomId: appointmentId ?? '',
    role: 'patient',
    autoStart: Boolean(appointmentId),
  });

  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const apt = await appointmentsApi.get(appointmentId);
        if (cancelled) return;
        setAppointment(apt);
      } catch (err) {
        if (cancelled) return;
        toast.error('Could not open the consultation', err instanceof Error ? err.message : undefined);
        navigate('/patient/appointments', { replace: true });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const handleSendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    setChatMessages((prev) => [...prev, { sender: 'patient', text: msgInput, time: 'Just now' }]);
    setMsgInput('');
  };

  const handleEndCall = () => {
    call.hangUp();
    toast.success('Consultation ended');
    navigate('/patient/appointments');
  };

  if (isLoading) {
    return <div className="text-center py-12 text-ink-soft text-sm">Loading the consultation…</div>;
  }

  if (!appointment) return null;

  const doctorInitials = initials(appointment.doctor) || 'DR';

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'My Appointments', href: '/patient/appointments' },
          { label: 'Video Consultation' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Video className="w-6 h-6 text-gov-700" />
            Video Consultation
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            {appointment.doctor} • {appointment.facility} • {appointment.date} at {appointment.time}
          </p>
        </div>

        <Badge variant={call.status === 'connected' ? 'success' : call.status === 'error' ? 'danger' : 'info'} size="md">
          {STATUS_LABEL[call.status] ?? call.status}
        </Badge>
      </div>

      {call.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-900">
          {call.error}
        </div>
      )}

      {call.mediaDenied && !call.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          This browser could not open a camera — another tab or app may be holding it. You can still
          see and hear the other side.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-sand-900 rounded-2xl overflow-hidden aspect-video relative shadow-xl border border-sand-800">
            {/* Remote (doctor) fills the frame */}
            <VideoStreamTile
              stream={call.remoteStream}
              className="absolute inset-0 w-full h-full"
              placeholder={
                <div className="space-y-2 text-center">
                  <div className="w-24 h-24 rounded-full bg-gov-700/80 text-white font-bold text-3xl flex items-center justify-center mx-auto border-4 border-gov-500 shadow-lg">
                    {doctorInitials}
                  </div>
                  <div className="text-white font-bold text-sm">{appointment.doctor}</div>
                  <div className="text-xs text-ink-soft">
                    {call.status === 'connected'
                      ? 'Camera is off on the doctor’s side'
                      : 'Waiting for the doctor to join…'}
                  </div>
                </div>
              }
            />

            {/* Overlays */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    call.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{appointment.doctor}</span>
              </div>
              <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-gov-200">
                {appointment.specialty}
              </div>
            </div>

            {/* Local self-preview */}
            <div className="absolute bottom-20 right-4 w-36 h-24 bg-sand-800 rounded-xl border border-sand-700 shadow-md overflow-hidden z-10">
              <VideoStreamTile
                stream={call.localStream}
                muted
                mirrored
                className="w-full h-full"
                placeholder={
                  <div className="text-center text-white">
                    <div className="text-xs font-bold">You</div>
                    <div className="text-[10px] text-ink-soft font-normal">
                      {call.isVideoOn ? 'Starting…' : 'Camera off'}
                    </div>
                  </div>
                }
              />
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 z-10">
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-2 rounded-2xl">
                <button
                  onClick={call.toggleMic}
                  disabled={!call.localStream}
                  className={`p-3 rounded-xl transition-colors disabled:opacity-40 ${
                    call.isMicOn ? 'bg-sand-700 hover:bg-sand-600 text-white' : 'bg-red-600 text-white'
                  }`}
                  title={call.isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {call.isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={call.toggleVideo}
                  disabled={!call.localStream}
                  className={`p-3 rounded-xl transition-colors disabled:opacity-40 ${
                    call.isVideoOn ? 'bg-sand-700 hover:bg-sand-600 text-white' : 'bg-red-600 text-white'
                  }`}
                  title={call.isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {call.isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleEndCall}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                  title="Leave Consultation"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-4 flex flex-col h-[500px]">
          <div className="flex-1 bg-surface rounded-2xl border border-line shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="p-3 bg-sand-50 border-b border-line font-bold text-xs text-ink flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-gov-700" />
              Consultation Chat
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-sand-50/30">
              {chatMessages.length === 0 && (
                <p className="text-[11px] text-ink-soft text-center py-4">No messages yet.</p>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'patient' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl p-2.5 text-xs leading-relaxed ${
                      m.sender === 'patient'
                        ? 'bg-gov-700 text-white rounded-br-xs'
                        : 'bg-surface text-ink border border-line rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-ink-soft mt-0.5">{m.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMsg} className="p-2 border-t border-line bg-surface flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Type message..."
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                className="flex-1 text-xs border border-sand-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gov-600"
              />
              <Button type="submit" variant="primary" size="sm">
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
