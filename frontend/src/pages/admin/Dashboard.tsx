import React from 'react';
import { 
  Building2, Users, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, 
  Bed, ShieldCheck, MapPin, Pill, Syringe, PhoneCall, TrendingUp, Sparkles 
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { PageHeader, SectionTitle } from '../../components/layout/PageHeader';
import { 
  MAHARASHTRA_DISTRICT_STATS, 
  MAHARASHTRA_STATE_KPIS, 
  INITIAL_FACILITIES, 
  INITIAL_REFERRALS,
  OUTBREAK_ALERTS
} from '../../data/mockData';
import { formatCrore } from '../../utils/formatIndianNumber';

export const AdminDashboard: React.FC = () => {
  const kpis = MAHARASHTRA_STATE_KPIS;
  const districts = MAHARASHTRA_DISTRICT_STATS;
  const facilities = INITIAL_FACILITIES;
  const outbreaks = OUTBREAK_ALERTS;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'State Overview' }]} />

      {/* Top Banner */}
      <PageHeader
        eyebrow={
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live across 36 districts
          </>
        }
        title="Health Network"
        subtitle="Real-time operations, disease surveillance and facility readiness"
        actions={
          <>
            <a
              href="/admin/heatmaps"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-xl transition-colors shadow-subtle"
            >
              <MapPin className="w-4 h-4" /> Epidemic Heatmap
            </a>
            <a
              href="/admin/ai-insights"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-line-strong text-ink-muted hover:bg-raised text-xs font-bold rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" /> AI Outbreak Forecaster
            </a>
          </>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Health facilities</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{kpis.totalFacilities.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-ink-soft mt-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" /> Sub-centres, PHCs &amp; CHCs
          </div>
        </Card>

        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Health workers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{kpis.activeAshas.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-ink-soft mt-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Norm: 1 per 1,000 population
          </div>
        </Card>

        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Citizens registered</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{formatCrore(kpis.abhaAccounts)}</p>
          <div className="flex items-center gap-1 text-xs text-ink-soft mt-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> ABDM dashboard, statewide
          </div>
        </Card>

        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Tele-consultations</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{formatCrore(kpis.teleConsultationsCompleted)}</p>
          <div className="flex items-center gap-1 text-xs text-ink-soft mt-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" /> eSanjeevani, cumulative to Dec 2024
          </div>
        </Card>
      </div>

      {/* Outbreak Alert Banner */}
      {outbreaks.length > 0 && (
        <Card className="p-4 bg-rose-50 border-rose-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-rose-900 text-sm">State Epidemiological Surveillance Alerts</span>
                <Badge variant="danger" className="text-[10px]">{outbreaks.length} Active Hotspots</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {outbreaks.map(o => (
                  <div key={o.id} className="p-3 bg-surface rounded-xl border border-rose-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink text-xs">{o.disease} Outbreak Cluster</span>
                      <Badge variant={o.severity === 'high' ? 'danger' : 'warning'} className="text-[10px] uppercase">
                        {o.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted">Location: <strong>{o.village}, {o.taluka}, {o.district}</strong></p>
                    <p className="text-xs text-rose-700 font-semibold">{o.casesCount} confirmed / suspect cases • Vector control dispatched</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* District Performance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-ink text-base">District Healthcare Performance Matrix</h2>
              <p className="text-xs text-ink-soft">Live bed utilization, ASHA coverage, and referral resolution by district</p>
            </div>
            <a href="/admin/districts" className="text-xs text-gov-600 font-bold hover:underline">
              View All 36 Districts →
            </a>
          </div>

          <div className="border border-line rounded-xl overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-sand-50 text-ink-muted font-bold border-b border-line">
                <tr>
                  <th className="p-3">District</th>
                  <th className="p-3">Facilities</th>
                  <th className="p-3">ASHA Workers</th>
                  <th className="p-3">Bed Occupancy</th>
                  <th className="p-3">Stock Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {districts.slice(0, 5).map(dist => (
                  <tr key={dist.district} className="hover:bg-sand-50/60">
                    <td className="p-3 font-bold text-ink">{dist.district}</td>
                    <td className="p-3 font-semibold text-sand-700">{dist.phcCount + dist.chcCount + dist.subCenterCount}</td>
                    <td className="p-3 text-ink-muted">{dist.ashaCount}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-sand-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${dist.bedOccupancyRate > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${dist.bedOccupancyRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-sand-700">{dist.bedOccupancyRate}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={dist.medicineAvailabilityRate > 90 ? 'success' : 'warning'} className="text-[10px]">
                        {dist.medicineAvailabilityRate}% Essential Rx
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Operational Shortcuts */}
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-ink text-base">Administrative Operations</h2>

          <div className="space-y-2.5">
            <a
              href="/admin/facility-management"
              className="p-3 bg-sand-50 hover:bg-sand-100 rounded-xl border border-line flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-ink text-xs group-hover:text-blue-700">Facility Directory</p>
                  <p className="text-[10px] text-ink-soft">Manage 1,840 PHCs, CHCs, DHs</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-ink-soft group-hover:text-blue-600" />
            </a>

            <a
              href="/admin/inventory-management"
              className="p-3 bg-sand-50 hover:bg-sand-100 rounded-xl border border-line flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-ink text-xs group-hover:text-emerald-700">Central Drug Supply (e-Aushadhi)</p>
                  <p className="text-[10px] text-ink-soft">Stock depletion alerts & indenting</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-ink-soft group-hover:text-emerald-600" />
            </a>

            <a
              href="/admin/staff-management"
              className="p-3 bg-sand-50 hover:bg-sand-100 rounded-xl border border-line flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-ink text-xs group-hover:text-purple-700">Medical Workforce Roster</p>
                  <p className="text-[10px] text-ink-soft">MOs, Specialists, ANMs & ASHAs</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-ink-soft group-hover:text-purple-600" />
            </a>

            <a
              href="/admin/audit-logs"
              className="p-3 bg-sand-50 hover:bg-sand-100 rounded-xl border border-line flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-ink text-xs group-hover:text-amber-700">ABDM Compliance & Audit</p>
                  <p className="text-[10px] text-ink-soft">FHIR gateway logs & access audits</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-ink-soft group-hover:text-amber-600" />
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};
