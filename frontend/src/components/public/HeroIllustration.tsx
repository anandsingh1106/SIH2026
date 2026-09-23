import React from 'react';
import heroConsultation from '../../assets/hero-consultation.jpg';

/**
 * Hero artwork: a patient's video consultation, with the ABHA record cards
 * that make it possible floating around the call.
 *
 * A commissioned raster illustration rather than the earlier hand-drawn SVG —
 * kept as a JPEG (no transparency needed) and compressed for the web; the
 * source is ~1.4MB, this ships at ~140KB.
 */
export const HeroIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src={heroConsultation}
    alt="A patient on a video consultation with a doctor, surrounded by cards showing her ABHA health record, medical history, and a scheduled appointment"
    className={`block object-cover ${className ?? ''}`}
  />
);
