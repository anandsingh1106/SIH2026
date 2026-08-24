import React from 'react';
import { Link } from 'react-router-dom';
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
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const HomePage: React.FC = () => {
  const impactData = [
    { month: 'Jan', consultations: 12000, referrals: 1800 },
    { month: 'Feb', consultations: 18500, referrals: 2400 },
    { month: 'Mar', consultations: 24000, referrals: 3100 },
    { month: 'Apr', consultations: 32000, referrals: 4200 },
    { month: 'May', consultations: 41000, referrals: 5600 },
    { month: 'Jun', consultations: 52000, referrals: 7100 },
    { month: 'Jul', consultations: 68000, referrals: 8900 },
    { month: 'Aug', consultations: 84500, referrals: 11200 },
  ];

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
    <div className="min-h-screen bg-white flex flex-col antialiased">

      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gov-50/70 via-white to-white py-16 lg:py-24 border-b border-slate-100">
        <div className="absolute inset-0 bg-grid-fade pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gov-100/80 text-gov-800 rounded-full text-xs font-bold border border-gov-200 shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-gov-700" />
                Government of Maharashtra Digital Public Health Infrastructure
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Connecting Maharashtra to <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-gov-700 via-gov-600 to-emerald-600 bg-clip-text text-transparent">
                  Better, Equitable Healthcare
                </span>
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                A unified, accessible digital healthcare ecosystem bridging <strong>36 districts</strong>, <strong>12,000+ facilities</strong>, <strong>65,000+ ASHA workers</strong>, primary medical officers, and tertiary specialists into one coordinated care grid.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/facilities">
                  <Button size="lg" variant="primary" leftIcon={<Search className="w-5 h-5" />}>
                    Find Nearest Facility
                  </Button>
                </Link>
                <Link to="/select-role">
                  <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    Explore Role Workspaces
                  </Button>
                </Link>
                <Link to="/emergency">
                  <Button size="md" variant="danger" leftIcon={<PhoneCall className="w-4 h-4" />}>
                    Emergency 108
                  </Button>
                </Link>
              </div>

              {/* Quick Highlight Pills */}
              <div className="pt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
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
              <div className="bg-gradient-to-br from-gov-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-glow border border-gov-700 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-gov-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-gov-700/60 pb-4 mb-6">
                  <div>
                    <h3 className="font-bold text-base text-white">Maharashtra Health Pulse</h3>
                    <p className="text-xs text-gov-300">Live Telemetry Across 36 Districts</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-mono font-bold animate-pulse">
                    ● LIVE GRID
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40">
                    <div className="text-2xl font-bold text-white">12,450+</div>
                    <div className="text-[11px] text-gov-300 font-medium">PHCs, CHCs & Hospitals</div>
                  </div>
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40">
                    <div className="text-2xl font-bold text-white">65,800+</div>
                    <div className="text-[11px] text-gov-300 font-medium">Active ASHA Workers</div>
                  </div>
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40">
                    <div className="text-2xl font-bold text-white">18,200+</div>
                    <div className="text-[11px] text-gov-300 font-medium">Doctors & Specialists</div>
                  </div>
                  <div className="bg-gov-950/60 p-3.5 rounded-xl border border-gov-700/40">
                    <div className="text-2xl font-bold text-emerald-400">98.4%</div>
                    <div className="text-[11px] text-gov-300 font-medium">Referral Transit Safety</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gov-700/60 flex items-center justify-between text-xs text-gov-200">
                  <span className="flex items-center gap-1.5">
                    <CloudOff className="w-3.5 h-3.5 text-gov-300" />
                    Offline Sync Queue Active
                  </span>
                  <Link to="/select-role" className="font-bold text-white hover:underline flex items-center gap-1">
                    Try Demo Mode →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Impact Dashboard Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
              State-Wide Healthcare Impact & Performance
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Real-time aggregated metrics connecting primary frontline care to super-specialty interventions
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Total Patients Served"
              value="1,482,900+"
              change={18.4}
              changeLabel="increase in rural coverage"
              variant="teal"
              icon={<Users className="w-5 h-5 text-gov-700" />}
            />
            <MetricCard
              title="Active Tele-Referrals"
              value="11,240"
              change={12.1}
              changeLabel="average transit < 45 mins"
              variant="blue"
              icon={<ArrowRight className="w-5 h-5 text-sky-700" />}
            />
            <MetricCard
              title="Essential Drugs Tracked"
              value="4,850,000"
              change={-2.4}
              changeLabel="stockout risk minimized"
              variant="emerald"
              icon={<Pill className="w-5 h-5 text-emerald-700" />}
            />
            <MetricCard
              title="Emergency Transfers"
              value="9,420"
              change={24.6}
              changeLabel="via 108 ambulance grid"
              variant="red"
              icon={<PhoneCall className="w-5 h-5 text-red-700" />}
            />
          </div>

          {/* Impact Growth Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-display font-bold text-slate-800 text-sm">Monthly Consultations & Tele-Referrals Trend (2026)</h4>
                <p className="text-xs text-slate-500">Longitudinal service volume expansion across Maharashtra</p>
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
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-gov-700 uppercase tracking-wider">Mission-Driven Architecture</span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Tackling Maharashtra's Core Healthcare Challenges
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Engineered specifically for the real-world rural and urban healthcare realities of our state
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((c, i) => (
              <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-premium hover:-translate-y-0.5 transition-all group">
                <div className="p-3 bg-white rounded-xl w-fit shadow-2xs border border-slate-200 group-hover:scale-110 transition-transform">
                  {c.icon}
                </div>
                <h4 className="font-bold text-slate-900 text-base mt-4">{c.title}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Platform Role Workspaces Grid */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-gov-700 uppercase tracking-wider">Unified Ecosystem</span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Specialized Digital Workspaces for Every Role
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Distinct ergonomics designed for task-first, queue-first, and analytics-first needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft flex flex-col justify-between hover:shadow-premium hover:-translate-y-0.5 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gov-700 uppercase tracking-wide">{f.role}</span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {f.tag}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{f.title}</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
                </div>
                <Link to={f.link} className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-gov-700 hover:text-gov-900 group">
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Success Stories & Real-World Impact */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-gov-700 uppercase tracking-wider">Field Stories</span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Real-World Healthcare Transformations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              How integrated tele-referrals and grassroots tooling save lives across Maharashtra
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-teal-50/50 border border-teal-200/60 space-y-3">
              <div className="text-xs font-bold text-gov-800">Paud Village, Mulshi Block (Pune)</div>
              <h4 className="font-bold text-slate-900 text-sm">
                "Zero Delay in Critical High-Risk Pregnancy Referral"
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "When ASHA worker Sunita identified severe gestational anemia (Hb 7.8 g/dL) during a routine home visit, she flagged it immediately offline. The PHC Doctor initiated a tele-referral, reserving an ICU bed at Sassoon Hospital before the ambulance even departed."
              </p>
              <div className="text-[11px] font-semibold text-slate-700 pt-2 border-t border-teal-100">
                — Dr. Rajesh Deshmukh, Medical Officer
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-sky-50/50 border border-sky-200/60 space-y-3">
              <div className="text-xs font-bold text-sky-800">Bhamragad Tribal Hamlet (Gadchiroli)</div>
              <h4 className="font-bold text-slate-900 text-sm">
                "Offline Screening Saves Diabetic Patient from Neuropathy"
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "In deep forest zones without cellular coverage, the ASHA tablet recorded CBAC screenings locally. When the worker visited the weekly market hub, 42 screening records synced automatically, alerting the District Hospital team."
              </p>
              <div className="text-[11px] font-semibold text-slate-700 pt-2 border-t border-sky-100">
                — District Nodal Officer, Gadchiroli
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-3">
              <div className="text-xs font-bold text-emerald-800">Aundh District Hospital (Pune)</div>
              <h4 className="font-bold text-slate-900 text-sm">
                "Trilingual Audio Prescriptions for Elderly Citizens"
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "Elderly patients who struggled with complex pill timings now press one button on their phone to hear their dosage read aloud in clear Marathi: 'दररोज सकाळी नाश्त्यानंतर १ गोळी घ्या'. Medication adherence improved by 34%."
              </p>
              <div className="text-[11px] font-semibold text-slate-700 pt-2 border-t border-emerald-100">
                — Senior Pharmacist, Aundh DH
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Everything you need to know about the MahaAarogya Sangam platform
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <h4 className="font-bold text-slate-900 text-sm">{faq.q}</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{faq.a}</p>
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
            <Link to="/select-role">
              <Button size="lg" variant="primary" className="bg-white text-gov-900 hover:bg-gov-50 border-none font-bold">
                Launch Role Workspaces →
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
