import React from 'react';
import { 
  Building2, Users, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, 
  Bed, ShieldCheck, MapPin, Pill, Syringe, PhoneCall, TrendingUp, Sparkles 
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { 
  MAHARASHTRA_DISTRICT_STATS, 
  MAHARASHTRA_STATE_KPIS, 
  INITIAL_FACILITIES, 
  INITIAL_REFERRALS,
  OUTBREAK_ALERTS 
} from '../../data/mockData';

export const AdminDashboard: React.FC = () => {
  const kpis = MAHARASHTRA_STATE_KPIS;
  const districts = MAHARASHTRA_DISTRICT_STATS;
  const facilities = INITIAL_FACILITIES;
  const outbreaks = OUTBREAK_ALERTS;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'State Overview' }]} />

      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-gov-900 via-gov-800 to-gov-700 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-gov-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">
              Maharashtra State Health Command Center
            </span>
            <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
              Live 36 Districts Sync
            </Badge>
          </div>
          <h1 className="text-2xl font-black mt-2">MahaArogya Integrated Health Mission</h1>
          <p className="text-sm text-gov-200 mt-1">Real-time public healthcare operations, disease surveillance, and rural facility readiness</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/admin/heatmaps"
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 hover:bg-gov-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <MapPin className="w-4 h-4" /> Epidemic Heatmap
          </a>
          <a
            href="/admin/ai-insights"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> AI Outbreak Forecaster
          </a>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Facilities</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.totalFacilities.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" /> 100% On-grid
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active ASHA Workforce</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.activeAshas.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-teal-600 mt-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> 98.4% Sync Rate
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ABHA Digital Records</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.totalPatientsRegistered.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-purple-600 mt-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> +14.2k this week
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tele-Consultations</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.teleConsultationsCompleted.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" /> eSanjeevani Integrated
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
                  <div key={o.id} className="p-3 bg-white rounded-xl border border-rose-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{o.disease} Outbreak Cluster</span>
                      <Badge variant={o.severity === 'high' ? 'danger' : 'warning'} className="text-[10px] uppercase">
                        {o.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">Location: <strong>{o.village}, {o.taluka}, {o.district}</strong></p>
                    <p className="text-xs text-rose-700 font-semibold">{o.casesCount} confirmed / suspect cases • Vector control dispatched</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* District Performance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">District Healthcare Performance Matrix</h2>
              <p className="text-xs text-slate-500">Live bed utilization, ASHA coverage, and referral resolution by district</p>
            </div>
            <a href="/admin/districts" className="text-xs text-gov-600 font-bold hover:underline">
              View All 36 Districts →
            </a>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">District</th>
                  <th className="p-3">Facilities</th>
                  <th className="p-3">ASHA Workers</th>
                  <th className="p-3">Bed Occupancy</th>
                  <th className="p-3">Stock Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {districts.slice(0, 5).map(dist => (
                  <tr key={dist.district} className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900">{dist.district}</td>
                    <td className="p-3 font-semibold text-slate-700">{dist.phcCount + dist.chcCount + dist.subCenterCount}</td>
                    <td className="p-3 text-slate-600">{dist.ashaCount}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${dist.bedOccupancyRate > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${dist.bedOccupancyRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{dist.bedOccupancyRate}%</span>
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
          <h2 className="font-bold text-slate-900 text-base">Administrative Operations</h2>

          <div className="space-y-2.5">
            <a
              href="/admin/facility-management"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs group-hover:text-blue-700">Facility Directory</p>
                  <p className="text-[10px] text-slate-500">Manage 1,840 PHCs, CHCs, DHs</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </a>

            <a
              href="/admin/inventory-management"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs group-hover:text-emerald-700">Central Drug Supply (e-Aushadhi)</p>
                  <p className="text-[10px] text-slate-500">Stock depletion alerts & indenting</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </a>

            <a
              href="/admin/staff-management"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs group-hover:text-purple-700">Medical Workforce Roster</p>
                  <p className="text-[10px] text-slate-500">MOs, Specialists, ANMs & ASHAs</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
            </a>

            <a
              href="/admin/audit-logs"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between group transition-colors block"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs group-hover:text-amber-700">ABDM Compliance & Audit</p>
                  <p className="text-[10px] text-slate-500">FHIR gateway logs & access audits</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};
