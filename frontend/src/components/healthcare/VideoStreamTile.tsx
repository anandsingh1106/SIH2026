import React, { useEffect, useRef } from 'react';

interface VideoStreamTileProps {
  stream: MediaStream | null;
  /** Always mute your own tile, or the microphone feeds back into the speakers. */
  muted?: boolean;
  /** Shown when there is no stream yet. */
  placeholder?: React.ReactNode;
  className?: string;
  /** Mirror the local preview, the way a mirror shows you to yourself. */
  mirrored?: boolean;
}

export const VideoStreamTile: React.FC<VideoStreamTileProps> = ({
  stream,
  muted = false,
  placeholder,
  className = '',
  mirrored = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }

    if (stream) {
      // Autoplay can still be refused; there is nothing useful to do but carry on.
      el.play().catch(() => {});
    }
  }, [stream]);

  const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live'));

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${hasVideo ? '' : 'invisible'} ${
          mirrored ? 'scale-x-[-1]' : ''
        }`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">{placeholder}</div>
      )}
    </div>
  );
};
