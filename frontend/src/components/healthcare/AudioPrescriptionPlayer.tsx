import React, { useState } from 'react';
import { Play, Pause, Volume2, Globe, FastForward, RotateCcw } from 'lucide-react';
import { SpeechService } from '../../services/audio/speechSynthesisService';
import { PrescribedMedicine } from '../../types';
import { Button } from '../ui/Button';

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

export const AudioPrescriptionPlayer: React.FC<AudioPrescriptionPlayerProps> = ({
  patientName,
  doctorName,
  facilityName,
  date,
  medicines,
  generalAdvice,
  generalAdviceMr,
  generalAdviceHi,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'mr' | 'hi' | 'en'>('mr');
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);

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

  const handlePlay = async () => {
    if (isPlaying) {
      SpeechService.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    let fullText = '';
    if (selectedLang === 'mr') fullText = buildMarathiScript();
    else if (selectedLang === 'hi') fullText = buildHindiScript();
    else fullText = buildEnglishScript();

    await SpeechService.speak(fullText, selectedLang);
    setIsPlaying(false);
  };

  const handleStop = () => {
    SpeechService.stop();
    setIsPlaying(false);
  };

  return (
    <div className="rounded-xl border border-gov-200 bg-gradient-to-br from-gov-50/60 to-emerald-50/30 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gov-600 text-white rounded-lg shadow-xs">
            <Volume2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Voice Prescription Assistant</h4>
            <p className="text-xs text-slate-500">Accessible audio explanation for patients and caregivers</p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-gov-700 ml-1 shrink-0" />
          <button
            onClick={() => { setSelectedLang('mr'); handleStop(); }}
            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
              selectedLang === 'mr' ? 'bg-gov-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            मराठी (Marathi)
          </button>
          <button
            onClick={() => { setSelectedLang('hi'); handleStop(); }}
            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
              selectedLang === 'hi' ? 'bg-gov-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            हिंदी (Hindi)
          </button>
          <button
            onClick={() => { setSelectedLang('en'); handleStop(); }}
            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
              selectedLang === 'en' ? 'bg-gov-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          variant={isPlaying ? 'danger' : 'primary'}
          size="md"
          leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          onClick={handlePlay}
        >
          {isPlaying ? 'Pause Voice Reading' : `Listen in ${selectedLang === 'mr' ? 'मराठी' : selectedLang === 'hi' ? 'हिंदी' : 'English'}`}
        </Button>

        {isPlaying && (
          <Button variant="secondary" size="md" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={handleStop}>
            Stop
          </Button>
        )}

        <span className="text-xs text-slate-500 italic">
          {isPlaying ? '🔊 Speaking prescription instructions clearly...' : 'Press play to listen to dosage timings and advice.'}
        </span>
      </div>
    </div>
  );
};
