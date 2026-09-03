// Audio Prescription Speech Synthesis Service

export type SpeechLang = 'mr' | 'hi' | 'en';

const LANG_CODES: Record<SpeechLang, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

export class SpeechService {
  private static isSpeaking = false;
  private static voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

  /** True when the browser can speak at all. */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Voices load asynchronously — the first getVoices() call usually returns an
   * empty array, which is why a language-matched voice would otherwise never be
   * found. Resolve once the list is actually populated.
   */
  private static loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSupported()) return Promise.resolve([]);
    if (this.voicesPromise) return this.voicesPromise;

    this.voicesPromise = new Promise((resolve) => {
      const existing = window.speechSynthesis.getVoices();
      if (existing.length > 0) {
        resolve(existing);
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.speechSynthesis.onvoiceschanged = null;
        resolve(window.speechSynthesis.getVoices());
      };

      window.speechSynthesis.onvoiceschanged = finish;
      // Some browsers never fire the event; do not hang forever.
      setTimeout(finish, 1500);
    });

    return this.voicesPromise;
  }

  /** Best available voice for a language, or null when none is installed. */
  private static pickVoice(voices: SpeechSynthesisVoice[], lang: SpeechLang) {
    const target = LANG_CODES[lang];
    return (
      voices.find((v) => v.lang === target) ||
      voices.find((v) => v.lang.replace('_', '-') === target) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(`${lang}-`)) ||
      // Fall back to Indian English, which reads Devanagari transliteration
      // far better than a US voice.
      voices.find((v) => v.lang === 'en-IN') ||
      // Many Windows installs ship only en-US/en-GB. Speaking the script in
      // one of those is still useful, so prefer any English voice over
      // returning null and letting the browser pick silence-prone defaults.
      voices.find((v) => v.lang.toLowerCase().startsWith('en-')) ||
      voices[0] ||
      null
    );
  }

  /** Languages this device can actually speak. */
  public static async availableLanguages(): Promise<SpeechLang[]> {
    const voices = await this.loadVoices();
    return (['mr', 'hi', 'en'] as SpeechLang[]).filter((l) =>
      voices.some((v) => v.lang.toLowerCase().startsWith(`${l}-`))
    );
  }

  /**
   * Speaks the given text.
   *
   * Rejects with a readable message when speech is unsupported or fails, so the
   * caller can surface it rather than appearing to do nothing.
   */
  public static async speak(text: string, lang: SpeechLang = 'mr'): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('This browser does not support audio playback of prescriptions.');
    }
    if (!text?.trim()) return;

    // Cancel anything already playing, then let the queue settle. Chrome
    // ignores a speak() issued in the same tick as cancel().
    window.speechSynthesis.cancel();
    await new Promise((r) => setTimeout(r, 60));

    const voices = await this.loadVoices();
    const voice = this.pickVoice(voices, lang);

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      // Tagging Devanagari text as mr-IN while an English voice speaks it makes
      // some engines emit nothing at all, so follow the voice we actually got.
      utterance.lang = voice?.lang || LANG_CODES[lang] || 'en-IN';
      // Slightly slower than default for clarity in medical guidance.
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (voice) utterance.voice = voice;

      let done = false;
      const settle = (fn: () => void) => {
        if (done) return;
        done = true;
        clearInterval(keepAlive);
        this.isSpeaking = false;
        fn();
      };

      // onend also fires when playback is cancelled.
      utterance.onend = () => settle(resolve);

      utterance.onerror = (event) => {
        // 'interrupted' and 'canceled' are normal when the user stops playback.
        if (event.error === 'interrupted' || event.error === 'canceled') {
          settle(resolve);
          return;
        }
        settle(() =>
          reject(new Error(
            event.error === 'not-allowed'
              ? 'Audio was blocked by the browser. Tap the play button directly to allow it.'
              : `Audio playback failed (${event.error}).`
          ))
        );
      };

      // Chrome stops speaking after ~15 seconds unless the synth is nudged.
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) return;
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10_000);

      this.isSpeaking = true;
      window.speechSynthesis.speak(utterance);
    });
  }

  public static stop() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }

  public static pause() {
    if (this.isSupported() && window.speechSynthesis.speaking) window.speechSynthesis.pause();
  }

  public static resume() {
    if (this.isSupported() && window.speechSynthesis.paused) window.speechSynthesis.resume();
  }

  public static getIsSpeaking(): boolean {
    return this.isSpeaking || (this.isSupported() && window.speechSynthesis.speaking);
  }
}
