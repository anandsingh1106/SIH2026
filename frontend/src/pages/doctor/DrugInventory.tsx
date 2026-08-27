import React, { useState, useEffect } from 'react';
import { dataService, generateToken } from '../../services/api/dataService';
import { Medicine } from '../../types';
import { Pill, AlertTriangle, Plus, Search, CheckCircle2, RefreshCw, ShoppingCart, Truck } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const DoctorDrugInventoryPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isIndentModalOpen, setIsIndentModalOpen] = useState(false);
  const [indentMed, setIndentMed] = useState<Medicine | null>(null);
  const [indentQty, setIndentQty] = useState(500);

  /**
   * Indents raised in this session, keyed by medicine id, so a row that has
   * already been ordered says so instead of offering to order again.
   */
  const [orderedIndents, setOrderedIndents] = useState<
    Record<string, { token: string; quantity: number; placedAt: string }>
  >({});
  const [lastIndent, setLastIndent] = useState<
    { token: string; quantity: number; medicineName: string } | null
  >(null);

  useEffect(() => {
    dataService.getMedicines().then(setMedicines);
  }, []);

  const filtered = medicines.filter((m) => {
    return (
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateIndent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indentMed || indentQty <= 0) return;

    const token = generateToken('IND');
    setOrderedIndents((prev) => ({
      ...prev,
      [indentMed.id]: { token, quantity: indentQty, placedAt: new Date().toISOString() },
    }));
    setLastIndent({ token, quantity: indentQty, medicineName: indentMed.name });
    setIsIndentModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Facility Pharmacy Inventory & Stock Indents' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-gov-700" />
            Essential Drugs List (EDL) Inventory & Stock Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pharmacy stock balances, batch expiry vigilance, and automated replenishment indents
          </p>
        </div>
      </div>

      {/* Receipt for the indent just raised */}
      {lastIndent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Indent raised for {lastIndent.medicineName}
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                {lastIndent.quantity} units routed to District Central Medical Store (DCMS Aundh).
                Expected delivery in 48-72 hours.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Indent Token
            </p>
            <p className="font-mono text-lg font-extrabold text-emerald-900">{lastIndent.token}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchInput
          placeholder="Search essential medicine, generic molecule, or therapeutic category..."
          onChange={setSearchQuery}
        />
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Medicine Formulation</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Batch & Expiry</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5">Minimum Threshold</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.map((m) => {
                const isLow = m.stock < m.minThreshold;
                const ordered = orderedIndents[m.id];
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.genericName}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{m.category}</td>
                    <td className="p-3.5">
                      <div className="font-mono text-slate-700 font-bold">{m.batchNumber}</div>
                      <div className="text-[10px] text-slate-400">Exp: {m.expiryDate}</div>
                    </td>
                    <td className="p-3.5 font-bold text-base text-slate-900">
                      {m.stock} {m.unit}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {m.minThreshold} {m.unit}
                    </td>
                    <td className="p-3.5">
                      {ordered ? (
                        <Badge variant="info" size="sm">
                          ON ORDER
                        </Badge>
                      ) : isLow ? (
                        <Badge variant="danger" size="sm">
                          LOW STOCK
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          ADEQUATE
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {ordered ? (
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            <Truck className="w-3.5 h-3.5 shrink-0" />
                            Order Placed
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {ordered.token} • {ordered.quantity} {m.unit}
                          </span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant={isLow ? 'primary' : 'outline'}
                          leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setIndentMed(m);
                            setIsIndentModalOpen(true);
                          }}
                        >
                          Indent Stock
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Indent Modal */}
      {isIndentModalOpen && indentMed && (
        <Modal
          isOpen={isIndentModalOpen}
          onClose={() => setIsIndentModalOpen(false)}
          title={`Create Stock Indent: ${indentMed.name}`}
          description={`Current balance: ${indentMed.stock} ${indentMed.unit} • Threshold: ${indentMed.minThreshold} ${indentMed.unit}`}
          size="md"
        >
          <form onSubmit={handleCreateIndent} className="space-y-4">
            <Input
              label="Indent Quantity to Order (Units)"
              type="number"
              required
              value={indentQty}
              onChange={(e) => setIndentQty(parseInt(e.target.value) || 0)}
            />
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              Electronic Indent will be routed to District Central Medical Store (DCMS Aundh). Typical replenishment delivery time is 48-72 hours.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsIndentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={indentQty <= 0}>
                Submit Indent to DCMS
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
