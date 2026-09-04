import React, { useState } from 'react';
import { BarChart3, TrendingUp, HeartPulse, Baby, ShieldAlert, Download, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { INFRASTRUCTURE_GAP, MAHARASHTRA_STATE_KPIS } from '../../data/mockData';

export const AdminStateAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'Q1' | 'Q2' | 'Q3' | 'Annual'>('Annual');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Statewide Epidemiological Analytics' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">State Public Health Analytics & Epidemiological Trends</h1>
            <p className="text-sm text-ink-soft">Mortality indicators, rural infrastructure coverage, and NCD burden across Maharashtra</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-surface border border-line rounded-lg p-1">
            {(['Q1', 'Q2', 'Q3', 'Annual'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeframe === tf ? 'bg-blue-600 text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-sand-900 text-white text-xs font-bold rounded-lg hover:bg-sand-800">
            <Download className="w-3.5 h-3.5" /> Export NFHS/HMIS Report
          </button>
        </div>
      </div>

      {/* Primary KPI Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <Card className="p-5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft uppercase">Maternal Mortality Ratio (MMR)</span>
            <Baby className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">33 <span className="text-xs font-normal text-ink-soft">per 100k live births</span></p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">↓ 12% vs National Average (97)</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft uppercase">Infant Mortality Rate (IMR)</span>
            <HeartPulse className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">16 <span className="text-xs font-normal text-ink-soft">per 1,000 live births</span></p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">↓ 4.1% YoY reduction</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft uppercase">Rural Health Facilities</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{MAHARASHTRA_STATE_KPIS.totalFacilities.toLocaleString('en-IN')}</p>
          <p className="text-xs text-ink-soft mt-1">Sub-centres, PHCs and CHCs statewide</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft uppercase">ASHA Workforce</span>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{MAHARASHTRA_STATE_KPIS.activeAshas.toLocaleString('en-IN')}</p>
          <p className="text-xs text-ink-soft mt-1">Norm: 1 ASHA per 1,000 rural population</p>
        </Card>
      </div>

      {/* Disease Burden Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger">
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-ink text-sm">Chronic NCD Burden in Rural Cohort (&gt;30 Years)</h2>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-sand-700 mb-1">
                <span>Hypertension (Stage 1 & 2)</span>
                <span>28.4% (3.4M citizens)</span>
              </div>
              <div className="w-full bg-sand-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: '28.4%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-sand-700 mb-1">
                <span>Type 2 Diabetes Mellitus</span>
                <span>17.2% (2.1M citizens)</span>
              </div>
              <div className="w-full bg-sand-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '17.2%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-sand-700 mb-1">
                <span>Oral / Cervical Cancer Screening Positivity</span>
                <span>3.1% (380k suspect lesions)</span>
              </div>
              <div className="w-full bg-sand-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: '3.1%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-sand-700 mb-1">
                <span>COPD / Asthma in Chulha-using Households</span>
                <span>14.8% (1.8M citizens)</span>
              </div>
              <div className="w-full bg-sand-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '14.8%' }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Infrastructure gap against national norms */}
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-ink text-sm">Rural Infrastructure Gap Against Population Norms</h2>
          <p className="text-xs text-ink-soft">
            All-India shortfall as on 31 March 2023, measured against the norm of one sub-centre per
            5,000 people, one PHC per 30,000 and one CHC per 1,20,000 (3,000 / 20,000 / 80,000 in
            tribal and hilly areas).
          </p>

          <div className="space-y-3 text-xs">
            {INFRASTRUCTURE_GAP.map(tier => (
              <div key={tier.tier} className="p-3 bg-sand-50 rounded-xl border border-line">
                <div className="flex justify-between font-bold text-ink">
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

          <p className="text-[11px] text-ink-muted leading-relaxed">
            The specialist tier carries the widest gap, so a third of PHC referrals have no CHC ready
            to receive them &mdash; the case for referral tracking and teleconsultation.
          </p>
        </Card>
      </div>
    </div>
  );
};
