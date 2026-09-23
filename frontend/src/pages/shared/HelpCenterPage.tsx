import React, { useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { HelpCircle, Search, BookOpen, FileText, Phone, MessageSquare, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

export const HelpCenterPage: React.FC = () => {
  const toast = useToast();
  const { currentRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does offline data saving work for ASHA workers?',
      a: 'When an ASHA worker creates a patient, records an ANC visit, or enters a screening result in a non-network zone, the record is immediately saved locally in IndexedDB with a "pending" sync tag. As soon as connectivity returns, the background sync manager uploads the queued mutations.',
    },
    {
      q: 'How do Doctors track referrals to tertiary hospitals?',
      a: 'In the Doctor Referral Center every referral shows its current stage (Sent → Accepted → In Transit → Arrived → In Consultation → Completed) with the history of who moved it and when. The receiving specialist can allocate a bed when accepting.',
    },
    {
      q: 'How can Patients listen to voice prescriptions in Marathi?',
      a: 'Navigate to "My Prescriptions" or "Voice Prescription" in the Patient portal and press "Listen in मराठी". The system will read out the medicine names, dosage timings (सकाळ/दुपार/रात्र), and food directions using native speech synthesis.',
    },
    {
      q: 'How do Specialists allocate ICU beds?',
      a: 'In the Specialist Referral Queue, clicking "Accept & Allocate Bed" brings up the live department bed roster (General, ICU, Ventilator) to assign an exact bed number before the patient arrives via 108 ambulance.',
    },
  ];

  // Short how-to guides for this app, written from its actual screens.
  const guides = [
    { title: 'ASHA: registering a pregnancy and recording ANC visits', role: 'ASHA', steps: [
      'Open Maternal Care and press "Register Pregnancy". Enter the woman\'s details, LMP date and any risk factors.',
      'At each check-up press "ANC Visit" on her card and record BP, weight and haemoglobin.',
      'Hb below 7 g/dL or systolic BP of 140 or more flags the pregnancy as high risk and alerts the PHC.',
      'Without network the record is saved on the phone and sent automatically once you are back online (Offline Sync).',
    ] },
    { title: 'Doctor: consultation and e-prescription', role: 'Doctor', steps: [
      'Call the next token from the OPD Queue, or open Consultation and choose the patient.',
      'Fill in complaints, vitals, diagnosis and ICD code, then add medicines with dose, frequency and quantity.',
      'Allergy warnings appear above the form if a medicine clashes with the patient\'s record.',
      'Press "Sign & Issue E-Prescription". The patient sees it, with audio instructions, in their portal.',
    ] },
    { title: 'Specialist: referrals, consultations and treatment plans', role: 'Specialist', steps: [
      'Accept incoming referrals from the Referral Queue and allocate a bed if the patient needs admission.',
      'In Consultations mark the patient as arrived, start the consultation and complete it with your advice.',
      'Write a Treatment Plan with phases and target dates. The PHC doctor ticks phases off; Follow-ups lists the next step of each plan.',
    ] },
    { title: 'Admin: facilities, stock and reports', role: 'Admin', steps: [
      'Register or edit facilities in Facility Management; beds and staff counts come from the live records.',
      'Health Signals lists referral delays, stock-outs and maternal risks found in the data, each with its evidence.',
      'Reports builds CSV exports from current records. Every export is written to the audit log.',
    ] },
    { title: 'Patient: appointments, prescriptions and SOS', role: 'Patient', steps: [
      'Book an appointment by choosing a facility and one of its doctors.',
      'Prescriptions shows every e-prescription, and the audio player reads it out in Marathi, Hindi or English.',
      'In an emergency call 108 from the Emergency page; "Alert my ASHA" pages your ASHA worker with your location.',
    ] },
  ];

  const [openGuide, setOpenGuide] = useState<(typeof guides)[number] | null>(null);
  const term = searchQuery.trim().toLowerCase();
  const matches = (text: string) => !term || text.toLowerCase().includes(term);
  const shownFaqs = faqs.filter((f) => matches(f.q) || matches(f.a));
  const shownGuides = guides.filter((g) => matches(g.title) || g.steps.some(matches));

  const printGuide = (g: (typeof guides)[number]) => {
    const win = window.open('', '_blank', 'width=760,height=800');
    if (!win) {
      toast.error('Pop-up blocked', 'Allow pop-ups for this site to print the guide.');
      return;
    }
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(g.title)}</title>
      <style>body{font-family:system-ui,sans-serif;margin:32px;line-height:1.6}h1{font-size:20px}</style></head>
      <body><h1>${esc(g.title)}</h1><ol>${g.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'Help Center & Knowledge Base' },
        ]}
      />

      <div className="text-center max-w-2xl mx-auto space-y-3 py-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center justify-center gap-2">
          <HelpCircle className="w-7 h-7 text-gov-700" />
          MahaAarogya Knowledge Base & Support
        </h1>
        <p className="text-xs sm:text-sm text-ink-soft">
          Find operational manuals, offline troubleshooting, and technical escalation contacts
        </p>

        <SearchInput
          placeholder="Search support articles, manuals, error codes..."
          onChange={setSearchQuery}
          className="max-w-md mx-auto pt-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
        {/* FAQs */}
        <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
            Operational FAQs
          </h3>

          <div className="space-y-2">
            {shownFaqs.length === 0 && <p className="text-xs text-ink-soft">No questions match "{searchQuery}".</p>}
            {shownFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-line rounded-xl overflow-hidden text-xs"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full p-3.5 bg-sand-50 font-bold text-ink flex items-center justify-between text-left hover:bg-sand-100 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-ink-soft transition-transform ${
                      expandedFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === idx && (
                  <div className="p-4 bg-surface text-ink-muted leading-relaxed border-t border-line">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Training Manuals & Escalation */}
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
              How-to Guides
            </h3>

            <div className="space-y-2.5">
              {shownGuides.length === 0 && <p className="text-xs text-ink-soft">No guides match "{searchQuery}".</p>}
              {shownGuides.map((g) => (
                <div
                  key={g.title}
                  className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h5 className="font-bold text-ink">{g.title}</h5>
                    <span className="text-[11px] text-ink-soft">{g.role} • {g.steps.length} steps</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpenGuide(g)}>
                    Read
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gov-900 text-white rounded-2xl p-6 shadow-lg space-y-3">
            <h3 className="font-bold text-sm text-white">Need help with the app?</h3>
            <p className="text-xs text-gov-200 leading-relaxed">
              Message your PHC or district administrator from Messages. For medical advice call the 104 health
              helpline, and for an emergency call 108.
            </p>
            <div className="text-xs pt-1 flex items-center justify-between gap-3 flex-wrap">
              <Link to="/messages" className="font-bold underline">Open Messages</Link>
              <span className="font-bold">📞 <a href="tel:104" className="underline">104</a> • <a href="tel:108" className="underline">108</a></span>
            </div>
          </div>

          <Modal isOpen={!!openGuide} onClose={() => setOpenGuide(null)} title={openGuide?.title ?? ''} size="md">
            {openGuide && (
              <div className="space-y-4 text-xs text-ink leading-relaxed">
                <ol className="list-decimal pl-5 space-y-2">
                  {openGuide.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
                <Button size="sm" variant="outline" onClick={() => printGuide(openGuide)}>
                  Print or save as PDF
                </Button>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
};
