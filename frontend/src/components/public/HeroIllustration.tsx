import React from 'react';

/**
 * Hero artwork: a health worker consulting a mother and her child.
 *
 * Drawn rather than photographed, deliberately. The stock photography we tried
 * either carried a real hospital's branding on the coat, showed the wrong
 * region, or framed rural India as documentary hardship — none of which suits
 * a product landing page. A drawing also costs no image request, stays sharp
 * on a low-end phone, and is recoloured from the same palette as the rest of
 * the page.
 *
 * The sari, the dupatta over the health worker's shoulder, and the skin tones
 * place the scene without resorting to flags or emblems.
 */
export const HeroIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 720 460"
    role="img"
    aria-label="A health worker showing a digital health record to a mother holding her child during a consultation"
    className={className}
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <linearGradient id="hi-room" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#eefaf6" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id="hi-coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#eef4f2" />
      </linearGradient>
      <linearGradient id="hi-sari" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0d9488" />
        <stop offset="100%" stopColor="#0f766e" />
      </linearGradient>
      <linearGradient id="hi-dupatta" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f6bb6d" />
        <stop offset="100%" stopColor="#e8871e" />
      </linearGradient>
    </defs>

    {/* Consulting room */}
    <rect width="720" height="460" fill="url(#hi-room)" />
    <rect y="392" width="720" height="68" fill="#e3f0ec" />
    <rect y="390" width="720" height="3" fill="#cfe4de" />

    {/* Window, softly lit */}
    <rect x="452" y="54" width="196" height="150" rx="10" fill="#ffffff" stroke="#cfe4de" strokeWidth="2.5" />
    <line x1="550" y1="54" x2="550" y2="204" stroke="#cfe4de" strokeWidth="2.5" />
    <line x1="452" y1="129" x2="648" y2="129" stroke="#cfe4de" strokeWidth="2.5" />

    {/* A potted plant, because every clinic has one */}
    <rect x="600" y="286" width="46" height="52" rx="7" fill="#0f766e" opacity="0.14" />
    <path
      d="M623 286c0-30-16-44-30-50 20-3 32 8 34 26 6-17 20-25 38-22-12 8-24 22-26 46z"
      fill="#0d9488"
      opacity="0.5"
    />

    {/* Wall chart */}
    <rect x="66" y="66" width="104" height="128" rx="8" fill="#ffffff" stroke="#cfe4de" strokeWidth="2.5" />
    <rect x="82" y="86" width="72" height="7" rx="3.5" fill="#0d9488" opacity="0.35" />
    <rect x="82" y="104" width="54" height="7" rx="3.5" fill="#cfe4de" />
    <rect x="82" y="122" width="64" height="7" rx="3.5" fill="#cfe4de" />
    <path
      d="M82 168l20-20 18 15 24-28"
      stroke="#0d9488"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* ── Health worker, left ── */}
    <g>
      <path d="M150 250c-14 30-16 66-14 110h150c2-46-2-82-16-110-16-14-104-14-120 0z" fill="url(#hi-coat)" />
      {/* dupatta over the shoulder — reads ASHA rather than hospital-only */}
      <path d="M150 250c-8 18-12 38-14 60l34 8c2-30 6-52 12-64z" fill="url(#hi-dupatta)" opacity="0.9" />
      <circle cx="210" cy="206" r="38" fill="#c68642" />
      <path d="M172 202c0-26 18-42 38-42s38 16 38 42c-6-16-20-24-38-24s-32 8-38 24z" fill="#2c1810" />
      {/* hair tied back */}
      <circle cx="248" cy="212" r="12" fill="#2c1810" />
      {/* stethoscope */}
      <path
        d="M188 250c-4 30 10 48 30 48s34-18 30-48"
        stroke="#0f766e"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="218" cy="304" r="9" fill="#0f766e" />
      {/* arm extending the record */}
      <path d="M262 300c26 4 44 14 56 26" stroke="#c68642" strokeWidth="20" fill="none" strokeLinecap="round" />
    </g>

    {/* ── The record being shared, centre ── */}
    <g>
      <rect x="300" y="292" width="112" height="76" rx="9" fill="#0f766e" />
      <rect x="307" y="299" width="98" height="62" rx="5" fill="#ffffff" />
      <rect x="316" y="309" width="46" height="6" rx="3" fill="#0d9488" />
      <rect x="316" y="322" width="72" height="5" rx="2.5" fill="#cfe4de" />
      <rect x="316" y="333" width="60" height="5" rx="2.5" fill="#cfe4de" />
      <path
        d="M316 350l12-11 11 8 15-16"
        stroke="#059669"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>

    {/* ── Mother and child, right ── */}
    <g>
      <path d="M470 262c-16 30-20 62-18 98h152c2-36-4-70-20-98-22-16-92-16-114 0z" fill="url(#hi-sari)" />
      {/* pallu across the shoulder */}
      <path d="M470 262c22-14 92-14 114 0-10 22-38 32-58 32s-46-10-56-32z" fill="#0b3d2e" opacity="0.28" />
      <circle cx="527" cy="220" r="36" fill="#b5713a" />
      <path d="M491 216c0-24 16-40 36-40s36 16 36 40c-4-18-18-26-36-26s-32 8-36 26z" fill="#22150c" />
      <circle cx="527" cy="196" r="3.5" fill="#b91c1c" />
      {/* arm cradling the child */}
      <path d="M566 320c-10 22-34 34-62 34" stroke="#b5713a" strokeWidth="19" fill="none" strokeLinecap="round" />

      {/* child on the lap */}
      <circle cx="474" cy="306" r="25" fill="#c68642" />
      <path d="M451 302c0-16 10-26 23-26s23 10 23 26c-3-11-12-16-23-16s-20 5-23 16z" fill="#22150c" />
      <path d="M452 330c-8 12-10 24-9 34h62c1-10-1-22-9-34-12-8-32-8-44 0z" fill="#fef3c7" />
    </g>
  </svg>
);
