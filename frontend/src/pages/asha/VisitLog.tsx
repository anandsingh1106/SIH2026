import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, CloudOff, CheckCircle2, MapPin, Search,
  RefreshCcw, AlertTriangle, Home as HomeIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { dataService } from '../../services/api/dataService';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import { useToast } from '../../hooks/useToast';

/**
 * Log of home visits recorded by this worker.
 *
 * Shows synced visits from the server alongside any still queued on the device,
 * each identified by its visit token, so a worker can confirm what was captured
 * and whether it has reached the server yet.
 */

interface LogEntry {
  token: string;
  patientName: string;
  date: string;
  riskLevel?: string;
  referralRecommended: boolean;
  observations?: string;
  synced: boolean;
  queuedAt?: string;
  syncError?: string;
  retryCount?: number;
}

export const AshaVisitLogPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingToken, setSyncingToken] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'synced'>('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [visits, queue] = await Promise.all([
        dataService.getHomeVisits(),
        syncQueueManager.getQueue(),
      ]);

      const synced: LogEntry[] = visits.map((v) => ({
        // The token was stored in householdId when the visit was recorded.
        token: (v as { householdId?: string }).householdId || '—',
        patientName: (v as { patientName?: string }).patientName || 'Unknown patient',
        date: v.date,
        riskLevel: (v as { riskLevel?: string }).riskLevel,
        referralRecommended: Boolean(v.referralRecommended),
        observations: v.observations,
        synced: true,
      }));

      const pending: LogEntry[] = queue
        .filter((op) => op.entity === 'home_visit')
        .map((op) => {
          const payload = (op.data ?? {}) as Record<string, unknown>;
          return {
            token: op.id,
            patientName: (payload.patientName as string) || 'Queued visit',
            date: (payload.visitDate as string) || op.timestamp.slice(0, 10),
            riskLevel: payload.riskLevel as string | undefined,
            referralRecommended: Boolean(payload.referralRecommended),
            observations: payload.observations as string | undefined,
            synced: false,
            queuedAt: op.timestamp,
            syncError: op.error,
            retryCount: op.retryCount,
          };
        });

      // Pending first — those are the ones needing attention.
      setEntries([...pending, ...synced].sort((a, b) => {
        if (a.synced !== b.synced) return a.synced ? 1 : -1;
        return (b.date ?? '').localeCompare(a.date ?? '');
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'home_visits') load();
    });
    const unsubSync = syncQueueManager.subscribe(() => load());
    return () => { unsub(); unsubSync(); };
  }, [load]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const { success, failed } = await syncQueueManager.processQueue();
      if (success > 0) toast.success(`${success} visit${success === 1 ? '' : 's'} synced`);
      if (failed > 0) toast.warning(`${failed} could not sync`, 'They stay queued and will retry.');
      if (success === 0 && failed === 0) toast.info('Nothing to sync');
      await load();
    } finally {
      setIsSyncing(false);
    }
  };

  /** Syncs a single queued visit, so the worker can push one record at a time. */
  const handleSyncOne = async (token: string) => {
    setSyncingToken(token);
    try {
      const { success, error } = await syncQueueManager.syncOne(token);
      if (success) {
        toast.success('Visit synced', `${token} is now on the server.`);
      } else {
        toast.error('Could not sync', error);
      }
      // Reload either way: on success the entry moves to Synced, on failure the
      // retry count shown on the card is refreshed.
      await load();
    } finally {
      setSyncingToken(null);
    }
  };

  const pendingCount = entries.filter((e) => !e.synced).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === 'pending' && e.synced) return false;
      if (filter === 'synced' && !e.synced) return false;
      if (!q) return true;
      return (
        e.token.toLowerCase().includes(q) ||
        e.patientName.toLowerCase().includes(q) ||
        (e.date ?? '').includes(q)
      );
    });
  }, [entries, query, filter]);

  const riskBadge = (risk?: string) => {
    const v = String(risk ?? '').toUpperCase();
    if (v === 'CRITICAL') return { variant: 'critical' as const, label: 'CRITICAL' };
    if (v === 'HIGH') return { variant: 'danger' as const, label: 'HIGH RISK' };
    if (v === 'MODERATE') return { variant: 'warning' as const, label: 'MODERATE' };
    if (v === 'LOW') return { variant: 'success' as const, label: 'NORMAL' };
    return null;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Home Visit Log' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-gov-700" />
            Home Visit Log
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            {isLoading
              ? 'Loading visits…'
              : `${entries.length} visit${entries.length === 1 ? '' : 's'} recorded` +
                (pendingCount > 0 ? ` · ${pendingCount} waiting to sync` : '')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
              onClick={handleSyncNow}
              isLoading={isSyncing}
            >
              Sync {pendingCount} now
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<HomeIcon className="w-3.5 h-3.5" />}
            onClick={() => navigate('/asha/home-visits')}
          >
            Record Visit
          </Button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <CloudOff className="w-4 h-4 shrink-0" />
          <span>
            {pendingCount} visit{pendingCount === 1 ? '' : 's'} recorded on this device have not
            reached the server yet. They sync automatically when connectivity returns.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <SearchInput placeholder="Search by token, patient or date…" onChange={setQuery} />
        </div>

        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-line text-xs">
          {([
            ['all', 'All'],
            ['pending', 'Not synced'],
            ['synced', 'Synced'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filter === key ? 'bg-gov-700 text-white' : 'text-ink-muted hover:bg-sand-100'
              }`}
            >
              {label}
              {key === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-soft">Loading visit log…</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-surface rounded-xl border border-dashed border-sand-300 text-center space-y-3">
          <ClipboardList className="w-8 h-8 mx-auto text-sand-300" />
          <p className="text-xs text-ink-soft">
            {entries.length === 0 ? 'No home visits recorded yet.' : 'No visits match this view.'}
          </p>
          {entries.length === 0 && (
            <Button size="sm" variant="primary" onClick={() => navigate('/asha/home-visits')}>
              Record your first visit
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e, i) => {
            const risk = riskBadge(e.riskLevel);
            return (
              <div
                key={`${e.token}-${i}`}
                className={`bg-surface rounded-2xl border p-5 shadow-xs ${
                  !e.synced ? 'border-amber-300 border-l-4 border-l-amber-500' : 'border-line'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gov-800 tracking-wider">
                        {e.token}
                      </span>
                      {risk && <Badge variant={risk.variant} size="sm">{risk.label}</Badge>}
                      {e.referralRecommended && (
                        <Badge variant="danger" size="sm">REFERRAL RAISED</Badge>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-ink">{e.patientName}</p>

                    {e.observations && (
                      <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                        {e.observations}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-ink-soft" />
                        Visited {e.date}
                      </span>
                      {e.queuedAt && (
                        <>
                          <span>•</span>
                          <span>Queued {new Date(e.queuedAt).toLocaleString('en-IN')}</span>
                        </>
                      )}
                    </div>

                    {/* Surface why a queued visit has not gone through. */}
                    {e.syncError && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                        <span>
                          {e.syncError}
                          {e.retryCount ? ` (${e.retryCount} attempt${e.retryCount === 1 ? '' : 's'})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {e.synced ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" /> Synced
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                          <CloudOff className="w-4 h-4" /> Pending
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={
                            <RefreshCcw
                              className={`w-3.5 h-3.5 ${syncingToken === e.token ? 'animate-spin' : ''}`}
                            />
                          }
                          onClick={() => handleSyncOne(e.token)}
                          isLoading={syncingToken === e.token}
                          disabled={syncingToken !== null}
                        >
                          Sync
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-ink-soft text-center">
          Showing {filtered.length} of {entries.length} visits
        </p>
      )}
    </div>
  );
};
