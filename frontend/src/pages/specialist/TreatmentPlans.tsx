import React, { useState } from 'react';
import { ClipboardList, Plus, CheckCircle, Clock, AlertCircle, FileText, ChevronRight, Activity } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { INITIAL_PATIENTS } from '../../data/mockData';

interface TreatmentPlan {
  id: string;
  patientName: string;
  condition: string;
  specialty: string;
  startDate: string;
  status: 'active' | 'review_required' | 'completed';
  phases: {
    phaseName: string;
    description: string;
    completed: boolean;
    targetDate: string;
  }[];
  notes: string;
}

const MOCK_PLANS: TreatmentPlan[] = [
  {
    id: 'tp-101',
    patientName: 'Anandi Devi Patil',
    condition: 'Uncontrolled HTN with Moderate Aortic Sclerosis & Early Nephropathy',
    specialty: 'Cardiology & Nephrology Care',
    startDate: '12 Aug 2026',
    status: 'active',
    phases: [
      { phaseName: 'Phase 1: Diagnostic Workup & Tele-ECG', description: '24hr Holter, Renal Doppler, Serum Creatinine & Microalbuminuria', completed: true, targetDate: '15 Aug 2026' },
      { phaseName: 'Phase 2: Pharmacotherapy Optimization', description: 'Switch from Amlodipine 5mg to Telmisartan 40mg + Chlorthalidone 12.5mg combo', completed: true, targetDate: '18 Aug 2026' },
      { phaseName: 'Phase 3: Ambulatory BP & Renal Function Re-check', description: 'Weekly BP tracking by Paud ASHA worker; serum K+ test at 4 weeks', completed: false, targetDate: '15 Sep 2026' },
      { phaseName: 'Phase 4: Tertiary Echo Review', description: 'Repeat 2D Echo at Sassoon General Hospital Pune', completed: false, targetDate: '20 Oct 2026' },
    ],
    notes: 'Patient advised strict salt restriction (<3g/day). ASHA to monitor for lower limb edema.',
  },
  {
    id: 'tp-102',
    patientName: 'Suresh More',
    condition: 'Post-NSTEMI Coronary Intervention Recovery',
    specialty: 'Interventional Cardiology',
    startDate: '05 Aug 2026',
    status: 'review_required',
    phases: [
      { phaseName: 'Phase 1: Percutaneous Transluminal Angioplasty', description: 'DES stent to Mid-LAD coronary artery', completed: true, targetDate: '06 Aug 2026' },
      { phaseName: 'Phase 2: Dual Antiplatelet & Statin Titration', description: 'Ticagrelor 90mg BD + Rosuvastatin 40mg nocte', completed: true, targetDate: '10 Aug 2026' },
      { phaseName: 'Phase 3: Cardiac Rehab & Tele-Monitoring', description: 'Phase II supervised walk test and daily HR/SpO2 sync', completed: false, targetDate: '05 Sep 2026' },
    ],
    notes: 'Check for bleeding tendencies or bruising. Ensure DAPT compliance without gap.',
  },
];

export const SpecialistTreatmentPlans: React.FC = () => {
  const [plans, setPlans] = useState<TreatmentPlan[]>(MOCK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const togglePhase = (planId: string, phaseIndex: number) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const newPhases = [...p.phases];
      newPhases[phaseIndex] = { ...newPhases[phaseIndex], completed: !newPhases[phaseIndex].completed };
      return { ...p, phases: newPhases };
    }));
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
            <h1 className="text-xl font-bold text-slate-900">Tertiary Treatment Plans & Protocols</h1>
            <p className="text-sm text-slate-500">Multi-stage longitudinal disease pathways, titration guidelines, and surgical plans</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-xl hover:bg-gov-700 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Formulate New Protocol
        </button>
      </div>

      <div className="space-y-6">
        {plans.map(plan => (
          <Card key={plan.id} className="p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{plan.patientName}</h2>
                  <Badge variant={plan.status === 'active' ? 'info' : plan.status === 'review_required' ? 'warning' : 'success'}>
                    {plan.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-400">Plan Ref: #{plan.id}</span>
                </div>
                <p className="text-sm font-semibold text-blue-900 mt-1">{plan.condition}</p>
                <p className="text-xs text-slate-500 mt-0.5">Specialty: {plan.specialty} • Initiated: {plan.startDate}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Care Plan Completion</span>
                <p className="text-lg font-bold text-slate-800">
                  {Math.round((plan.phases.filter(p => p.completed).length / plan.phases.length) * 100)}%
                </p>
              </div>
            </div>

            {/* Phases timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Treatment Plan Progression & Milestones</h3>
              <div className="space-y-2">
                {plan.phases.map((phase, idx) => (
                  <div
                    key={idx}
                    onClick={() => togglePhase(plan.id, idx)}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                      phase.completed
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {phase.completed ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${phase.completed ? 'line-through text-emerald-800' : 'text-slate-800'}`}>
                          {phase.phaseName}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{phase.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-medium text-slate-400">Target: {phase.targetDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialist Advisory Notes */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-900">Clinical Directives for PHC / Subcenter: </span>
              {plan.notes}
            </div>
          </Card>
        ))}
      </div>

      {/* Formulate Plan Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Formulate Specialist Treatment Protocol"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Patient Name / ABHA</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kulkarni (91-9921-2291-0021)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Protocol Title</label>
            <input
              type="text"
              placeholder="e.g. Stage 3 CKD Management & Proteinuria Control"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Directives for PHC Medical Officer</label>
            <textarea
              rows={3}
              placeholder="Specify target BP/Sugar ranges, red-flag symptoms, and titration rules..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
            >
              Authorize & Publish Plan
            </button>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
