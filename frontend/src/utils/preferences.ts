/**
 * Display preferences kept on this device. They are conveniences, so storage
 * failures (private mode, blocked site data) fall back to the defaults.
 */
export interface Preferences {
  /** Play a short tone when a critical notification arrives. */
  criticalChime: boolean;
  /** Darker text and firmer borders. */
  highContrast: boolean;
}

const KEY = 'arogyasetu.preferences';
const DEFAULTS: Preferences = { criticalChime: true, highContrast: false };

export function getPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setPreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not persisted; still applied for this visit.
  }
  applyPreferences(next);
  return next;
}

export function applyPreferences(prefs: Preferences = getPreferences()) {
  if (prefs.highContrast) document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
}

/** A short two-note alert tone, generated so no audio file is needed. */
export function playCriticalChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.start(start);
      osc.stop(start + 0.2);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // Audio can be blocked until the user interacts with the page.
  }
}
