import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import { useI18n } from '../../hooks/useI18n';
import {
  LayoutDashboard,
  CheckSquare,
  MapPin,
  UserPlus,
  Home,
  Syringe,
  Baby,
  Activity,
  ArrowRightLeft,
  CloudOff,
  FileText,
  BarChart3,
  Users,
  Stethoscope,
  Sparkles,
  Pill,
  FlaskConical,
  Video,
  Package,
  BedDouble,
  FileCheck,
  Building2,
  Flame,
  ShieldCheck,
  Clock,
  Volume2,
  PhoneCall,
  Calendar,
  Settings,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

export const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({
  isOpen = true,
  onClose,
}) => {
  const { currentRole, currentUser } = useAuth();
  const { t } = useI18n();

  const getNavItems = () => {
    switch (currentRole) {
      case 'asha':
        return [
          { label: t.nav.dashboard, to: '/asha/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: t.nav.tasks, to: '/asha/tasks', icon: <CheckSquare className="w-4 h-4" /> },
          { label: t.nav.map, to: '/asha/map', icon: <MapPin className="w-4 h-4" /> },
          { label: 'My Patients', to: '/asha/patients', icon: <Users className="w-4 h-4" /> },
          { label: t.nav.registerPatient, to: '/asha/register-patient', icon: <UserPlus className="w-4 h-4" /> },
          { label: t.nav.homeVisits, to: '/asha/home-visits', icon: <Home className="w-4 h-4" /> },
          { label: 'Visit Log', to: '/asha/visit-log', icon: <FileCheck className="w-4 h-4" /> },
          { label: t.nav.immunization, to: '/asha/immunization', icon: <Syringe className="w-4 h-4" /> },
          { label: t.nav.maternalCare, to: '/asha/maternal-care', icon: <Baby className="w-4 h-4" /> },
          { label: t.nav.ncdScreening, to: '/asha/ncd-screening', icon: <Activity className="w-4 h-4" /> },
          { label: t.nav.referrals, to: '/asha/referrals', icon: <ArrowRightLeft className="w-4 h-4" /> },
          { label: t.nav.offlineSync, to: '/asha/offline-sync', icon: <CloudOff className="w-4 h-4" /> },
          { label: 'IEC Documents', to: '/asha/documents', icon: <FileText className="w-4 h-4" /> },
          { label: t.nav.reports, to: '/asha/reports', icon: <BarChart3 className="w-4 h-4" /> },
        ];
      case 'doctor':
        return [
          { label: t.nav.dashboard, to: '/doctor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: t.nav.queue, to: '/doctor/queue', icon: <Users className="w-4 h-4" />, count: 12 },
          { label: t.nav.patients, to: '/doctor/patients', icon: <FileText className="w-4 h-4" /> },
          { label: t.nav.consultation, to: '/doctor/consultation', icon: <Stethoscope className="w-4 h-4" /> },
          { label: t.nav.aiTriage, to: '/doctor/ai-triage', icon: <Sparkles className="w-4 h-4" /> },
          { label: t.nav.prescriptions, to: '/doctor/prescriptions', icon: <Pill className="w-4 h-4" /> },
          { label: t.nav.labOrders, to: '/doctor/lab-orders', icon: <FlaskConical className="w-4 h-4" /> },
          { label: t.nav.referrals, to: '/doctor/referrals', icon: <ArrowRightLeft className="w-4 h-4" /> },
          { label: t.nav.telemedicine, to: '/doctor/telemedicine', icon: <Video className="w-4 h-4" /> },
          { label: t.nav.inventory, to: '/doctor/inventory', icon: <Package className="w-4 h-4" /> },
          { label: t.nav.analytics, to: '/doctor/analytics', icon: <TrendingUp className="w-4 h-4" /> },
        ];
      case 'specialist':
        return [
          { label: t.nav.dashboard, to: '/specialist/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: t.nav.referrals, to: '/specialist/referrals', icon: <ArrowRightLeft className="w-4 h-4" />, count: 3 },
          { label: t.nav.beds, to: '/specialist/beds', icon: <BedDouble className="w-4 h-4" /> },
          { label: t.nav.consultation, to: '/specialist/consultations', icon: <Stethoscope className="w-4 h-4" /> },
          { label: t.nav.treatmentPlans, to: '/specialist/treatment-plans', icon: <FileCheck className="w-4 h-4" /> },
          { label: t.nav.referrals, to: '/specialist/follow-ups', icon: <Activity className="w-4 h-4" /> },
          { label: t.nav.discharge, to: '/specialist/discharge', icon: <FileText className="w-4 h-4" /> },
        ];
      case 'admin':
        return [
          { label: t.nav.dashboard, to: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: t.nav.stateAnalytics, to: '/admin/state-analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { label: t.nav.districtAnalytics, to: '/admin/district-analytics', icon: <Building2 className="w-4 h-4" /> },
          { label: t.nav.facilityManagement, to: '/admin/facilities', icon: <Building2 className="w-4 h-4" /> },
          { label: t.nav.inventory, to: '/admin/inventory', icon: <Package className="w-4 h-4" /> },
          { label: t.nav.staffManagement, to: '/admin/staff', icon: <Users className="w-4 h-4" /> },
          { label: t.nav.heatmaps, to: '/admin/heatmaps', icon: <Flame className="w-4 h-4" /> },
          { label: t.nav.auditLogs, to: '/admin/audit-logs', icon: <ShieldCheck className="w-4 h-4" /> },
          { label: t.nav.reports, to: '/admin/reports', icon: <FileText className="w-4 h-4" /> },
          { label: t.nav.aiInsights, to: '/admin/ai-insights', icon: <Sparkles className="w-4 h-4" /> },
        ];
      case 'patient':
        return [
          { label: t.nav.dashboard, to: '/patient/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { label: t.nav.timeline, to: '/patient/timeline', icon: <Clock className="w-4 h-4" /> },
          { label: t.nav.prescriptions, to: '/patient/prescriptions', icon: <Pill className="w-4 h-4" /> },
          { label: t.nav.labOrders, to: '/patient/lab-reports', icon: <FlaskConical className="w-4 h-4" /> },
          { label: t.nav.calendar, to: '/patient/appointments', icon: <Calendar className="w-4 h-4" /> },
          { label: t.nav.referrals, to: '/patient/referrals', icon: <ArrowRightLeft className="w-4 h-4" /> },
          { label: t.nav.audioPrescription, to: '/patient/audio-prescription', icon: <Volume2 className="w-4 h-4" /> },
          { label: t.nav.immunization, to: '/patient/vaccinations', icon: <Syringe className="w-4 h-4" /> },
          { label: t.common.emergency, to: '/patient/emergency', icon: <PhoneCall className="w-4 h-4 text-red-500" /> },
          { label: t.nav.family, to: '/patient/family', icon: <Users className="w-4 h-4" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const roleLabel = t.roles[currentRole as keyof typeof t.roles] || currentRole;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* User Header Profile in Sidebar */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gov-600 to-gov-800 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-soft ring-1 ring-gov-500/40">
          {currentUser?.name.charAt(0) || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
          <p className="text-[11px] text-gov-400 font-semibold uppercase tracking-wider">
            {roleLabel}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {currentUser?.facilityName || currentUser?.district}
          </p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
          {roleLabel}
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between pl-2.5 pr-3 py-2.5 rounded-xl text-xs font-medium transition-all border-l-4 ${
                isActive
                  ? 'bg-gov-700/90 text-white font-bold shadow-soft border-l-gov-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border-l-transparent'
              }`
            }
          >
            <div className="flex items-center gap-2.5 truncate">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </div>
            {item.count !== undefined && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full font-bold bg-slate-800 text-gov-300 border border-slate-700">
                {item.count}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
            {t.nav.settings}
          </div>
          <NavLink
            to="/calendar"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${
                isActive ? 'bg-gov-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Calendar className="w-4 h-4" />
            <span>{t.nav.calendar}</span>
          </NavLink>
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${
                isActive ? 'bg-gov-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Settings className="w-4 h-4" />
            <span>{t.nav.settings}</span>
          </NavLink>
          <NavLink
            to="/help"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${
                isActive ? 'bg-gov-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t.nav.contact}</span>
          </NavLink>
        </div>
      </nav>

      {/* Emergency Hotline in Sidebar */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] flex items-center justify-between">
        <a href="tel:108" className="flex items-center gap-1.5 text-red-400 hover:underline font-bold">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>{t.common.emergency}</span>
        </a>
        <span className="text-slate-400">v1.0 {t.common.appName}</span>
      </div>
    </aside>
  );
};
