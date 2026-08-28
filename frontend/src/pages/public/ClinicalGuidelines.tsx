import React, { useState } from 'react';
import { CLINICAL_GUIDELINES_DATA } from '../../data/mockData';
import { BookOpen, Search, Bookmark, Download, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const ClinicalGuidelinesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [activeGuideline, setActiveGuideline] = useState<(typeof CLINICAL_GUIDELINES_DATA)[0] | null>(null);

  const toggleBookmark = (id: string) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds(bookmarkedIds.filter((b) => b !== id));
    } else {
      setBookmarkedIds([...bookmarkedIds, id]);
    }
  };

  const filteredGuidelines = CLINICAL_GUIDELINES_DATA.filter((g) => {
    return (
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col antialiased">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-gov-700" />
            Maharashtra Standard Clinical Management Guidelines & Protocols
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Evidence-based standard treatment workflows for Primary Medical Officers, CHC clinicians, and frontline staff.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <span>
            <strong>Clinician Reference:</strong> These guidelines are intended for qualified healthcare practitioners to standardize diagnostic and therapeutic decisions across Government of Maharashtra health facilities.
          </span>
        </div>

        {/* Search */}
        <div className="bg-surface p-4 rounded-xl border border-line shadow-xs">
          <SearchInput
            placeholder="Search guidelines by disease (Hypertension, Snakebite, Maternal HRP, Dengue)..."
            onChange={setSearchQuery}
          />
        </div>

        {/* Guidelines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger">
          {filteredGuidelines.map((guide) => {
            const isBookmarked = bookmarkedIds.includes(guide.id);
            return (
              <div
                key={guide.id}
                className="bg-surface rounded-xl border border-line p-5 shadow-xs flex flex-col justify-between hover:shadow-card transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="primary" size="sm">
                        {guide.category}
                      </Badge>
                      <h3 className="font-bold text-ink text-sm mt-1.5 leading-snug">
                        {guide.title}
                      </h3>
                      <p className="text-[11px] text-ink-soft font-medium">Specialty: {guide.specialty}</p>
                    </div>
                    <button
                      onClick={() => toggleBookmark(guide.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isBookmarked ? 'bg-gov-50 text-gov-700 border-gov-300' : 'text-ink-soft border-line hover:text-sand-700'
                      }`}
                      title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Guideline'}
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-gov-700' : ''}`} />
                    </button>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-3">{guide.summary}</p>

                  <div className="flex flex-wrap gap-1">
                    {guide.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] bg-sand-100 text-ink-muted px-2 py-0.5 rounded font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-ink-soft">Updated: {guide.updatedDate}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<FileText className="w-3.5 h-3.5" />}
                      onClick={() => setActiveGuideline(guide)}
                    >
                      Read Protocol
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => alert(`Downloading official PDF for "${guide.title}"...`)}
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Protocol Viewer Modal */}
        {activeGuideline && (
          <Modal
            isOpen={!!activeGuideline}
            onClose={() => setActiveGuideline(null)}
            title={activeGuideline.title}
            description={`${activeGuideline.category} • Directorate of Health Services, Maharashtra`}
            size="xl"
            footer={
              <div className="flex justify-between items-center w-full">
                <span className="text-[11px] text-ink-soft">Version 2.4 • Effective State-Wide</span>
                <Button variant="primary" size="sm" onClick={() => setActiveGuideline(null)}>
                  Done Reading
                </Button>
              </div>
            }
          >
            <div className="space-y-4 text-xs text-ink leading-relaxed">
              <div className="bg-sand-50 p-4 rounded-xl border border-line">
                <h5 className="font-bold text-ink uppercase tracking-wider mb-1">Executive Summary:</h5>
                <p>{activeGuideline.summary}</p>
              </div>

              <div>
                <h5 className="font-bold text-ink uppercase tracking-wider mb-2">Standard Diagnostic & Management Flow:</h5>
                <div className="space-y-2">
                  <div className="p-3 bg-surface border border-line rounded-lg">
                    <div className="font-bold text-gov-800">1. Initial Triage & Red-Flag Assessment:</div>
                    <p className="text-ink-muted mt-0.5">Verify vital signs (BP, Pulse, SpO2, Temp, Glucose). Identify any emergent contraindications requiring immediate resuscitation.</p>
                  </div>
                  <div className="p-3 bg-surface border border-line rounded-lg">
                    <div className="font-bold text-gov-800">2. First-Line Pharmacotherapy:</div>
                    <p className="text-ink-muted mt-0.5">Initiate formulary-listed medications available at the PHC pharmacy. Cross-check for recorded penicillin, sulfa, or NSAID allergies in EHR.</p>
                  </div>
                  <div className="p-3 bg-surface border border-line rounded-lg">
                    <div className="font-bold text-gov-800">3. Tele-Referral Escalation Criteria:</div>
                    <p className="text-ink-muted mt-0.5">If clinical thresholds exceed primary capability, create a 108 tele-referral with clinical summary to reserve a tertiary bed at District/GMC hospital.</p>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>

    </div>
  );
};
