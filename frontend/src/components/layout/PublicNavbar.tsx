import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, PhoneCall, Menu, X, User } from 'lucide-react';
import { LanguageSelector } from '../ui/LanguageSelector';
import { Button } from '../ui/Button';
import { useI18n } from '../../hooks/useI18n';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useI18n();

  const links = [
    { label: t.nav.home, href: '/' },
    { label: t.nav.about, href: '/about' },
    { label: t.nav.facilities, href: '/facilities' },
    { label: t.nav.findMedicines, href: '/find-medicines' },
    { label: t.nav.healthPrograms, href: '/health-programs' },
    { label: t.nav.clinicalGuidelines, href: '/clinical-guidelines' },
    { label: t.nav.news, href: '/news' },
    { label: t.common.emergency, href: '/emergency', isEmergency: true },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      {/* Top Government Ribbon */}
      <div className="bg-gradient-to-r from-gov-900 via-gov-800 to-gov-900 text-white text-[11px] px-4 py-1.5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Government of Maharashtra • Public Health Department
          </span>
          <span className="text-gov-300 hidden sm:inline">| महाराष्ट्र शासन आरोग्य विभाग</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="tel:108"
            className="flex items-center gap-1 text-amber-300 font-bold hover:underline"
          >
            <PhoneCall className="w-3 h-3" />
            <span>24x7 Ambulance: 108</span>
          </a>
          <span className="text-gov-400">|</span>
          <LanguageSelector compact />
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gov-600 to-gov-800 text-white flex items-center justify-center font-bold text-lg shadow-soft ring-1 ring-gov-900/10 group-hover:shadow-glow transition-shadow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-slate-900 text-base leading-tight tracking-tight">
              {t.common.appName.includes('महा') ? t.common.appName : <>MahaAarogya <span className="text-gov-700">Sangam</span></>}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">{t.common.appTagline}</p>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden xl:flex items-center space-x-1">
          {links.map((item) => {
            const isActive = location.pathname === item.href;
            if (item.isEmergency) {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="ml-2 h-8 px-3 shrink-0 whitespace-nowrap rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-2xs inline-flex items-center gap-1.5 animate-pulse"
                >
                  <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-gov-800 bg-gov-50 font-bold after:absolute after:left-3 after:right-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-gov-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Link to="/login" className="shrink-0">
            <Button variant="outline" size="sm" leftIcon={<User className="w-3.5 h-3.5" />}>
              {t.common.login}
            </Button>
          </Link>
          <Link to="/register" className="shrink-0">
            <Button variant="primary" size="sm">
              Create Account
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="xl:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white p-4 space-y-2 shadow-lg animate-in slide-in-from-top duration-150">
          {links.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                item.isEmergency
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200'
                  : location.pathname === item.href
                  ? 'bg-gov-50 text-gov-800 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                {t.common.login} / ABHA Login
              </Button>
            </Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="sm" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="trust-divider" />
    </header>
  );
};
