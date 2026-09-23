import React, { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import {
  backendApi,
  type ReportDefinition,
  type ReportTable,
  type ReportType,
} from '@arogyasetu/shared/services/api';
import { localDateString } from '@arogyasetu/shared/utils';
import { useToast } from '../../hooks/useToast';

/** Quotes a cell when it holds a comma, quote or line break (RFC 4180). */
const csvCell = (value: string | number | null) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function downloadCsv(report: ReportTable) {
  const lines = [report.columns, ...report.rows].map((row) => row.map(csvCell).join(','));
  // The byte order mark makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `arogyasetu-${report.type}-${localDateString()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const AdminReports: React.FC = () => {
  const toast = useToast();
  const [catalogue, setCatalogue] = useState<ReportDefinition[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [busy, setBusy] = useState<ReportType | null>(null);
  const [preview, setPreview] = useState<ReportTable | null>(null);

  useEffect(() => {
    backendApi
      .getReportCatalogue()
      .then(setCatalogue)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the report list.'))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = ['all', ...new Set(catalogue.map((r) => r.category))];
  const filtered = selectedCategory === 'all' ? catalogue : catalogue.filter((r) => r.category === selectedCategory);

  const fetchReport = async (type: ReportType, then: (report: ReportTable) => void) => {
    setBusy(type);
    try {
      then(await backendApi.getReport(type));
    } catch (err) {
      toast.error('Could not build the report', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const download = (type: ReportType) =>
    fetchReport(type, (report) => {
      downloadCsv(report);
      toast.success('Report downloaded', `${report.rows.length} rows, generated from current records.`);
    });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Health Reports' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Health Reports & Exports</h1>
            <p className="text-sm text-ink-soft">Built on demand from current platform records and downloaded as CSV</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-surface border border-line text-ink-muted hover:bg-sand-50'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-soft">
        Every export is recorded in the audit log. The referral register lists referral codes and facilities only,
        never patient names.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <div className="space-y-4">
        {isLoading && <Card className="p-8 text-center text-xs text-ink-soft">Loading reports…</Card>}
        {filtered.map(report => (
          <Card key={report.type} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-ink text-base">{report.title}</h3>
                <Badge variant="info" className="text-[10px]">{report.category}</Badge>
              </div>
              <p className="text-xs text-ink-soft">{report.description}</p>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                onClick={() => void fetchReport(report.type, setPreview)}
                disabled={busy !== null}
                className="flex items-center gap-2 px-3 py-2 border border-line text-sand-700 text-xs font-bold rounded-lg hover:bg-sand-50 disabled:opacity-50"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={() => void download(report.type)}
                disabled={busy !== null}
                className="flex items-center gap-2 px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {busy === report.type ? 'Building…' : 'Download CSV'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? 'Report preview'}>
        {preview && (
          <div className="space-y-3">
            <p className="text-xs text-ink-soft">
              {preview.rows.length} rows • generated {new Date(preview.generatedAt).toLocaleString('en-IN')}
              {preview.rows.length > 10 && ' • first 10 shown'}
            </p>
            <div className="border border-line rounded-lg overflow-x-auto max-h-80">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-sand-50 text-ink-muted font-bold sticky top-0">
                  <tr>{preview.columns.map((c) => <th key={c} className="p-2 whitespace-nowrap">{c}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.rows.length === 0 ? (
                    <tr><td colSpan={preview.columns.length} className="p-4 text-center text-ink-soft">No records yet.</td></tr>
                  ) : (
                    preview.rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j} className="p-2 whitespace-nowrap">{cell ?? ''}</td>)}</tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => { downloadCsv(preview); setPreview(null); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gov-600 hover:bg-gov-700 text-white text-xs font-bold rounded-lg"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download full CSV
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
