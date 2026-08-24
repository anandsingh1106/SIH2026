import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Syringe, CheckCircle2, AlertTriangle, Clock, Plus, Phone, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const AshaImmunizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'due' | 'completed' | 'all'>('due');
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [batchNo, setBatchNo] = useState('MR-2026-X8');

  const [records, setRecords] = useState([
    { id: 'imm-1', childName: 'Aarav Sachin Gaikwad', motherName: 'Kavita Gaikwad', dob: '2025-08-10', gender: 'male', vaccine: 'Measles-Rubella 1st Dose (MR-1) + Vit A', dueDate: '2026-08-23', status: 'due', village: 'Paud (Kolvan Rd)', phone: '+91 97654 32109' },
    { id: 'imm-2', childName: 'Ananya Rahul Shinde', motherName: 'Pooja Shinde', dob: '2026-05-15', gender: 'female', vaccine: 'Pentavalent 3 + OPV 3 + Rotavirus', dueDate: '2026-08-24', status: 'due', village: 'Paud (Vetal Pada)', phone: '+91 98221 44556' },
    { id: 'imm-3', childName: 'Omkar Ramesh Patil', motherName: 'Sunita Patil', dob: '2024-08-20', gender: 'male', vaccine: 'DPT Booster 1 + OPV Booster', dueDate: '2026-08-20', status: 'overdue', village: 'Paud (Gaothan)', phone: '+91 98500 44332' },
    { id: 'imm-4', childName: 'Tanvi Vikas More', motherName: 'Sneha More', dob: '2026-02-10', gender: 'female', vaccine: 'BCG + Hep B Birth Dose', dueDate: '2026-02-10', givenDate: '2026-02-11', status: 'completed', village: 'Paud (Koliwada)', phone: '+91 94220 11223' },
  ]);

  const handleAdminister = (child: any) => {
    setSelectedChild(child);
    setIsGiveModalOpen(true);
  };

  const handleConfirmAdminister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    setRecords(
      records.map((r) =>
        r.id === selectedChild.id
          ? { ...r, status: 'completed', givenDate: new Date().toISOString().substring(0, 10) }
          : r
      )
    );
    setIsGiveModalOpen(false);
    setSelectedChild(null);
  };

  const filtered = records.filter((r) => {
    if (activeTab === 'due') return r.status === 'due' || r.status === 'overdue';
    if (activeTab === 'completed') return r.status === 'completed';
    return true;
  });

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
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Syringe className="w-6 h-6 text-gov-700" />
            Universal Immunization Tracking Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            National Health Mission Immunization Schedule (Birth to 5 Years & Pregnant Mothers)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'due' ? 'bg-gov-700 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Due & Overdue (3)
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'completed' ? 'bg-gov-700 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Completed Sessions
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all' ? 'bg-gov-700 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Ledger Records
          </button>
        </div>
      </div>

      {/* Vaccine Ledger Cards */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <div
            key={r.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              r.status === 'overdue'
                ? 'border-red-300 bg-red-50/20'
                : r.status === 'completed'
                ? 'border-emerald-200 bg-emerald-50/10'
                : 'border-slate-200'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    r.status === 'overdue'
                      ? 'danger'
                      : r.status === 'completed'
                      ? 'success'
                      : 'warning'
                  }
                  size="sm"
                >
                  {r.status.toUpperCase()}
                </Badge>
                <h3 className="font-bold text-slate-900 text-sm">{r.childName}</h3>
                <span className="text-xs text-slate-500 font-medium">({r.gender.toUpperCase()}, DOB: {r.dob})</span>
              </div>

              <div className="font-semibold text-gov-800 text-xs flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5" />
                <span>{r.vaccine}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-0.5">
                <span>👩 <strong>Mother:</strong> {r.motherName}</span>
                <span>•</span>
                <span>🏠 {r.village}</span>
                <span>•</span>
                <span>📅 Due Date: {r.dueDate}</span>
                {r.givenDate && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">✅ Given: {r.givenDate}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {r.status !== 'completed' ? (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleAdminister(r)}
                  >
                    Record Dose Given
                  </Button>
                  <a href={`tel:${r.phone}`}>
                    <Button size="sm" variant="outline" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                      Call Mother
                    </Button>
                  </a>
                </>
              ) : (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Dose Administered & Logged
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Administer Modal */}
      {isGiveModalOpen && selectedChild && (
        <Modal
          isOpen={isGiveModalOpen}
          onClose={() => setIsGiveModalOpen(false)}
          title={`Record Vaccine Administration: ${selectedChild.childName}`}
          description={`Vaccine: ${selectedChild.vaccine} • Mother: ${selectedChild.motherName}`}
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
              Verified Vaccine Vial Monitor (VVM) is in Stage 1/2 (Usable). Administering in Anganwadi session under cold-chain compliance.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsGiveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Confirm & Log Vaccine Given
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
