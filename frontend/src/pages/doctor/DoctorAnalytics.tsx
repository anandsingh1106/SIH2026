import React, { useEffect, useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { BarChart3, Users, Pill, Video, CheckCircle2 } from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { backendApi, type DoctorAnalytics } from '@arogyasetu/shared/services/api';

const BAR_COLORS = ['#1d4ed8', '#2563eb', '#f59e0b', '#e11d48', '#8b5cf6', '#0d9488'];

export const DoctorAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DoctorAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    backendApi
      .getDoctorAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your practice figures.'));
  }, []);

  const eightWeekTotal = data ? data.weekly.reduce((sum, w) => sum + w.opd + w.tele, 0) : 0;
  const loading = !data && !error;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Clinical Analytics & Practice Insights' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-gov-700" />
          Clinical Practice Analytics
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Your own consultations, prescriptions and follow-ups, counted from the records you have written
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Consultations (8 weeks)"
          value={loading ? '…' : eightWeekTotal}
          subtitle={data ? `${data.consultations} in total` : ' '}
          variant="teal"
          icon={<Users className="w-5 h-5 text-gov-700" />}
        />
        <MetricCard
          title="Antibiotic Prescription %"
          value={loading ? '…' : data ? `${data.antibiotic.rate}%` : '-'}
          subtitle={
            data
              ? `${data.antibiotic.withAntibiotic} of ${data.antibiotic.prescriptions} prescriptions • target below 30%`
              : ' '
          }
          variant={data && data.antibiotic.rate > 30 ? 'amber' : 'emerald'}
          icon={<Pill className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Teleconsultations"
          value={loading ? '…' : data ? data.teleconsultations : '-'}
          subtitle={data ? `${data.referralsMade} referrals made` : ' '}
          variant="blue"
          icon={<Video className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Follow-ups Kept"
          value={loading ? '…' : data ? (data.followUps.due ? `${data.followUps.rate}%` : 'None due') : '-'}
          subtitle={data ? `${data.followUps.kept} of ${data.followUps.due} past follow-up dates` : ' '}
          variant="blue"
          icon={<CheckCircle2 className="w-5 h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger">
        <ChartCard
          title="Weekly Patient Volume (OPD vs Telemedicine)"
          subtitle="Consultations you recorded in each of the last eight weeks"
        >
          <div className="h-64">
            {data && eightWeekTotal === 0 ? (
              <p className="h-full flex items-center justify-center text-xs text-ink-soft">
                No consultations in the last eight weeks.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weekly ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(label) => `Week from ${label}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="opd" stackId="v" fill="#1d4ed8" name="In-person OPD" />
                  <Bar dataKey="tele" stackId="v" fill="#0284c7" radius={[4, 4, 0, 0]} name="Telemedicine" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Top Presenting Diagnoses"
          subtitle="Share of your consultations with a recorded diagnosis"
        >
          <div className="space-y-3 pt-2">
            {loading && <p className="text-xs text-ink-soft">Loading…</p>}
            {data && data.topDiagnoses.length === 0 && (
              <p className="text-xs text-ink-soft">No diagnoses recorded yet.</p>
            )}
            {data?.topDiagnoses.map((item, idx) => (
              <div key={item.diagnosis} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-ink gap-3">
                  <span>{item.diagnosis}</span>
                  <span className="font-bold shrink-0">{item.percent}% ({item.count})</span>
                </div>
                <div className="w-full bg-sand-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percent}%`, backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
