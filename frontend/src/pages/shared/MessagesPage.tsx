import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { dataService } from '../../services/api/dataService';
import { Message } from '../../types';
import { MessageSquare, Send, Paperclip, Search, User, CheckCheck } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';

export const MessagesPage: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedContact, setSelectedContact] = useState({
    id: 'usr-doc-1',
    name: 'Dr. Rajesh Deshmukh',
    role: 'Primary Medical Officer (PHC Paud)',
  });

  useEffect(() => {
    const load = async () => {
      const list = await dataService.getMessages();
      setMessages(list);
    };
    load();
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'messages') load();
    });
    return () => unsub();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    const newMsg: Message = {
      id: 'msg-' + Date.now(),
      conversationId: 'conv-asha-doc',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentRole,
      recipientId: selectedContact.id,
      recipientName: selectedContact.name,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
    };

    await dataService.sendMessage(newMsg);
    setInputText('');
  };

  const contacts = [
    { id: 'usr-doc-1', name: 'Dr. Rajesh Deshmukh', role: 'Medical Officer (PHC Paud)', status: 'Online' },
    { id: 'usr-spec-1', name: 'Dr. Priya Kulkarni', role: 'Cardiologist (Sassoon)', status: 'In OPD' },
    { id: 'usr-asha-1', name: 'Sunita Gaikwad (ASHA)', role: 'Field Worker (Paud)', status: 'Active on 108' },
    { id: 'usr-admin-1', name: 'Pune District Control Room', role: 'Nodal Dispatch', status: '24x7 Active' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Care Team Messaging' },
        ]}
      />

      <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* Contact List */}
        <div className="w-full md:w-80 border-r border-line bg-sand-50/50 flex flex-col">
          <div className="p-4 border-b border-line">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gov-700" />
              Care Team Conversations
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {contacts.map((c) => {
              const isSelected = selectedContact.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`p-3.5 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-surface font-bold border-l-4 border-l-gov-700 shadow-2xs' : 'hover:bg-sand-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{c.name}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">● {c.status}</span>
                  </div>
                  <div className="text-[11px] text-ink-soft truncate mt-0.5">{c.role}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 flex flex-col justify-between bg-surface">
          {/* Top Chat Bar */}
          <div className="p-4 border-b border-line bg-sand-50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-ink">{selectedContact.name}</h4>
              <p className="text-[11px] text-ink-soft">{selectedContact.role}</p>
            </div>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Encrypted Government LAN Channel
            </span>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-sand-50/30">
            {messages.map((m) => {
              const isMe = m.senderRole === currentRole;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs ${
                      isMe
                        ? 'bg-gov-700 text-white rounded-br-xs'
                        : 'bg-surface text-ink border border-line rounded-bl-xs'
                    }`}
                  >
                    {!isMe && (
                      <div className="font-bold text-[11px] text-gov-800 mb-1">
                        {m.senderName} ({m.senderRole.toUpperCase()})
                      </div>
                    )}
                    <p>{m.text}</p>
                  </div>
                  <span className="text-[10px] text-ink-soft mt-1 px-1 flex items-center gap-1">
                    {m.timestamp} {isMe && <CheckCheck className="w-3 h-3 text-gov-600" />}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-line bg-surface flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Simulating attachment upload (EHR slip, ECG report, Photo)...')}
              className="p-2 text-ink-soft hover:text-sand-700 rounded-lg hover:bg-sand-100"
              title="Attach clinical report / photo"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder={`Type a clinical message to ${selectedContact.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 text-xs border border-sand-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
            />
            <Button type="submit" variant="primary" size="sm" className="rounded-xl h-9 px-4 font-bold">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
