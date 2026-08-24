import React from 'react';
import { PhoneCall, AlertOctagon, Heart, Zap, Stethoscope, ShieldAlert, Navigation, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const EmergencyPage: React.FC = () => {
  const hotlines = [
    { number: '108', title: 'Free 24x7 Ambulance & Trauma Dispatch', desc: 'Emergency response for severe road accidents, acute heart attacks, strokes, respiratory failure, and snakebites with GPS dispatch.', color: 'bg-red-600 hover:bg-red-700 text-white' },
    { number: '102', title: 'Maternal & Sick Infant Transport (JSSK)', desc: 'Dedicated cashless transport for pregnant women in labour, post-delivery drop-back, and sick infants under 1 year.', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { number: '104', title: 'State Health Advice & Triage Helpline', desc: 'Consult registered government doctors and counsellors for fever guidance, mental health support, and poison advice.', color: 'bg-gov-700 hover:bg-gov-800 text-white' },
    { number: '112', title: 'National Emergency Unified Response', desc: 'Police, Fire, Disaster Management, and multi-agency coordination.', color: 'bg-slate-800 hover:bg-slate-900 text-white' },
  ];

  const firstResponseProtocols = [
    {
      title: '🐍 Snakebite First-Response Protocol',
      steps: [
        'Keep the victim calm and strictly IMMOBILIZE the affected limb with a splint.',
        'DO NOT cut, suction, apply tourniquets, or electric shock (causes tissue necrosis).',
        'Remove rings, tight bracelets, or footwear before swelling occurs.',
        'Call 108 IMMEDIATELY for transport to the nearest PHC/Civil Hospital with Anti-Snake Venom (ASVS).',
      ],
      warning: 'Anti-Snake Venom is available 100% free across all Government PHCs and District Hospitals.',
    },
    {
      title: '🫀 Suspected Heart Attack (Acute Coronary Syndrome)',
      steps: [
        'Recognize symptoms: Crushing chest pain radiating to left arm/jaw, cold sweats, breathlessness.',
        'Sit or lie the patient down in a comfortable position (head elevated).',
        'If available and prescribed, give Aspirin 300mg chewable immediately.',
        'Call 108 stating "Suspected Cardiac Emergency" to dispatch an Advanced Life Support (ALS) vehicle.',
      ],
      warning: 'Apex Cath Labs and free Thrombolysis (Tenecteplase) are provided under MJPJAY.',
    },
    {
      title: '🧠 Acute Stroke (FAST Protocol)',
      steps: [
        'F — Face Drooping: Ask person to smile. Does one side of the face droop?',
        'A — Arm Weakness: Ask person to raise both arms. Does one arm drift downward?',
        'S — Speech Difficulty: Is speech slurred or strange?',
        'T — Time to call 108: Golden window for clot-busting therapy is within 4.5 hours.',
      ],
      warning: 'Inform dispatch to route to a designated Stroke-Ready Center with CT Scan.',
    },
    {
      title: '🤰 Maternal Obstetric Emergency',
      steps: [
        'Danger signs: Severe vaginal bleeding, fits/convulsions, severe headache with blurred vision, high fever.',
        'Position the pregnant mother in the Left Lateral position to maximize fetal blood supply.',
        'Keep airways clear if mother has convulsions (eclampsia). Do not force objects into mouth.',
        'Dial 108/102 immediately with urgent hospital transfer escort.',
      ],
      warning: 'Cashless emergency C-section and blood transfusion guaranteed under JSSK.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        {/* High-Alert Header */}
        <div className="bg-red-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-red-700 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-bold tracking-wider uppercase">
              <AlertOctagon className="w-4 h-4 animate-bounce" />
              Maharashtra 24x7 Emergency Response Hub
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Dial 108 for Immediate Ambulance & Trauma Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-red-100 max-w-2xl">
              Free emergency medical response covering all 36 districts with Advanced Life Support (ALS) & Basic Life Support (BLS) GPS-tracked fleets.
            </p>
          </div>

          <a
            href="tel:108"
            className="px-8 py-4 bg-white text-red-700 font-extrabold text-xl rounded-2xl shadow-2xl hover:bg-red-50 transition-all flex items-center gap-3 active:scale-95 shrink-0"
          >
            <PhoneCall className="w-7 h-7 fill-red-600 animate-pulse" />
            <span>CALL 108 NOW</span>
          </a>
        </div>

        {/* Hotlines Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hotlines.map((h) => (
            <div
              key={h.number}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{h.number}</div>
                <h4 className="font-bold text-slate-800 text-sm mt-1">{h.title}</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{h.desc}</p>
              </div>
              <a
                href={`tel:${h.number}`}
                className={`mt-4 w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${h.color}`}
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call {h.number}
              </a>
            </div>
          ))}
        </div>

        {/* First-Response Clinical Protocols */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Standard First-Response Protocols While Waiting for 108 Ambulance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evidence-based pre-hospital instructions approved by the Directorate of Health Services, Maharashtra.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {firstResponseProtocols.map((p, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">{p.title}</h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {p.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="font-bold text-gov-700 shrink-0">{sIdx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <div className="p-2.5 bg-gov-50 border border-gov-200 rounded-lg text-[11px] font-semibold text-gov-900">
                  ℹ️ {p.warning}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
