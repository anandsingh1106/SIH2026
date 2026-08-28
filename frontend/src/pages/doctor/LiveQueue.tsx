import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Stethoscope, AlertTriangle, CheckCircle2, Phone, Volume2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TriageBadge } from '../../components/healthcare/TriageBadge';

export const DoctorLiveQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [calledToken, setCalledToken] = useState<number | null>(14);

  const queueItems = [
    { token: 14, name: 'Kavita Sachin Gaikwad', age: 24, gender: 'Female', reason: 'Severe Gestational Anemia (Hb 7.8 g/dL)', priority: 'critical' as const, wait: '2 mins', status: 'In Consultation', abha: '91-8765-4321-9876' },
    { token: 15, name: 'Ramesh Tukaram Patil', age: 48, gender: 'Male', reason: 'Hypertension & T2DM Regular Follow-up', priority: 'moderate' as const, wait: '8 mins', status: 'Waiting', abha: '91-4521-8890-1200' },
    { token: 16, name: 'Eknath Mahadev Shinde', age: 62, gender: 'Male', reason: 'Recurrent Angina / Chest Pain on Exertion', priority: 'high' as const, wait: '12 mins', status: 'Waiting', abha: '91-1122-3344-5566' },
    { token: 17, name: 'Vandana Suresh Jadhav', age: 45, gender: 'Female', reason: 'CBAC NCD Screening High Score Referral', priority: 'moderate' as const, wait: '18 mins', status: 'Waiting', abha: '91-9988-7766-5544' },
    { token: 18, name: 'Sunil Dnyaneshwar More', age: 34, gender: 'Male', reason: 'Acute Viral Fever & Myalgia (Monsoon Check)', priority: 'low' as const, wait: '24 mins', status: 'Waiting', abha: '91-3344-5566-7788' },
  ];

  const handleCallPatient = (token: number, name: string) => {
    setCalledToken(token);
    // Announce token voice in OPD room
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(`Token Number ${token}. ${name}. Please enter OPD Consultation Room.`);
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Live OPD Queue & Token Desk' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink flex items-center gap-2">
            <Users className="w-6 h-6 text-gov-700" />
            Live OPD Patient Queue Management
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Real-time digital token dispatch with automated voice call-out and triage tier sorting
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gov-800 bg-gov-50 border border-gov-200 px-3 py-1.5 rounded-xl">
          <Clock className="w-4 h-4 text-gov-700" />
          <span>Average Consultation Turnaround: 9.4 Mins</span>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-surface rounded-2xl border border-line divide-y divide-line shadow-soft overflow-hidden">
        {queueItems.map((item) => {
          const isCurrent = calledToken === item.token;
          return (
            <div
              key={item.token}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isCurrent ? 'bg-gov-50/50 border-l-4 border-l-gov-700 shadow-glow' : 'hover:bg-sand-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl font-display font-extrabold text-base flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-gradient-to-br from-gov-600 to-gov-700 text-white ring-4 ring-gov-100 shadow-soft'
                      : 'bg-sand-100 text-sand-700'
                  }`}
                >
                  #{item.token}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink text-base">{item.name}</span>
                    <span className="text-xs text-ink-soft font-medium">({item.age} Yrs / {item.gender})</span>
                    <TriageBadge priority={item.priority} size="sm" />
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-gov-700 text-white rounded-full animate-pulse">
                        CURRENTLY IN ROOM
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-sand-700 font-medium">
                    Reason for Visit: <span className="font-semibold text-ink">{item.reason}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-ink-soft pt-0.5">
                    <span className="font-mono text-gov-800 font-semibold">ABHA: {item.abha}</span>
                    <span>•</span>
                    <span>Waiting Time: {item.wait}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Volume2 className="w-3.5 h-3.5" />}
                  onClick={() => handleCallPatient(item.token, item.name)}
                >
                  Call Token
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                  onClick={() => navigate('/doctor/consultation')}
                >
                  Open Consultation
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
