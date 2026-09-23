import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, FileText, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { backendApi, type ReferralRecord } from '@arogyasetu/shared/services/api';
import { useToast } from '../../hooks/useToast';

type Tab = 'arriving' | 'active' | 'completed';

// Where each referral status sits in the specialist's day.
const TAB_STATUSES: Record<Tab, string[]> = {
  arriving: ['ACCEPTED', 'IN_TRANSIT'],
  active: ['ARRIVED', 'IN_CONSULTATION'],
  completed: ['COMPLETED'],
};

const TAB_LABELS: Record<Tab, string> = {
  arriving: 'Awaiting arrival',
  active: 'In consultation',
  completed: 'Completed',
};

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Accepted',
  IN_TRANSIT: 'In transit',
  ARRIVED: 'Arrived',
  IN_CONSULTATION: 'In consultation',
  COMPLETED: 'Completed',
};

const URGENCY_BADGE: Record<string, 'danger' | 'warning' | 'info'> = {
  EMERGENCY: 'danger',
  URGENT: 'warning',
  ROUTINE: 'info',
};

const formatDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

export const SpecialistConsultations: React.FC = () => {
  const toast = useToast();
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [concluding, setConcluding] = useState<ReferralRecord | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await backendApi.getReferrals();
      setReferrals(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load consultations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inTab = (tab: Tab) => referrals.filter((r) => TAB_STATUSES[tab].includes(r.status));
  const currentList = inTab(activeTab);

  const run = async (referral: ReferralRecord, action: () => Promise<ReferralRecord>, done: string) => {
    setBusyId(referral.id);
    try {
      const updated = await action();
      setReferrals((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      toast.success(done, referral.patientName ?? referral.referralCode);
      return true;
    } catch (err) {
      toast.error('Could not update the referral', err instanceof Error ? err.message : 'Please try again.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const conclude = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concluding) return;
    const ok = await run(
      concluding,
      () => backendApi.completeReferral(concluding.id, notes.trim() || undefined),
      'Consultation completed'
    );
    if (ok) {
      setConcluding(null);
      setNotes('');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Specialist Consultations' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Specialist Consultations</h1>
            <p className="text-sm text-ink-soft">Accepted referrals from arrival to a completed consultation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-sand-100 p-1 rounded-xl overflow-x-auto">
            {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                  activeTab === tab ? 'bg-surface text-purple-700 shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {TAB_LABELS[tab]} ({inTab(tab).length})
              </button>
            ))}
          </div>
          <button
            onClick={() => void load()}
            disabled={isLoading}
            aria-label="Refresh"
            className="p-2 border border-line rounded-lg hover:bg-sand-50 disabled:opacity-50"
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
          <Card className="p-8 text-center text-xs text-ink-soft">Loading consultations…</Card>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12 text-ink-soft">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold">Nothing {TAB_LABELS[activeTab].toLowerCase()}</p>
            {activeTab !== 'completed' && (
              <p className="text-xs mt-1">
                New referrals are accepted from the <Link to="/specialist/referrals" className="text-purple-700 font-bold hover:underline">referral queue</Link>.
              </p>
            )}
          </div>
        ) : (
          currentList.map((ref) => (
            <Card key={ref.id} className="p-5 hover:border-purple-200 transition-all">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink text-base">{ref.patientName ?? 'Patient'}</span>
                    <Badge variant={URGENCY_BADGE[ref.urgency] ?? 'info'}>{ref.urgency}</Badge>
                    {ref.specialty && <Badge variant="default" className="text-xs">{ref.specialty}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[ref.status] ?? ref.status}</Badge>
                  </div>

                  <p className="text-xs text-ink-soft">
                    {ref.referralCode} • Referred from{' '}
                    <strong className="text-sand-700">{ref.sourceFacilityName ?? 'unknown facility'}</strong>
                    {ref.referredByName && <> by <strong className="text-sand-700">{ref.referredByName}</strong></>}
                    {' '}on {formatDateTime(ref.createdAt)}
                  </p>

                  {(ref.clinicalSummary || ref.reason) && (
                    <div className="p-3 bg-sand-50 rounded-xl border border-line text-xs text-sand-700">
                      <p className="font-semibold text-ink mb-0.5">Referring clinical summary</p>
                      {ref.reason && <p className="font-medium">{ref.reason}</p>}
                      {ref.clinicalSummary && ref.clinicalSummary !== ref.reason && <p>{ref.clinicalSummary}</p>}
                    </div>
                  )}

                  {ref.status === 'COMPLETED' && (
                    <p className="text-[11px] text-emerald-700 font-semibold">Completed {formatDateTime(ref.completedAt)}</p>
                  )}
                </div>

                <div className="flex md:flex-col gap-2 self-end md:self-auto shrink-0">
                  {TAB_STATUSES.arriving.includes(ref.status) && (
                    <button
                      disabled={busyId === ref.id}
                      onClick={() => void run(ref, () => backendApi.arriveReferral(ref.id), 'Marked as arrived')}
                      className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      Patient Arrived
                    </button>
                  )}
                  {ref.status === 'ARRIVED' && (
                    <button
                      disabled={busyId === ref.id}
                      onClick={() => void run(ref, () => backendApi.setReferralStatus(ref.id, 'IN_CONSULTATION'), 'Consultation started')}
                      className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      Start Consultation
                    </button>
                  )}
                  {ref.status === 'IN_CONSULTATION' && (
                    <button
                      disabled={busyId === ref.id}
                      onClick={() => { setConcluding(ref); setNotes(''); }}
                      className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Conclude Consultation
                    </button>
                  )}
                  <Link
                    to={`/specialist/treatment-plans?referral=${ref.id}`}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 border border-line text-sand-700 text-xs font-semibold rounded-lg hover:bg-sand-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Treatment Plan
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={!!concluding}
        onClose={() => setConcluding(null)}
        title={`Conclude consultation${concluding?.patientName ? `: ${concluding.patientName}` : ''}`}
      >
        <form onSubmit={conclude} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Closes referral {concluding?.referralCode}. The note is added to the referral history the referring
            doctor sees.
          </p>
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Consultation outcome and advice</label>
            <textarea
              rows={4}
              maxLength={1000}
              placeholder="Diagnosis, treatment given, medicines to continue at the PHC, and when to refer back..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busyId === concluding?.id}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            >
              {busyId === concluding?.id ? 'Saving…' : 'Complete Referral'}
            </button>
            <button
              type="button"
              onClick={() => setConcluding(null)}
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
