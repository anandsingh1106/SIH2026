import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Referral, Bed } from '@arogyasetu/shared/types';
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
import { PageHeader, SectionTitle } from '../../components/layout/PageHeader';
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
      <PageHeader
        eyebrow={
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sassoon General Hospital & B.J. GMC Pune
          </>
        }
        title="Namaskar, Dr. Priya Kulkarni"
        subtitle="Cardiology & Critical Care • Tertiary referral nodal officer"
        actions={
          <>
            <Link to="/specialist/referrals">
              <Button variant="primary" size="sm" leftIcon={<ArrowRightLeft className="w-4 h-4" />}>
                Referral Triage
              </Button>
            </Link>
            <Link to="/specialist/beds">
              <Button variant="secondary" size="sm" leftIcon={<BedDouble className="w-4 h-4" />}>
                Live Bed Census
              </Button>
            </Link>
          </>
        }
      />

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
              <SectionTitle icon={<ArrowRightLeft className="w-4 h-4 text-gov-700" />}>
                Recent referrals
              </SectionTitle>
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
              <SectionTitle icon={<BedDouble className="w-4 h-4 text-gov-700" />} className="text-sm">
                Bed roster
              </SectionTitle>
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

        </div>
      </div>
    </div>
  );
};
