import React from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { BarChart3, TrendingUp, Users, Pill, Stethoscope, Video, CheckCircle2 } from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const DoctorAnalyticsPage: React.FC = () => {
  const weeklyFootfall = [
    { day: 'Mon', opd: 48, tele: 6 },
    { day: 'Tue', opd: 52, tele: 8 },
    { day: 'Wed', opd: 44, tele: 5 },
    { day: 'Thu', opd: 58, tele: 10 },
    { day: 'Fri', opd: 49, tele: 7 },
    { day: 'Sat', opd: 64, tele: 12 },
    { day: 'Sun', opd: 22, tele: 4 },
  ];

  const morbidityData = [
    { name: 'Essential Hypertension', value: 34, color: '#1d4ed8' },
    { name: 'Type 2 Diabetes Mellitus', value: 28, color: '#0d9488' },
    { name: 'Viral URI / Seasonal Flu', value: 18, color: '#f59e0b' },
    { name: 'Gestational Anemia', value: 12, color: '#e11d48' },
    { name: 'Musculoskeletal Pain', value: 8, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Clinical Analytics & Practice Insights' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-gov-700" />
          Clinical Practice Analytics & Morbidity Trends
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Longitudinal epidemiology, antibiotic stewardship ratios, and teleconsultation efficacy indicators
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Footfall"
          value="1,248 OPD"
          subtitle="+14% vs last month"
          variant="teal"
          icon={<Users className="w-5 h-5 text-gov-700" />}
        />
        <MetricCard
          title="Antibiotic Prescription %"
          value="18.2%"
          subtitle="Target < 25% (WHO Compliant)"
          variant="emerald"
          icon={<Pill className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Teleconsultations"
          value="184 Calls"
          subtitle="Avg Duration: 8.5 Mins"
          variant="blue"
          icon={<Video className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Follow-Up Compliance"
          value="88.4%"
          subtitle="Chronic Care Retention"
          variant="blue"
          icon={<CheckCircle2 className="w-5 h-5 text-purple-600" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Footfall Bar Chart */}
        <ChartCard
          title="Weekly Patient Volume (OPD vs Telemedicine)"
          subtitle="Total patient interactions over the last 7 days"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyFootfall} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="opd" fill="#0f766e" radius={[4, 4, 0, 0]} name="In-Person OPD" />
                <Bar dataKey="tele" fill="#0284c7" radius={[4, 4, 0, 0]} name="Telemedicine" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Morbidity Distribution */}
        <ChartCard
          title="Top Presenting Morbidities (ICD-11 Categories)"
          subtitle="Percentage distribution of primary clinical diagnoses"
        >
          <div className="space-y-3 pt-2">
            {morbidityData.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{item.name}</span>
                  <span className="font-bold">{item.value}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
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
