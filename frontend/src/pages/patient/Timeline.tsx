import React, { useState } from 'react';
import { Clock, Pill, FlaskConical, Syringe, ArrowRightLeft, Stethoscope, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { INITIAL_PATIENTS, INITIAL_PRESCRIPTIONS, INITIAL_LAB_ORDERS, INITIAL_REFERRALS } from '../../data/mockData';

type EventType = 'all' | 'consultation' | 'prescription' | 'lab' | 'referral' | 'vaccination';

interface TimelineEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  subtitle: string;
  detail: string;
  badge?: string;
  badgeVariant?: 'success' | 'info' | 'warning' | 'danger' | 'default';
}

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-gov-600',
  prescription: 'bg-purple-600',
  lab: 'bg-blue-600',
  referral: 'bg-amber-500',
  vaccination: 'bg-green-600',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  consultation: <Stethoscope className="w-3.5 h-3.5 text-white" />,
  prescription: <Pill className="w-3.5 h-3.5 text-white" />,
  lab: <FlaskConical className="w-3.5 h-3.5 text-white" />,
  referral: <ArrowRightLeft className="w-3.5 h-3.5 text-white" />,
  vaccination: <Syringe className="w-3.5 h-3.5 text-white" />,
};

export const PatientTimeline: React.FC = () => {
  const [filter, setFilter] = useState<EventType>('all');

  const events: TimelineEvent[] = [
    {
      id: 'e1', date: '23 Aug 2026', type: 'consultation',
      title: 'Follow-up Consultation — PHC Paud',
      subtitle: 'Dr. Rajesh Deshmukh (General Medicine)',
      detail: 'BP controlled at 128/82. HbA1c improved. Continue current medications. Next review in 4 weeks.',
      badge: 'Completed', badgeVariant: 'success',
    },
    {
      id: 'e2', date: '20 Aug 2026', type: 'lab',
      title: 'Complete Blood Count (CBC)',
      subtitle: 'PHC Paud Lab — Pathology',
      detail: 'Hb: 12.4 g/dL · WBC: 7,200 · Platelets: 2.1 Lakh — All within reference range.',
      badge: 'Normal', badgeVariant: 'success',
    },
    {
      id: 'e3', date: '20 Aug 2026', type: 'lab',
      title: 'HbA1c (Glycated Haemoglobin)',
      subtitle: 'PHC Paud Lab — Biochemistry',
      detail: 'Result: 7.2% (Previously 8.1%) — Improving glycemic control.',
      badge: 'Improving', badgeVariant: 'info',
    },
    {
      id: 'e4', date: '10 Aug 2026', type: 'prescription',
      title: 'Prescription — Hypertension & Diabetes',
      subtitle: 'Dr. Rajesh Deshmukh',
      detail: 'Amlodipine 5mg (1-0-0) · Metformin 500mg (1-0-1) · Aspirin 75mg (0-1-0) — 30-day supply.',
      badge: 'Active', badgeVariant: 'info',
    },
    {
      id: 'e5', date: '28 Jul 2026', type: 'referral',
      title: 'Specialist Referral — Cardiology',
      subtitle: 'Referred to B.J. Govt Medical College & Sassoon',
      detail: 'Referred by Dr. Deshmukh for ECG review and cardiac assessment. Priority: Moderate.',
      badge: 'In Progress', badgeVariant: 'warning',
    },
    {
      id: 'e6', date: '15 Jul 2026', type: 'consultation',
      title: 'Initial OPD Visit — PHC Paud',
      subtitle: 'Dr. Rajesh Deshmukh',
      detail: 'Chief Complaint: Breathlessness on exertion, elevated BP (158/96). Diagnosed: Stage 2 Hypertension + Type 2 DM.',
      badge: 'Completed', badgeVariant: 'success',
    },
    {
      id: 'e7', date: '02 Jan 2026', type: 'vaccination',
      title: 'COVID-19 Booster Dose',
      subtitle: 'PHC Paud — Immunization Center',
      detail: 'Covaxin Booster administered. Certificate updated in COWIN.',
      badge: 'Given', badgeVariant: 'success',
    },
    {
      id: 'e8', date: '14 Jun 2025', type: 'lab',
      title: 'Fasting Blood Sugar',
      subtitle: 'PHC Paud Lab',
      detail: 'Result: 186 mg/dL (Reference: 70-100) — High. Triggered diabetes diagnosis workup.',
      badge: 'Abnormal', badgeVariant: 'danger',
    },
  ];

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

  const filterButtons: { label: string; value: EventType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Consultations', value: 'consultation' },
    { label: 'Prescriptions', value: 'prescription' },
    { label: 'Lab Reports', value: 'lab' },
    { label: 'Referrals', value: 'referral' },
    { label: 'Vaccinations', value: 'vaccination' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Health Timeline' }]} />

      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-gov-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Longitudinal Health Timeline</h1>
          <p className="text-sm text-slate-500">Your complete medical history in chronological order</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400 mt-2.5 shrink-0" />
        {filterButtons.map(btn => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === btn.value
                ? 'bg-gov-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 z-0" />

        <div className="space-y-0">
          {filtered.map((event, idx) => {
            const isNewDate = idx === 0 || filtered[idx - 1].date !== event.date;
            return (
              <div key={event.id}>
                {isNewDate && (
                  <div className="relative flex items-center gap-3 mb-3 mt-4 first:mt-0">
                    <div className="z-10 w-10 h-6 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2">
                      {event.date}
                    </span>
                  </div>
                )}

                <div className="relative flex items-start gap-4 mb-3 pl-0">
                  {/* Icon dot */}
                  <div className={`z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${TYPE_COLORS[event.type]}`}>
                    {TYPE_ICONS[event.type]}
                  </div>

                  {/* Card */}
                  <Card className="flex-1 p-4 hover:shadow-card transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{event.subtitle}</p>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{event.detail}</p>
                      </div>
                      {event.badge && (
                        <Badge variant={event.badgeVariant ?? 'default'} className="text-xs shrink-0">
                          {event.badge}
                        </Badge>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No events found for this filter</p>
        </div>
      )}
    </div>
  );
};

export default PatientTimeline;

