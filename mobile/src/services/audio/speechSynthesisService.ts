import * as Speech from 'expo-speech';

/**
 * Mirrors frontend/src/services/audio/speechSynthesisService.ts, backed by
 * expo-speech (the device's native TTS engine) instead of the Web Speech
 * API. Same three-language contract: pick an installed voice for mr/hi/en,
 * or fall back to English when the device has no Indic voice installed.
 */
export type SpeechLang = 'mr' | 'hi' | 'en';

const LANG_CODES: Record<SpeechLang, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

export class SpeechService {
  private static isSpeaking = false;
  private static voicesPromise: Promise<Speech.Voice[]> | null = null;

  private static loadVoices(): Promise<Speech.Voice[]> {
    if (!this.voicesPromise) {
      this.voicesPromise = Speech.getAvailableVoicesAsync().catch(() => []);
    }
    return this.voicesPromise;
  }

  private static pickVoiceLang(voices: Speech.Voice[], lang: SpeechLang): string | null {
    const target = LANG_CODES[lang];
    const match =
      voices.find((v) => v.language === target) ||
      voices.find((v) => v.language?.toLowerCase().startsWith(`${lang}-`)) ||
      voices.find((v) => v.language === 'en-IN') ||
      voices.find((v) => v.language?.toLowerCase().startsWith('en-'));
    return match?.language ?? null;
  }

  /** Languages this device can actually speak. */
  public static async availableLanguages(): Promise<SpeechLang[]> {
    const voices = await this.loadVoices();
    if (voices.length === 0) {
      // Some devices report no voice list at all even though the OS TTS
      // engine works; assume all three are speakable rather than warning
      // about a missing voice that may well exist.
      return ['mr', 'hi', 'en'];
    }
    return (['mr', 'hi', 'en'] as SpeechLang[]).filter((l) =>
      voices.some((v) => v.language?.toLowerCase().startsWith(`${l}-`))
    );
  }

  public static async speak(text: string, lang: SpeechLang = 'mr'): Promise<void> {
    if (!text?.trim()) return;

    await Speech.stop();

    const voices = await this.loadVoices();
    const resolvedLang = this.pickVoiceLang(voices, lang) ?? LANG_CODES[lang];

    return new Promise((resolve, reject) => {
      this.isSpeaking = true;
      Speech.speak(text, {
        language: resolvedLang,
        rate: 0.9,
        pitch: 1.0,
        onDone: () => {
          this.isSpeaking = false;
          resolve();
        },
        onStopped: () => {
          this.isSpeaking = false;
          resolve();
        },
        onError: () => {
          this.isSpeaking = false;
          reject(new Error('Audio playback failed on this device.'));
        },
      });
    });
  }

  public static async stop() {
    await Speech.stop();
    this.isSpeaking = false;
  }

  public static getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
