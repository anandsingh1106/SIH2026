import React, { useState } from 'react';
import { HEALTH_PROGRAMS_DATA } from '../../data/mockData';
import { Shield, FileCheck, Phone, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const HealthProgramsPage: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState<(typeof HEALTH_PROGRAMS_DATA)[0] | null>(null);

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col antialiased">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-gov-700" />
            Government Healthcare Schemes & Financial Protection Programs
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Cashless super-specialty treatment, maternal entitlements, and tribal health missions across Maharashtra.
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
          {HEALTH_PROGRAMS_DATA.map((prog) => (
            <div
              key={prog.id}
              className="bg-surface rounded-2xl border border-line p-6 shadow-xs flex flex-col justify-between hover:shadow-card transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="primary" size="sm">
                      {prog.coverageAmount}
                    </Badge>
                    <h3 className="font-bold text-ink text-base mt-2">{prog.name}</h3>
                    {prog.nameMr && <p className="text-xs text-ink-soft font-medium">{prog.nameMr}</p>}
                  </div>
                </div>

                <p className="text-xs text-ink-muted leading-relaxed">{prog.description}</p>

                <div className="bg-sand-50 p-3 rounded-xl border border-line space-y-1.5 text-xs">
                  <div className="font-semibold text-ink">Target Beneficiaries:</div>
                  <div className="text-ink-muted">{prog.beneficiaries}</div>
                </div>

                <div>
                  <div className="text-xs font-bold text-sand-700 uppercase tracking-wider mb-2">
                    Key Entitlements & Coverage:
                  </div>
                  <ul className="space-y-1 text-xs text-ink-muted">
                    {prog.keyBenefits.map((b, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gov-600 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line flex items-center justify-between gap-3">
                <a href={`tel:${prog.helpline.split('/')[0].trim()}`} className="text-xs font-bold text-sand-700 flex items-center gap-1.5 hover:text-gov-700">
                  <Phone className="w-3.5 h-3.5 text-gov-700" />
                  <span>Helpline: {prog.helpline}</span>
                </a>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedProgram(prog)}
                >
                  View Eligibility & Documents
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Program Details Modal */}
        {selectedProgram && (
          <Modal
            isOpen={!!selectedProgram}
            onClose={() => setSelectedProgram(null)}
            title={selectedProgram.name}
            description={`Coverage: ${selectedProgram.coverageAmount} • Helpline: ${selectedProgram.helpline}`}
            size="lg"
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button variant="secondary" size="sm" onClick={() => setSelectedProgram(null)}>
                  Close
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div>
                <h5 className="font-bold text-ink uppercase tracking-wider mb-2">Required Identification Documents:</h5>
                <div className="space-y-1.5">
                  {selectedProgram.requiredDocuments.map((doc, idx) => (
                    <div key={idx} className="p-2.5 bg-sand-50 border border-line rounded-lg flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-gov-700 shrink-0" />
                      <span className="font-semibold text-ink">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-gov-50 border border-gov-200 rounded-xl text-gov-900 space-y-1">
                <div className="font-bold">Application & Cashless Claim Workflow:</div>
                <p>
                  1. Visit the dedicated <strong>Arogyamitra Helpdesk</strong> located at the entrance of any empaneled hospital.
                </p>
                <p>
                  2. Present your Ration Card / Aadhaar / ABHA ID along with the OPD referral slip.
                </p>
                <p>
                  3. The Arogyamitra initiates an online pre-authorization request within 30 minutes for zero-out-of-pocket admission.
                </p>
              </div>
            </div>
          </Modal>
        )}
      </div>

    </div>
  );
};
