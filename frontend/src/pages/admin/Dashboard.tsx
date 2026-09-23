import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, AlertTriangle, Activity, ArrowUpRight,
  ShieldCheck, MapPin, Pill, PhoneCall, TrendingUp, Sparkles, CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { PageHeader } from '../../components/layout/PageHeader';
import { MAHARASHTRA_STATE_KPIS } from '../../data/mockData';
import { formatCrore } from '../../utils/formatIndianNumber';
import {
  backendApi,
  type AdminAnalytics,
  type DistrictAnalyticsRecord,
  type HealthSignal,
} from '@arogyasetu/shared/services/api';

const SEVERITY_BADGE: Record<HealthSignal['severity'], 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  high: 'warning',
  moderate: 'info',
};

export const AdminDashboard: React.FC = () => {
  const kpis = MAHARASHTRA_STATE_KPIS;
  const [summary, setSummary] = useState<AdminAnalytics | null>(null);
  const [districts, setDistricts] = useState<DistrictAnalyticsRecord[] | null>(null);
  const [signals, setSignals] = useState<HealthSignal[] | null>(null);

  useEffect(() => {
    // Each panel loads on its own, so one slow query does not blank the page.
    backendApi.getAdminAnalytics().then(setSummary).catch(() => setSummary(null));
    backendApi.getDistrictAnalytics().then(setDistricts).catch(() => setDistricts([]));
    backendApi.getHealthSignals().then((d) => setSignals(d.signals)).catch(() => setSignals([]));
  }, []);

  const urgent = (signals ?? []).filter((s) => s.severity !== 'moderate');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'State Overview' }]} />

      <PageHeader
        eyebrow={
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live platform data • Maharashtra
          </>
        }
        title="Health Network"
        subtitle="Operations, clinical risk and facility readiness"
        actions={
          <>
            <Link
              to="/admin/heatmaps"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-xl transition-colors shadow-subtle"
            >
              <MapPin className="w-4 h-4" /> Risk Heatmaps
            </Link>
            <Link
              to="/admin/ai-insights"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-line-strong text-ink-muted hover:bg-raised text-xs font-bold rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Health Signals
            </Link>
          </>
        }
      />

      {/* Platform activity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Patients registered', value: summary?.patients.total, note: summary ? `${summary.districts.length} districts` : '', icon: <Users className="w-4 h-4" />, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Referrals in progress', value: summary?.referrals.pending, note: summary ? `${summary.referrals.completionRate}% of ${summary.referrals.total} completed` : '', icon: <Activity className="w-4 h-4" />, tone: 'bg-purple-50 text-purple-600' },
          { label: 'Beds free now', value: summary ? `${summary.beds.available} / ${summary.beds.total}` : undefined, note: summary ? `${summary.beds.occupancyRate}% occupied` : '', icon: <Building2 className="w-4 h-4" />, tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'High-risk pregnancies', value: summary?.maternal.highRisk, note: summary ? `of ${summary.maternal.active} being followed` : '', icon: <AlertTriangle className="w-4 h-4" />, tone: 'bg-rose-50 text-rose-600' },
        ].map((card) => (
          <Card key={card.label} className="p-4 bg-surface border-line">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-soft">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.tone}`}>{card.icon}</div>
            </div>
            <p className="text-2xl font-bold text-ink mt-2">{card.value ?? '…'}</p>
            <p className="text-xs text-ink-soft mt-1 font-semibold">{card.note}</p>
          </Card>
        ))}
      </div>

      {/* Signals needing attention */}
      {signals && (
        urgent.length > 0 ? (
          <Card className="p-4 bg-rose-50 border-rose-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-900 text-sm">Needs attention</span>
                    <Badge variant="danger" className="text-[10px]">{urgent.length}</Badge>
                  </div>
                  <Link to="/admin/ai-insights" className="text-xs font-bold text-rose-800 hover:underline">
                    All health signals →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {urgent.slice(0, 3).map(s => (
                    <Link key={s.id} to={s.link} className="p-3 bg-surface rounded-xl border border-rose-100 space-y-1 hover:border-rose-300 transition-colors block">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-ink-soft">{s.category}</span>
                        <Badge variant={SEVERITY_BADGE[s.severity]} className="text-[10px] uppercase">{s.severity}</Badge>
                      </div>
                      <p className="font-bold text-ink text-xs">{s.title}</p>
                      <p className="text-[11px] text-ink-muted truncate">{s.location}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-emerald-50 border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            No critical or high signals in the current records.
          </Card>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink text-base">District Performance Matrix</h2>
              <p className="text-xs text-ink-soft">Facilities, workforce, bed use and stock by district</p>
            </div>
            <Link to="/admin/district-analytics" className="text-xs text-gov-600 font-bold hover:underline shrink-0">
              District analytics →
            </Link>
          </div>

          <div className="border border-line rounded-xl overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-sand-50 text-ink-muted font-bold border-b border-line">
                <tr>
                  <th className="p-3">District</th>
                  <th className="p-3">Patients</th>
                  <th className="p-3">Facilities</th>
                  <th className="p-3">ASHA / Doctors</th>
                  <th className="p-3">Bed Occupancy</th>
                  <th className="p-3">Stock Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {districts === null ? (
                  <tr><td colSpan={6} className="p-6 text-center text-ink-soft">Loading districts…</td></tr>
                ) : districts.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-ink-soft">No district data yet.</td></tr>
                ) : (
                  districts.slice(0, 5).map(dist => (
                    <tr key={dist.district} className="hover:bg-sand-50/60">
                      <td className="p-3 font-bold text-ink">{dist.district}</td>
                      <td className="p-3 text-ink-muted">{dist.patients}</td>
                      <td className="p-3 font-semibold text-sand-700">{dist.facilities.total}</td>
                      <td className="p-3 text-ink-muted">{dist.ashaWorkers} / {dist.doctors}</td>
                      <td className="p-3">
                        {dist.beds.total === 0 ? (
                          <span className="text-ink-soft">No beds listed</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-sand-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${dist.beds.occupancyRate > 85 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${dist.beds.occupancyRate}%` }}
                              />
                            </div>
                            <span className="font-bold text-sand-700">{dist.beds.occupancyRate}%</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {dist.stock.availabilityRate == null ? (
                          <span className="text-ink-soft">No stock recorded</span>
                        ) : (
                          <Badge variant={dist.stock.availabilityRate >= 90 ? 'success' : 'warning'} className="text-[10px]">
                            {dist.stock.availabilityRate}% above reorder
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-ink text-base">Administrative Operations</h2>

          <div className="space-y-2.5">
            {[
              { to: '/admin/facilities', title: 'Facility Directory', note: summary ? `${summary.facilities.total} active facilities` : 'Register and edit facilities', icon: <Building2 className="w-4 h-4" />, tone: 'bg-blue-100 text-blue-700', hover: 'group-hover:text-blue-700' },
              { to: '/admin/inventory', title: 'Drug Supply (e-Aushadhi)', note: summary ? `${summary.inventory.lowStock} of ${summary.inventory.items} stock lines low` : 'Stock levels and restocking', icon: <Pill className="w-4 h-4" />, tone: 'bg-emerald-100 text-emerald-700', hover: 'group-hover:text-emerald-700' },
              { to: '/admin/staff', title: 'Medical Workforce Roster', note: 'Doctors, specialists and ASHAs', icon: <Users className="w-4 h-4" />, tone: 'bg-purple-100 text-purple-700', hover: 'group-hover:text-purple-700' },
              { to: '/admin/audit-logs', title: 'Compliance & Audit', note: 'Record access and export logs', icon: <ShieldCheck className="w-4 h-4" />, tone: 'bg-amber-100 text-amber-700', hover: 'group-hover:text-amber-700' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="p-3 bg-sand-50 hover:bg-sand-100 rounded-xl border border-line flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${item.tone}`}>{item.icon}</div>
                  <div>
                    <p className={`font-bold text-ink text-xs ${item.hover}`}>{item.title}</p>
                    <p className="text-[10px] text-ink-soft">{item.note}</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-ink-soft" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Published statewide reference figures, kept apart from the platform's
          own counts above so the two are not read as one. */}
      <div className="space-y-2">
        <p className="text-[11px] text-ink-soft">
          Statewide reference figures published by NHM, NHSRC, ABDM and eSanjeevani. Context for the network,
          not activity recorded by this platform.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Health facilities', value: kpis.totalFacilities.toLocaleString('en-IN'), note: 'Sub-centres, PHCs & CHCs', icon: <Building2 className="w-4 h-4" /> },
            { label: 'ASHA workers', value: kpis.activeAshas.toLocaleString('en-IN'), note: 'Norm: 1 per 1,000 population', icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'ABHA accounts', value: formatCrore(kpis.abhaAccounts), note: 'ABDM dashboard, statewide', icon: <TrendingUp className="w-4 h-4" /> },
            { label: 'Tele-consultations', value: formatCrore(kpis.teleConsultationsCompleted), note: 'eSanjeevani, cumulative to Dec 2024', icon: <PhoneCall className="w-4 h-4" /> },
          ].map((card) => (
            <Card key={card.label} className="p-4 bg-raised border-line">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">{card.label}</span>
                <div className="w-8 h-8 rounded-lg bg-sand-100 text-ink-muted flex items-center justify-center">{card.icon}</div>
              </div>
              <p className="text-xl font-bold text-ink mt-2">{card.value}</p>
              <p className="text-xs text-ink-soft mt-1">{card.note}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
