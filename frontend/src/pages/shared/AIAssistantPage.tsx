import React, { useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { getAIContextualResponse, AIMessage } from '../../services/ai/aiAssistantService';
import { Bot, Send, Sparkles, User, Mic, Volume2, ShieldCheck } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';

export const AIAssistantPage: React.FC = () => {
  const { currentRole } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      sender: 'assistant',
      text: `Namaskar! I am your dedicated MahaAarogya Clinical AI Copilot. How can I assist your ${currentRole.toUpperCase()} workflow today?`,
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const userMsg: AIMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setIsLoading(true);

    try {
      const res = await getAIContextualResponse(textToSend, currentRole);
      setMessages((prev) => [...prev, res]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = {
    asha: [
      'Show today priority maternal danger signs',
      'Explain immunization catch-up schedule for 1 year child',
      'How to counsel family on high blood sugar in Marathi',
    ],
    doctor: [
      'Summarize patient Ramesh Patil recent lab results & vitals',
      'Show clinical protocol for Stage 2 Hypertension management',
      'Check drug interaction between Amlodipine and Metformin',
    ],
    specialist: [
      'Explain why referral REF-MH-PUN-0891 was assigned Critical score 94',
      'Show post-C-section severe anemia recovery monitoring protocols',
      'Tertiary bed reservation policy for tribal emergency transfers',
    ],
    admin: [
      'Explain today spike in fever cases in Gadchiroli & Palghar',
      'Show essential drug stockout risk forecast for next 14 days',
      'Summarize MJPJAY cashless claim turnaround performance',
    ],
    patient: [
      'Explain my prescription medicines in simple Marathi/Hindi',
      'What are the side effects of Amlodipine 5mg?',
      'How to book a teleconsultation with a government doctor',
    ],
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Aarogya AI Health Copilot' },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[700px]">
        {/* Top Header */}
        <div className="p-5 bg-gradient-to-r from-gov-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Bot className="w-6 h-6 text-gov-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Aarogya Clinical AI Copilot
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  ACTIVE
                </span>
              </h2>
              <p className="text-xs text-gov-200">
                Contextualized for {currentRole.toUpperCase()} Care Workflows & NHM Guidelines
              </p>
            </div>
          </div>
          <div className="text-[11px] text-gov-300 hidden sm:block">
            Evidence-Based Clinical Decision Support
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Clinical Safety Notice:</strong> AI suggestions are intended for decision-support only and must be validated by licensed healthcare professionals.
          </span>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs whitespace-pre-line ${
                  m.sender === 'user'
                    ? 'bg-gov-700 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                }`}
              >
                {m.text}
                {m.sources && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-semibold">
                    📚 Grounded in: {m.sources.join(' • ')}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 w-fit">
              <Sparkles className="w-4 h-4 text-gov-600 animate-spin" />
              <span>Analyzing patient EHR & NHM protocol database...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
          {(samplePrompts[currentRole] || []).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-gov-50 text-slate-700 hover:text-gov-800 rounded-full border border-slate-200 text-xs font-medium transition-colors shadow-2xs shrink-0"
            >
              💡 {prompt}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask anything (e.g. clinical protocols, patient summaries, emergency guidelines)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 text-xs border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
          />
          <Button
            size="md"
            variant="primary"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="rounded-xl h-11 px-5 font-bold"
          >
            <Send className="w-4 h-4 mr-1" /> Ask AI
          </Button>
        </div>
      </div>
    </div>
  );
};
