import React, { useState } from 'react';
import { CalendarCheck, Bell, UserCheck, AlertTriangle, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

interface FollowUpItem {
  id: string;
  patientName: string;
  condition: string;
  lastVisit: string;
  dueDate: string;
  priority: 'critical' | 'high' | 'routine';
  assignedPhc: string;
  ashaWorker: string;
  status: 'pending_confirmation' | 'scheduled' | 'overdue' | 'completed';
  latestTelemetry?: string;
}

const MOCK_FOLLOWUPS: FollowUpItem[] = [
  {
    id: 'fu-1',
    patientName: 'Anandi Devi Patil',
    condition: 'Refractory HTN + Diabetic Retinopathy Review',
    lastVisit: '10 Aug 2026',
    dueDate: '25 Aug 2026',
    priority: 'high',
    assignedPhc: 'PHC Paud, Pune',
    ashaWorker: 'Sunita Patil (Ward 3)',
    status: 'scheduled',
    latestTelemetry: 'BP 138/86 mmHg (ASHA Home Visit on 22 Aug)',
  },
  {
    id: 'fu-2',
    patientName: 'Suresh More',
    condition: 'Post-PTCA Stent Patency & Echo Review',
    lastVisit: '06 Aug 2026',
    dueDate: '20 Aug 2026',
    priority: 'critical',
    assignedPhc: 'PHC Pirangut, Pune',
    ashaWorker: 'Vandana Kute',
    status: 'overdue',
    latestTelemetry: 'Missed scheduled tele-ECG slot',
  },
  {
    id: 'fu-3',
    patientName: 'Kavita Jadhav',
    condition: 'High-Risk Pregnancy (Gestational DM + Anemia)',
    lastVisit: '15 Aug 2026',
    dueDate: '28 Aug 2026',
    priority: 'high',
    assignedPhc: 'CHC Mulshi',
    ashaWorker: 'Meena Gaikwad',
    status: 'scheduled',
    latestTelemetry: 'Hb 10.2 g/dL, Fasting Sugar 112 mg/dL',
  },
];

export const SpecialistFollowUps: React.FC = () => {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(MOCK_FOLLOWUPS);
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? followUps : followUps.filter(f => f.status === filter);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Specialist Workspace' }, { label: 'Automated Follow-ups & Reminders' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tertiary Specialist Follow-Up Tracker</h1>
            <p className="text-sm text-slate-500">Cross-tier tracking of high-risk discharged patients with ASHA & PHC integration</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'scheduled', 'overdue'].map(st => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === st ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(fu => (
          <Card key={fu.id} className="p-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{fu.patientName}</h3>
                  <Badge variant={fu.priority === 'critical' ? 'danger' : fu.priority === 'high' ? 'warning' : 'default'}>
                    {fu.priority.toUpperCase()}
                  </Badge>
                  <Badge variant={fu.status === 'overdue' ? 'danger' : 'info'} className="capitalize">
                    {fu.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-700">{fu.condition}</p>
                <p className="text-xs text-slate-500">
                  Assigned Facility: <strong>{fu.assignedPhc}</strong> • ASHA Worker: <strong>{fu.ashaWorker}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Review Due Date</span>
                <p className={`text-sm font-bold ${fu.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {fu.dueDate}
                </p>
              </div>
            </div>

            {fu.latestTelemetry && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="font-bold text-slate-900">Latest Field Telemetry: </span>
                  {fu.latestTelemetry}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synced via ASHA App
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-600 text-white text-xs font-bold rounded-lg hover:bg-gov-700 transition-colors">
                <Bell className="w-3.5 h-3.5" /> Send Urgent Alert to ASHA & Patient
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
