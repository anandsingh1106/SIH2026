import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Pill, CheckCircle2, AlertTriangle, Loader2, IndianRupee, MapPin, Calendar,
} from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { dataService } from '../../services/api/dataService';
import { Prescription, MedicineAvailability, MedicineOrder } from '@arogyasetu/shared/types';

export const PatientMedicineOrders: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [availability, setAvailability] = useState<MedicineAvailability[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [order, setOrder] = useState<MedicineOrder | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dataService
      .getPrescriptions()
      .then((list) => {
        setPrescriptions(list);
        if (list.length > 0) setSelectedRx(list[0]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Stock is checked per prescription, so it reloads whenever one is chosen.
  useEffect(() => {
    if (!selectedRx) return;
    setIsLoadingStock(true);
    setOrder(null);
    setError('');

    dataService
      .getPrescriptionAvailability(selectedRx.id)
      .then((rows) => {
        setAvailability(rows);
        // Everything in stock starts selected; the rest cannot be ordered.
        setChecked(
          Object.fromEntries(rows.map((r) => [r.medicineName, r.available]))
        );
      })
      .finally(() => setIsLoadingStock(false));
  }, [selectedRx]);

  const selectedItems = useMemo(
    () => availability.filter((a) => a.available && checked[a.medicineName]),
    [availability, checked]
  );

  const totalCost = useMemo(
    () => selectedItems.reduce((sum, a) => sum + (a.estimatedCost ?? 0), 0),
    [selectedItems]
  );

  const handleOrder = async () => {
    if (!selectedRx || selectedItems.length === 0) return;
    setIsOrdering(true);
    setError('');
    try {
      const placed = await dataService.orderMedicines(
        selectedRx.id,
        selectedItems.map((a) => ({
          medicineName: a.medicineName,
          quantity: a.quantity || 1,
        })),
        selectedItems[0]?.facilityId ?? undefined
      );
      setOrder(placed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Order Medicines' }]} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gov-100 text-gov-700 flex items-center justify-center">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">Order Prescribed Medicines</h1>
          <p className="text-sm text-ink-soft">
            Reserve the medicines on your prescription and collect them from the pharmacy counter
          </p>
        </div>
      </div>

      {/* Order receipt */}
      {order && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Order placed successfully</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Show this token at the pharmacy counter to collect {order.items.length}{' '}
                {order.items.length === 1 ? 'medicine' : 'medicines'}.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Collection Token
            </p>
            <p className="font-mono text-lg font-extrabold text-emerald-900">{order.orderCode}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
        </div>
      )}

      {isLoading && <CardSkeleton />}

      {!isLoading && prescriptions.length === 0 && (
        <EmptyState
          icon={<Pill className="w-8 h-8" />}
          title="No prescriptions yet"
          description="Medicines you are prescribed during a consultation will appear here for ordering."
        />
      )}

      {!isLoading && prescriptions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Prescription picker */}
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-bold text-sand-700 uppercase tracking-wider">
              Your Prescriptions ({prescriptions.length})
            </h3>
            {prescriptions.map((rx) => (
              <button
                key={rx.id}
                onClick={() => setSelectedRx(rx)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  selectedRx?.id === rx.id
                    ? 'bg-gov-50/60 border-gov-600 shadow-xs'
                    : 'bg-surface border-line hover:bg-sand-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink">
                    {rx.doctorName || 'Prescription'}
                  </span>
                  <Badge variant="secondary" size="sm">
                    {(rx.medicines ?? []).length} med
                  </Badge>
                </div>
                <div className="text-[11px] text-ink-soft mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {rx.date || '—'}
                </div>
              </button>
            ))}
          </div>

          {/* Medicines to order */}
          <div className="lg:col-span-8">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-bold text-ink text-sm">Medicines on this prescription</h3>
                {selectedRx?.facilityName && (
                  <span className="text-[11px] text-ink-soft flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedRx.facilityName}
                  </span>
                )}
              </div>

              {isLoadingStock && (
                <p className="text-xs text-ink-soft flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking pharmacy stock…
                </p>
              )}

              {!isLoadingStock && availability.length === 0 && (
                <p className="text-xs text-ink-soft py-4">
                  No medicines were recorded on this prescription.
                </p>
              )}

              {!isLoadingStock &&
                availability.map((a) => (
                  <label
                    key={a.medicineName}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                      a.available
                        ? 'bg-surface border-line cursor-pointer hover:bg-sand-50'
                        : 'bg-sand-50 border-line opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 accent-gov-600"
                      disabled={!a.available}
                      checked={Boolean(checked[a.medicineName])}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [a.medicineName]: e.target.checked }))
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-sm text-ink">{a.medicineName}</span>
                        {a.available ? (
                          <Badge variant="success" size="sm">IN STOCK ({a.inStock})</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">OUT OF STOCK</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-soft mt-0.5">
                        {[a.dosage, a.frequency, a.duration].filter(Boolean).join(' • ') || '—'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px]">
                        <span className="text-ink-muted font-semibold">Qty: {a.quantity || 1}</span>
                        {a.unitPrice != null && (
                          <span className="text-ink-muted flex items-center">
                            <IndianRupee className="w-3 h-3" />
                            {a.unitPrice}/unit
                          </span>
                        )}
                        {a.estimatedCost != null && (
                          <span className="font-bold text-gov-800 flex items-center">
                            <IndianRupee className="w-3 h-3" />
                            {a.estimatedCost}
                          </span>
                        )}
                      </div>
                      {!a.available && (
                        <p className="text-[11px] text-red-600 mt-1">
                          Not available at any pharmacy right now. Please ask your ASHA worker.
                        </p>
                      )}
                    </div>
                  </label>
                ))}

              {/* Order bar */}
              {!isLoadingStock && availability.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
                  <div className="text-xs">
                    <span className="text-ink-soft">
                      {selectedItems.length} of {availability.length} selected
                    </span>
                    {totalCost > 0 && (
                      <span className="ml-3 font-bold text-ink inline-flex items-center">
                        Total: <IndianRupee className="w-3.5 h-3.5 ml-1" />
                        {totalCost.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                    disabled={selectedItems.length === 0 || isOrdering}
                    isLoading={isOrdering}
                    onClick={handleOrder}
                  >
                    {isOrdering ? 'Placing order…' : 'Place Order'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
