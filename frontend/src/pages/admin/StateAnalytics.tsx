import React, { useState } from 'react';
import { BarChart3, TrendingUp, HeartPulse, Baby, ShieldAlert, Download, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { MAHARASHTRA_STATE_KPIS } from '../../data/mockData';

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
            <p className="text-sm text-ink-soft">Maternal Mortality, NCD screening penetrance, and tribal healthcare metrics across Maharashtra</p>
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
            <span className="text-xs font-bold text-ink-soft uppercase">Universal Full Immunization</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">94.8%</p>
          <p className="text-xs text-ink-soft mt-1">U-WIN verified across 36 districts</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft uppercase">NCD Screening Penetrance</span>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-ink mt-2">82.4%</p>
          <p className="text-xs text-ink-soft mt-1">Population &gt;30 yrs screened</p>
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

        {/* Tribal & Remote Talukas Index */}
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-ink text-sm">Tribal & Remote Talukas Intensive Health Track</h2>
          <p className="text-xs text-ink-soft">Targeted nutrition, sickle cell anemia, and maternal delivery coverage in Melghat, Gadchiroli, Nandurbar</p>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-sand-50 rounded-xl border border-line">
              <div className="flex justify-between font-bold text-ink">
                <span>Sickle Cell Anemia Mission (Nandurbar & Gadchiroli)</span>
                <Badge variant="success">96% Screened</Badge>
              </div>
              <p className="text-ink-muted mt-1">42,000 tribal youth mapped; genetic counseling cards distributed.</p>
            </div>

            <div className="p-3 bg-sand-50 rounded-xl border border-line">
              <div className="flex justify-between font-bold text-ink">
                <span>100% Institutional Deliveries via Birth Waiting Homes</span>
                <Badge variant="success">99.1%</Badge>
              </div>
              <p className="text-ink-muted mt-1">Zero home deliveries recorded in high-risk talukas during Q3.</p>
            </div>

            <div className="p-3 bg-sand-50 rounded-xl border border-line">
              <div className="flex justify-between font-bold text-ink">
                <span>Severe Acute Malnutrition (SAM) Treatment Units</span>
                <Badge variant="warning">88% Recovery</Badge>
              </div>
              <p className="text-ink-muted mt-1">1,240 children rehabilitated via Nutrition Rehabilitation Centers (NRC).</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
