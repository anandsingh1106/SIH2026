import React, { useState } from 'react';
import { FileText, Download, Calendar, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

interface HealthReport {
  id: string;
  title: string;
  category: 'HMIS' | 'NFHS' | 'NCD' | 'Immunization' | 'Tribal Health';
  generatedDate: string;
  period: string;
  fileSize: string;
  status: 'ready' | 'generating';
}

const MOCK_REPORTS: HealthReport[] = [
  { id: 'rep-1', title: 'Monthly HMIS Form 7 - Maternal & Child Health Return', category: 'HMIS', generatedDate: '20 Aug 2026', period: 'July 2026', fileSize: '2.4 MB PDF', status: 'ready' },
  { id: 'rep-2', title: 'National NCD Screening & Follow-up Compliance Report', category: 'NCD', generatedDate: '18 Aug 2026', period: 'Q2 2026', fileSize: '4.8 MB XLSX', status: 'ready' },
  { id: 'rep-3', title: 'U-WIN Universal Immunization Dropout & Coverage Analysis', category: 'Immunization', generatedDate: '15 Aug 2026', period: 'July 2026', fileSize: '1.8 MB PDF', status: 'ready' },
  { id: 'rep-4', title: 'Tribal Talukas Severe Malnutrition & Sickle Cell Audit', category: 'Tribal Health', generatedDate: '10 Aug 2026', period: 'H1 2026', fileSize: '3.1 MB PDF', status: 'ready' },
  { id: 'rep-5', title: 'Maharashtra State e-Aushadhi Pharmaceutical Consumption Index', category: 'HMIS', generatedDate: '01 Aug 2026', period: 'July 2026', fileSize: '5.2 MB XLSX', status: 'ready' },
];

export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<HealthReport[]>(MOCK_REPORTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const filtered = selectedCategory === 'all'
    ? reports
    : reports.filter(r => r.category === selectedCategory);

  const triggerDownload = (id: string) => {
    setDownloadSuccess(id);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Statutory Health Reports' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Statutory Health Reports & Export Engine</h1>
            <p className="text-sm text-ink-soft">Government of Maharashtra & Ministry of Health and Family Welfare (MoHFW) returns</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'HMIS', 'NCD', 'Immunization', 'Tribal Health'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-surface border border-line text-ink-muted hover:bg-sand-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Report successfully downloaded and compiled with SHA-256 digital validation signature.
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {filtered.map(report => (
          <Card key={report.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-ink text-base">{report.title}</h3>
                <Badge variant="info" className="text-[10px]">{report.category}</Badge>
              </div>
              <p className="text-xs text-ink-soft">
                Reporting Period: <strong className="text-sand-700">{report.period}</strong> • Generated on: {report.generatedDate} • Size: {report.fileSize}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={() => triggerDownload(report.id)}
                className="flex items-center gap-2 px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                {report.fileSize.includes('XLSX') ? <FileSpreadsheet className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                Download Official Return
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
