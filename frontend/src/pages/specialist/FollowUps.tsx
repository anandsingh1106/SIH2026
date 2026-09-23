import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Bell, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { backendApi, type TreatmentPlanRecord } from '@arogyasetu/shared/services/api';
import { localDateString, localDateOffset } from '@arogyasetu/shared/utils';

type Phase = TreatmentPlanRecord['phases'][number];
type Status = 'overdue' | 'due_soon' | 'scheduled' | 'undated';

interface FollowUpItem {
  plan: TreatmentPlanRecord;
  phase: Phase;
  status: Status;
}

const STATUS_LABEL: Record<Status, string> = {
  overdue: 'Overdue',
  due_soon: 'Due this week',
  scheduled: 'Scheduled',
  undated: 'No target date',
};

const formatDate = (iso?: string) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/**
 * Each open treatment plan's next unfinished phase is the follow-up it is
 * waiting on, so the tracker is built from the plans rather than a list of
 * its own.
 */
function toFollowUps(plans: TreatmentPlanRecord[]): FollowUpItem[] {
  const today = localDateString();
  const weekAhead = localDateOffset(7);
  return plans
    .filter((p) => p.status === 'ACTIVE' || p.status === 'REVIEW_REQUIRED')
    .flatMap((plan) => {
      const phase = plan.phases.find((ph) => !ph.completed);
      if (!phase) return [];
      const due = phase.targetDate?.slice(0, 10);
      const status: Status = !due ? 'undated' : due < today ? 'overdue' : due <= weekAhead ? 'due_soon' : 'scheduled';
      return [{ plan, phase, status }];
    })
    .sort((a, b) => (a.phase.targetDate ?? '9999').localeCompare(b.phase.targetDate ?? '9999'));
}

export const SpecialistFollowUps: React.FC = () => {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');

  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items: plans } = await backendApi.getTreatmentPlans({ limit: 100 });
      setItems(toFollowUps(plans));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load follow-ups.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendAlert = async ({ plan, phase }: FollowUpItem) => {
    setBusy(plan.id);
    setResult(null);
    try {
      const res = await backendApi.sendUrgentAlert(
        plan.patientId,
        `Follow-up due for ${plan.title}: ${phase.title}${phase.targetDate ? ` by ${formatDate(phase.targetDate)}` : ''}. Please contact the patient and confirm attendance.`,
        `Follow-up needed: ${plan.patientName}`
      );
      setResult(
        res.notified.length > 0
          ? { text: `Reminder sent to ${res.notified.map((n) => (n === 'ASHA' ? 'the ASHA' : 'the patient')).join(' and ')} for ${res.patientName}.`, ok: true }
          : { text: `${res.patientName} has no assigned ASHA or patient login, so there was nobody to remind.`, ok: false }
      );
    } catch (err) {
      setResult({ text: err instanceof Error ? err.message : 'Could not send the reminder.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const markDone = async ({ plan, phase }: FollowUpItem) => {
    setBusy(plan.id);
    setResult(null);
    try {
      await backendApi.setTreatmentPhase(plan.id, phase.id, true);
      setResult({ text: `${phase.title} marked done for ${plan.patientName}.`, ok: true });
      await load();
    } catch (err) {
      setResult({ text: err instanceof Error ? err.message : 'Could not update the plan.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const counts = (s: Status) => items.filter((i) => i.status === s).length;
  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Follow-ups & Reminders' }]} />

      {result && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-semibold">{result.text}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Specialist Follow-Up Tracker</h1>
            <p className="text-sm text-ink-soft">The next pending step of every open treatment plan, with its due date</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {(['all', 'overdue', 'due_soon', 'scheduled'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                filter === st ? 'bg-amber-600 text-white shadow-sm' : 'bg-surface border border-line text-ink-muted hover:bg-sand-50'
              }`}
            >
              {st === 'all' ? `All (${items.length})` : `${STATUS_LABEL[st]} (${counts(st)})`}
            </button>
          ))}
          <button
            onClick={() => void load()}
            disabled={isLoading}
            aria-label="Refresh"
            className="p-2 border border-line rounded-lg hover:bg-sand-50 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center text-xs text-ink-soft">Loading follow-ups…</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-xs text-ink-soft">
            {items.length === 0 ? (
              <>No open treatment plans. Follow-ups appear here once you <Link to="/specialist/treatment-plans" className="text-gov-700 font-bold hover:underline">create a plan</Link>.</>
            ) : 'Nothing in this filter.'}
          </Card>
        ) : (
          filtered.map(item => {
            const { plan, phase, status } = item;
            const done = plan.phases.filter((p) => p.completed).length;
            return (
              <Card key={plan.id} className="p-5 space-y-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-ink text-base">{plan.patientName}</h3>
                      <Badge variant={status === 'overdue' ? 'danger' : status === 'due_soon' ? 'warning' : 'info'}>
                        {STATUS_LABEL[status]}
                      </Badge>
                      {plan.status === 'REVIEW_REQUIRED' && <Badge variant="warning">Review required</Badge>}
                    </div>
                    <p className="text-xs font-semibold text-sand-700">{plan.title}</p>
                    <p className="text-xs text-ink-soft">
                      {[plan.patientVillage && `Village: ${plan.patientVillage}`, `ASHA: ${plan.ashaName ?? 'not assigned'}`,
                        plan.referralCode && `Referral ${plan.referralCode}`].filter(Boolean).join(' • ')}
                    </p>
                  </div>

                  <div className="md:text-right shrink-0">
                    <span className="text-xs text-ink-soft">Due</span>
                    <p className={`text-sm font-bold ${status === 'overdue' ? 'text-rose-600' : 'text-ink'}`}>
                      {formatDate(phase.targetDate)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-sand-50 rounded-xl border border-line text-xs text-sand-700">
                  <span className="font-bold text-ink">Next step (phase {phase.position} of {plan.phases.length}, {done} done): </span>
                  {phase.title}
                  {phase.description && <span className="text-ink-soft"> • {phase.description}</span>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-line flex-wrap">
                  <button
                    onClick={() => void markDone(item)}
                    disabled={busy === plan.id}
                    className="px-3 py-1.5 border border-emerald-200 text-emerald-800 bg-emerald-50 text-xs font-bold rounded-lg hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Mark step done
                  </button>
                  <button
                    onClick={() => void sendAlert(item)}
                    disabled={busy === plan.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-600 text-white text-xs font-bold rounded-lg hover:bg-gov-700 transition-colors disabled:opacity-60"
                  >
                    {busy === plan.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…</>
                    ) : (
                      <><Bell className="w-3.5 h-3.5" /> Remind ASHA &amp; Patient</>
                    )}
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
