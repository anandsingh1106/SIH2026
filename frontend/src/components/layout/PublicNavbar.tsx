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
    { label: t.nav.healthPrograms, href: '/health-programs' },
    { label: t.nav.clinicalGuidelines, href: '/clinical-guidelines' },
    { label: t.nav.news, href: '/news' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-line shadow-2xs">
      {/* One bar, not two. The ambulance number and the language switch used to
          sit in a strip of their own above this row, which cost a whole band of
          vertical space on every public page to carry two controls. They now
          travel with the sign-in buttons on the right. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4.5rem] py-2 flex items-center gap-4">
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
            <p className="hidden 2xl:block text-[10px] text-ink-soft font-medium truncate">
              {t.common.appTagline}
            </p>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden 2xl:flex items-center gap-0.5 pl-2 shrink-0">
          {links.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative px-2 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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

        {/* Trailing controls: helpline, language, sign-in and the hamburger all
            travel together, pinned to the right edge at every width. ml-auto
            holds them there now that the row is no longer justify-between. */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* The ambulance number stays the one red thing in the bar. */}
          <a
            href="tel:108"
            className="hidden md:flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 whitespace-nowrap"
            title="24x7 ambulance helpline"
          >
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            <span>108</span>
          </a>

          <div className="hidden lg:block">
            <LanguageSelector compact />
          </div>

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

          {/* The helpline and the language switch are hidden from the bar on
              small screens, so the menu is where they live there. Emergency
              stays first: it is the one link that must never take a second
              look to find. */}
          <a
            href="tel:108"
            className="md:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-700 border border-red-200"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            24x7 Ambulance: 108
          </a>
          <Link
            to="/emergency"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-sand-700 hover:bg-sand-50"
          >
            {t.common.emergency}
          </Link>
          <div className="lg:hidden pt-1">
            <LanguageSelector compact />
          </div>
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
