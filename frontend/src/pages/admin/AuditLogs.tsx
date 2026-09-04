import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, Lock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { dataService } from '../../services/api/dataService';
import type { AuditLog } from '../../types';

/**
 * A denied action is recorded with an explicit outcome in its action name.
 * Everything else the server writes is an action that succeeded — the audit
 * row exists precisely because the operation completed.
 */
const isDenied = (action: string) => /DENIED|FAILED|UNAUTHORIZED|REJECTED/i.test(action);

/** ISO timestamps read poorly in a ledger; show them the way a log would. */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

/** `ISSUE_PRESCRIPTION` -> `Issue prescription`. */
function humanizeAction(action: string): string {
  const words = action.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'denied'>('all');

  useEffect(() => {
    let cancelled = false;
    dataService
      .getAuditLogs()
      .then((rows) => {
        if (cancelled) return;
        setLogs(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((l) => {
      const denied = isDenied(l.action);
      if (statusFilter === 'denied' && !denied) return false;
      if (statusFilter === 'success' && denied) return false;
      if (!needle) return true;
      return [l.userName, l.action, l.resource, l.resourceId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [logs, search, statusFilter]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Security & Access Audit Logs' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sand-900 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Access &amp; Clinical Action Audit Trail</h1>
            <p className="text-sm text-ink-soft">
              Every authentication, record access and clinical action written server-side as it happens
            </p>
          </div>
        </div>

        <Badge variant="success" className="px-3 py-1 text-xs">
          <Lock className="w-3.5 h-3.5 inline mr-1" /> Append-only, written server-side
        </Badge>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, action, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'success', 'denied'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                statusFilter === st
                  ? 'bg-sand-900 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sand-50 text-ink-muted font-bold border-b border-line">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor &amp; Role</th>
                <th className="p-3.5">Action Performed</th>
                <th className="p-3.5">Target Resource</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((entry) => {
                const denied = isDenied(entry.action);
                return (
                  <tr key={entry.id} className="hover:bg-sand-50/60">
                    <td className="p-3.5 text-ink-soft font-mono text-[11px] whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-ink">{entry.userName || 'System'}</p>
                      {entry.userRole && (
                        <Badge variant="info" className="text-[9px] uppercase mt-0.5">{entry.userRole}</Badge>
                      )}
                    </td>
                    <td className="p-3.5 font-medium text-ink">{humanizeAction(entry.action)}</td>
                    <td className="p-3.5 font-mono text-sand-700 text-[11px]">
                      <div>{entry.resource}</div>
                      {entry.resourceId && (
                        <div className="text-ink-soft">{entry.resourceId.slice(0, 8)}…</div>
                      )}
                    </td>
                    <td className="p-3.5 text-ink-soft font-mono text-[11px]">{entry.ipAddress || '—'}</td>
                    <td className="p-3.5">
                      <Badge variant={denied ? 'danger' : 'success'} className="text-[10px] uppercase">
                        {denied ? 'denied' : 'success'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-soft">
                    {logs.length === 0
                      ? 'No audit entries recorded yet.'
                      : 'No entries match this search.'}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-soft">Loading audit trail…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!loading && logs.length > 0 && (
        <p className="text-xs text-ink-soft">
          Showing {filtered.length} of {logs.length} most recent entries.
        </p>
      )}
    </div>
  );
};
