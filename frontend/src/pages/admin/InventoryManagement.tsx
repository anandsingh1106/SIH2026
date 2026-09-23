import React, { useCallback, useEffect, useState } from 'react';
import { Pill, Plus, Search, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { backendApi, type InventoryRecord } from '@arogyasetu/shared/services/api';
import { useToast } from '../../hooks/useToast';

const DAY_MS = 24 * 60 * 60 * 1000;

const expiresWithin = (item: InventoryRecord, days: number) =>
  !!item.expiryDate && new Date(item.expiryDate).getTime() - Date.now() <= days * DAY_MS;

const EMPTY_RECEIPT = { inventoryId: '', quantity: '', reason: '' };

export const AdminInventoryManagement: React.FC = () => {
  const toast = useToast();

  const [drugs, setDrugs] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receipt, setReceipt] = useState(EMPTY_RECEIPT);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await backendApi.getInventory({ limit: 100 });
      setDrugs(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const term = search.trim().toLowerCase();
  const filtered = drugs.filter((d) => {
    const matchesSearch =
      !term ||
      (d.name ?? '').toLowerCase().includes(term) ||
      (d.genericName ?? '').toLowerCase().includes(term);
    if (filter === 'low') return matchesSearch && d.isLow && d.stock > 0;
    if (filter === 'out') return matchesSearch && d.stock === 0;
    return matchesSearch;
  });

  const lowStockCount = drugs.filter((d) => d.isLow).length;
  const expiringCount = drugs.filter((d) => expiresWithin(d, 90)).length;

  const openReceipt = (inventoryId = '') => {
    setReceipt({ ...EMPTY_RECEIPT, inventoryId });
    setShowReceiptModal(true);
  };

  const handleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = parseInt(receipt.quantity, 10);
    if (!receipt.inventoryId || !Number.isFinite(quantity) || quantity < 1) return;
    setIsSaving(true);
    try {
      const updated = await backendApi.adjustStock(receipt.inventoryId, {
        type: 'STOCK_IN',
        quantity,
        reason: receipt.reason.trim() || undefined,
      });
      toast.success('Stock updated', `${updated.name ?? 'Item'} now has ${updated.stock} units.`);
      setShowReceiptModal(false);
      await load();
    } catch (err) {
      toast.error('Could not update stock', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'e-Aushadhi Drug Supply & Inventory' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">e-Aushadhi Drug Inventory</h1>
            <p className="text-sm text-ink-soft">Facility stock levels, reorder buffers and expiry tracking</p>
          </div>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => void load()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2.5 border border-line text-sm font-semibold rounded-xl hover:bg-sand-50 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => openReceipt()}
            disabled={drugs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Record Stock Received
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase">Stock Lines Tracked</span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{isLoading ? '…' : `${drugs.length} Items`}</p>
          <p className="text-xs text-emerald-700 mt-1">Across all facilities</p>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <span className="text-xs font-bold text-amber-800 uppercase">Low Stock / Reorder Threshold</span>
          <p className="text-2xl font-bold text-amber-950 mt-1">{isLoading ? '…' : `${lowStockCount} Items`}</p>
          <p className="text-xs text-amber-700 mt-1">At or below their reorder level</p>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <span className="text-xs font-bold text-blue-800 uppercase">Expiring Within 90 Days</span>
          <p className="text-2xl font-bold text-blue-950 mt-1">{isLoading ? '…' : `${expiringCount} Batches`}</p>
          <p className="text-xs text-blue-700 mt-1">Use first or return to warehouse</p>
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
          {([['all', 'All'], ['low', 'Low'], ['out', 'Stock out']] as const).map(([flt, label]) => (
            <button
              key={flt}
              onClick={() => setFilter(flt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                filter === flt
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Drug List Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sand-50 text-ink-muted font-bold border-b border-line">
              <tr>
                <th className="p-3.5">Medicine & Generic Form</th>
                <th className="p-3.5">Facility</th>
                <th className="p-3.5">Stock Level</th>
                <th className="p-3.5">Batch & Expiry</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-ink-soft">Loading inventory…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-soft">
                    {drugs.length === 0 ? 'No stock has been recorded yet.' : 'No items match this search or filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map(drug => {
                  const isOut = drug.stock === 0;
                  const expiringSoon = expiresWithin(drug, 90);
                  return (
                    <tr key={drug.id} className="hover:bg-sand-50/60">
                      <td className="p-3.5">
                        <p className="font-bold text-ink">{drug.name ?? 'Unknown medicine'}</p>
                        <p className="text-[11px] text-ink-soft">
                          {[drug.genericName, drug.strength].filter(Boolean).join(' • ')}
                        </p>
                      </td>
                      <td className="p-3.5 text-ink-muted">{drug.facilityName ?? '-'}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isOut ? 'text-rose-600' : drug.isLow ? 'text-amber-600' : 'text-ink'}`}>
                            {drug.stock} units
                          </span>
                          {drug.isLow && (
                            <Badge variant={isOut ? 'danger' : 'warning'} className="text-[9px]">
                              {isOut ? 'Stock Out' : 'Below Buffer'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-ink-soft">Reorder at: {drug.reorderLevel}</span>
                      </td>
                      <td className="p-3.5">
                        <p className="font-mono text-sand-700">{drug.batchNumber ?? '-'}</p>
                        <p className={`text-[10px] ${expiringSoon ? 'text-rose-600 font-semibold' : 'text-ink-soft'}`}>
                          Exp: {drug.expiryDate ?? '-'}
                        </p>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => openReceipt(drug.id)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stock receipt modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Record Stock Received"
      >
        <form onSubmit={handleReceipt} className="space-y-4">
          <p className="text-xs text-ink-muted">
            Adds the received quantity to the facility's stock and keeps a record of the transaction.
          </p>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Medicine & Facility</label>
            <select
              required
              value={receipt.inventoryId}
              onChange={e => setReceipt({ ...receipt, inventoryId: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-xs bg-surface"
            >
              <option value="" disabled>Select a stock line</option>
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name ?? 'Unknown'}{d.strength ? ` ${d.strength}` : ''} ({d.facilityName ?? 'facility'}, {d.stock} in stock)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Quantity Received</label>
              <input
                type="number"
                required
                min={1}
                max={1000000}
                placeholder="e.g. 500"
                value={receipt.quantity}
                onChange={e => setReceipt({ ...receipt, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Note (optional)</label>
              <input
                type="text"
                maxLength={300}
                placeholder="e.g. District warehouse supply"
                value={receipt.reason}
                onChange={e => setReceipt({ ...receipt, reason: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Add to Stock'}
            </button>
            <button
              type="button"
              onClick={() => setShowReceiptModal(false)}
              className="px-4 py-2.5 border border-line text-sand-700 text-xs font-semibold rounded-lg hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
