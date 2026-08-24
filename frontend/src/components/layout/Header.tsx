import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/authContext';
import { useI18n } from '../../hooks/useI18n';
import { backendApi, NotificationRecord } from '../../services/api/backendApi';
import {
  Shield,
  Bell,
  MessageSquare,
  Search,
  User,
  LogOut,
  Calendar,
  Settings,
  HelpCircle,
  Menu,
  Sparkles,
  PhoneCall,
  CheckCheck
} from 'lucide-react';
import { LanguageSelector } from '../ui/LanguageSelector';
import { Badge } from '../ui/Badge';

export const Header: React.FC<{ onToggleSidebar?: () => void }> = ({ onToggleSidebar }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const { items } = await backendApi.getNotifications();
      setNotifications(items);
    } catch {
      // A failed notification poll should not break the shell.
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();

    // Live updates arrive over SSE — no polling timer.
    const source = new EventSource('/api/stream', { withCredentials: true });
    source.addEventListener('notification', () => fetchNotifs());
    source.onerror = () => source.close();

    return () => source.close();
  }, [fetchNotifs]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await backendApi.markAllNotificationsRead().catch(() => undefined);
    fetchNotifs();
  };

  const roleColors = {
    asha: 'bg-teal-50 text-teal-800 border-teal-200',
    doctor: 'bg-sky-50 text-sky-800 border-sky-200',
    specialist: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    admin: 'bg-purple-50 text-purple-800 border-purple-200',
    patient: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  const roleLabel = t.roles[currentRole as keyof typeof t.roles] || currentRole;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 sm:px-6 lg:pr-8 lg:pl-64 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Hamburger & Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gov-600 to-gov-800 text-white flex items-center justify-center font-bold text-sm shadow-soft group-hover:shadow-glow transition-shadow">
              <Shield className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-extrabold text-slate-900 text-sm tracking-tight">
                {t.common.appName.includes('महा') ? t.common.appName : <>MahaAarogya <span className="text-gov-700">Sangam</span></>}
              </span>
              <div className="text-[10px] text-slate-500 font-medium leading-none">
                {t.common.appTagline}
              </div>
            </div>
          </Link>
        </div>

        {/* Global Search Bar (Center) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`${t.common.search}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigate(`/facilities?search=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-gov-600 focus:bg-white focus:ring-2 focus:ring-gov-100"
            />
          </div>
        </div>

        {/* Right Side: Role Badge, Language, Notifications, Messages, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Role Tag */}
          <div className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${roleColors[currentRole]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{roleLabel}</span>
          </div>

          <LanguageSelector compact />

          {/* Care Messages */}
          <Link
            to="/messages"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors"
            title={t.nav.messages}
          >
            <MessageSquare className="w-5 h-5" />
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors"
              title={t.nav.notifications}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    {t.nav.notifications} ({unreadCount})
                  </h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-gov-700 hover:underline font-semibold flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">{t.common.noData}</div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (n.link) navigate(n.link);
                        }}
                        className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.isRead ? 'bg-gov-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-slate-100 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-xs font-bold text-gov-700 hover:underline"
                  >
                    {t.nav.notifications} →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gov-700 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="font-bold text-xs text-slate-900 truncate">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser?.facilityName || currentUser?.district}</p>
                  <div className="text-[10px] font-mono text-gov-700 font-semibold mt-0.5">
                    ABHA: {currentUser?.abhaId || 'Linked'}
                  </div>
                </div>

                <div className="py-1 text-xs text-slate-700">
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4 text-slate-400" /> {t.nav.profile}
                  </Link>
                  <Link
                    to="/calendar"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50"
                  >
                    <Calendar className="w-4 h-4 text-slate-400" /> {t.nav.calendar}
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-slate-400" /> {t.nav.settings}
                  </Link>
                  <Link
                    to="/help"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" /> {t.nav.contact}
                  </Link>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left font-semibold"
                  >
                    <LogOut className="w-4 h-4" /> {t.common.logout}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
