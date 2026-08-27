import React, { useState } from 'react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { FlaskConical, Plus, Search, CheckCircle2, AlertTriangle, Clock, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { INITIAL_LAB_ORDERS } from '../../data/mockData';
import { LabOrder } from '../../types';

export const DoctorLabOrdersPage: React.FC = () => {
  const [labOrders, setLabOrders] = useState<LabOrder[]>(INITIAL_LAB_ORDERS);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    patientName: 'Ramesh Tukaram Patil',
    testName: 'Lipid Profile (Cholesterol, Triglycerides)',
    category: 'Biochemistry' as const,
    priority: 'moderate' as const,
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrd: LabOrder = {
      id: 'lab-' + Date.now(),
      patientId: 'pat-101',
      patientName: newTest.patientName,
      doctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Deshmukh',
      facilityName: 'PHC Paud Lab',
      testName: newTest.testName,
      category: newTest.category,
      dateOrdered: new Date().toISOString().substring(0, 10),
      priority: newTest.priority,
      status: 'ordered',
    };
    setLabOrders([newOrd, ...labOrders]);
    setIsOrderModalOpen(false);
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
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-gov-700" />
            Diagnostic Lab Investigations & Pathology Requisitions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Requisition ID</th>
                <th className="p-3.5">Patient Name</th>
                <th className="p-3.5">Test Name & Category</th>
                <th className="p-3.5">Date Ordered</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Result & Reference Range</th>
                <th className="p-3.5">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {labOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{ord.id}</td>
                  <td className="p-3.5 font-semibold">{ord.patientName}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-gov-800">{ord.testName}</div>
                    <div className="text-[10px] text-slate-400">{ord.category}</div>
                  </td>
                  <td className="p-3.5 text-slate-500">{ord.dateOrdered}</td>
                  <td className="p-3.5">
                    <Badge variant={ord.status === 'completed' ? 'success' : 'warning'} size="sm">
                      {(ord.status ?? '').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-3.5">
                    {ord.result ? (
                      <div>
                        <div className="font-bold text-slate-900">
                          {ord.result} {ord.unit}
                        </div>
                        <div className="text-[10px] text-slate-400">Ref: {ord.referenceRange}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sample in processing</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {ord.isAbnormal ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        ABNORMAL
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        NORMAL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
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
            <Input
              label="Patient Full Name"
              required
              value={newTest.patientName}
              onChange={(e) => setNewTest({ ...newTest, patientName: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Diagnostic Panel / Test</label>
              <select
                value={newTest.testName}
                onChange={(e) => setNewTest({ ...newTest, testName: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 font-semibold focus:outline-none focus:border-gov-600"
              >
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
                <select
                  value={newTest.category}
                  onChange={(e) => setNewTest({ ...newTest, category: e.target.value as any })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="Pathology">Pathology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Radiology">Radiology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
                <select
                  value={newTest.priority}
                  onChange={(e) => setNewTest({ ...newTest, priority: e.target.value as any })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="low">Routine</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">Urgent (STAT)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsOrderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Dispatch Requisition
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
