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
            A comprehensive, patient-centered digital health backbone designed for the Government of Maharashtra, connecting 120+ million citizens across 36 districts.
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

        {/* Core Pillars */}
        <div className="bg-surface rounded-2xl border border-line p-8 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-ink">Architectural & Ethical Pillars</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-ink">
                <CloudOff className="w-5 h-5 text-teal-600" />
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
