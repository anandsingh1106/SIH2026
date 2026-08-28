import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { FileText, Download, Eye, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const AshaDocumentsPage: React.FC = () => {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const docs = [
    {
      id: 'doc-1',
      title: 'Maternal Nutrition & Diet Counseling Chart (मराठी)',
      category: 'Maternal Health',
      lang: 'मराठी / English',
      description: 'Visual dietary guide showing balanced diet portions, iron-rich local green vegetables, jaggery, drumsticks, and calcium sources for pregnant mothers.',
      content: '१. दररोज आहारात पालेभाज्या (पालक, मेथी), गूळ आणि शेंगदाणे यांचा समावेश करावा.\n२. जेवणानंतर लगेच चहा किंवा कॉफी पिणे टाळावे, यामुळे शरीरातील लोह शोषणात अडथळा येतो.\n३. डॉक्टर किंवा आशा ताईंनी दिलेल्या आयर्न (IFA) च्या लाल गोळ्या न चुकता दररोज घ्याव्यात.',
    },
    {
      id: 'doc-2',
      title: 'National Immunization Schedule (NIS) Wall Poster 2026',
      category: 'Child Health',
      lang: 'मराठी / हिंदी / English',
      description: 'Comprehensive milestone chart detailing vaccine dosages from birth, 6 wks, 10 wks, 14 wks, 9 months, 16-24 months, and 5-6 years.',
      content: 'जन्म: बी.सी.जी., पोलिओ (OPV 0), हेपॅटायटीस बी\n६ आठवडे: पेंटाव्हॅलेंट १, पोलिओ १, रोटाव्हायरस १, एफ.आय.पी.व्ही. १\n१० आठवडे: पेंटाव्हॅलेंट २, पोलिओ २, रोटाव्हायरस २\n१४ आठवडे: पेंटाव्हॅलेंट ३, पोलिओ ३, रोटाव्हायरस ३, एफ.आय.पी.व्ही. २\n९ महिने: गोवर-रुबेला (MR 1), व्हिटॅमिन ए',
    },
    {
      id: 'doc-3',
      title: 'Snakebite & Poisoning Community Awareness Pamphlet',
      category: 'Emergency Care',
      lang: 'मराठी',
      description: 'Critical DOs and DONTs for rural community education on snakebite prevention, whole blood clotting tests, and immediate 108 ambulance dispatch.',
      content: 'साप चावल्यास काय करावे:\n- रुग्णाला त्वरित शांत बसवावे.\n- चावलेला अवयव काठी किंवा पट्टीने बांधून स्थिर ठेवावा.\n- लगेच १०८ रुग्णवाहिका बोलवून जवळच्या प्राथमिक आरोग्य केंद्रात न्यावे.\nकाय करू नये:\n- चावलेल्या जागी काप मारू नका.\n- तोंडाने विष चोखण्याचा प्रयत्न करू नका.\n- दोरीने घट्ट आवळून बांधू नका.',
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'IEC Field Materials & Visual Guidelines' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <FileText className="w-6 h-6 text-gov-700" />
          Offline-Cached IEC Visual Materials & Educational Flyers
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Standardized communication tools for maternal nutrition counseling, immunization awareness, and snakebite first aid
        </p>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="bg-surface rounded-2xl border border-line p-5 shadow-xs flex flex-col justify-between hover:shadow-card transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="primary" size="sm">
                  {doc.category}
                </Badge>
                <span className="text-[11px] font-semibold text-ink-soft">{doc.lang}</span>
              </div>
              <h3 className="font-bold text-ink text-sm leading-snug">{doc.title}</h3>
              <p className="text-xs text-ink-muted leading-relaxed line-clamp-3">{doc.description}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-line flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Eye className="w-3.5 h-3.5" />}
                onClick={() => setSelectedDoc(doc)}
              >
                Inspect Material
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => alert(`Downloading offline cached document: ${doc.title}`)}
              >
                Save PDF
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Document Inspector Modal */}
      {selectedDoc && (
        <Modal
          isOpen={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.title}
          description={`Category: ${selectedDoc.category} • Directorate of Health Services`}
          size="lg"
        >
          <div className="space-y-4 text-xs text-ink leading-relaxed">
            <p className="text-ink-muted italic bg-sand-50 p-3 rounded-lg border border-line">
              {selectedDoc.description}
            </p>
            <div className="bg-gov-50/50 p-4 rounded-xl border border-gov-200 font-medium whitespace-pre-line space-y-2">
              {selectedDoc.content}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
