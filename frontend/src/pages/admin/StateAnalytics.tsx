import React, { useEffect, useState } from 'react';
import { BarChart3, HeartPulse, Baby, Download, TrendingUp, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { INFRASTRUCTURE_GAP, MAHARASHTRA_STATE_KPIS } from '../../data/mockData';
import { backendApi, type AdminAnalytics } from '@arogyasetu/shared/services/api';
import { localDateString } from '@arogyasetu/shared/utils';

const RISK_STYLE: Record<string, { label: string; bar: string }> = {
  HIGH: { label: 'High risk', bar: 'bg-rose-500' },
  MODERATE: { label: 'Moderate risk', bar: 'bg-amber-500' },
  LOW: { label: 'Low risk', bar: 'bg-emerald-500' },
};

const TREND_LINES = [
  { key: 'consultations', label: 'Consultations', color: '#1d4ed8' },
  { key: 'referrals', label: 'Referrals', color: '#e11d48' },
  { key: 'screenings', label: 'NCD screenings', color: '#f59e0b' },
  { key: 'vaccinesGiven', label: 'Vaccine doses', color: '#0d9488' },
] as const;

function exportSummary(a: AdminAnalytics) {
  const rows: (string | number)[][] = [
    ['Section', 'Measure', 'Value'],
    ['Patients', 'Registered', a.patients.total],
    ['Referrals', 'Total', a.referrals.total],
    ['Referrals', 'Completed', a.referrals.completed],
    ['Referrals', 'In progress', a.referrals.pending],
    ['Referrals', 'Completion rate %', a.referrals.completionRate],
    ['Referrals', 'Average hours to acceptance', a.referralTurnaroundHours ?? ''],
    ['Maternal', 'Ongoing pregnancies', a.maternal.active],
    ['Maternal', 'High risk', a.maternal.highRisk],
    ['Maternal', 'ANC visits', a.maternal.ancVisits],
    ['Immunization', 'Doses given', a.immunization.given],
    ['Immunization', 'Doses due or overdue', a.immunization.due],
    ['Immunization', 'Coverage %', a.immunization.coverageRate],
    ['NCD', 'Screenings', a.ncd.screenings],
    ['NCD', 'Suspected diabetes', a.ncd.suspectedDiabetes],
    ['NCD', 'Suspected hypertension', a.ncd.suspectedHypertension],
    ['Beds', 'Occupancy %', a.beds.occupancyRate],
    ...a.trends.flatMap((t) =>
      TREND_LINES.map((l) => [`Monthly ${t.key}`, l.label, t[l.key]] as (string | number)[])
    ),
  ];
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `arogyasetu-state-summary-${localDateString()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const AdminStateAnalytics: React.FC = () => {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    backendApi
      .getAdminAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load platform figures.'));
  }, []);

  const riskTotal = data?.ncd.byRisk.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const topDiagnosisMax = data?.topDiagnoses[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'State Public Health Analytics' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">State Public Health Analytics</h1>
            <p className="text-sm text-ink-soft">Published state indicators alongside what is being recorded on the platform</p>
          </div>
        </div>

        <button
          onClick={() => data && exportSummary(data)}
          disabled={!data}
          className="flex items-center gap-1.5 px-3 py-2 bg-sand-900 text-white text-xs font-bold rounded-lg hover:bg-sand-800 disabled:opacity-50 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" /> Export Platform Summary (CSV)
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      {/* Published reference indicators */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Published state indicators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          <Card className="p-5 border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-soft uppercase">Maternal Mortality Ratio</span>
              <Baby className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-ink mt-2">
              {MAHARASHTRA_STATE_KPIS.maternalMortalityRatio} <span className="text-xs font-normal text-ink-soft">per 1,00,000 live births</span>
            </p>
            <p className="text-xs text-ink-soft mt-1">India: 97 • SRS 2018-20</p>
          </Card>

          <Card className="p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-soft uppercase">Infant Mortality Rate</span>
              <HeartPulse className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-ink mt-2">
              {MAHARASHTRA_STATE_KPIS.infantMortalityRate} <span className="text-xs font-normal text-ink-soft">per 1,000 live births</span>
            </p>
            <p className="text-xs text-ink-soft mt-1">India: 28 • SRS 2020</p>
          </Card>

          <Card className="p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-soft uppercase">Rural Health Facilities</span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-ink mt-2">{MAHARASHTRA_STATE_KPIS.totalFacilities.toLocaleString('en-IN')}</p>
            <p className="text-xs text-ink-soft mt-1">Sub-centres, PHCs and CHCs • NHM RHS</p>
          </Card>

          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-soft uppercase">ASHA Workforce</span>
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-ink mt-2">{MAHARASHTRA_STATE_KPIS.activeAshas.toLocaleString('en-IN')}</p>
            <p className="text-xs text-ink-soft mt-1">Norm: 1 per 1,000 rural population • NHSRC</p>
          </Card>
        </div>
      </div>

      {/* Platform figures */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Recorded on ArogyaSetu</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Patients registered', data?.patients.total, data ? `${data.districts.length} districts` : ''],
            ['Referral completion', data ? `${data.referrals.completionRate}%` : undefined,
              data ? `${data.referrals.completed} of ${data.referrals.total}${data.referralTurnaroundHours != null ? ` • accepted in ${data.referralTurnaroundHours} h avg` : ''}` : ''],
            ['High-risk pregnancies', data?.maternal.highRisk, data ? `of ${data.maternal.active} ongoing • ${data.maternal.ancVisits} ANC visits` : ''],
            ['Vaccine coverage', data ? `${data.immunization.coverageRate}%` : undefined,
              data ? `${data.immunization.given} given • ${data.immunization.due} due` : ''],
          ].map(([title, value, sub]) => (
            <Card key={String(title)} className="p-4">
              <span className="text-xs font-bold text-ink-soft uppercase">{title}</span>
              <p className="text-2xl font-bold text-ink mt-1">{value ?? (error ? '-' : '…')}</p>
              <p className="text-[11px] text-ink-soft mt-1">{sub}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="font-bold text-ink text-sm">Monthly activity, last six months</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.trends ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {TREND_LINES.map((l) => (
                <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger">
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-bold text-ink text-sm">NCD screening outcomes (CBAC)</h2>
            <p className="text-xs text-ink-soft">
              {data ? `${data.ncd.screenings} screenings recorded by ASHA workers and PHC staff` : 'Loading…'}
            </p>
          </div>
          <div className="space-y-3 text-xs">
            {(['HIGH', 'MODERATE', 'LOW'] as const).map((risk) => {
              const count = data?.ncd.byRisk.find((r) => r.risk_category === risk)?.count ?? 0;
              const share = riskTotal ? Number(((count / riskTotal) * 100).toFixed(1)) : 0;
              return (
                <div key={risk}>
                  <div className="flex justify-between font-semibold text-sand-700 mb-1">
                    <span>{RISK_STYLE[risk].label}</span>
                    <span>{share}% ({count})</span>
                  </div>
                  <div className="w-full bg-sand-100 h-2 rounded-full overflow-hidden">
                    <div className={`${RISK_STYLE[risk].bar} h-full rounded-full`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
            {data && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-sand-50 rounded-xl border border-line">
                  <p className="text-ink-soft">Suspected diabetes</p>
                  <p className="text-lg font-bold text-ink">{data.ncd.suspectedDiabetes}</p>
                </div>
                <div className="p-3 bg-sand-50 rounded-xl border border-line">
                  <p className="text-ink-soft">Suspected hypertension</p>
                  <p className="text-lg font-bold text-ink">{data.ncd.suspectedHypertension}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-bold text-ink text-sm">Most common diagnoses at consultation</h2>
            <p className="text-xs text-ink-soft">Across every consultation recorded on the platform</p>
          </div>
          <div className="space-y-2 text-xs">
            {data?.topDiagnoses.length === 0 && <p className="text-ink-soft">No diagnoses recorded yet.</p>}
            {data?.topDiagnoses.map((d) => (
              <div key={d.diagnosis}>
                <div className="flex justify-between font-semibold text-sand-700 mb-1 gap-3">
                  <span>{d.diagnosis}</span>
                  <span className="shrink-0">{d.count}</span>
                </div>
                <div className="w-full bg-sand-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${topDiagnosisMax ? (d.count / topDiagnosisMax) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Infrastructure gap against national norms */}
      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-ink text-sm">Rural Infrastructure Gap Against Population Norms</h2>
        <p className="text-xs text-ink-soft">
          All-India shortfall as on 31 March 2023, measured against the norm of one sub-centre per
          5,000 people, one PHC per 30,000 and one CHC per 1,20,000 (3,000 / 20,000 / 80,000 in
          tribal and hilly areas). Source: Health Dynamics of India 2022-23, MoHFW.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {INFRASTRUCTURE_GAP.map(tier => (
            <div key={tier.tier} className="p-3 bg-sand-50 rounded-xl border border-line">
              <div className="flex justify-between font-bold text-ink gap-2">
                <span>{tier.tier}</span>
                <Badge variant={tier.shortfallPercent >= 30 ? 'danger' : 'warning'}>
                  {tier.shortfallPercent}% shortfall
                </Badge>
              </div>
              <p className="text-ink-muted mt-1">
                {tier.functioning.toLocaleString('en-IN')} functioning nationally &middot; one per {tier.norm}
              </p>
              <div className="w-full bg-sand-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${tier.shortfallPercent >= 30 ? 'bg-rose-500' : 'bg-amber-500'}`}
                  style={{ width: `${tier.shortfallPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
