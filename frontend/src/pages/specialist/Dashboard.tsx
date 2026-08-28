import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Referral, Bed } from '../../types';
import {
  Building2,
  BedDouble,
  ArrowRightLeft,
  AlertTriangle,
  FileCheck2,
  Users,
  Video,
  Sparkles,
  ArrowRight,
  Clock,
  HeartPulse,
} from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { TriageBadge } from '../../components/healthcare/TriageBadge';

export const SpecialistDashboard: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);

  useEffect(() => {
    Promise.all([dataService.getReferrals(), dataService.getBeds()]).then(([rList, bList]) => {
      setReferrals(rList);
      setBeds(bList);
    });
  }, []);

  const pendingInward = referrals.filter((r) => r.status === 'created' || r.status === 'accepted' || r.status === 'in_transit');
  const criticalCases = referrals.filter((r) => r.priority === 'critical');
  const availableBeds = beds.filter((b) => b.status === 'available');

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Specialist Workspace', href: '/specialist/dashboard' },
          { label: 'Tertiary Care Command Center' },
        ]}
      />

      {/* Specialist Header */}
      <div className="bg-gradient-to-r from-gov-800 to-indigo-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-bold text-gov-100 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Sassoon General Hospital & B.J. GMC Pune
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Namaskar, Dr. Priya Kulkarni (MD, DM Cardiology)
          </h1>
          <p className="text-xs text-gov-200 mt-1">
            Department of Cardiology & Critical Care • Tertiary Referral Command Nodal Officer
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/specialist/referrals">
            <Button
              variant="primary"
              size="sm"
              className="bg-surface text-gov-900 hover:bg-gov-50 font-bold"
              leftIcon={<ArrowRightLeft className="w-4 h-4 text-gov-700" />}
            >
              Inward Referral Triage
            </Button>
          </Link>
          <Link to="/specialist/beds">
            <Button
              variant="secondary"
              size="sm"
              className="bg-gov-900/60 text-white border-gov-600 hover:bg-gov-900"
              leftIcon={<BedDouble className="w-4 h-4 text-gov-300" />}
            >
              Live Bed Census
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Case Notification Banner */}
      {criticalCases.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl shadow-2xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold text-red-900">Critical 108 Transfer Approaching:</span>{' '}
              <span className="text-red-800">
                {criticalCases[0].patientName} ({criticalCases[0].provisionalDiagnosis}) — ETA: 12 Mins. ICU Bed Reserved.
              </span>
            </div>
          </div>
          <Link to="/specialist/referrals">
            <Button size="sm" variant="danger" className="text-xs">
              View Handover Notes →
            </Button>
          </Link>
        </div>
      )}

      {/* Specialist KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Inward Referral Stream"
          value={pendingInward.length}
          subtitle="From PHC Paud & Baramati"
          variant="teal"
          icon={<ArrowRightLeft className="w-5 h-5 text-gov-700" />}
        />
        <MetricCard
          title="ICU / HDU Beds Free"
          value={`${availableBeds.length} / ${beds.length} Beds`}
          subtitle="Ventilator ICU: 1 Available"
          variant="blue"
          icon={<BedDouble className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Critical Transfers (108)"
          value={criticalCases.length}
          subtitle="Immediate Trauma / Cath Lab"
          variant="red"
          icon={<HeartPulse className="w-5 h-5 text-red-600" />}
        />
        <MetricCard
          title="MJPJAY Cashless Claims"
          value="100% Free"
          subtitle="Zero Out-of-Pocket"
          variant="emerald"
          icon={<FileCheck2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Main Grid: Referral Triage & Department Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inward Referrals Queue (Left 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-gov-700" />
                Active Inward Transfers from District Network
              </h3>
              <Link to="/specialist/referrals" className="text-xs font-bold text-gov-700 hover:underline">
                Open Referral Center →
              </Link>
            </div>

            <div className="space-y-3">
              {pendingInward.map((ref) => (
                <div
                  key={ref.id}
                  className="p-4 bg-sand-50 border border-line rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-sand-100/80 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-gov-800 bg-surface px-2 py-0.5 rounded border border-line text-[11px]">
                        {ref.referralCode}
                      </span>
                      <TriageBadge priority={ref.priority} size="sm" />
                      <span className="font-bold text-ink text-sm">{ref.patientName}</span>
                      <span className="text-ink-soft font-medium">({ref.patientAge}y/{ref.patientGender})</span>
                    </div>

                    <p className="text-ink-muted font-medium">{ref.provisionalDiagnosis}</p>

                    <div className="text-[11px] text-ink-soft flex items-center gap-2 pt-0.5">
                      <span>🏥 From: {ref.referringFacilityName}</span>
                      <span>•</span>
                      <span>👨‍⚕️ Ref Doctor: {ref.referringDoctorName}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">AI Priority: {ref.aiPriorityScore}/100</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to="/specialist/referrals">
                      <Button size="sm" variant="primary">
                        Review & Allocate Bed
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Bed Census Snapshot & Modules */}
        <div className="lg:col-span-4 space-y-6">
          {/* Bed Census Widget */}
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-gov-700" />
                Department Bed Roster
              </h4>
              <Link to="/specialist/beds" className="text-xs text-gov-700 font-bold hover:underline">
                All Beds ({beds.length})
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-800 block uppercase">Available</span>
                <span className="text-xl font-extrabold text-emerald-700">{availableBeds.length}</span>
              </div>
              <div className="bg-sand-50 border border-line p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-ink-muted block uppercase">Occupied</span>
                <span className="text-xl font-extrabold text-ink">{beds.length - availableBeds.length}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-[11px] text-ink-muted">
                <span>ICU Ventilator Bed 02</span>
                <span className="text-emerald-700 font-bold">READY (Available)</span>
              </div>
              <div className="flex justify-between text-[11px] text-ink-muted">
                <span>Maternal ICU Bed 04</span>
                <span className="text-amber-700 font-bold">RESERVED (In Transit)</span>
              </div>
              <div className="flex justify-between text-[11px] text-ink-muted">
                <span>Cath Lab Post-Op Bed 01</span>
                <span className="text-red-700 font-bold">OCCUPIED</span>
              </div>
            </div>
          </div>

          {/* Quick Tertiary Links */}
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-2 text-xs font-semibold">
            <h4 className="font-bold text-ink text-xs uppercase tracking-wider mb-2">
              Tertiary Care Stations
            </h4>
            <Link to="/specialist/treatment-plans" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
              <span>Multi-Week Treatment Pathways</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
            </Link>
            <Link to="/specialist/follow-ups" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
              <span>Grassroots Follow-Up Coordinator</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
            </Link>
            <Link to="/specialist/discharge" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
              <span>MJPJAY Discharge Summaries</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
