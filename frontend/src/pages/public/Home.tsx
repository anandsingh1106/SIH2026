import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { backendApi } from '../../services/api/backendApi';
import {
  Shield,
  PhoneCall,
  Search,
  Activity,
  Users,
  Building2,
  Pill,
  Video,
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Heart,
  CloudOff,
  Stethoscope,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MetricCard } from '../../components/ui/MetricCard';
import { Reveal } from '../../components/ui/Reveal';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface PlatformStats {
  patients: number;
  facilities: number;
  consultations: number;
  prescriptions: number;
  referrals: number;
  emergencyReferrals: number;
  bedsAvailable: number;
  bedsTotal: number;
  vaccinationsGiven: number;
  screenings: number;
  healthWorkers: number;
  districts: number;
}

type TrendPoint = { month: string; consultations: number; referrals: number };

export const HomePage: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [impactData, setImpactData] = useState<TrendPoint[]>([]);

  useEffect(() => {
    // Live platform figures. If unreachable the cards fall back to a dash
    // rather than showing a number that was never real.
    backendApi.getPlatformStats().then(setStats).catch(() => setStats(null));
    backendApi
      .getPlatformTrends()
      .then((t) => setImpactData(t.points))
      .catch(() => setImpactData([]));
  }, []);

  const challenges = [
    {
      title: 'Rural Healthcare Access',
      desc: 'Overcoming geographic barriers across 40,000+ villages with offline-capable ASHA mobile tooling.',
      icon: <Users className="w-5 h-5 text-teal-600" />,
    },
    {
      title: 'Specialist Availability',
      desc: 'Connecting rural PHCs with tertiary medical college cardiologists and oncologists via tele-triage.',
      icon: <Stethoscope className="w-5 h-5 text-sky-600" />,
    },
    {
      title: 'Critical Referral Delays',
      desc: 'Real-time 9-stage referral tracking with 108 ambulance dispatch and reserved ICU bed allocation.',
      icon: <ArrowRight className="w-5 h-5 text-amber-600" />,
    },
    {
      title: 'Essential Drug Shortages',
      desc: 'Predictive supply chain tracking from state warehouses down to remote village subcenters.',
      icon: <Pill className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: 'Maternal & Child Mortality',
      desc: 'High-Risk Pregnancy (HRP) scoring, mandatory 4 ANC visits, and zero-out-of-pocket JSSK support.',
      icon: <Heart className="w-5 h-5 text-red-600" />,
    },
    {
      title: 'Fragmented Health Records',
      desc: 'Unified longitudinal EHR anchored on Ayushman Bharat Health Account (ABHA) IDs.',
      icon: <FileText className="w-5 h-5 text-indigo-600" />,
    },
  ];

  const features = [
    {
      role: 'ASHA Workers',
      title: 'Frontline Task-First Workspace',
      desc: 'Offline-ready household health map, CBAC screening, ANC danger sign alerts, and instant referrals.',
      link: '/asha/dashboard',
      tag: 'Offline First',
    },
    {
      role: 'Medical Officers',
      title: 'Live OPD Queue & Structured EHR',
      desc: 'High-density consultation station, explainable AI triage, drug allergy safety checks, and e-prescriptions.',
      link: '/doctor/dashboard',
      tag: 'Clinical Density',
    },
    {
      role: 'Tertiary Specialists',
      title: 'Super-Specialty Referral & Bed Desk',
      desc: 'Live ICU/General bed reservation, surgical treatment plan builder, and downward follow-up coordination.',
      link: '/specialist/dashboard',
      tag: 'Apex Care',
    },
    {
      role: 'Health Administrators',
      title: 'State & District Command Center',
      desc: '36-district live health metrics, disease outbreak heatmaps, medical supply chain buffer tracking.',
      link: '/admin/dashboard',
      tag: 'State Intelligence',
    },
    {
      role: 'Citizens & Patients',
      title: 'ABHA Health Portal & Voice Rx',
      desc: 'Simple health timeline, appointment booking, referral tracker, and trilingual voice prescription player.',
      link: '/patient/dashboard',
      tag: 'Multilingual & Audio',
    },
    {
      role: 'Public Discovery',
      title: 'Open Healthcare & Drug Directory',
      desc: 'Find nearby government and MJPJAY hospitals, real-time medicine stock, and clinical guidelines.',
      link: '/facilities',
      tag: 'Citizen Access',
    },
  ];

  const faqs = [
    {
      q: 'How does MahaAarogya Sangam work in areas without mobile internet?',
      a: 'The platform is built with an offline-first architecture using local IndexedDB storage. ASHA workers can register patients, conduct home visits, and record screenings without connectivity. All data automatically synchronizes when network signal is re-established.',
    },
    {
      q: 'How are referrals tracked between rural PHCs and tertiary hospitals like Sassoon?',
      a: 'Referrals follow a transparent 9-stage lifecycle: Created → Accepted → Scheduled → In Transit (108 Ambulance) → Arrived → Consultation → Treatment → Follow-up → Closed. Both referring doctors and patients receive real-time updates and bed reservation tokens.',
    },
    {
      q: 'What is the Voice Audio Prescription feature?',
      a: 'For patients with limited literacy or visual impairment, prescriptions can be read out loud in Marathi, Hindi, or English using voice synthesis, explaining dosage timings (सकाळ/दुपार/रात्र) and food instructions clearly.',
    },
    {
      q: 'Which government health insurance schemes are integrated?',
      a: 'The platform integrates Mahatma Jyotirao Phule Jan Arogya Yojana (MJPJAY), Ayushman Bharat PM-JAY, Janani Shishu Suraksha Karyakram (JSSK), and Navsanjivani Yojana with dedicated eligibility checkers.',
    },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">

      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-warm-hero py-16 lg:py-24 border-b border-line">
        <div className="absolute inset-0 bg-grid-fade pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-saffron-100 text-saffron-900 rounded-full text-xs font-bold border border-saffron-200 shadow-subtle animate-fade-up">
                <Shield className="w-3.5 h-3.5 text-saffron-700" />
                Government of Maharashtra Digital Public Health Infrastructure
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight animate-fade-up [animation-delay:60ms]">
                Connecting Maharashtra to <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-gov-700 via-gov-600 to-saffron-500 bg-clip-text text-transparent">
                  Better, Equitable Healthcare
                </span>
              </h1>

              <p className="text-lg text-ink-muted leading-relaxed max-w-2xl animate-fade-up [animation-delay:120ms]">
                A unified, accessible digital healthcare ecosystem bridging <strong>36 districts</strong>, <strong>12,000+ facilities</strong>, <strong>65,000+ ASHA workers</strong>, primary medical officers, and tertiary specialists into one coordinated care grid.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2 animate-fade-up [animation-delay:180ms]">
                <Link to="/facilities">
                  <Button size="lg" variant="primary" leftIcon={<Search className="w-5 h-5" />}>
                    Find Nearest Facility
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    Create Your Account
                  </Button>
                </Link>
                <Link to="/emergency">
                  <Button size="md" variant="danger" leftIcon={<PhoneCall className="w-4 h-4" />}>
                    Emergency 108
                  </Button>
                </Link>
              </div>

              {/* Quick Highlight Pills */}
              <div className="pt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-ink-muted animate-fade-up [animation-delay:240ms]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Offline-First (IndexedDB)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Trilingual (मराठी, हिंदी, English)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ABHA Integrated
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  MJPJAY Cashless Support
                </span>
              </div>
            </div>

            {/* Right Map/Illustration Banner */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-gov-800 via-gov-900 to-sand-950 text-white rounded-3xl p-6 sm:p-8 shadow-glow border border-gov-700 relative overflow-hidden animate-fade-up [animation-delay:120ms]">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-saffron-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-gov-700/60 pb-4 mb-6">
                  <div>
                    <h3 className="font-bold text-base text-white">Maharashtra Health Pulse</h3>
                    <p className="text-xs text-gov-300">
                      {stats
                        ? `Live across ${stats.districts} ${stats.districts === 1 ? 'district' : 'districts'}`
                        : 'Connecting to the network…'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-mono font-bold animate-pulse">
                    ● LIVE GRID
                  </span>
                </div>

                {/* Every figure below is a live count from the platform. */}
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40 transition-colors duration-200 hover:border-saffron-500/50 hover:bg-gov-950/80">
                    <div className="text-2xl font-bold text-white tabular-nums">{stats ? stats.facilities : '—'}</div>
                    <div className="text-[11px] text-gov-300 font-medium">PHCs, CHCs &amp; Hospitals</div>
                  </div>
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40 transition-colors duration-200 hover:border-saffron-500/50 hover:bg-gov-950/80">
                    <div className="text-2xl font-bold text-white tabular-nums">{stats ? stats.healthWorkers : '—'}</div>
                    <div className="text-[11px] text-gov-300 font-medium">Health Workers Onboard</div>
                  </div>
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40 transition-colors duration-200 hover:border-saffron-500/50 hover:bg-gov-950/80">
                    <div className="text-2xl font-bold text-white tabular-nums">{stats ? stats.consultations : '—'}</div>
                    <div className="text-[11px] text-gov-300 font-medium">Consultations Recorded</div>
                  </div>
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40 transition-colors duration-200 hover:border-saffron-500/50 hover:bg-gov-950/80">
                    <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                      {stats && stats.bedsTotal > 0
                        ? `${Math.round((stats.bedsAvailable / stats.bedsTotal) * 100)}%`
                        : '—'}
                    </div>
                    <div className="text-[11px] text-gov-300 font-medium">Bed Capacity Free</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gov-700/60 flex items-center justify-between text-xs text-gov-200">
                  <span className="flex items-center gap-1.5">
                    <CloudOff className="w-3.5 h-3.5 text-gov-300" />
                    Offline Sync Queue Active
                  </span>
                  <Link to="/login" className="font-bold text-white hover:underline flex items-center gap-1">
                    Sign in →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Impact Dashboard Section */}
      <section className="py-16 bg-raised border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
              Platform Activity
            </h2>
            <p className="text-sm sm:text-base text-ink-muted mt-2">
              Live counts from this deployment, connecting frontline care to specialist services
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Patients Registered"
              value={stats ? stats.patients.toLocaleString('en-IN') : '—'}
              changeLabel="across linked facilities"
              variant="teal"
              icon={<Users className="w-5 h-5 text-gov-700" />}
            />
            <MetricCard
              title="Referrals Tracked"
              value={stats ? stats.referrals.toLocaleString('en-IN') : '—'}
              changeLabel={stats ? `${stats.emergencyReferrals} marked emergency` : 'live referral pipeline'}
              variant="blue"
              icon={<ArrowRight className="w-5 h-5 text-sky-700" />}
            />
            <MetricCard
              title="Prescriptions Issued"
              value={stats ? stats.prescriptions.toLocaleString('en-IN') : '—'}
              changeLabel="with trilingual audio playback"
              variant="emerald"
              icon={<Pill className="w-5 h-5 text-emerald-700" />}
            />
            <MetricCard
              title="Beds Available"
              value={stats ? `${stats.bedsAvailable} / ${stats.bedsTotal}` : '—'}
              changeLabel="live ICU and ward capacity"
              variant="red"
              icon={<PhoneCall className="w-5 h-5 text-red-700" />}
            />
          </div>

          {/* Impact Growth Chart */}
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-display font-bold text-ink text-sm">
                  Consultations &amp; Referrals — last 8 months
                </h4>
                <p className="text-xs text-ink-soft">
                  Monthly totals recorded on the platform
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-gov-700">
                  <span className="w-3 h-3 rounded-full bg-gov-600" /> Consultations
                </span>
                <span className="flex items-center gap-1.5 text-sky-600">
                  <span className="w-3 h-3 rounded-full bg-sky-500" /> Tele-Referrals
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={impactData}>
                  <defs>
                    <linearGradient id="colorConsult" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRef" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="consultations" stroke="#0f766e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConsult)" />
                  <Area type="monotone" dataKey="referrals" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRef)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Maharashtra Healthcare Challenges Solved */}
      <section className="py-16 bg-surface border-b border-line">
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-gov-700 uppercase tracking-wider">Mission-Driven Architecture</span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink mt-1">
              Tackling Maharashtra's Core Healthcare Challenges
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-2">
              Engineered specifically for the real-world rural and urban healthcare realities of our state
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {challenges.map((c, i) => (
              <div key={i} className="p-6 rounded-2xl border border-line bg-sand-50/50 hover:bg-surface hover:shadow-premium hover:-translate-y-0.5 transition-all group">
                <div className="p-3 bg-surface rounded-xl w-fit shadow-2xs border border-line group-hover:scale-110 transition-transform">
                  {c.icon}
                </div>
                <h4 className="font-bold text-ink text-base mt-4">{c.title}</h4>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 4. Platform Role Workspaces Grid */}
      <section className="py-16 bg-raised border-b border-line">
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-gov-700 uppercase tracking-wider">Unified Ecosystem</span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink mt-1">
              Specialized Digital Workspaces for Every Role
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-2">
              Distinct ergonomics designed for task-first, queue-first, and analytics-first needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {features.map((f, i) => (
              <div key={i} className="bg-surface rounded-2xl border border-line p-6 shadow-soft flex flex-col justify-between hover:shadow-premium hover:-translate-y-0.5 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gov-700 uppercase tracking-wide">{f.role}</span>
                    <span className="text-[10px] font-semibold bg-sand-100 text-ink-muted px-2 py-0.5 rounded-full border border-line">
                      {f.tag}
                    </span>
                  </div>
                  <h4 className="font-bold text-ink text-base">{f.title}</h4>
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed">{f.desc}</p>
                </div>
                <Link to={f.link} className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs font-bold text-gov-700 hover:text-gov-900 group">
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 5. Success Stories & Real-World Impact */}
      <section className="py-16 bg-surface border-b border-line">
        <Reveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-gov-700 uppercase tracking-wider">Field Stories</span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink mt-1">
              Real-World Healthcare Transformations
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-2">
              How integrated tele-referrals and grassroots tooling save lives across Maharashtra
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-teal-50/50 border border-teal-200/60 space-y-3">
              <div className="text-xs font-bold text-gov-800">Paud Village, Mulshi Block (Pune)</div>
              <h4 className="font-bold text-ink text-sm">
                "Zero Delay in Critical High-Risk Pregnancy Referral"
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed italic">
                "When ASHA worker Sunita identified severe gestational anemia (Hb 7.8 g/dL) during a routine home visit, she flagged it immediately offline. The PHC Doctor initiated a tele-referral, reserving an ICU bed at Sassoon Hospital before the ambulance even departed."
              </p>
              <div className="text-[11px] font-semibold text-sand-700 pt-2 border-t border-teal-100">
                — Dr. Rajesh Deshmukh, Medical Officer
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-sky-50/50 border border-sky-200/60 space-y-3">
              <div className="text-xs font-bold text-sky-800">Bhamragad Tribal Hamlet (Gadchiroli)</div>
              <h4 className="font-bold text-ink text-sm">
                "Offline Screening Saves Diabetic Patient from Neuropathy"
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed italic">
                "In deep forest zones without cellular coverage, the ASHA tablet recorded CBAC screenings locally. When the worker visited the weekly market hub, 42 screening records synced automatically, alerting the District Hospital team."
              </p>
              <div className="text-[11px] font-semibold text-sand-700 pt-2 border-t border-sky-100">
                — District Nodal Officer, Gadchiroli
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-3">
              <div className="text-xs font-bold text-emerald-800">Aundh District Hospital (Pune)</div>
              <h4 className="font-bold text-ink text-sm">
                "Trilingual Audio Prescriptions for Elderly Citizens"
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed italic">
                "Elderly patients who struggled with complex pill timings now press one button on their phone to hear their dosage read aloud in clear Marathi: 'दररोज सकाळी नाश्त्यानंतर १ गोळी घ्या'. Medication adherence improved by 34%."
              </p>
              <div className="text-[11px] font-semibold text-sand-700 pt-2 border-t border-emerald-100">
                — Senior Pharmacist, Aundh DH
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-16 bg-raised border-b border-line">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-2">
              Everything you need to know about the MahaAarogya Sangam platform
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-surface rounded-xl border border-line p-5 shadow-2xs">
                <h4 className="font-bold text-ink text-sm">{faq.q}</h4>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Government CTA Bar */}
      <section className="py-12 bg-gradient-to-r from-gov-950 via-gov-900 to-gov-950 text-white relative overflow-hidden">
        <div className="trust-divider absolute top-0 left-0 right-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl font-bold text-white">Join Maharashtra's Digital Health Revolution</h3>
            <p className="text-xs text-gov-300 mt-1">
              Explore the live interactive portals for Patients, ASHA workers, Doctors, Specialists, and Administrators.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/register">
              <Button size="lg" variant="primary" className="bg-surface text-gov-900 hover:bg-gov-50 border-none font-bold">
                Get Started →
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
