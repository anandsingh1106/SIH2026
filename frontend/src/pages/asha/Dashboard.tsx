import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localDateString } from '@arogyasetu/shared/utils';
import { backendApi, type AshaAnalytics } from '@arogyasetu/shared/services/api';
import { useAuth } from '../../services/auth/authContext';
import { dataService } from '../../services/api/dataService';
import { syncQueueManager } from '../../services/offline/syncQueueManager';
import { Task, Referral, Patient } from '@arogyasetu/shared/types';
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
import { PageHeader, SectionTitle } from '../../components/layout/PageHeader';

// The API reports TODO / IN_PROGRESS / COMPLETED / CANCELLED; the shared
// mapping only lowercases them, so they never equal the declared 'pending'.
const isOpenTask = (t: Task) => !['completed', 'cancelled'].includes(String(t.status).toLowerCase());

const PRIORITY_RANK: Record<string, number> = { urgent: 0, critical: 0, high: 1, normal: 2, medium: 2, low: 3 };

export const AshaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<AshaAnalytics | null>(null);
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
      // The counts are a convenience; the rest of the dashboard still works without them.
      backendApi.getAshaAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
    };
    load();

    const unsubSync = syncQueueManager.subscribe((s) => setPendingSyncCount(s.pendingCount));
    const unsubData = dataService.subscribe(() => load());

    return () => {
      unsubSync();
      unsubData();
    };
  }, []);

  const today = localDateString();
  const dueDay = (t: Task) => (t.dueDate ?? '').slice(0, 10);
  // Today's work is everything still open that is due today or already late.
  const pendingTasks = tasks
    .filter((t) => isOpenTask(t) && dueDay(t) !== '' && dueDay(t) <= today)
    .sort((a, b) =>
      (PRIORITY_RANK[String(a.priority).toLowerCase()] ?? 2) - (PRIORITY_RANK[String(b.priority).toLowerCase()] ?? 2) ||
      dueDay(a).localeCompare(dueDay(b))
    );
  const overdueCount = pendingTasks.filter((t) => dueDay(t) < today).length;
  const dueTodayCount = pendingTasks.length - overdueCount;
  const criticalReferrals = referrals.filter((r) => r.priority === 'critical' || r.status === 'in_transit');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'ASHA Field Workspace', href: '/asha/dashboard' }, { label: 'Daily Command Hub' }]} />

      <PageHeader
        eyebrow={
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {[
              currentUser?.village && `${currentUser.village} Village`,
              currentUser?.taluka && `${currentUser.taluka} Block`,
              currentUser?.district,
            ].filter(Boolean).join(' • ') || 'ASHA Field Workspace'}
          </>
        }
        title={`Namaskar, ${currentUser?.name ?? 'ASHA worker'}`}
        subtitle={[
          analytics && `${analytics.assignedPatients} patients assigned`,
          analytics && `${analytics.homeVisits} home visits recorded`,
          currentUser?.facilityName,
        ].filter(Boolean).join(' • ') || undefined}
        actions={
          <>
            <Link to="/asha/register-patient">
              <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                Register Patient
              </Button>
            </Link>
            <Link to="/asha/map">
              <Button variant="secondary" size="sm" leftIcon={<MapPin className="w-4 h-4" />}>
                Household Map
              </Button>
            </Link>
          </>
        }
      />

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
          subtitle={`${dueTodayCount} due today • ${overdueCount} overdue`}
          variant="teal"
          icon={<CheckSquare className="w-5 h-5 text-gov-700" />}
          onClick={() => navigate('/asha/tasks')}
        />
        <MetricCard
          title="High-Risk Maternal (ANC)"
          value={analytics ? `${analytics.highRiskMaternal} ${analytics.highRiskMaternal === 1 ? 'Case' : 'Cases'}` : '-'}
          subtitle="Pregnancies flagged high risk"
          variant="red"
          icon={<Baby className="w-5 h-5 text-red-600" />}
          onClick={() => navigate('/asha/maternal-care')}
        />
        <MetricCard
          title="Vaccines Due / Overdue"
          value={analytics ? `${analytics.vaccinationsDue} Due` : '-'}
          subtitle="Across your assigned patients"
          variant="amber"
          icon={<Syringe className="w-5 h-5 text-amber-600" />}
          onClick={() => navigate('/asha/immunization')}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger">
        {/* Left 2 Cols: Today's Tasks & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Tasks List */}
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle icon={<CheckSquare className="w-4 h-4 text-gov-700" />}>
                Today's schedule
              </SectionTitle>
              <Link to="/asha/tasks" className="text-xs font-bold text-gov-700 hover:underline">
                View All Tasks ({tasks.length}) →
              </Link>
            </div>

            <div className="space-y-3">
              {pendingTasks.length === 0 && (
                <p className="p-4 text-center text-xs text-ink-soft bg-sand-50 border border-dashed border-line rounded-xl">
                  Nothing due today. You are all caught up.
                </p>
              )}
              {pendingTasks.slice(0, 4).map((task) => {
                const priority = String(task.priority ?? '').toLowerCase();
                const overdue = dueDay(task) < today;
                return (
                <div
                  key={task.id}
                  className="p-3.5 bg-sand-50 border border-line rounded-xl flex items-start justify-between gap-3 text-xs hover:bg-sand-100/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={priority === 'urgent' || priority === 'critical' ? 'critical' : priority === 'high' ? 'danger' : 'primary'}
                        size="sm"
                      >
                        {priority.toUpperCase()}
                      </Badge>
                      {overdue && <Badge variant="warning" size="sm">OVERDUE</Badge>}
                      <span className="font-bold text-ink text-sm">{task.title}</span>
                    </div>
                    {task.description && task.description !== task.title && (
                      <p className="text-ink-muted">{task.description}</p>
                    )}
                    <div className="text-[11px] text-ink-soft flex items-center gap-2 pt-0.5 flex-wrap">
                      {task.patientName && (
                        <>
                          <span>👤 {task.patientName}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>⏰ Due: {overdue ? dueDay(task) : 'Today'}</span>
                    </div>
                  </div>

                  <Link to="/asha/home-visits">
                    <Button size="sm" variant="primary" className="shrink-0">
                      Start Visit
                    </Button>
                  </Link>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Quick Village Status & Referral Watch */}
        <div className="space-y-6">
          {/* Active Referrals Tracker */}
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-4">
            <h3 className="font-display text-base font-bold text-ink flex items-center justify-between">
              <span>Patients in referral care</span>
              <Link to="/asha/referrals" className="text-gov-700 hover:underline">
                View ({referrals.length})
              </Link>
            </h3>

            <div className="space-y-3">
              {referrals.map((r) => (
                <div key={r.id} className="p-3 bg-sand-50 border border-line rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{r.patientName}</span>
                    <Badge variant={r.priority === 'critical' ? 'critical' : 'warning'} size="sm">
                      {r.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-ink-soft text-[11px] truncate">{r.provisionalDiagnosis}</p>
                  <div className="text-[10px] text-gov-800 font-semibold pt-1 border-t border-line">
                    To: {r.targetFacilityName}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IEC Quick Guides */}
          <div className="bg-gov-50/70 border border-gov-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h4 className="font-display text-sm font-bold text-gov-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-gov-700" />
              Counselling tip
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
