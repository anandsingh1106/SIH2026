import React, { useCallback, useEffect, useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { FlaskConical, Plus, Search, CheckCircle2, AlertTriangle, Clock, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { dataService } from '../../services/api/dataService';
import type { LabOrder, Patient } from '../../types';

/** The button label for moving an order to its next worklist stage. */
const NEXT_STAGE_LABEL: Record<string, string> = {
  ordered: 'Collect sample',
  sample_collected: 'Start processing',
  processing: 'Mark complete',
};

function formatOrderedDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const DoctorLabOrdersPage: React.FC = () => {
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    patientId: '',
    testName: '',
    category: 'Biochemistry',
    priority: 'ROUTINE' as 'ROUTINE' | 'URGENT' | 'STAT',
  });

  const loadOrders = useCallback(async () => {
    const rows = await dataService.getLabOrders();
    setLabOrders(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dataService.getLabOrders(), dataService.getPatients()])
      .then(([orders, people]) => {
        if (cancelled) return;
        setLabOrders(orders);
        setPatients(people);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTest.patientId || !newTest.testName.trim()) {
      setError('Select a patient and name the test.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await dataService.createLabOrder({
        patientId: newTest.patientId,
        testName: newTest.testName.trim(),
        category: newTest.category,
        priority: newTest.priority,
      });
      await loadOrders();
      setIsOrderModalOpen(false);
      setNewTest({ patientId: '', testName: '', category: 'Biochemistry', priority: 'ROUTINE' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the lab order.');
    } finally {
      setSaving(false);
    }
  };

  /** Advances an order to the next stage of the lab worklist. */
  const advance = async (order: LabOrder) => {
    const next: Record<string, 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED'> = {
      ordered: 'SAMPLE_COLLECTED',
      sample_collected: 'PROCESSING',
      processing: 'COMPLETED',
    };
    const target = next[order.status];
    if (!target) return;
    setError(null);
    try {
      await dataService.updateLabOrderStatus(order.id, target);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order.');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Diagnostic Pathology & Radiology Orders' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-gov-700" />
            Diagnostic Lab Investigations & Pathology Requisitions
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Order blood panels, urine chemistry, and imaging with critical value alerts
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsOrderModalOpen(true)}
        >
          Order New Lab Investigation
        </Button>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-sand-50 text-sand-700 font-semibold border-b border-line">
              <tr>
                <th className="p-3.5">Requisition ID</th>
                <th className="p-3.5">Patient Name</th>
                <th className="p-3.5">Test Name & Category</th>
                <th className="p-3.5">Date Ordered</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Result & Reference Range</th>
                <th className="p-3.5">Flag</th>
                <th className="p-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {labOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-sand-50">
                  <td className="p-3.5 font-mono text-[11px] text-ink-soft">
                    {ord.id.slice(0, 8)}
                  </td>
                  <td className="p-3.5 font-semibold">{ord.patientName ?? '—'}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-gov-800">{ord.testName}</div>
                    <div className="text-[10px] text-ink-soft">{ord.category}</div>
                  </td>
                  <td className="p-3.5 text-ink-soft whitespace-nowrap">
                    {formatOrderedDate(ord.dateOrdered)}
                  </td>
                  <td className="p-3.5">
                    <Badge variant={ord.status === 'completed' ? 'success' : 'warning'} size="sm">
                      {(ord.status ?? '').replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-3.5">
                    {ord.result ? (
                      <div>
                        <div className="font-bold text-ink">
                          {ord.result} {ord.unit}
                        </div>
                        {ord.referenceRange && (
                          <div className="text-[10px] text-ink-soft">Ref: {ord.referenceRange}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-ink-soft italic">
                        {ord.status === 'completed' ? 'Result not recorded' : 'Awaiting result'}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {/* A flag is only meaningful once a result exists. */}
                    {!ord.result ? (
                      <span className="text-ink-soft">—</span>
                    ) : ord.isAbnormal ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        ABNORMAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        NORMAL
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {NEXT_STAGE_LABEL[ord.status] ? (
                      <button
                        onClick={() => advance(ord)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-line text-gov-800 hover:bg-sand-50 transition-colors whitespace-nowrap"
                      >
                        {NEXT_STAGE_LABEL[ord.status]}
                      </button>
                    ) : (
                      <span className="text-ink-soft text-[11px]">Closed</span>
                    )}
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-soft">
                    Loading lab worklist…
                  </td>
                </tr>
              )}

              {!loading && labOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-soft">
                    No lab orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Test Modal */}
      {isOrderModalOpen && (
        <Modal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          title="Order Diagnostic Investigation"
          description="Send pathology or radiology requisition to PHC Lab & District Hospital"
          size="md"
        >
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1.5">
                Patient <span className="text-red-600">*</span>
              </label>
              <select
                required
                value={newTest.patientId}
                onChange={(e) => setNewTest({ ...newTest, patientId: e.target.value })}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink font-semibold focus:outline-none focus:border-gov-600"
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.village ? ` — ${p.village}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1.5">Diagnostic Panel / Test</label>
              <select
                required
                value={newTest.testName}
                onChange={(e) => setNewTest({ ...newTest, testName: e.target.value })}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink font-semibold focus:outline-none focus:border-gov-600"
              >
                <option value="">Select a test…</option>
                <option value="Complete Blood Count (CBC) with Smear">Complete Blood Count (CBC) with Smear</option>
                <option value="HbA1c (Glycated Hemoglobin)">HbA1c (Glycated Hemoglobin)</option>
                <option value="Serum Creatinine & eGFR">Serum Creatinine & eGFR</option>
                <option value="Lipid Profile (Total Cholesterol, HDL, LDL)">Lipid Profile (Total Cholesterol, HDL, LDL)</option>
                <option value="Liver Function Test (LFT: SGOT, SGPT, Bilirubin)">Liver Function Test (LFT: SGOT, SGPT, Bilirubin)</option>
                <option value="12-Lead Electrocardiogram (ECG)">12-Lead Electrocardiogram (ECG)</option>
                <option value="Chest X-Ray PA View">Chest X-Ray PA View</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1.5">Department</label>
                <select
                  value={newTest.category}
                  onChange={(e) => setNewTest({ ...newTest, category: e.target.value as any })}
                  className="w-full text-xs border border-sand-300 rounded-lg p-2 bg-surface"
                >
                  <option value="Pathology">Pathology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Radiology">Radiology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1.5">Priority</label>
                <select
                  value={newTest.priority}
                  onChange={(e) => setNewTest({ ...newTest, priority: e.target.value as any })}
                  className="w-full text-xs border border-sand-300 rounded-lg p-2 bg-surface"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? 'Saving…' : 'Dispatch Requisition'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
