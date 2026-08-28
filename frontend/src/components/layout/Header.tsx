import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Dropdowns previously stayed open until their trigger was pressed again,
  // which on a phone means tapping elsewhere leaves the panel covering content.
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNotifMenu && !showProfileMenu) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setShowNotifMenu(false);
      if (profileRef.current && !profileRef.current.contains(target)) setShowProfileMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifMenu(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [showNotifMenu, showProfileMenu]);

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
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-line shadow-subtle">
      <div className="px-4 sm:px-6 lg:pr-8 lg:pl-64 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Hamburger & Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl text-ink-muted hover:bg-sand-100 hover:text-ink transition-colors lg:hidden"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gov-600 to-gov-800 text-white flex items-center justify-center font-bold text-sm shadow-soft transition-all duration-200 group-hover:shadow-glow group-hover:scale-105">
              <Shield className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-extrabold text-ink text-sm tracking-tight">
                {t.common.appName.includes('महा') ? t.common.appName : <>MahaAarogya <span className="text-gov-700">Sangam</span></>}
              </span>
              <div className="text-[10px] text-ink-soft font-medium leading-none">
                {t.common.appTagline}
              </div>
            </div>
          </Link>
        </div>

        {/* Global Search Bar (Center) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={`${t.common.search}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigate(`/facilities?search=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }
              }}
              className="w-full text-sm bg-raised border border-line rounded-xl pl-10 pr-4 py-2.5 text-ink placeholder:text-ink-soft/70 transition-all duration-200 focus:outline-none focus:border-gov-600 focus:bg-surface focus:ring-4 focus:ring-gov-600/12"
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
            className="p-2.5 text-ink-soft hover:text-ink hover:bg-sand-100 rounded-xl relative transition-colors"
            title={t.nav.messages}
          >
            <MessageSquare className="w-5 h-5" />
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2.5 text-ink-soft hover:text-ink hover:bg-sand-100 rounded-xl relative transition-colors"
              title={t.nav.notifications}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-surface tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-2xl shadow-premium border border-line py-2 z-50 origin-top-right animate-scale-in">
                <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
                  <h4 className="font-bold text-xs text-ink uppercase tracking-wider">
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

                <div className="max-h-72 overflow-y-auto divide-y divide-line">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-ink-soft">{t.common.noData}</div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (n.link) navigate(n.link);
                        }}
                        className={`p-3.5 text-xs cursor-pointer transition-colors hover:bg-raised ${
                          !n.isRead ? 'bg-saffron-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink text-sm">{n.title}</span>
                          <span className="text-[10px] text-ink-soft shrink-0 ml-2">{n.timestamp}</span>
                        </div>
                        <p className="text-ink-muted mt-1 leading-relaxed text-xs">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-line text-center">
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
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-sand-100 transition-colors"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-line"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gov-600 to-gov-800 text-white flex items-center justify-center font-bold text-xs shadow-subtle">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl shadow-premium border border-line py-2 z-50 origin-top-right animate-scale-in">
                <div className="px-4 py-3 border-b border-line">
                  <p className="font-bold text-sm text-ink truncate">{currentUser?.name}</p>
                  <p className="text-xs text-ink-soft truncate">{currentUser?.facilityName || currentUser?.district}</p>
                  <div className="text-[10px] font-mono text-gov-700 font-semibold mt-0.5">
                    ABHA: {currentUser?.abhaId || 'Linked'}
                  </div>
                </div>

                <div className="py-1 text-sm text-ink-muted">
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-raised transition-colors"
                  >
                    <User className="w-4 h-4 text-ink-soft" /> {t.nav.profile}
                  </Link>
                  <Link
                    to="/calendar"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-raised transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-ink-soft" /> {t.nav.calendar}
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-raised transition-colors"
                  >
                    <Settings className="w-4 h-4 text-ink-soft" /> {t.nav.settings}
                  </Link>
                  <Link
                    to="/help"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-raised transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-ink-soft" /> {t.nav.contact}
                  </Link>
                </div>

                <div className="pt-1 border-t border-line">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left font-semibold transition-colors"
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
