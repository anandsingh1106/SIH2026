import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SpeechService, SpeechLang } from '../services/audio/speechSynthesisService';
import type { PrescribedMedicine } from '@arogyasetu/shared/types';

export interface AudioPrescriptionPlayerProps {
  patientName: string;
  doctorName: string;
  facilityName: string;
  date: string;
  medicines: PrescribedMedicine[];
  generalAdvice?: string;
  generalAdviceMr?: string;
  generalAdviceHi?: string;
}

/** Mirrors frontend/src/components/healthcare/AudioPrescriptionPlayer.tsx, backed by expo-speech. */
export function AudioPrescriptionPlayer({
  patientName,
  doctorName,
  facilityName,
  date,
  medicines,
  generalAdvice,
  generalAdviceMr,
  generalAdviceHi,
}: AudioPrescriptionPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SpeechLang>('mr');
  const [audioError, setAudioError] = useState('');
  const [availableLangs, setAvailableLangs] = useState<string[] | null>(null);

  useEffect(() => {
    SpeechService.availableLanguages()
      .then(setAvailableLangs)
      .catch(() => setAvailableLangs([]));
    return () => {
      SpeechService.stop();
    };
  }, []);

  const buildMarathiScript = () => {
    let script = `नमस्कार ${patientName} जी. हे डॉक्टर ${doctorName}, ${facilityName} यांच्याकडून आपले औषधोपचार मार्गदर्शन आहे. तारीख ${date}. `;
    medicines.forEach((m, idx) => {
      script += `औषध क्रमांक ${idx + 1}: ${m.name}. ${m.instructionsMr || m.instructions}. हे औषध ${m.duration} पर्यंत घ्यावे. `;
    });
    if (generalAdviceMr || generalAdvice) {
      script += `विशेष सल्ला: ${generalAdviceMr || generalAdvice}. `;
    }
    script += `कोणताही त्रास झाल्यास त्वरित जवळच्या आरोग्य केंद्राशी संपर्क साधावा. धन्यवाद.`;
    return script;
  };

  const buildHindiScript = () => {
    let script = `नमस्ते ${patientName} जी। यह डॉक्टर ${doctorName}, ${facilityName} द्वारा आपकी दवा का विवरण है। दिनांक ${date}। `;
    medicines.forEach((m, idx) => {
      script += `दवा संख्या ${idx + 1}: ${m.name}। ${m.instructionsHi || m.instructions}। यह दवा ${m.duration} तक लेनी है। `;
    });
    if (generalAdviceHi || generalAdvice) {
      script += `विशेष सलाह: ${generalAdviceHi || generalAdvice}। `;
    }
    script += `किसी भी असुविधा की स्थिति में तुरंत नजदीकी स्वास्थ्य केंद्र से संपर्क करें। धन्यवाद।`;
    return script;
  };

  const buildEnglishScript = () => {
    let script = `Hello ${patientName}. This is your digital prescription instructions from Dr. ${doctorName} at ${facilityName}, dated ${date}. `;
    medicines.forEach((m, idx) => {
      script += `Medicine ${idx + 1}: ${m.name}. ${m.instructions}. Duration: ${m.duration}. `;
    });
    if (generalAdvice) {
      script += `Doctor's Advice: ${generalAdvice}. `;
    }
    script += `Please consult your healthcare team if symptoms persist. Thank you.`;
    return script;
  };

  const handleStop = () => {
    SpeechService.stop();
    setIsPlaying(false);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      handleStop();
      return;
    }

    setAudioError('');
    setIsPlaying(true);

    const canSpeakChosen = availableLangs === null || availableLangs.includes(selectedLang);
    const spokenLang = canSpeakChosen ? selectedLang : 'en';

    let fullText = '';
    if (spokenLang === 'mr') fullText = buildMarathiScript();
    else if (spokenLang === 'hi') fullText = buildHindiScript();
    else fullText = buildEnglishScript();

    try {
      await SpeechService.speak(fullText, spokenLang);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Audio playback failed.');
    } finally {
      setIsPlaying(false);
    }
  };

  const selectLang = (lang: SpeechLang) => {
    setSelectedLang(lang);
    handleStop();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconText}>🔊</Text>
          </View>
          <View>
            <Text style={styles.title}>Voice Prescription Assistant</Text>
            <Text style={styles.subtitle}>Accessible audio explanation</Text>
          </View>
        </View>
      </View>

      <View style={styles.langRow}>
        {(
          [
            ['mr', 'मराठी'],
            ['hi', 'हिंदी'],
            ['en', 'English'],
          ] as [SpeechLang, string][]
        ).map(([lang, label]) => (
          <Pressable
            key={lang}
            style={[styles.langPill, selectedLang === lang && styles.langPillActive]}
            onPress={() => selectLang(lang)}
          >
            <Text style={[styles.langPillText, selectedLang === lang && styles.langPillTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.controlsRow}>
        <Pressable style={[styles.playBtn, isPlaying && styles.stopBtn]} onPress={handlePlay}>
          <Text style={styles.playBtnText}>
            {isPlaying
              ? '⏸ Pause Voice Reading'
              : `▶ Listen in ${selectedLang === 'mr' ? 'मराठी' : selectedLang === 'hi' ? 'हिंदी' : 'English'}`}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {isPlaying ? '🔊 Speaking prescription instructions clearly…' : 'Tap play to listen to dosage timings and advice.'}
      </Text>

      {audioError ? <Text style={styles.errorText}>{audioError}</Text> : null}

      {availableLangs !== null && !availableLangs.includes(selectedLang) && !audioError && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            No {selectedLang === 'mr' ? 'Marathi' : selectedLang === 'hi' ? 'Hindi' : 'English'} voice is
            installed on this device, so playback will read the English version aloud instead.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: '#DCFCE7', backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 15 },
  title: { fontSize: 12, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 10, color: '#6B7280' },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  langPill: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  langPillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  langPillText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  langPillTextActive: { color: '#fff' },
  controlsRow: { flexDirection: 'row' },
  playBtn: { flex: 1, backgroundColor: '#15803D', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  stopBtn: { backgroundColor: '#DC2626' },
  playBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  hint: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 10, textAlign: 'center' },
  errorText: { fontSize: 11, color: '#B91C1C', marginTop: 10 },
  warnBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 10, padding: 10, marginTop: 10 },
  warnText: { fontSize: 11, color: '#92400E', lineHeight: 16 },
});
