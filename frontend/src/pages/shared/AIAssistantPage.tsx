import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { getAIContextualResponse, AIMessage } from '../../services/ai/aiAssistantService';
import { Bot, Send, Sparkles, User, Mic, Volume2, ShieldCheck } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { AIMessageContent } from '../../components/ai/AIMessageContent';

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

  const feedEndRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    // A preset tapped while a request is in flight would otherwise interleave.
    if (!textToSend || isLoading) return;

    const userMsg: AIMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Captured before the state update so the request carries the prior turns.
    const history = messages;

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setIsLoading(true);

    // getAIContextualResponse resolves with a failed message rather than throwing.
    const res = await getAIContextualResponse(textToSend, currentRole, undefined, history);
    setMessages((prev) => [...prev, res]);
    setIsLoading(false);
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

      <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col h-[700px]">
        {/* Top Header */}
        <div className="p-5 bg-gradient-to-r from-gov-800 to-sand-900 text-white flex items-center justify-between">
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
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-sand-50/40">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                  m.sender === 'user'
                    ? 'bg-gov-700 text-white rounded-br-xs'
                    : m.failed
                    ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-xs'
                    : 'bg-surface text-ink border border-line rounded-bl-xs'
                }`}
              >
                <AIMessageContent text={m.text} />
                {m.sources && (
                  <div className="mt-2 pt-2 border-t border-line text-[10px] text-ink-soft font-semibold">
                    📚 Grounded in: {m.sources.join(' • ')}
                  </div>
                )}
                {m.disclaimer && (
                  <div className="mt-2 pt-2 border-t border-line text-[10px] text-ink-soft italic">
                    {m.disclaimer}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-ink-soft mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-ink-soft bg-surface p-3 rounded-xl border border-line w-fit">
              <Sparkles className="w-4 h-4 text-gov-600 animate-spin" />
              <span>Analyzing patient EHR & NHM protocol database...</span>
            </div>
          )}
          <div ref={feedEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-3 bg-sand-100 border-t border-line flex gap-2 overflow-x-auto no-scrollbar">
          {(samplePrompts[currentRole] || []).map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="whitespace-nowrap px-3 py-1.5 bg-surface hover:bg-gov-50 text-sand-700 hover:text-gov-800 rounded-full border border-line text-xs font-medium transition-colors shadow-2xs shrink-0"
            >
              💡 {prompt}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="p-4 bg-surface border-t border-line flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask anything (e.g. clinical protocols, patient summaries, emergency guidelines)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 text-xs border border-sand-300 rounded-xl px-4 py-3 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
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
