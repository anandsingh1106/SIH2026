import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Lock, FileText, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'success' | 'flagged' | 'denied';
  consentRef?: string;
}

const MOCK_AUDIT_LOGS: AuditEntry[] = [
  { id: 'aud-101', timestamp: '23 Aug 2026, 15:42:10', actor: 'Dr. Priya Kulkarni', role: 'Specialist', action: 'FHIR CarePlan authoring & ABHA Bundle Push', resource: 'Patient: 91-8273-1928-4491', ipAddress: '10.14.88.21', status: 'success', consentRef: 'CONS-99120-OK' },
  { id: 'aud-102', timestamp: '23 Aug 2026, 14:15:02', actor: 'Sunita Patil (ANM/ASHA)', role: 'ASHA', action: 'Offline NCD Sync (3 Households)', resource: 'Villages: Paud Ward 3', ipAddress: '100.72.10.4', status: 'success', consentRef: 'CONS-FIELD-88' },
  { id: 'aud-103', timestamp: '23 Aug 2026, 12:30:19', actor: 'Dr. Rajesh Deshmukh', role: 'Doctor', action: 'e-Prescription & Tele-Consult Dispatch', resource: 'Rx #RX-2026-08-01', ipAddress: '10.12.44.102', status: 'success', consentRef: 'CONS-88219-OK' },
  { id: 'aud-104', timestamp: '23 Aug 2026, 11:05:44', actor: 'Unknown Client', role: 'External Gateway', action: 'Unauthorized Patient Record Request', resource: 'ABHA: 91-1029-4829-1102', ipAddress: '185.220.101.5', status: 'denied' },
  { id: 'aud-105', timestamp: '23 Aug 2026, 09:12:30', actor: 'Administrator', role: 'Admin', action: 'Statewide Emergency Drug Indent PO-9921', resource: 'Drug Warehouse: Pune', ipAddress: '10.0.4.1', status: 'success' },
];

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>(MOCK_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'denied'>('all');

  const filtered = logs.filter(l => {
    const matchesSearch = l.actor.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()) || l.resource.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Security & ABDM Audit Logs' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">ABDM FHIR Compliance & Access Audit Trail</h1>
            <p className="text-sm text-slate-500">Immutable ledger of patient record access, consent token validations, and clinical actions</p>
          </div>
        </div>

        <Badge variant="success" className="px-3 py-1 text-xs">
          <Lock className="w-3.5 h-3.5 inline mr-1" /> SHA-256 Tamper-Proof Audit
        </Badge>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, action description, or ABHA resource ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'success', 'denied'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor & Role</th>
                <th className="p-3.5">Action Performed</th>
                <th className="p-3.5">Target Resource</th>
                <th className="p-3.5">IP & Consent Ref</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/60 font-sans">
                  <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">{entry.timestamp}</td>
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900">{entry.actor}</p>
                    <Badge variant="info" className="text-[9px] uppercase mt-0.5">{entry.role}</Badge>
                  </td>
                  <td className="p-3.5 font-medium text-slate-800">{entry.action}</td>
                  <td className="p-3.5 font-mono text-slate-700 text-[11px]">{entry.resource}</td>
                  <td className="p-3.5 text-slate-500 text-[11px]">
                    <div>IP: {entry.ipAddress}</div>
                    {entry.consentRef && <div className="text-emerald-700 font-semibold">{entry.consentRef}</div>}
                  </td>
                  <td className="p-3.5">
                    <Badge variant={entry.status === 'success' ? 'success' : 'danger'} className="text-[10px] uppercase">
                      {entry.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
