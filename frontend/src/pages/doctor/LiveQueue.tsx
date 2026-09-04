import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Stethoscope, Volume2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { TriageBadge } from '../../components/healthcare/TriageBadge';
import { dataService } from '../../services/api/dataService';
import { useAuth } from '../../services/auth/authContext';
import { QueueToken, QueueSummary } from '@arogyasetu/shared/types';

const STATUS_LABEL: Record<QueueToken['status'], string> = {
  WAITING: 'Waiting',
  CALLED: 'Called',
  IN_PROGRESS: 'In Consultation',
  COMPLETED: 'Consultation Complete',
  SKIPPED: 'Skipped',
};

export const DoctorLiveQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const facilityId = currentUser?.facilityId;

  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const loadQueue = useCallback(async () => {
    if (!facilityId) {
      setIsLoading(false);
      return;
    }
    const { items, summary: s } = await dataService.getQueue(facilityId);
    setTokens(items);
    setSummary(s);
    setIsLoading(false);
  }, [facilityId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Completing a consultation elsewhere must show up here without a manual
  // refresh, which is the whole point of a live desk.
  useEffect(() => {
    return dataService.subscribe((event) => {
      if (event.entity === 'queue' || event.entity === 'prescriptions') loadQueue();
    });
  }, [loadQueue]);

  // The queue also moves when other staff act, so poll while the page is open.
  useEffect(() => {
    const id = setInterval(loadQueue, 20_000);
    return () => clearInterval(id);
  }, [loadQueue]);

  const act = async (tokenId: string, action: 'call' | 'start' | 'complete' | 'skip') => {
    setActionError('');
    try {
      await dataService.updateQueueToken(tokenId, action);
      await loadQueue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the token.');
    }
  };

  const handleCallPatient = async (token: QueueToken) => {
    await act(token.id, 'call');
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(
        `Token Number ${token.tokenNumber}. ${token.patientName ?? ''}. Please enter OPD Consultation Room.`
      );
      window.speechSynthesis.speak(u);
    }
  };

  const handleOpenConsultation = async (token: QueueToken) => {
    // Mark the token in-progress so the desk reflects the room before the
    // doctor leaves this page.
    if (token.status === 'CALLED' || token.status === 'WAITING') {
      if (token.status === 'WAITING') await act(token.id, 'call');
      await act(token.id, 'start');
    }
    // Carry the patient and token through so the consultation can complete the
    // right queue entry once the prescription is signed.
    navigate('/doctor/consultation', {
      state: { patientId: token.patientId, queueTokenId: token.id },
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Live OPD Queue & Token Desk' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink flex items-center gap-2">
            <Users className="w-6 h-6 text-gov-700" />
            Live OPD Patient Queue Management
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Real-time digital token dispatch with automated voice call-out and triage tier sorting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadQueue}>
            Refresh
          </Button>
          {summary && (
            <div className="flex items-center gap-2 text-xs font-bold text-gov-800 bg-gov-50 border border-gov-200 px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 text-gov-700" />
              <span>
                {summary.waiting} Waiting • {summary.completed} Completed
                {summary.currentToken ? ` • Now #${summary.currentToken}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
          {actionError}
        </div>
      )}

      {/* Queue List */}
      <div className="bg-surface rounded-2xl border border-line divide-y divide-line shadow-soft overflow-hidden">
        {isLoading && (
          <div className="p-12 text-center text-xs text-ink-soft">Loading today's OPD queue…</div>
        )}

        {!isLoading && tokens.length === 0 && (
          <div className="p-12 text-center text-xs text-ink-soft">
            {facilityId
              ? 'No tokens issued for today yet. Tokens appear here as patients register at the OPD desk.'
              : 'Your account is not linked to a facility, so no OPD queue can be shown.'}
          </div>
        )}

        {tokens.map((item) => {
          const isCurrent = item.status === 'IN_PROGRESS' || item.status === 'CALLED';
          const isDone = item.status === 'COMPLETED';
          return (
            <div
              key={item.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isCurrent ? 'bg-gov-50/50 border-l-4 border-l-gov-700 shadow-glow' : isDone ? 'bg-sand-50/40' : 'hover:bg-sand-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl font-display font-extrabold text-base flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-gradient-to-br from-gov-600 to-gov-700 text-white ring-4 ring-gov-100 shadow-soft'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-sand-100 text-sand-700'
                  }`}
                >
                  #{item.tokenNumber}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-base ${isDone ? 'text-ink-muted line-through' : 'text-ink'}`}>
                      {item.patientName ?? 'Patient'}
                    </span>
                    <TriageBadge priority={isCurrent ? 'high' : 'low'} size="sm" />
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-gov-700 text-white rounded-full animate-pulse">
                        CURRENTLY IN ROOM
                      </span>
                    )}
                    {isDone && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> COMPLETED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-sand-700 font-medium">
                    Status: <span className="font-semibold text-ink">{STATUS_LABEL[item.status]}</span>
                    {item.doctorName && <> • Attending: <span className="font-semibold text-ink">{item.doctorName}</span></>}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-ink-soft pt-0.5">
                    <span className="font-mono text-gov-800 font-semibold">Token ID: {item.id.slice(0, 8)}</span>
                    {item.status === 'WAITING' && item.position ? (
                      <>
                        <span>•</span>
                        <span>Position in line: {item.position}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isDone && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Volume2 className="w-3.5 h-3.5" />}
                      disabled={item.status !== 'WAITING'}
                      onClick={() => handleCallPatient(item)}
                    >
                      Call Token
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenConsultation(item)}
                    >
                      Open Consultation
                    </Button>
                  </>
                )}
                {isDone && (
                  <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Prescription issued
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
