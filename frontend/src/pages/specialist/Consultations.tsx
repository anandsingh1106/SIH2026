import React, { useState } from 'react';
import { Stethoscope, Video, FileText, Bot, Clock, CheckCircle2, User, ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { INITIAL_REFERRALS, INITIAL_PATIENTS } from '../../data/mockData';

export const SpecialistConsultations: React.FC = () => {
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  const pendingConsultations = INITIAL_REFERRALS.filter(r => r.status === 'accepted' || r.status === 'consultation' || r.status === 'scheduled' || r.status === 'created');
  const completedConsultations = INITIAL_REFERRALS.filter(r => r.status === 'treatment' || r.status === 'follow_up' || r.status === 'closed');

  const currentList = activeTab === 'pending' ? pendingConsultations : completedConsultations;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Specialist Consultations' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Specialist Tele-Consultation & Review</h1>
            <p className="text-sm text-slate-500">Conduct tertiary tele-consultations with MOs and manage complex clinical reviews</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'pending' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Consultation ({pendingConsultations.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'completed' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedConsultations.length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {currentList.map(ref => (
          <Card key={ref.id} className="p-5 hover:border-purple-200 transition-all">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-base">{ref.patientName}</span>
                  <Badge variant={ref.priority === 'critical' ? 'danger' : ref.priority === 'high' ? 'warning' : 'info'}>
                    {ref.priority.toUpperCase()} PRIORITY
                  </Badge>
                  <Badge variant="default" className="text-xs">{ref.specialty}</Badge>
                </div>

                <p className="text-xs text-slate-500">
                  Referred from: <strong className="text-slate-700">{ref.referringFacilityName}</strong> by <strong className="text-slate-700">{ref.referringDoctorName}</strong>
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <p className="font-semibold text-slate-800 mb-0.5">Referring Clinical Impression:</p>
                  <p>{ref.clinicalSummary}</p>
                </div>

                {ref.aiRationale && (
                  <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                    <Bot className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">AI Clinical Decision Support: </span>
                      {ref.aiRationale} (Priority Score: {ref.aiPriorityScore}/100)
                    </div>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col gap-2 self-end md:self-auto shrink-0">
                <button
                  onClick={() => setSelectedConsultation(ref.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                  <Video className="w-4 h-4" /> Start Tele-Consult
                </button>
                <a
                  href={`/specialist/treatment-plans?referral=${ref.id}`}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Formulate Plan
                </a>
              </div>
            </div>
          </Card>
        ))}

        {currentList.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold">No {activeTab} specialist consultations</p>
          </div>
        )}
      </div>

      {/* Tele-Consultation Modal */}
      <Modal
        isOpen={!!selectedConsultation}
        onClose={() => setSelectedConsultation(null)}
        title="Tertiary Specialist Tele-Consultation Session"
      >
        <div className="space-y-4">
          <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center text-white text-sm">
            <div className="text-center space-y-2">
              <Video className="w-10 h-10 mx-auto text-purple-400 animate-pulse" />
              <p className="font-bold">Secure ABDM Encrypted Video Bridge Ready</p>
              <p className="text-xs text-slate-400">Connecting PHC Paud Telemedicine Suite with Sassoon Tertiary Desk</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Specialist Consultation Notes & Directives</label>
            <textarea
              rows={3}
              placeholder="Record diagnostic impression, drug dosage adjustments, and required tertiary lab investigations..."
              value={clinicalNotes}
              onChange={e => setClinicalNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedConsultation(null);
                setClinicalNotes('');
              }}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700"
            >
              Conclude & Dispatch Specialist Prescription
            </button>
            <button
              onClick={() => setSelectedConsultation(null)}
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
