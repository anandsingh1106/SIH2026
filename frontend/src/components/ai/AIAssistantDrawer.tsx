import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, MessageSquare, Volume2, Mic, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../services/auth/authContext';
import { getAIContextualResponse, AIMessage } from '../../services/ai/aiAssistantService';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export const AIAssistantDrawer: React.FC = () => {
  const { currentRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      sender: 'assistant',
      text: `Namaskar! I am your MahaAarogya Clinical AI Assistant. How can I assist your ${currentRole.toUpperCase()} workflow today?`,
      timestamp: 'Just now',
    },
  ]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: AIMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);

    try {
      const response = await getAIContextualResponse(textToSend, currentRole);
      setMessages((prev) => [...prev, response]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const rolePresets = {
    asha: ['Show today pending home visits', 'Maternal severe anemia danger signs', 'Immunization schedule for 1 year child'],
    doctor: ['Summarize patient Ramesh Patil EHR', 'Hypertension Stage 2 clinical guidelines', 'Check penicillin allergy risks'],
    specialist: ['Explain critical referral priority score', 'Maternal ICU bed management protocols', 'Post-CABG discharge summary guidelines'],
    admin: ['Explain today Gadchiroli fever spike', 'State essential medicine stockout risk', 'MJPJAY cashless claim metrics'],
    patient: ['Explain my prescription in simple Marathi/Hindi', 'How to take Amlodipine 5mg', 'Emergency 108 ambulance contact'],
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gov-700 hover:bg-gov-800 text-white p-3.5 rounded-full shadow-elevated border border-gov-500/50 flex items-center gap-2.5 transition-all hover:scale-105 group"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-bold pr-1 hidden sm:inline">Aarogya AI</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[560px] animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-gov-800 to-teal-800 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/15 backdrop-blur-xs rounded-lg">
                <Bot className="w-5 h-5 text-gov-200" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Aarogya AI Copilot
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                    ASSISTANT
                  </span>
                </h4>
                <p className="text-[11px] text-gov-200">Tailored for {currentRole.toUpperCase()} Care Workflow</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gov-200 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Clinical Disclaimer */}
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[10px] text-amber-900 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>AI Clinical Decision Support. All recommendations require clinician verification.</span>
          </div>

          {/* Chat Messages */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-gov-700 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {m.text}

                  {m.sources && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-semibold">
                      📚 Sources: {m.sources.join(' • ')}
                    </div>
                  )}

                  {m.suggestedActions && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {m.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (act.action.startsWith('navigate:')) {
                              navigate(act.action.replace('navigate:', ''));
                              setIsOpen(false);
                            }
                          }}
                          className="px-2 py-1 bg-gov-50 hover:bg-gov-100 text-gov-800 border border-gov-200 rounded-md font-bold text-[11px] transition-colors"
                        >
                          {act.label} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-gov-600 animate-spin" />
                <span>Analyzing clinical database & protocols...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-slate-100/70 border-t border-slate-200 flex gap-1.5 overflow-x-auto no-scrollbar">
            {(rolePresets[currentRole] || []).map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset)}
                className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-gov-50 text-slate-700 hover:text-gov-800 rounded-full border border-slate-200 text-[11px] font-medium transition-colors shadow-2xs shrink-0"
              >
                💡 {preset}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Aarogya AI (e.g. summarize records, dosage, guidelines)..."
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-200"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="rounded-xl h-9 px-3"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
