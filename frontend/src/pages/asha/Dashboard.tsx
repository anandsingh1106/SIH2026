import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import { Task, Referral, Patient } from '../../types';
import {
  CheckSquare,
  Home,
  Baby,
  Syringe,
  Activity,
  ArrowRightLeft,
  CloudOff,
  UserPlus,
  MapPin,
  AlertTriangle,
  Users,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

export const AshaDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [tList, rList, pList] = await Promise.all([
        dataService.getTasks(),
        dataService.getReferrals(),
        dataService.getPatients(),
      ]);
      setTasks(tList);
      setReferrals(rList);
      setPatients(pList);
    };
    load();

    const unsubSync = syncQueueManager.subscribe((s) => setPendingSyncCount(s.pendingCount));
    const unsubData = dataService.subscribe(() => load());

    return () => {
      unsubSync();
      unsubData();
    };
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const criticalReferrals = referrals.filter((r) => r.priority === 'critical' || r.status === 'in_transit');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'ASHA Field Workspace', href: '/asha/dashboard' }, { label: 'Daily Command Hub' }]} />

      {/* ASHA Header */}
      <div className="bg-gradient-to-r from-gov-800 to-teal-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-bold text-gov-100 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Paud Village • Mulshi Block (Pune)
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Namaskar, Sunita Gaikwad (ASHA Worker)
          </h1>
          <p className="text-xs text-gov-100 mt-1">
            Village Population: 1,420 • 284 Households Covered • Subcenter Paud
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/asha/register-patient">
            <Button variant="primary" size="sm" className="bg-white text-gov-900 hover:bg-gov-50 font-bold" leftIcon={<UserPlus className="w-4 h-4 text-gov-700" />}>
              Register Patient
            </Button>
          </Link>
          <Link to="/asha/map">
            <Button variant="secondary" size="sm" className="bg-teal-900/60 text-white border-teal-600 hover:bg-teal-900" leftIcon={<MapPin className="w-4 h-4 text-gov-300" />}>
              Household Map
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alert Bar */}
      {criticalReferrals.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl shadow-2xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold text-red-900">Active High-Risk Case in Transit:</span>{' '}
              <span className="text-red-800">{criticalReferrals[0].patientName} ({criticalReferrals[0].provisionalDiagnosis})</span>
            </div>
          </div>
          <Link to="/asha/referrals">
            <Button size="sm" variant="danger" className="text-xs">
              Track 108 Ambulance →
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Priority Tasks"
          value={pendingTasks.length}
          subtitle="4 home visits & vaccines"
          variant="teal"
          icon={<CheckSquare className="w-5 h-5 text-gov-700" />}
          onClick={() => {}}
        />
        <MetricCard
          title="High-Risk Maternal (ANC)"
          value="3 Cases"
          subtitle="1 referred to Sassoon"
          variant="red"
          icon={<Baby className="w-5 h-5 text-red-600" />}
        />
        <MetricCard
          title="Vaccines Due (0-2 Yrs)"
          value="8 Due"
          subtitle="Anganwadi session today"
          variant="amber"
          icon={<Syringe className="w-5 h-5 text-amber-600" />}
        />
        <MetricCard
          title="Offline Sync Queue"
          value={pendingSyncCount}
          subtitle={pendingSyncCount > 0 ? 'Queued in IndexedDB' : 'Fully Synced'}
          variant="emerald"
          icon={<CloudOff className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Core Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Tasks & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Tasks List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-gov-700" />
                Today's Daily Task Action List
              </h3>
              <Link to="/asha/tasks" className="text-xs font-bold text-gov-700 hover:underline">
                View All Tasks ({tasks.length}) →
              </Link>
            </div>

            <div className="space-y-3">
              {pendingTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs hover:bg-slate-100/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'danger' : 'primary'}
                        size="sm"
                      >
                        {task.priority.toUpperCase()}
                      </Badge>
                      <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                    </div>
                    <p className="text-slate-600">{task.description}</p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                      <span>👤 {task.patientName}</span>
                      <span>•</span>
                      <span>🏠 {task.village} ({task.householdNumber})</span>
                      <span>•</span>
                      <span>⏰ Due: {task.dueTime}</span>
                    </div>
                  </div>

                  <Link to="/asha/home-visits">
                    <Button size="sm" variant="primary" className="shrink-0">
                      Start Visit
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Rapid Action Modules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/asha/home-visits"
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-gov-600 transition-all text-center space-y-2 group"
            >
              <div className="p-2.5 bg-gov-50 text-gov-700 rounded-xl w-fit mx-auto group-hover:bg-gov-700 group-hover:text-white transition-colors">
                <Home className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-800">Record Home Visit</div>
            </Link>

            <Link
              to="/asha/maternal-care"
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-gov-600 transition-all text-center space-y-2 group"
            >
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl w-fit mx-auto group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Baby className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-800">Maternal ANC (HRP)</div>
            </Link>

            <Link
              to="/asha/immunization"
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-gov-600 transition-all text-center space-y-2 group"
            >
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl w-fit mx-auto group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Syringe className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-800">Immunization Due</div>
            </Link>

            <Link
              to="/asha/ncd-screening"
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-gov-600 transition-all text-center space-y-2 group"
            >
              <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl w-fit mx-auto group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Activity className="w-5 h-5" />
              </div>
              <div className="font-bold text-xs text-slate-800">NCD CBAC Form</div>
            </Link>
          </div>
        </div>

        {/* Right Col: Quick Village Status & Referral Watch */}
        <div className="space-y-6">
          {/* Active Referrals Tracker */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Village Patients in Referral Care</span>
              <Link to="/asha/referrals" className="text-gov-700 hover:underline">
                View ({referrals.length})
              </Link>
            </h3>

            <div className="space-y-3">
              {referrals.map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{r.patientName}</span>
                    <Badge variant={r.priority === 'critical' ? 'critical' : 'warning'} size="sm">
                      {r.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-[11px] truncate">{r.provisionalDiagnosis}</p>
                  <div className="text-[10px] text-gov-800 font-semibold pt-1 border-t border-slate-200">
                    To: {r.targetFacilityName}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IEC Quick Guides */}
          <div className="bg-gov-50/70 border border-gov-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-gov-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-gov-700" />
              Frontline Counselling Tip
            </h4>
            <p className="text-xs text-gov-800 leading-relaxed italic">
              "For pregnant mothers with Hb &lt; 8 g/dL, ensure daily intake of 2 large red IFA tablets and encourage leafy green vegetables, jaggery, and drumsticks."
            </p>
            <Link to="/asha/documents" className="text-[11px] font-bold text-gov-700 hover:underline block pt-1">
              View All IEC Visual Flyers →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
