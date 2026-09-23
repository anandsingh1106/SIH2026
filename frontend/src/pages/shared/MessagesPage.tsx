import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { MessageSquare, Send, Plus, Search, ArrowLeft } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  backendApi,
  type ChatMessageRecord,
  type ConversationRecord,
  type MessagingContact,
} from '@arogyasetu/shared/services/api';
import { useToast } from '../../hooks/useToast';

const ROLE_LABEL: Record<string, string> = {
  asha: 'ASHA', doctor: 'Doctor', specialist: 'Specialist', admin: 'Admin', patient: 'Patient',
};

const REFRESH_MS = 15000;

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const titleOf = (c: ConversationRecord) =>
  c.members.map((m) => m.name).join(', ') || c.subject || 'Just you';

export const MessagesPage: React.FC = () => {
  const toast = useToast();
  const { currentUser, currentRole } = useAuth();

  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [contacts, setContacts] = useState<MessagingContact[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  // The toast context changes whenever a toast shows; reading it through a ref
  // keeps the polling effects below from restarting on every toast.
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const loadConversations = useCallback(async () => {
    try {
      const { items } = await backendApi.getConversations();
      setConversations(items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conversations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { items } = await backendApi.getConversationMessages(conversationId);
      setMessages(items);
      // Reading the thread clears its unread badge.
      const unread = items.filter((m) => !m.isRead && m.senderId !== currentUser?.id);
      if (unread.length) {
        await Promise.all(unread.map((m) => backendApi.markMessageRead(m.id).catch(() => undefined)));
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
      }
    } catch (err) {
      toastRef.current.error('Could not load messages', err instanceof Error ? err.message : undefined);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    const timer = window.setInterval(() => void loadMessages(activeId), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const openPicker = async () => {
    setPickerOpen(true);
    if (contacts) return;
    try {
      setContacts(await backendApi.getMessagingContacts());
    } catch (err) {
      setContacts([]);
      toast.error('Could not load contacts', err instanceof Error ? err.message : undefined);
    }
  };

  // Reuse the one-to-one thread with this person if there is one.
  const startWith = async (contact: MessagingContact) => {
    setPickerOpen(false);
    const existing = conversations.find((c) => c.members.length === 1 && c.members[0].id === contact.id);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    try {
      const created = await backendApi.createConversation([contact.id]);
      await loadConversations();
      setMessages([]);
      setActiveId(created.id);
    } catch (err) {
      toast.error('Could not start the conversation', err instanceof Error ? err.message : undefined);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeId) return;
    setIsSending(true);
    try {
      await backendApi.sendChatMessage(activeId, text);
      setInputText('');
      await Promise.all([loadMessages(activeId), loadConversations()]);
    } catch (err) {
      toast.error('Message not sent', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const shownContacts = useMemo(() => {
    const term = contactSearch.trim().toLowerCase();
    return (contacts ?? []).filter((c) =>
      !term || c.name.toLowerCase().includes(term) || (c.facilityName ?? '').toLowerCase().includes(term)
    );
  }, [contacts, contactSearch]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Care Team Messaging' },
        ]}
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* Conversation list */}
        <div className={`w-full md:w-80 border-r border-line bg-sand-50/50 flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-line flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gov-700" />
              Conversations
            </h3>
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => void openPicker()}>
              New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {isLoading && <p className="p-4 text-xs text-ink-soft">Loading…</p>}
            {!isLoading && conversations.length === 0 && (
              <p className="p-4 text-xs text-ink-soft">No conversations yet. Press "New" to message your care team.</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left p-3.5 text-xs transition-colors ${
                  c.id === activeId ? 'bg-surface border-l-4 border-l-gov-700 shadow-2xs' : 'hover:bg-sand-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink truncate">{titleOf(c)}</span>
                  <span className="text-[10px] text-ink-soft shrink-0">{timeLabel(c.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-[11px] text-ink-soft truncate">{c.lastMessage ?? 'No messages yet'}</span>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-gov-700 text-white text-[10px] font-bold flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className={`flex-1 flex-col justify-between bg-surface ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-xs text-ink-soft p-6 text-center">
              Choose a conversation, or press "New" to start one.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-line bg-sand-50 flex items-center gap-3">
                <button onClick={() => setActiveId(null)} className="md:hidden p-1 rounded hover:bg-sand-100" aria-label="Back">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-ink truncate">{titleOf(active)}</h4>
                  <p className="text-[11px] text-ink-soft truncate">
                    {active.members.map((m) => ROLE_LABEL[m.role] ?? m.role).join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-sand-50/30">
                {messages.length === 0 && <p className="text-center text-xs text-ink-soft">No messages yet. Say hello.</p>}
                {messages.map((m) => {
                  const isMe = m.senderId === currentUser?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap break-words ${
                          isMe ? 'bg-gov-700 text-white rounded-br-xs' : 'bg-surface text-ink border border-line rounded-bl-xs'
                        }`}
                      >
                        {!isMe && (
                          <div className="font-bold text-[11px] text-gov-800 mb-1">
                            {m.senderName}{m.senderRole ? ` (${ROLE_LABEL[m.senderRole] ?? m.senderRole})` : ''}
                          </div>
                        )}
                        <p>{m.text}</p>
                      </div>
                      <span className="text-[10px] text-ink-soft mt-1 px-1">{timeLabel(m.timestamp)}</span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-line bg-surface flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4000}
                  placeholder={`Message ${titleOf(active)}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 text-xs border border-sand-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gov-600 focus:ring-2 focus:ring-gov-100"
                />
                <Button type="submit" variant="primary" size="sm" className="rounded-xl h-9 px-4 font-bold" disabled={isSending || !inputText.trim()} aria-label="Send">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="New Message" size="md">
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              placeholder="Search by name or facility..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-xs"
            />
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-line border border-line rounded-lg">
            {contacts === null && <p className="p-4 text-xs text-ink-soft">Loading contacts…</p>}
            {contacts && shownContacts.length === 0 && (
              <p className="p-4 text-xs text-ink-soft">
                {contacts.length === 0 ? 'Nobody is linked to your care yet.' : 'No contacts match this search.'}
              </p>
            )}
            {shownContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => void startWith(c)}
                className="w-full text-left p-3 text-xs hover:bg-sand-50 flex items-center justify-between gap-2"
              >
                <span>
                  <span className="font-bold text-ink">{c.name}</span>
                  {c.facilityName && <span className="block text-[11px] text-ink-soft">{c.facilityName}</span>}
                </span>
                <span className="text-[10px] font-bold uppercase text-gov-700 shrink-0">{ROLE_LABEL[c.role] ?? c.role}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
