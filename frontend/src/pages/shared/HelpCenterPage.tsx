import React, { useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { HelpCircle, Search, BookOpen, FileText, Phone, MessageSquare, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';

export const HelpCenterPage: React.FC = () => {
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
      a: 'In the Doctor Referral Center, every outward referral displays a live 9-stage stepper (Created → Accepted → In Transit → Arrived → Consultation → Treatment → Follow-up → Closed) alongside reserved bed tokens at receiving medical colleges.',
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

  const guides = [
    { title: 'ASHA Field Manual: Maternal Danger Signs (Marathi/English)', role: 'ASHA', pages: '14 Pages PDF' },
    { title: 'Medical Officer ICD-11 & E-Prescription Standard Workflow', role: 'Doctor', pages: '8 Pages PDF' },
    { title: 'Tertiary Bed Management & Discharge Summary Protocol', role: 'Specialist', pages: '10 Pages PDF' },
    { title: 'State Epidemiological Anomaly & Heatmap User Guide', role: 'Admin', pages: '18 Pages PDF' },
  ];

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
            {faqs.map((faq, idx) => (
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
              Official SOPs & Training Manuals
            </h3>

            <div className="space-y-2.5">
              {guides.map((g, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-sand-50 border border-line rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h5 className="font-bold text-ink">{g.title}</h5>
                    <span className="text-[11px] text-ink-soft">{g.role} • {g.pages}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => alert(`Downloading manual: ${g.title}`)}
                  >
                    Download PDF
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gov-900 text-white rounded-2xl p-6 shadow-lg space-y-3">
            <h3 className="font-bold text-sm text-white">Need Technical Support / Issue Escalation?</h3>
            <p className="text-xs text-gov-200 leading-relaxed">
              Our 24x7 State Health IT Helpdesk assists with offline sync errors, ABHA authentication failures, and portal access.
            </p>
            <div className="text-xs pt-1 flex items-center justify-between">
              <span className="font-bold">📞 Toll-Free: 1800 233 2200</span>
              <span className="text-gov-300">helpdesk.arogya@maharashtra.gov.in</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
