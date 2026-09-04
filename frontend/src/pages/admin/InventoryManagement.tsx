import React, { useState } from 'react';
import { Pill, AlertTriangle, Download, Plus, Search, Filter, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { INITIAL_MEDICINES } from '../../data/mockData';
import { Medicine } from '@arogyasetu/shared/types';

export const AdminInventoryManagement: React.FC = () => {
  const [drugs, setDrugs] = useState<Medicine[]>(INITIAL_MEDICINES);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'critical'>('all');
  const [showIndentModal, setShowIndentModal] = useState(false);

  const filtered = drugs.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.genericName.toLowerCase().includes(search.toLowerCase());
    if (filter === 'low') return matchesSearch && d.stock <= d.minThreshold && d.stock > 0;
    if (filter === 'critical') return matchesSearch && d.stock === 0;
    return matchesSearch;
  });

  const lowStockCount = drugs.filter(d => d.stock <= d.minThreshold).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'e-Aushadhi Drug Supply & Inventory' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">e-Aushadhi Central Drug Warehouse & Inventory</h1>
            <p className="text-sm text-ink-soft">Statewide pharmaceutical supply chain, stock buffer monitoring, and automated emergency indents</p>
          </div>
        </div>

        <button
          onClick={() => setShowIndentModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Create State Emergency Indent
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase">Essential Medicines Tracked</span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{drugs.length} Items</p>
          <p className="text-xs text-emerald-700 mt-1">National List of Essential Medicines (NLEM)</p>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <span className="text-xs font-bold text-amber-800 uppercase">Low Stock / Reorder Threshold</span>
          <p className="text-2xl font-bold text-amber-950 mt-1">{lowStockCount} Drugs</p>
          <p className="text-xs text-amber-700 mt-1">Automated warehouse POs generated</p>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <span className="text-xs font-bold text-blue-800 uppercase">Vaccine Cold Chain Status</span>
          <p className="text-2xl font-bold text-blue-950 mt-1">100% Green</p>
          <p className="text-xs text-blue-700 mt-1">eVIN real-time temperature telemetry OK</p>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by drug trade or generic name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {(['all', 'low', 'critical'] as const).map(flt => (
            <button
              key={flt}
              onClick={() => setFilter(flt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all shrink-0 ${
                filter === flt
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {flt}
            </button>
          ))}
        </div>
      </Card>

      {/* Drug List Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sand-50 text-ink-muted font-bold border-b border-line">
              <tr>
                <th className="p-3.5">Medicine & Generic Form</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Facility / Warehouse</th>
                <th className="p-3.5">Stock Level</th>
                <th className="p-3.5">Batch & Expiry</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(drug => {
                const isLow = drug.stock <= drug.minThreshold;
                const isOut = drug.stock === 0;

                return (
                  <tr key={drug.id} className="hover:bg-sand-50/60">
                    <td className="p-3.5">
                      <p className="font-bold text-ink">{drug.name}</p>
                      <p className="text-[11px] text-ink-soft">{drug.genericName} • {drug.dosage}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-sand-700">{drug.category}</td>
                    <td className="p-3.5 text-ink-muted">{drug.facilityName}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-ink'}`}>
                          {drug.stock} {drug.unit || 'units'}
                        </span>
                        {isLow && (
                          <Badge variant={isOut ? 'danger' : 'warning'} className="text-[9px]">
                            {isOut ? 'Stock Out' : 'Below Buffer'}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-soft">Reorder at: {drug.minThreshold}</span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-mono text-sand-700">{drug.batchNumber}</p>
                      <p className="text-[10px] text-ink-soft">
                        Exp: {drug.expiryDate}
                      </p>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setShowIndentModal(true)}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                      >
                        Indent Buffer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Indent Modal */}
      <Modal
        isOpen={showIndentModal}
        onClose={() => setShowIndentModal(false)}
        title="Dispatch State Emergency Drug Indent"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            Submit a fast-track supply request directly to Haffkine Bio-Pharmaceutical Corporation & State Drug Warehouse.
          </p>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Target Facility / Warehouse</label>
            <select className="w-full px-3 py-2 border border-line rounded-lg text-xs bg-surface">
              <option>PHC Paud, Mulshi Taluka (Pune)</option>
              <option>CHC Mulshi (Pune)</option>
              <option>District Hospital Aundh (Pune)</option>
              <option>District Hospital Nandurbar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Medicine & Required Quantity</label>
            <input
              type="text"
              placeholder="e.g. Tab Metformin 500mg (10,000 Strips)"
              className="w-full px-3 py-2 border border-line rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowIndentModal(false)}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
            >
              Authorize & Dispatch PO
            </button>
            <button
              onClick={() => setShowIndentModal(false)}
              className="px-4 py-2.5 border border-line text-sand-700 text-xs font-semibold rounded-lg hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
