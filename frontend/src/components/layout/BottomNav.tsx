import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import {
  LayoutDashboard,
  CheckSquare,
  MapPin,
  UserPlus,
  Users,
  Stethoscope,
  Pill,
  ArrowRightLeft,
  BedDouble,
  BarChart3,
  Flame,
  Clock,
  Volume2,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentRole } = useAuth();

  const getItems = () => {
    switch (currentRole) {
      case 'asha':
        return [
          { label: 'Home', to: '/asha/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Tasks', to: '/asha/tasks', icon: <CheckSquare className="w-5 h-5" /> },
          { label: 'Map', to: '/asha/map', icon: <MapPin className="w-5 h-5" /> },
          { label: 'Register', to: '/asha/register-patient', icon: <UserPlus className="w-5 h-5" /> },
          { label: 'Referrals', to: '/asha/referrals', icon: <ArrowRightLeft className="w-5 h-5" /> },
        ];
      case 'doctor':
        return [
          { label: 'Home', to: '/doctor/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Queue', to: '/doctor/queue', icon: <Users className="w-5 h-5" /> },
          { label: 'Consult', to: '/doctor/consultation', icon: <Stethoscope className="w-5 h-5" /> },
          { label: 'Prescribe', to: '/doctor/prescriptions', icon: <Pill className="w-5 h-5" /> },
          { label: 'Referrals', to: '/doctor/referrals', icon: <ArrowRightLeft className="w-5 h-5" /> },
        ];
      case 'specialist':
        return [
          { label: 'Home', to: '/specialist/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Queue', to: '/specialist/referrals', icon: <ArrowRightLeft className="w-5 h-5" /> },
          { label: 'Beds', to: '/specialist/beds', icon: <BedDouble className="w-5 h-5" /> },
          { label: 'Consult', to: '/specialist/consultations', icon: <Stethoscope className="w-5 h-5" /> },
        ];
      case 'admin':
        return [
          { label: 'Command', to: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'State', to: '/admin/state-analytics', icon: <BarChart3 className="w-5 h-5" /> },
          { label: 'Heatmaps', to: '/admin/heatmaps', icon: <Flame className="w-5 h-5" /> },
          { label: 'Supply', to: '/admin/inventory', icon: <Pill className="w-5 h-5" /> },
        ];
      case 'patient':
        return [
          { label: 'Home', to: '/patient/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { label: 'Timeline', to: '/patient/timeline', icon: <Clock className="w-5 h-5" /> },
          { label: 'Medicines', to: '/patient/prescriptions', icon: <Pill className="w-5 h-5" /> },
          { label: 'Audio Rx', to: '/patient/audio-prescription', icon: <Volume2 className="w-5 h-5" /> },
          { label: 'Referral', to: '/patient/referrals', icon: <ArrowRightLeft className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const items = getItems();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line px-2 pt-1.5 flex items-center justify-around shadow-elevated"
      style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom))' }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `group relative flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl text-[11px] font-semibold 
             transition-[color,background-color] duration-200 ${
              isActive ? 'text-gov-800 bg-gov-50' : 'text-ink-soft hover:text-ink active:bg-sand-100'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`absolute -top-1 h-0.5 rounded-full bg-saffron-500 transition-all duration-200 ${
                  isActive ? 'w-7 opacity-100' : 'w-0 opacity-0'
                }`}
              />
              <span className="transition-transform duration-200 group-active:scale-90">{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
