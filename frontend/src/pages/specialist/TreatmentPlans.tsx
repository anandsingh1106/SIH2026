import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, CheckCircle, Clock, Trash2, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import {
  backendApi,
  type ReferralRecord,
  type TreatmentPlanRecord,
  type TreatmentPlanStatus,
} from '@arogyasetu/shared/services/api';
import { localDateString, localDateOffset } from '@arogyasetu/shared/utils';
import { useAuth } from '../../services/auth/authContext';
import { useToast } from '../../hooks/useToast';

const STATUS_BADGE: Record<TreatmentPlanStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'default' }> = {
  ACTIVE: { label: 'Active', variant: 'info' },
  REVIEW_REQUIRED: { label: 'Review required', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
};

const formatDate = (iso?: string) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

type PhaseDraft = { title: string; description: string; targetDate: string };

const emptyPhase = (days = 7): PhaseDraft => ({ title: '', description: '', targetDate: localDateOffset(days) });

const EMPTY_DRAFT = {
  referralId: '',
  title: '',
  specialty: '',
  directives: '',
  phases: [emptyPhase(7)],
};

export const SpecialistTreatmentPlans: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [plans, setPlans] = useState<TreatmentPlanRecord[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [planPage, referralPage] = await Promise.all([
        backendApi.getTreatmentPlans({ limit: 100 }),
        // Referrals are only needed for the patient picker, so a failure there
        // should not hide the plans.
        backendApi.getReferrals().catch(() => ({ items: [] as ReferralRecord[] })),
      ]);
      setPlans(planPage.items);
      setReferrals(referralPage.items.filter((r) => !['CANCELLED', 'REJECTED'].includes(r.status)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load treatment plans.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Arriving from a consultation's "Treatment Plan" link: open the form for
  // that referral once the referrals have loaded.
  const referralParam = searchParams.get('referral');
  useEffect(() => {
    if (!referralParam || isLoading) return;
    const referral = referrals.find((r) => r.id === referralParam);
    if (referral) {
      setDraft({ ...EMPTY_DRAFT, referralId: referral.id, specialty: referral.specialty ?? '', phases: [emptyPhase(7)] });
      setShowCreateModal(true);
    }
    setSearchParams({}, { replace: true });
  }, [referralParam, isLoading, referrals, setSearchParams]);

  const visible = plans.filter((p) => statusFilter === 'all' || p.status === 'ACTIVE' || p.status === 'REVIEW_REQUIRED');
  const isAuthor = (plan: TreatmentPlanRecord) => !!currentUser && plan.authorId === currentUser.id;
  const isClosed = (plan: TreatmentPlanRecord) => plan.status === 'COMPLETED' || plan.status === 'CANCELLED';

  const replacePlan = (updated: TreatmentPlanRecord) =>
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const togglePhase = async (plan: TreatmentPlanRecord, phaseId: string, completed: boolean) => {
    if (isClosed(plan)) return;
    setBusyId(phaseId);
    try {
      replacePlan(await backendApi.setTreatmentPhase(plan.id, phaseId, completed));
    } catch (err) {
      toast.error('Could not update the phase', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (plan: TreatmentPlanRecord, status: TreatmentPlanStatus) => {
    setBusyId(plan.id);
    try {
      replacePlan(await backendApi.updateTreatmentPlan(plan.id, { status }));
      toast.success('Plan updated', `${plan.patientName}: ${STATUS_BADGE[status].label.toLowerCase()}.`);
    } catch (err) {
      toast.error('Could not update the plan', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, phases: [emptyPhase(7)] });
    setShowCreateModal(true);
  };

  const pickReferral = (referralId: string) => {
    const referral = referrals.find((r) => r.id === referralId);
    setDraft((d) => ({
      ...d,
      referralId,
      specialty: d.specialty || referral?.specialty || '',
    }));
  };

  const updatePhase = (index: number, patch: Partial<PhaseDraft>) =>
    setDraft((d) => ({ ...d, phases: d.phases.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const referral = referrals.find((r) => r.id === draft.referralId);
    if (!referral) return;
    const phases = draft.phases
      .filter((p) => p.title.trim())
      .map((p) => ({
        title: p.title.trim(),
        description: p.description.trim() || undefined,
        targetDate: p.targetDate || undefined,
      }));
    if (phases.length === 0) {
      toast.error('Add a phase', 'A plan needs at least one phase with a title.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await backendApi.createTreatmentPlan({
        patientId: referral.patientId,
        referralId: referral.id,
        title: draft.title.trim(),
        specialty: draft.specialty.trim() || undefined,
        directives: draft.directives.trim() || undefined,
        startDate: localDateString(),
        phases,
      });
      setPlans((prev) => [created, ...prev]);
      setShowCreateModal(false);
      toast.success('Plan published', `The care team for ${created.patientName} can now follow it.`);
    } catch (err) {
      toast.error('Could not publish the plan', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Care Protocols & Treatment Plans' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Treatment Plans & Protocols</h1>
            <p className="text-sm text-ink-soft">Phased care pathways for referred patients, followed up by the PHC team</p>
          </div>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => void load()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2.5 border border-line text-sm font-semibold rounded-xl hover:bg-sand-50 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-xl hover:bg-gov-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> New Treatment Plan
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {([['open', 'Open plans'], ['all', 'All plans']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === value ? 'bg-gov-600 text-white shadow-sm' : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-xs text-ink-soft">Loading treatment plans…</Card>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-xs text-ink-soft">
          {plans.length === 0
            ? 'No treatment plans yet. Start one for a referred patient with "New Treatment Plan".'
            : 'No open plans. Switch to "All plans" to see completed ones.'}
        </Card>
      ) : (
        <div className="space-y-6">
          {visible.map(plan => {
            const done = plan.phases.filter((p) => p.completed).length;
            const percent = plan.phases.length ? Math.round((done / plan.phases.length) * 100) : 0;
            const badge = STATUS_BADGE[plan.status];
            const today = localDateString();
            return (
              <Card key={plan.id} className="p-5 md:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-ink">{plan.patientName}</h2>
                      <Badge variant={badge.variant}>{badge.label.toUpperCase()}</Badge>
                      {plan.referralCode && <span className="text-xs text-ink-soft">Referral {plan.referralCode}</span>}
                    </div>
                    <p className="text-sm font-semibold text-blue-900 mt-1">{plan.title}</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {[plan.specialty, `Started ${formatDate(plan.startDate)}`, plan.authorName && `By ${plan.authorName}`]
                        .filter(Boolean).join(' • ')}
                    </p>
                  </div>

                  <div className="md:text-right shrink-0">
                    <span className="text-xs text-ink-soft">Plan completion</span>
                    <p className="text-lg font-bold text-ink">{percent}%</p>
                    <div className="w-32 h-1.5 bg-sand-100 rounded-full overflow-hidden md:ml-auto">
                      <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Phases {isClosed(plan) ? '' : '(tap to mark done)'}
                  </h3>
                  <div className="space-y-2">
                    {plan.phases.map((phase) => {
                      const late = !phase.completed && !!phase.targetDate && phase.targetDate < today;
                      return (
                        <button
                          type="button"
                          key={phase.id}
                          disabled={isClosed(plan) || busyId === phase.id}
                          onClick={() => void togglePhase(plan, phase.id, !phase.completed)}
                          className={`w-full text-left p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all disabled:cursor-default ${
                            phase.completed
                              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                              : 'bg-surface border-line hover:border-blue-300'
                          } ${busyId === phase.id ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {phase.completed ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Clock className={`w-5 h-5 ${late ? 'text-rose-500' : 'text-ink-soft'}`} />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${phase.completed ? 'line-through text-emerald-800' : 'text-ink'}`}>
                                Phase {phase.position}: {phase.title}
                              </p>
                              {phase.description && <p className="text-xs text-ink-muted mt-0.5">{phase.description}</p>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[11px] font-medium ${late ? 'text-rose-600' : 'text-ink-soft'}`}>
                              {phase.completed ? `Done ${formatDate(phase.completedAt)}` : `Target ${formatDate(phase.targetDate)}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {plan.directives && (
                  <div className="p-3.5 bg-sand-50 rounded-xl border border-line text-xs text-sand-700">
                    <span className="font-bold text-ink">Directives for the PHC team: </span>
                    {plan.directives}
                  </div>
                )}

                {isAuthor(plan) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {isClosed(plan) ? (
                      <button
                        disabled={busyId === plan.id}
                        onClick={() => void setStatus(plan, 'ACTIVE')}
                        className="px-3 py-1.5 text-xs font-bold border border-line rounded-lg hover:bg-sand-50 disabled:opacity-50"
                      >
                        Reopen plan
                      </button>
                    ) : (
                      <>
                        <button
                          disabled={busyId === plan.id}
                          onClick={() => void setStatus(plan, plan.status === 'REVIEW_REQUIRED' ? 'ACTIVE' : 'REVIEW_REQUIRED')}
                          className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                        >
                          {plan.status === 'REVIEW_REQUIRED' ? 'Review done' : 'Flag for review'}
                        </button>
                        <button
                          disabled={busyId === plan.id}
                          onClick={() => void setStatus(plan, 'COMPLETED')}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Mark plan complete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Treatment Plan"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Referred patient</label>
            <select
              required
              value={draft.referralId}
              onChange={e => pickReferral(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
            >
              <option value="" disabled>Select a referral</option>
              {referrals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.patientName ?? 'Patient'} ({r.referralCode}{r.specialty ? `, ${r.specialty}` : ''})
                </option>
              ))}
            </select>
            {referrals.length === 0 && (
              <p className="text-[11px] text-ink-soft mt-1">No referrals have reached you yet, so there is no patient to plan for.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-sand-700 mb-1">Condition / plan title</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={200}
                placeholder="e.g. Stage 3 CKD with proteinuria"
                value={draft.title}
                onChange={e => setDraft({ ...draft, title: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Specialty</label>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g. Nephrology"
                value={draft.specialty}
                onChange={e => setDraft({ ...draft, specialty: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-sand-700">Phases</label>
              <button
                type="button"
                disabled={draft.phases.length >= 12}
                onClick={() => setDraft({ ...draft, phases: [...draft.phases, emptyPhase(7 * (draft.phases.length + 1))] })}
                className="text-xs font-bold text-gov-700 hover:underline disabled:opacity-50"
              >
                + Add phase
              </button>
            </div>
            {draft.phases.map((phase, i) => (
              <div key={i} className="p-3 border border-line rounded-lg space-y-2 bg-sand-50/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required={i === 0}
                    maxLength={160}
                    placeholder={`Phase ${i + 1}, e.g. Baseline renal workup`}
                    value={phase.title}
                    onChange={e => updatePhase(i, { title: e.target.value })}
                    className="flex-1 min-w-0 px-3 py-2 border border-line rounded-lg text-xs"
                  />
                  <input
                    type="date"
                    value={phase.targetDate}
                    onChange={e => updatePhase(i, { targetDate: e.target.value })}
                    className="w-36 px-2 py-2 border border-line rounded-lg text-xs"
                  />
                  {draft.phases.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove phase ${i + 1}`}
                      onClick={() => setDraft({ ...draft, phases: draft.phases.filter((_, j) => j !== i) })}
                      className="px-2 text-ink-soft hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={600}
                  placeholder="Details (optional)"
                  value={phase.description}
                  onChange={e => updatePhase(i, { description: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Directives for the PHC medical officer and ASHA</label>
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="Target BP or sugar ranges, red-flag symptoms, when to refer back..."
              value={draft.directives}
              onChange={e => setDraft({ ...draft, directives: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving || referrals.length === 0}
              className="flex-1 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-lg hover:bg-gov-700 disabled:opacity-60"
            >
              {isSaving ? 'Publishing…' : 'Publish Plan'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 border border-line text-sand-700 text-sm font-semibold rounded-lg hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
