// Audio Prescription Speech Synthesis Service
export class SpeechService {
  private static isSpeaking = false;

  public static speak(text: string, lang: 'mr' | 'hi' | 'en' = 'mr'): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported in this browser.');
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Stop any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for clarity in medical guidance
      utterance.pitch = 1.0;

      // Select voice based on language
      const langCodes = {
        mr: 'mr-IN',
        hi: 'hi-IN',
        en: 'en-IN',
      };
      utterance.lang = langCodes[lang] || 'en-IN';

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) => v.lang === utterance.lang || v.lang.startsWith(lang)
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        resolve();
      };

      this.isSpeaking = true;
      window.speechSynthesis.speak(utterance);
    });
  }

  public static stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public static getIsSpeaking(): boolean {
    return this.isSpeaking || ('speechSynthesis' in window && window.speechSynthesis.speaking);
  }
}
