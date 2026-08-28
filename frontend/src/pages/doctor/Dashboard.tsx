import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Patient, Referral, Prescription, Medicine } from '../../types';
import {
  Stethoscope,
  Users,
  AlertTriangle,
  Pill,
  Video,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  Activity,
} from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { TriageBadge } from '../../components/healthcare/TriageBadge';

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  useEffect(() => {
    Promise.all([
      dataService.getPatients(),
      dataService.getReferrals(),
      dataService.getMedicines(),
    ]).then(([pList, rList, mList]) => {
      setPatients(pList);
      setReferrals(rList);
      setMedicines(mList);
    });
  }, []);

  const liveQueue = [
    { token: 14, patientName: 'Kavita Sachin Gaikwad', age: 24, gender: 'Female', reason: 'Severe Gestational Anemia (Hb 7.8)', priority: 'critical' as const, waitMin: '2 mins', status: 'In Transit (108)' },
    { token: 15, patientName: 'Ramesh Tukaram Patil', age: 48, gender: 'Male', reason: 'T2DM & Hypertension Follow-up', priority: 'moderate' as const, waitMin: '8 mins', status: 'Waiting' },
    { token: 16, patientName: 'Eknath Mahadev Shinde', age: 62, gender: 'Male', reason: 'Recurrent Angina / Chest Pain', priority: 'high' as const, waitMin: '12 mins', status: 'Waiting' },
    { token: 17, patientName: 'Vandana Suresh Jadhav', age: 45, gender: 'Female', reason: 'CBAC NCD Screening Referral', priority: 'moderate' as const, waitMin: '18 mins', status: 'Waiting' },
  ];

  const lowStockMeds = medicines.filter((m) => m.stock < m.minThreshold);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Primary Care Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Clinical OPD Station' },
        ]}
      />

      {/* Doctor Clinic Header */}
      <div className="bg-gradient-to-r from-gov-800 to-sand-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-bold text-gov-100 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> PHC Paud OPD Clinic • Mulshi Block
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Namaskar, Dr. Rajesh Deshmukh (MBBS, DCH)
          </h1>
          <p className="text-xs text-gov-200 mt-1">
            Primary Medical Officer • Reg No: MMC-2012-08-4521 • Active Shift: Morning OPD
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/doctor/consultation">
            <Button
              variant="primary"
              size="sm"
              className="bg-surface text-gov-900 hover:bg-gov-50 font-bold"
              leftIcon={<Stethoscope className="w-4 h-4 text-gov-700" />}
            >
              Start Next Consultation
            </Button>
          </Link>
          <Link to="/doctor/telemedicine">
            <Button
              variant="secondary"
              size="sm"
              className="bg-gov-900/60 text-white border-gov-600 hover:bg-gov-900"
              leftIcon={<Video className="w-4 h-4 text-sky-300" />}
            >
              Virtual Clinic Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alert Bar */}
      {lowStockMeds.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-2xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-900">Pharmacy Low Stock Alert:</span>{' '}
              <span className="text-amber-800">
                {lowStockMeds.map((m) => `${m.name} (${m.stock} remaining)`).join(', ')}.
              </span>
            </div>
          </div>
          <Link to="/doctor/inventory">
            <Button size="sm" variant="amber" className="text-xs">
              Review Stock Indent →
            </Button>
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's OPD Footfall"
          value="42 Patients"
          subtitle="14 Waiting in Queue"
          variant="teal"
          icon={<Users className="w-5 h-5 text-gov-700" />}
        />
        <MetricCard
          title="Critical / High Triage"
          value="3 Cases"
          subtitle="Immediate attention"
          variant="red"
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        />
        <MetricCard
          title="Tele-Referrals Issued"
          value="4 Active"
          subtitle="Sassoon & Aundh DH"
          variant="blue"
          icon={<ArrowRight className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="E-Prescriptions Written"
          value="38 Today"
          subtitle="100% Formulary checked"
          variant="emerald"
          icon={<Pill className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Main Clinical Station Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live OPD Queue (Left 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-gov-700" />
                Live OPD Waiting Room & Token Queue
              </h3>
              <Link to="/doctor/queue" className="text-xs font-bold text-gov-700 hover:underline">
                Manage Queue →
              </Link>
            </div>

            <div className="space-y-3">
              {liveQueue.map((item) => (
                <div
                  key={item.token}
                  className="p-4 bg-sand-50 border border-line rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-sand-100/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gov-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      #{item.token}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm">{item.patientName}</span>
                        <span className="text-ink-soft font-medium">({item.age} Yrs / {item.gender})</span>
                        <TriageBadge priority={item.priority} size="sm" />
                      </div>
                      <p className="text-ink-muted font-medium">Reason: {item.reason}</p>
                      <div className="text-[11px] text-ink-soft">
                        Waiting: {item.waitMin} • Status: <span className="font-semibold text-gov-800">{item.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to="/doctor/consultation">
                      <Button size="sm" variant="primary">
                        Call into OPD
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: AI Insights & Quick Clinical Links */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Clinical Diagnostic Insights */}
          <div className="bg-gradient-to-br from-gov-50 to-emerald-50/50 border border-gov-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gov-700" />
              <h4 className="font-bold text-gov-900 text-xs uppercase tracking-wider">
                Clinical AI Diagnostic Assistant
              </h4>
            </div>
            <p className="text-xs text-sand-700 leading-relaxed">
              "Patient <strong>Kavita Gaikwad (24y)</strong> presents with severe gestational anemia (Hb 7.8) and BP 138/88 at 28 weeks. Immediate tertiary parenteral iron therapy and Level-3 fetal surveillance indicated under PMSMA protocol."
            </p>
            <Link to="/doctor/ai-triage">
              <Button size="sm" variant="outline" className="w-full text-xs">
                Launch Full AI Triage Analyzer →
              </Button>
            </Link>
          </div>

          {/* Quick Doctor Modules */}
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-ink text-xs uppercase tracking-wider">
              Clinical Stations
            </h4>
            <div className="space-y-2 text-xs font-semibold">
              <Link to="/doctor/patients" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
                <span>Longitudinal EHR Records</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
              </Link>
              <Link to="/doctor/prescriptions" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
                <span>E-Prescription Creator</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
              </Link>
              <Link to="/doctor/lab-orders" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
                <span>Diagnostic Lab Orders</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
              </Link>
              <Link to="/doctor/referrals" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
                <span>Specialist Referral Center</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
              </Link>
              <Link to="/doctor/analytics" className="flex items-center justify-between p-2.5 bg-sand-50 hover:bg-sand-100 rounded-xl text-ink transition-colors">
                <span>Practice Analytics & Trends</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-soft" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
