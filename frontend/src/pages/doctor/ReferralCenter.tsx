import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/api/dataService';
import { Referral, Patient } from '@arogyasetu/shared/types';
import { ArrowRightLeft, Plus, Building2, CheckCircle2, Clock, Truck, ShieldAlert, Sparkles } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { TriageBadge } from '../../components/healthcare/TriageBadge';
import { ReferralTimelineWidget } from '../../components/healthcare/ReferralTimelineWidget';

export const DoctorReferralCenterPage: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isNewReferralOpen, setIsNewReferralOpen] = useState(false);

  const [newRef, setNewRef] = useState({
    patientId: 'pat-103',
    targetFacilityId: 'fac-gmc-sassoon',
    specialty: 'Cardiology',
    priority: 'high' as 'high' | 'critical',
    diagnosis: 'Suspected Acute Coronary Syndrome with Ischemic ECG Changes',
    summary: '62-year-old male presenting with exertional chest heaviness radiating to left arm. ECG shows ST segment depressions. Given loading dose of Clopidogrel and Atorvastatin. Needs urgent tertiary angiography & 2D Echo.',
  });

  useEffect(() => {
    Promise.all([dataService.getReferrals(), dataService.getPatients()]).then(([rList, pList]) => {
      setReferrals(rList);
      setPatients(pList);
      if (rList.length > 0) setSelectedReferral(rList[0]);
    });
  }, []);

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === newRef.patientId) || patients[0];

    const ref: Referral = {
      id: 'ref-' + Date.now(),
      referralCode: 'REF-MH-PUN-' + Math.floor(1000 + Math.random() * 9000),
      patientId: pat.id,
      patientName: pat.name,
      patientAge: pat.age,
      patientGender: pat.gender,
      referringFacilityId: 'fac-phc-paud',
      referringFacilityName: 'PHC Paud Clinic',
      referringDoctorName: 'Dr. Rajesh Deshmukh',
      targetFacilityId: newRef.targetFacilityId,
      targetFacilityName: newRef.targetFacilityId === 'fac-gmc-sassoon' ? 'B.J. Govt Medical College & Sassoon General Hospital' : 'District Hospital Aundh, Pune',
      specialty: newRef.specialty,
      priority: newRef.priority,
      status: 'created',
      provisionalDiagnosis: newRef.diagnosis,
      clinicalSummary: newRef.summary,
      aiPriorityScore: newRef.priority === 'critical' ? 95 : 84,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        { status: 'created', timestamp: new Date().toISOString(), note: 'Referral dispatched by Medical Officer', updatedBy: 'Dr. Rajesh Deshmukh' },
      ],
    };

    const saved = await dataService.createReferral(ref);
    setReferrals([saved, ...referrals]);
    setSelectedReferral(saved);
    setIsNewReferralOpen(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Specialist Referral Center' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-gov-700" />
            Specialist Referral Dispatch & Bed Reservation Center
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Coordinate upward transfers from PHC Paud to District Hospital and Sassoon Medical College
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewReferralOpen(true)}
        >
          Create Tertiary Referral
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Outward Referral List (Left 5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-sand-700 uppercase tracking-wider">
            Active Outward Referrals ({referrals.length})
          </h3>

          <div className="space-y-2.5">
            {referrals.map((r) => {
              const isSelected = selectedReferral?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReferral(r)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gov-50/60 border-gov-600 shadow-sm ring-2 ring-gov-100'
                      : 'bg-surface border-line hover:bg-sand-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-gov-800 bg-surface px-2 py-0.5 rounded border border-line">
                      {r.referralCode}
                    </span>
                    <TriageBadge priority={r.priority} size="sm" />
                  </div>

                  <h4 className="font-bold text-ink text-sm mt-2">{r.patientName}</h4>
                  <p className="text-xs text-ink-soft line-clamp-1">{r.provisionalDiagnosis}</p>

                  <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-xs text-ink-muted">
                    <span className="font-semibold text-gov-800">To: {(r.targetFacilityName ?? '').split(' ')[0]}</span>
                    <span className="capitalize font-bold text-sand-700 bg-sand-100 px-2 py-0.5 rounded">
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Referral Timeline & Details (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedReferral ? (
            <div className="space-y-4">
              <ReferralTimelineWidget
                currentStatus={selectedReferral.status}
                history={selectedReferral.history}
              />

              <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="font-bold text-ink text-base">{selectedReferral.patientName}</h3>
                    <p className="text-ink-soft">{selectedReferral.patientAge} Yrs / {selectedReferral.patientGender}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-ink-soft">AI Priority Score</span>
                    <div className="text-xl font-extrabold text-red-600">{selectedReferral.aiPriorityScore} / 100</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-sand-50 p-3.5 rounded-xl border border-line">
                  <div>
                    <span className="text-[11px] text-ink-soft font-medium">Destination Hospital:</span>
                    <div className="font-bold text-gov-800">{selectedReferral.targetFacilityName}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-soft font-medium">Specialty Unit:</span>
                    <div className="font-bold text-ink">{selectedReferral.specialty}</div>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-ink uppercase tracking-wider mb-1">Clinical Summary & Handover Notes:</h5>
                  <p className="text-ink-muted leading-relaxed bg-sand-50 p-3 rounded-lg border border-line">
                    {selectedReferral.clinicalSummary}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-surface rounded-2xl border border-line text-center text-xs text-ink-soft">
              Select a referral to review live care coordination.
            </div>
          )}
        </div>
      </div>

      {/* New Referral Modal */}
      {isNewReferralOpen && (
        <Modal
          isOpen={isNewReferralOpen}
          onClose={() => setIsNewReferralOpen(false)}
          title="Create Outward Specialist Referral"
          description="Initiate tele-referral with clinical handover summary and reserved hospital bed request"
          size="lg"
        >
          <form onSubmit={handleCreateReferral} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1.5">Select Patient</label>
              <select
                value={newRef.patientId}
                onChange={(e) => setNewRef({ ...newRef, patientId: e.target.value })}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink font-semibold focus:outline-none focus:border-gov-600"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age}y, {p.village}) — ABHA: {p.abhaId}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1.5">Destination Hospital</label>
                <select
                  value={newRef.targetFacilityId}
                  onChange={(e) => setNewRef({ ...newRef, targetFacilityId: e.target.value })}
                  className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
                >
                  <option value="fac-gmc-sassoon">B.J. GMC & Sassoon General Hospital, Pune</option>
                  <option value="fac-dh-aundh">District Hospital Aundh, Pune</option>
                  <option value="fac-kem-mumbai">KEM Hospital & Seth GSMC, Mumbai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1.5">Required Specialty</label>
                <select
                  value={newRef.specialty}
                  onChange={(e) => setNewRef({ ...newRef, specialty: e.target.value })}
                  className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
                >
                  <option value="Cardiology">Cardiology & Cath Lab</option>
                  <option value="Obstetrics & High-Risk Pregnancy">Obstetrics & High-Risk Pregnancy</option>
                  <option value="Neurosurgery">Neurosurgery & Trauma</option>
                  <option value="Oncology">Oncology & Chemotherapy</option>
                  <option value="Orthopedics">Orthopedics & Joint Replacement</option>
                </select>
              </div>
            </div>

            <Input
              label="Provisional Clinical Diagnosis"
              required
              value={newRef.diagnosis}
              onChange={(e) => setNewRef({ ...newRef, diagnosis: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1.5">Clinical Case Summary & Reasons for Transfer</label>
              <textarea
                rows={3}
                required
                value={newRef.summary}
                onChange={(e) => setNewRef({ ...newRef, summary: e.target.value })}
                className="w-full text-xs border border-sand-300 rounded-xl p-3 focus:outline-none focus:border-gov-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsNewReferralOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Dispatch Referral & Reserve Bed
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
