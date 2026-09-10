import React from 'react';
import { Shield, CheckCircle2, Lock, CloudOff, Sparkles, Building2, Users, HeartHandshake } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col antialiased">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 flex-1">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gov-100 text-gov-800 rounded-full text-xs font-bold border border-gov-200">
            <Shield className="w-3.5 h-3.5" /> Official Vision & Architecture
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">
            About MahaAarogya Sangam
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-2xl mx-auto leading-relaxed">
            A comprehensive, patient-centered digital health backbone connecting 120+ million citizens across 36 districts.
          </p>
        </div>

        {/* Mission & Vision Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-3">
            <div className="p-3 bg-gov-50 text-gov-700 rounded-xl w-fit">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">Our Public Health Mission</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              To eliminate geographical, economic, and logistical barriers to high-quality healthcare in Maharashtra by providing a resilient, offline-capable digital grid that empowers frontline workers, medical officers, and tertiary specialists to collaborate seamlessly.
            </p>
          </div>

          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-3">
            <div className="p-3 bg-sky-50 text-sky-700 rounded-xl w-fit">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">Our Digital Health Vision</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              A state where every citizen—from a tribal hamlet in Gadchiroli to a dense neighborhood in Mumbai—has a secure longitudinal health record, timely referral transit with reserved ICU capacity, and clear, accessible prescription guidance in their native language.
            </p>
          </div>
        </div>

        {/* Names the tier structure the platform actually models, using the
            state's current administrative terminology rather than the textbook
            PHC/CHC labels: sub-centres and PHCs are Ayushman Arogya Mandir
            spokes, district hospitals are the hubs they refer into. */}
        <div className="bg-surface rounded-2xl border border-line p-8 shadow-xs space-y-4">
          <h2 className="text-xl font-bold text-ink">How the Care Network is Organised</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            Maharashtra delivers rural care through a hub-and-spoke network. Sub-centres and
            Primary Health Centres operate as <span className="font-semibold text-ink">Ayushman Arogya Mandir</span> spokes,
            handling screening, maternal care and first contact. District hospitals act as
            <span className="font-semibold text-ink"> hubs</span>, carrying the specialist capacity a spoke refers into.
            This platform models that same structure end to end — a referral raised at a spoke
            travels to a hub with its record, its transport and its bed reservation attached,
            rather than restarting as a fresh case on arrival.
          </p>
          <p className="text-[11px] text-ink-soft leading-relaxed">
            The rural facility figures used across these screens cover the 33 districts that
            appear in the National Health Mission&rsquo;s rural health tables. Mumbai City and
            Mumbai Suburban are absent from those tables because they have no rural PHC
            network, so state-wide services such as the 108 ambulance fleet are described
            across all 36 districts instead.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="bg-surface rounded-2xl border border-line p-8 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-ink">Architectural & Ethical Pillars</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-ink">
                <CloudOff className="w-5 h-5 text-blue-600" />
                <span>1. Offline-First Resilience</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Critical frontline tasks cannot depend on active cellular connectivity. Using client-side IndexedDB databases, ASHA workers operate completely offline in remote villages, with automatic conflict-resolved synchronization upon reconnect.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-ink">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>2. Responsible Clinical AI</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                AI is strictly deployed as an explainable clinical decision-support copilot, never an autonomous diagnostician. Every triage score and drug interaction alert details supporting factors and mandates verified clinician authorization.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-ink">
                <Lock className="w-5 h-5 text-emerald-600" />
                <span>3. Patient Privacy & ABHA</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Built strictly adhering to Ayushman Bharat Digital Mission (ABDM) standards and national data protection laws. Every medical record access is immutably logged in governance audit trails.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
