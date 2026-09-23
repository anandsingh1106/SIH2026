import React, { useEffect, useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { BarChart3, Download, Printer } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { backendApi } from '@arogyasetu/shared/services/api';
import { useAuth } from '../../services/auth/authContext';
import { useToast } from '../../hooks/useToast';

type MonthlyReport = Awaited<ReturnType<typeof backendApi.getAshaMonthlyReport>>;

/** The current month and the five before it, newest first, as YYYY-MM. */
const recentMonths = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    };
  });
};

export const AshaReportsPage: React.FC = () => {
  const toast = useToast();
  const { currentUser } = useAuth();
  const months = recentMonths();
  const [month, setMonth] = useState(months[0].value);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError('');
    backendApi
      .getAshaMonthlyReport(month)
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not build the report.'); });
    return () => { cancelled = true; };
  }, [month]);

  const monthLabel = months.find((m) => m.value === month)?.label ?? month;

  const exportCsv = () => {
    if (!report) return;
    const lines = [
      ['Monthly Progress Report', monthLabel],
      ['ASHA', currentUser?.name ?? ''],
      ['Assigned patients', String(report.assignedPatients)],
      [],
      ['Indicator', 'Count'],
      ...report.rows.map((r) => [r.indicator, String(r.value)]),
      [],
      ['Still open', 'Count'],
      ['Vaccine doses due or overdue', String(report.pending.vaccinesDue)],
      ['High-risk pregnancies being followed', String(report.pending.highRiskPregnancies)],
      ['Open tasks', String(report.pending.openTasks)],
    ];
    const csv = lines.map((l) => l.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `asha-mpr-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded', monthLabel);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Monthly ASHA Progress Report (MPR)' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gov-700" />
            Monthly ASHA Progress Report (MPR)
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Counted from the visits, screenings and records you entered in the app
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-line rounded-lg text-xs font-semibold bg-surface"
            aria-label="Reporting month"
          >
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <Button size="sm" variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()} disabled={!report}>
            Print MPR
          </Button>
          <Button size="sm" variant="primary" leftIcon={<Download className="w-4 h-4" />} onClick={exportCsv} disabled={!report}>
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-bold uppercase tracking-wider">Reporting Month</div>
          <div className="text-xl font-bold text-ink">{monthLabel}</div>
          <div className="text-[11px] text-gov-700 font-medium">
            {[currentUser?.name, currentUser?.facilityName].filter(Boolean).join(' • ')}
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-bold uppercase tracking-wider">Assigned Patients</div>
          <div className="text-xl font-bold text-ink">{report ? report.assignedPatients : '…'}</div>
          <div className="text-[11px] text-ink-soft">
            {report ? `${report.rows.find((r) => r.key === 'homeVisits')?.value ?? 0} home visits this month` : ' '}
          </div>
        </div>

        <div className="bg-gov-900 text-white p-5 rounded-2xl shadow-md border border-gov-800 space-y-1">
          <div className="text-xs text-gov-300 font-bold uppercase tracking-wider">Still Open</div>
          {report ? (
            <div className="text-sm font-semibold space-y-0.5">
              <p>{report.pending.vaccinesDue} vaccine doses due</p>
              <p>{report.pending.highRiskPregnancies} high-risk pregnancies</p>
              <p>{report.pending.openTasks} open tasks</p>
            </div>
          ) : (
            <div className="text-xl font-bold">…</div>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-ink text-sm uppercase tracking-wider">Activity in {monthLabel}</h3>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs text-left">
            <thead className="bg-sand-50 text-sand-700 font-semibold border-b border-line">
              <tr>
                <th className="p-3">Indicator</th>
                <th className="p-3 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {!report ? (
                <tr><td colSpan={2} className="p-6 text-center text-ink-soft">{error ? '-' : 'Loading…'}</td></tr>
              ) : (
                report.rows.map((r) => (
                  <tr key={r.key} className="hover:bg-sand-50">
                    <td className="p-3 font-semibold text-ink">{r.indicator}</td>
                    <td className="p-3 font-mono font-bold text-gov-800 text-right">{r.value}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-ink-soft">
          Incentive amounts are set by the state NHM and verified by the ANM, so this report lists the activities only.
        </p>
      </div>
    </div>
  );
};
