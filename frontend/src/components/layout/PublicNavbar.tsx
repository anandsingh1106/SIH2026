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
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-line shadow-2xs">
      {/* Utility strip: the ambulance number and language stay one tap away on
          every public page, without claiming any institutional affiliation. */}
      <div className="bg-sand-50 border-b border-line text-[11px] px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap justify-center sm:justify-end items-center gap-x-3 gap-y-1">
        <a
          href="tel:108"
          className="flex items-center gap-1.5 font-bold text-red-700 hover:text-red-800 hover:underline"
        >
          <PhoneCall className="w-3 h-3" />
          <span>24x7 Ambulance: 108</span>
        </a>
        <span className="hidden sm:inline text-line" aria-hidden="true">|</span>
        <LanguageSelector compact />
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4.5rem] py-2 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group min-w-0 2xl:shrink-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-gov-600 to-gov-800 text-white flex items-center justify-center font-bold text-lg shadow-soft ring-1 ring-gov-900/10 group-hover:shadow-glow transition-shadow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-ink text-[15px] leading-tight tracking-tight truncate">
              {t.common.appName.includes('महा') ? t.common.appName : <>MahaAarogya <span className="text-gov-700">Sangam</span></>}
            </h1>
            {/* The tagline is the first thing to go when space is tight: it
                repeats what the page already says, and on a narrow bar it was
                wrapping to a second line and spilling past the border. */}
            <p className="hidden lg:block 2xl:hidden text-[10px] text-ink-soft font-medium truncate">
              {t.common.appTagline}
            </p>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden 2xl:flex flex-1 items-center justify-center gap-0.5 px-4 min-w-0">
          {links.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative px-2.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-gov-800 bg-gov-50 font-bold after:absolute after:left-3 after:right-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-gov-600'
                    : 'text-ink-muted hover:text-ink hover:bg-sand-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Trailing controls: the buttons and the hamburger travel together so
            they stay pinned to the right edge at every width. */}
        <div className="flex items-center gap-2 shrink-0">
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
        <div className="2xl:hidden flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-ink-muted hover:bg-sand-100"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="2xl:hidden border-t border-line bg-surface p-4 space-y-2 shadow-lg animate-in slide-in-from-top duration-150">
          {links.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                location.pathname === item.href
                  ? 'bg-gov-50 text-gov-800 font-bold'
                  : 'text-sand-700 hover:bg-sand-50'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Emergency is kept in the mobile menu explicitly. The utility strip
              carries it on desktop, but on a phone that strip is cramped, and
              this is the one link that must never take a second look to find. */}
          <Link
            to="/emergency"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-700 border border-red-200"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            {t.common.emergency}
          </Link>
          <div className="pt-3 border-t border-line flex flex-col gap-2">
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
