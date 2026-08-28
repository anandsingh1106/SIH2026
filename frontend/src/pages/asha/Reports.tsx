import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { BarChart3, Download, Printer, CheckCircle2, DollarSign, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const AshaReportsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('August 2026');

  const performanceMetrics = [
    { indicator: 'Total Village Households Surveyed', target: 284, achieved: 284, percentage: '100%' },
    { indicator: 'Early ANC Registrations (First Trimester)', target: 12, achieved: 11, percentage: '91.6%' },
    { indicator: 'Full Immunization (0-1 Year Infants)', target: 18, achieved: 17, percentage: '94.4%' },
    { indicator: 'NCD CBAC Questionnaires Completed (30+)', target: 45, achieved: 42, percentage: '93.3%' },
    { indicator: 'High-Risk Maternal Referrals Facilitated', target: 4, achieved: 4, percentage: '100%' },
    { indicator: 'Institutional Deliveries Accompanied', target: 6, achieved: 6, percentage: '100%' },
  ];

  const incentives = [
    { activity: 'Facilitating Institutional Delivery under JSY (Rural)', rate: '₹600 / Delivery', count: 6, total: '₹3,600' },
    { activity: 'Complete Infant Immunization Tracking (1 Year)', rate: '₹500 / Child', count: 17, total: '₹8,500' },
    { activity: 'Community NCD CBAC Screening Surveys', rate: '₹10 / Form', count: 42, total: '₹420' },
    { activity: 'High-Risk Pregnancy Home Monitoring & Escort', rate: '₹400 / Case', count: 4, total: '₹1,600' },
    { activity: 'VHND / Anganwadi Nutrition Session Mobilization', rate: '₹200 / Session', count: 4, total: '₹800' },
  ];

  const totalIncentive = '₹14,920';

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Monthly ASHA Progress Report (MPR) & Incentives' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gov-700" />
            Monthly ASHA Progress Report (MPR) & Performance Ledger
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Auto-generated service indicators and verified performance-based remuneration calculation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print MPR
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => alert('Downloading official Monthly Progress Report (MPR-MH-PUN-082026.csv)...')}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-bold uppercase tracking-wider">Reporting Cycle</div>
          <div className="text-xl font-bold text-ink">{selectedMonth}</div>
          <div className="text-[11px] text-gov-700 font-medium">PHC Paud • Mulshi Block</div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line shadow-xs space-y-1">
          <div className="text-xs text-ink-soft font-bold uppercase tracking-wider">Overall KPI Compliance</div>
          <div className="text-xl font-bold text-emerald-600">96.5% Target Achieved</div>
          <div className="text-[11px] text-ink-soft">Grade A Frontline Performance</div>
        </div>

        <div className="bg-gov-900 text-white p-5 rounded-2xl shadow-md border border-gov-800 space-y-1">
          <div className="text-xs text-gov-300 font-bold uppercase tracking-wider">Estimated Monthly Remuneration</div>
          <div className="text-2xl font-extrabold text-emerald-400">{totalIncentive}</div>
          <div className="text-[11px] text-gov-300">Direct Benefit Transfer (DBT) Ready</div>
        </div>
      </div>

      {/* Section 1: KPI Achievements */}
      <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
          Village Health Indicators & Performance Summary
        </h3>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs text-left">
            <thead className="bg-sand-50 text-sand-700 font-semibold border-b border-line">
              <tr>
                <th className="p-3">Healthcare Indicator / Milestone</th>
                <th className="p-3">Target</th>
                <th className="p-3">Achieved</th>
                <th className="p-3">Performance %</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {performanceMetrics.map((m, idx) => (
                <tr key={idx} className="hover:bg-sand-50">
                  <td className="p-3 font-semibold text-ink">{m.indicator}</td>
                  <td className="p-3 font-mono">{m.target}</td>
                  <td className="p-3 font-mono font-bold text-gov-800">{m.achieved}</td>
                  <td className="p-3 font-bold">{m.percentage}</td>
                  <td className="p-3">
                    <Badge variant="success" size="sm">
                      Target Met
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Incentive Itemization */}
      <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
            National Health Mission Incentive Itemization
          </h3>
          <span className="text-xs font-bold text-gov-800">Total: {totalIncentive}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-xs text-left">
            <thead className="bg-sand-50 text-sand-700 font-semibold border-b border-line">
              <tr>
                <th className="p-3">Approved NHM Activity</th>
                <th className="p-3">Unit Remuneration Rate</th>
                <th className="p-3">Verified Units</th>
                <th className="p-3">Total Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {incentives.map((inc, idx) => (
                <tr key={idx} className="hover:bg-sand-50">
                  <td className="p-3 font-semibold text-ink">{inc.activity}</td>
                  <td className="p-3 text-ink-muted">{inc.rate}</td>
                  <td className="p-3 font-mono font-bold text-ink">{inc.count}</td>
                  <td className="p-3 font-mono font-bold text-emerald-700">{inc.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
