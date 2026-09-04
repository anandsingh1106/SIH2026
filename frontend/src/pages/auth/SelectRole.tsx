import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '@arogyasetu/shared/types';
import { Shield, Sparkles, Users, Stethoscope, BedDouble, Building2, User, ArrowRight } from 'lucide-react';

export const SelectRolePage: React.FC = () => {
  const navigate = useNavigate();

  const personas = [
    {
      role: 'asha' as UserRole,
      title: 'ASHA Frontline Health Worker',
      titleMr: 'आशा आरोग्य सेविका',
      name: 'Sunita Gaikwad',
      facility: 'PHC Paud Subcenter, Mulshi Block (Pune District)',
      desc: 'Task-first, mobile-first, and 100% offline-capable. Manage village household maps, conduct maternal ANC visits, execute CBAC NCD surveys, track vaccinations, and issue emergency 108 tele-referrals.',
      features: ['Offline IndexedDB Storage', 'Village Household Map', 'ANC & Immunization Tracker', '9-Stage Referral Dispatch'],
      icon: <Users className="w-8 h-8 text-teal-600" />,
      color: 'border-teal-300 hover:border-teal-500 bg-teal-50/30',
      btnColor: 'bg-teal-700 hover:bg-teal-800 text-white',
      path: '/asha/dashboard',
    },
    {
      role: 'doctor' as UserRole,
      title: 'Primary Care Medical Officer',
      titleMr: 'वैद्यकीय अधिकारी',
      name: 'Dr. Rajesh Deshmukh (MBBS, DCH)',
      facility: 'Primary Health Center (PHC) Paud Clinic',
      desc: 'Information-dense clinical consultation station. Manage live OPD queue tokens, review longitudinal EHR histories, utilize explainable AI triage, execute e-prescriptions with allergy checks, and trigger tele-consults.',
      features: ['Live Token Queue', 'Longitudinal EHR Timeline', 'Explainable AI Triage', 'Formulary Drug-Allergy Checker'],
      icon: <Stethoscope className="w-8 h-8 text-sky-600" />,
      color: 'border-sky-300 hover:border-sky-500 bg-sky-50/30',
      btnColor: 'bg-sky-700 hover:bg-sky-800 text-white',
      path: '/doctor/dashboard',
    },
    {
      role: 'specialist' as UserRole,
      title: 'Tertiary Care Specialist',
      titleMr: 'तज्ज्ञ सल्लागार (हृदयरोग व अतिदक्षता)',
      name: 'Dr. Priya Kulkarni (MD, DM Cardiology)',
      facility: 'B.J. Govt Medical College & Sassoon General Hospital, Pune',
      desc: 'Apex referral triage and critical care bed coordination. Prioritize incoming tele-referrals, reserve ICU/Ventilator beds, author structured surgical treatment plans, and coordinate downward discharge follow-ups.',
      features: ['Tertiary Referral Queue', 'Live ICU Bed Allocation', 'Multi-Phase Treatment Plans', 'Discharge Summary Dispatch'],
      icon: <BedDouble className="w-8 h-8 text-indigo-600" />,
      color: 'border-indigo-300 hover:border-indigo-500 bg-indigo-50/30',
      btnColor: 'bg-indigo-700 hover:bg-indigo-800 text-white',
      path: '/specialist/dashboard',
    },
    {
      role: 'admin' as UserRole,
      title: 'State Health Command Administrator',
      titleMr: 'राज्य आरोग्य संचालक',
      name: 'Shri Sanjay Shinde, IAS',
      facility: 'Directorate of Health Services, Arogya Bhavan, Mumbai',
      desc: 'High-level command center with 36-district health intelligence. Monitor live disease outbreak heatmaps (Dengue, Malaria), state drug buffer inventories, doctor allocations, and NHM/MJPJAY compliance.',
      features: ['36-District KPI Grid', 'Disease Hotspot Heatmaps', 'Central Supply Chain Buffer', 'Governance Audit Trails'],
      icon: <Building2 className="w-8 h-8 text-purple-600" />,
      color: 'border-purple-300 hover:border-purple-500 bg-purple-50/30',
      btnColor: 'bg-purple-700 hover:bg-purple-800 text-white',
      path: '/admin/dashboard',
    },
    {
      role: 'patient' as UserRole,
      title: 'Citizen / Patient Portal',
      titleMr: 'नागरिक / रुग्ण आरोग्य खाते',
      name: 'Ramesh Tukaram Patil',
      facility: 'ABHA ID: 91-4521-8890-1200 (Paud Village, Pune)',
      desc: 'Accessible, reassuring personal health record. View digital prescriptions, listen to dosages in Marathi or Hindi voice audio, monitor diagnostic lab values, track referral transit, and book OPD visits.',
      features: ['Trilingual Voice Audio Rx', 'Diagnostic Lab Range Tracker', 'Referral Live Progress', 'Multi-Profile Family Records'],
      icon: <User className="w-8 h-8 text-emerald-600" />,
      color: 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/30',
      btnColor: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      path: '/patient/dashboard',
    },
  ];

  const handleSelect = (p: (typeof personas)[0]) => {
    navigate('/register', { state: { role: p.role } });
  };

  return (
    <div className="min-h-screen bg-sand-50 py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gov-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-ink text-xl tracking-tight">
              MahaAarogya Sangam
            </span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gov-100 text-gov-800 rounded-full text-xs font-bold border border-gov-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Choose Your Role
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Choose a Healthcare Persona to Register As
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            MahaAarogya Sangam features dedicated, ergonomically distinct workspaces for each participant in Maharashtra's public healthcare ecosystem. Pick a role to create your account.
          </p>
        </div>

        {/* Personas Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {personas.map((p) => (
            <div
              key={p.role}
              className={`rounded-2xl border-2 p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-card ${p.color}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-surface rounded-xl shadow-2xs border border-line">
                    {p.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-surface px-2.5 py-1 rounded-full border border-line text-sand-700">
                    {p.role}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-ink leading-snug">{p.title}</h3>
                  <p className="text-xs text-ink-soft font-medium">{p.titleMr}</p>
                  <div className="mt-2 text-xs font-semibold text-gov-800 bg-white/80 p-2 rounded-lg border border-line/80">
                    {p.name} <br />
                    <span className="text-[11px] font-normal text-ink-soft">{p.facility}</span>
                  </div>
                </div>

                <p className="text-xs text-ink-muted leading-relaxed">{p.desc}</p>

                <div className="space-y-1.5 pt-2 border-t border-line/60">
                  <div className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                    Core Capabilities:
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-sand-700">
                    {p.features.map((f, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gov-600 shrink-0" />
                        <span className="truncate">{f}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4">
                <button
                  onClick={() => handleSelect(p)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${p.btnColor}`}
                >
                  <span>Register as {p.role.toUpperCase()}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
