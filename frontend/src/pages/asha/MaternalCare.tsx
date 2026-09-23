import React, { useCallback, useEffect, useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Baby, AlertTriangle, Phone, Plus, RefreshCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { backendApi, type MaternalRecord } from '@arogyasetu/shared/services/api';
import { useToast } from '../../hooks/useToast';

const DAY_MS = 24 * 60 * 60 * 1000;
const today = () => new Date().toISOString().slice(0, 10);

function weeksSince(date?: string): number | null {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
  return days >= 0 ? Math.floor(days / 7) : null;
}

function ageFrom(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * DAY_MS);
  return Number.isFinite(years) ? Math.floor(years) : null;
}

/** Only the age is asked at registration, so the birth date is approximate. */
function approximateDateOfBirth(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

const OUTCOME_LABEL: Record<string, string> = {
  ONGOING: 'Ongoing pregnancy',
  DELIVERED: 'Delivered',
  ABORTED: 'Pregnancy loss',
  REFERRED: 'Referred',
};

const EMPTY_REGISTRATION = { name: '', age: 23, village: '', lmp: '', gravida: 1, para: 0, phone: '' };
const EMPTY_VISIT = { visitDate: today(), weight: '', bpSystolic: '', bpDiastolic: '', hemoglobin: '', ifaTablets: '', tetanusGiven: false, notes: '' };

const optionalNumber = (value: string) => (value.trim() === '' ? undefined : Number(value));

export const AshaMaternalCarePage: React.FC = () => {
  const toast = useToast();

  const [mothers, setMothers] = useState<MaternalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newReg, setNewReg] = useState(EMPTY_REGISTRATION);
  const [isRegistering, setIsRegistering] = useState(false);

  const [visitFor, setVisitFor] = useState<MaternalRecord | null>(null);
  const [visit, setVisit] = useState(EMPTY_VISIT);
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await backendApi.getMaternalRecords({ limit: 100 });
      setMothers(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load maternal records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRegisterMother = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      const patient = await backendApi.createPatient({
        name: newReg.name.trim(),
        gender: 'FEMALE',
        dateOfBirth: approximateDateOfBirth(newReg.age),
        phone: newReg.phone.trim() || undefined,
        village: newReg.village.trim() || undefined,
      });
      await backendApi.createMaternalRecord({
        patientId: patient.id,
        lmpDate: newReg.lmp,
        gravida: newReg.gravida,
        parity: newReg.para,
      });
      toast.success('Pregnancy registered', `${patient.name} is now on your ANC ledger.`);
      setIsRegisterOpen(false);
      setNewReg(EMPTY_REGISTRATION);
      await load();
    } catch (err) {
      toast.error('Registration failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const openVisit = (mother: MaternalRecord) => {
    setVisit({ ...EMPTY_VISIT, visitDate: today() });
    setVisitFor(mother);
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitFor) return;
    setIsSavingVisit(true);
    try {
      await backendApi.addAncVisit(visitFor.id, {
        visitDate: visit.visitDate,
        weight: optionalNumber(visit.weight),
        bloodPressureSystolic: optionalNumber(visit.bpSystolic),
        bloodPressureDiastolic: optionalNumber(visit.bpDiastolic),
        hemoglobin: optionalNumber(visit.hemoglobin),
        ifaTabletsGiven: optionalNumber(visit.ifaTablets),
        tetanusGiven: visit.tetanusGiven,
        notes: visit.notes.trim() || undefined,
      });
      toast.success('ANC visit recorded', visitFor.patientName ? `Saved for ${visitFor.patientName}.` : undefined);
      setVisitFor(null);
      await load();
    } catch (err) {
      toast.error('Could not save the visit', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSavingVisit(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Maternal & Child Health Care (ANC / HRP)' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <Baby className="w-6 h-6 text-gov-700" />
            Maternal Health (ANC) & High-Risk Pregnancy Ledger
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Monitor Expected Delivery Dates (EDD), 4 ANC milestones, JSSK benefits, and red-flag danger signs
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCcw className="w-4 h-4" />}
            onClick={() => void load()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsRegisterOpen(true)}
          >
            Register Pregnant Mother
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Mother Records Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-soft">Loading maternal records…</div>
      ) : mothers.length === 0 && !error ? (
        <div className="p-12 bg-surface rounded-xl border border-dashed border-sand-300 text-center space-y-3">
          <Baby className="w-8 h-8 mx-auto text-sand-300" />
          <p className="text-xs text-ink-soft">No pregnancies are registered on your ledger yet.</p>
          <Button size="sm" variant="primary" onClick={() => setIsRegisterOpen(true)}>
            Register the first mother
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {mothers.map((m) => {
            const weeks = weeksSince(m.lmpDate);
            const age = ageFrom(m.patientDateOfBirth);
            const ancDone = m.ancVisitCount ?? 0;
            return (
              <div
                key={m.id}
                className={`bg-surface rounded-2xl border p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
                  m.highRisk ? 'border-red-300 bg-red-50/20' : 'border-line'
                }`}
              >
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={m.highRisk ? 'critical' : 'success'} size="sm">
                      {m.highRisk ? 'HIGH RISK PREGNANCY (HRP)' : 'NORMAL GESTATION'}
                    </Badge>
                    <h3 className="font-bold text-ink text-base">{m.patientName ?? 'Unnamed patient'}</h3>
                    <span className="text-xs text-ink-soft font-medium">
                      ({age !== null ? `${age} Yrs • ` : ''}Gravida {m.gravida ?? '-'}, Para {m.parity ?? '-'})
                    </span>
                    {m.patientVillage && (
                      <span className="text-xs text-ink-soft">• {m.patientVillage}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-sand-50 p-3 rounded-xl border border-line text-xs">
                    <div>
                      <span className="text-[11px] text-ink-soft">Gestation:</span>
                      <div className="font-bold text-gov-800">
                        {weeks !== null ? `${weeks} Weeks` : 'LMP not recorded'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-ink-soft">Expected Delivery:</span>
                      <div className="font-bold text-ink">{m.eddDate ?? '-'}</div>
                    </div>
                    <div>
                      <span className="text-[11px] text-ink-soft">Hemoglobin (latest):</span>
                      <div className={`font-bold ${m.latestHemoglobin !== undefined && m.latestHemoglobin < 8 ? 'text-red-600' : 'text-ink'}`}>
                        {m.latestHemoglobin !== undefined ? `${m.latestHemoglobin} g/dL` : 'Not recorded'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-ink-soft">Blood Pressure (latest):</span>
                      <div className="font-bold text-ink">{m.latestBp ? `${m.latestBp} mmHg` : 'Not recorded'}</div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {m.riskFactors.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> High-Risk Indicators Identified:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.riskFactors.map((rf, idx) => (
                          <span key={idx} className="text-xs bg-red-100 text-red-800 font-semibold px-2.5 py-0.5 rounded-full border border-red-200">
                            {rf}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ANC Milestones Progress Bar */}
                  <div className="space-y-1 text-xs pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-ink-muted">
                      <span>ANC Checkups Completed: {Math.min(ancDone, 4)} / 4</span>
                      <span className="text-gov-700 font-bold">
                        {OUTCOME_LABEL[m.outcome ?? 'ONGOING'] ?? m.outcome}
                        {m.jsskRegistered ? ' • JSSK' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-sand-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gov-600 rounded-full"
                        style={{ width: `${(Math.min(ancDone, 4) / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" variant="primary" onClick={() => openVisit(m)}>
                    Record ANC Visit Details
                  </Button>
                  {m.patientPhone && (
                    <a href={`tel:${m.patientPhone}`}>
                      <Button size="sm" variant="outline" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                        Call Mother / Husband
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register New Pregnancy Modal */}
      {isRegisterOpen && (
        <Modal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          title="Register New Pregnant Mother (MCP Registration)"
          description="Enrolls pregnant mother into tracking schedule with automatic EDD and ANC reminders"
          size="md"
        >
          <form onSubmit={handleRegisterMother} className="space-y-4">
            <Input
              label="Mother Full Name"
              required
              minLength={2}
              placeholder="e.g. Renuka Deepak Patil"
              value={newReg.name}
              onChange={(e) => setNewReg({ ...newReg, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Age (Years)"
                type="number"
                min={12}
                max={60}
                required
                value={newReg.age}
                onChange={(e) => setNewReg({ ...newReg, age: parseInt(e.target.value) || 20 })}
              />
              <Input
                label="Last Menstrual Period (LMP)"
                type="date"
                required
                max={today()}
                value={newReg.lmp}
                onChange={(e) => setNewReg({ ...newReg, lmp: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Gravida (Total Pregnancies)"
                type="number"
                min={1}
                max={20}
                required
                value={newReg.gravida}
                onChange={(e) => setNewReg({ ...newReg, gravida: parseInt(e.target.value) || 1 })}
              />
              <Input
                label="Para (Live Births)"
                type="number"
                min={0}
                max={20}
                required
                value={newReg.para}
                onChange={(e) => setNewReg({ ...newReg, para: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Village"
                placeholder="e.g. Paud"
                value={newReg.village}
                onChange={(e) => setNewReg({ ...newReg, village: e.target.value })}
              />
              <Input
                label="Contact Phone"
                required
                placeholder="+91 98000 12345"
                value={newReg.phone}
                onChange={(e) => setNewReg({ ...newReg, phone: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isRegistering}>
                {isRegistering ? 'Registering…' : 'Register & Calculate EDD'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record ANC Visit Modal */}
      {visitFor && (
        <Modal
          isOpen={!!visitFor}
          onClose={() => setVisitFor(null)}
          title={`Record ANC Visit${visitFor.patientName ? `: ${visitFor.patientName}` : ''}`}
          description="Hb below 7 g/dL or systolic BP of 140 or more flags the pregnancy as high risk and alerts the facility doctors"
          size="md"
        >
          <form onSubmit={handleSaveVisit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Visit Date"
                type="date"
                required
                max={today()}
                value={visit.visitDate}
                onChange={(e) => setVisit({ ...visit, visitDate: e.target.value })}
              />
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                min={20}
                max={200}
                value={visit.weight}
                onChange={(e) => setVisit({ ...visit, weight: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="BP Systolic"
                type="number"
                min={50}
                max={300}
                value={visit.bpSystolic}
                onChange={(e) => setVisit({ ...visit, bpSystolic: e.target.value })}
              />
              <Input
                label="BP Diastolic"
                type="number"
                min={20}
                max={200}
                value={visit.bpDiastolic}
                onChange={(e) => setVisit({ ...visit, bpDiastolic: e.target.value })}
              />
              <Input
                label="Hb (g/dL)"
                type="number"
                step="0.1"
                min={1}
                max={25}
                value={visit.hemoglobin}
                onChange={(e) => setVisit({ ...visit, hemoglobin: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <Input
                label="IFA Tablets Given"
                type="number"
                min={0}
                max={500}
                value={visit.ifaTablets}
                onChange={(e) => setVisit({ ...visit, ifaTablets: e.target.value })}
              />
              <label className="flex items-center gap-2 text-xs font-semibold text-ink pb-3">
                <input
                  type="checkbox"
                  checked={visit.tetanusGiven}
                  onChange={(e) => setVisit({ ...visit, tetanusGiven: e.target.checked })}
                />
                Td / Tetanus dose given
              </label>
            </div>
            <Input
              label="Notes"
              placeholder="Danger signs, counselling given, next visit plan"
              value={visit.notes}
              onChange={(e) => setVisit({ ...visit, notes: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setVisitFor(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSavingVisit}>
                {isSavingVisit ? 'Saving…' : 'Save ANC Visit'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
