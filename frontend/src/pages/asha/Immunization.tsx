import React, { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Syringe, CheckCircle2, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { dataService } from '../../services/api/dataService';
import type { Patient, Vaccination } from '@arogyasetu/shared/types';

type Tab = 'due' | 'completed' | 'all';

/** A dose joined to the patient it belongs to, for display. */
interface LedgerRow extends Vaccination {
  patient?: Patient;
}

const STATUS_VARIANT = {
  OVERDUE: 'danger',
  GIVEN: 'success',
  DUE: 'warning',
} as const;

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const AshaImmunizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('due');
  const [records, setRecords] = useState<Vaccination[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [selected, setSelected] = useState<LedgerRow | null>(null);
  const [batchNo, setBatchNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dataService.getVaccinations(), dataService.getPatients()])
      .then(([vaccinations, people]) => {
        if (cancelled) return;
        setRecords(vaccinations);
        setPatients(people);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byPatient = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.id, p);
    return map;
  }, [patients]);

  const rows: LedgerRow[] = useMemo(
    () =>
      records.map((r) => ({ ...r, patient: byPatient.get(r.patientId) })),
    [records, byPatient]
  );

  const dueCount = useMemo(
    () => rows.filter((r) => r.status === 'DUE' || r.status === 'OVERDUE').length,
    [rows]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === 'due'
        ? rows.filter((r) => r.status === 'DUE' || r.status === 'OVERDUE')
        : activeTab === 'completed'
        ? rows.filter((r) => r.status === 'GIVEN')
        : rows;

    // Overdue first, then by the date the dose was scheduled for.
    return [...list].sort((a, b) => {
      const rank = (s: Vaccination['status']) => (s === 'OVERDUE' ? 0 : s === 'DUE' ? 1 : 2);
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
      return (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '');
    });
  }, [rows, activeTab]);

  const handleAdminister = (row: LedgerRow) => {
    setSelected(row);
    setBatchNo(row.batchNumber ?? '');
    setError(null);
    setIsGiveModalOpen(true);
  };

  const handleConfirmAdminister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await dataService.administerVaccination(selected.id, {
        batchNumber: batchNo.trim() || undefined,
      });
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setIsGiveModalOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the dose. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Village Immunization & Universal Child Vaccine Register' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Syringe className="w-6 h-6 text-gov-700" />
            Universal Immunization Tracking Ledger
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            National Health Mission Immunization Schedule (Birth to 5 Years &amp; Pregnant Mothers)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface p-1 rounded-xl border border-line shadow-2xs text-xs font-semibold">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'due' ? 'bg-gov-700 text-white font-bold' : 'text-ink-muted hover:bg-sand-100'
            }`}
          >
            Due &amp; Overdue{dueCount > 0 ? ` (${dueCount})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'completed' ? 'bg-gov-700 text-white font-bold' : 'text-ink-muted hover:bg-sand-100'
            }`}
          >
            Completed Sessions
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all' ? 'bg-gov-700 text-white font-bold' : 'text-ink-muted hover:bg-sand-100'
            }`}
          >
            All Ledger Records
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-surface rounded-2xl border border-line p-8 text-center text-sm text-ink-soft">
          Loading immunisation register…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-surface rounded-2xl border border-line p-8 text-center text-sm text-ink-soft">
          {records.length === 0
            ? 'No immunisation records found for your patients.'
            : 'Nothing in this tab right now.'}
        </div>
      )}

      {/* Vaccine Ledger Cards */}
      <div className="space-y-3">
        {filtered.map((r) => {
          const given = r.status === 'GIVEN';
          return (
            <div
              key={r.id}
              className={`bg-surface rounded-2xl border p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                r.status === 'OVERDUE'
                  ? 'border-red-300 bg-red-50/20'
                  : given
                  ? 'border-emerald-200 bg-emerald-50/10'
                  : 'border-line'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={STATUS_VARIANT[r.status]} size="sm">
                    {r.status}
                  </Badge>
                  <h3 className="font-bold text-ink text-sm">
                    {r.patientName ?? r.patient?.name ?? 'Unknown patient'}
                  </h3>
                  {r.patient && (
                    <span className="text-xs text-ink-soft font-medium">
                      ({r.patient.gender?.toUpperCase()}
                      {r.patient.age != null ? `, ${r.patient.age} yrs` : ''})
                    </span>
                  )}
                </div>

                <div className="font-semibold text-gov-800 text-xs flex items-center gap-1.5">
                  <Syringe className="w-3.5 h-3.5" />
                  <span>
                    {r.name}
                    {r.dose ? ` — ${r.dose}` : ''}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft pt-0.5">
                  {r.patient?.village && (
                    <>
                      <span>{r.patient.village}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>Scheduled: {formatDate(r.scheduledDate)}</span>
                  {r.administeredDate && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">
                        Given: {formatDate(r.administeredDate)}
                      </span>
                    </>
                  )}
                  {r.batchNumber && (
                    <>
                      <span>•</span>
                      <span className="font-mono">Batch {r.batchNumber}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!given ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => handleAdminister(r)}
                    >
                      Record Dose Given
                    </Button>
                    {r.patient?.phone && (
                      <a href={`tel:${r.patient.phone}`}>
                        <Button size="sm" variant="outline" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                          Call
                        </Button>
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" /> Dose Administered &amp; Logged
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Administer Modal */}
      {isGiveModalOpen && selected && (
        <Modal
          isOpen={isGiveModalOpen}
          onClose={() => setIsGiveModalOpen(false)}
          title={`Record Vaccine Administration: ${selected.patientName ?? selected.patient?.name ?? ''}`}
          description={`${selected.name}${selected.dose ? ` — ${selected.dose}` : ''}`}
          size="md"
        >
          <form onSubmit={handleConfirmAdminister} className="space-y-4">
            <Input
              label="Vaccine Batch Number (from vial)"
              required
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
            />
            <div className="p-3 bg-gov-50 border border-gov-200 rounded-xl text-xs text-gov-900">
              Confirm the Vaccine Vial Monitor (VVM) is in Stage 1 or 2 before administering, and that
              cold-chain has been maintained for this vial.
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsGiveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? 'Saving…' : 'Confirm & Log Vaccine Given'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
