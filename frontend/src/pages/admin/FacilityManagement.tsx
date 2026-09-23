import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Search, MapPin, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import {
  backendApi,
  type AdminFacilityRecord,
  type FacilityInput,
  type FacilityType,
} from '@arogyasetu/shared/services/api';
import { useToast } from '../../hooks/useToast';

const TYPE_LABELS: Record<FacilityType, string> = {
  SUB_CENTER: 'Sub-Centre',
  PHC: 'PHC',
  CHC: 'CHC',
  DISTRICT_HOSPITAL: 'District Hospital',
  SPECIALIST_HOSPITAL: 'Specialist Hospital',
  MEDICAL_COLLEGE: 'Medical College',
};

const TYPE_OPTIONS: { value: FacilityType; label: string }[] = [
  { value: 'SUB_CENTER', label: 'Sub-Centre' },
  { value: 'PHC', label: 'PHC (Primary Health Centre)' },
  { value: 'CHC', label: 'CHC (Community Health Centre)' },
  { value: 'DISTRICT_HOSPITAL', label: 'District Hospital' },
  { value: 'SPECIALIST_HOSPITAL', label: 'Specialist Hospital' },
  { value: 'MEDICAL_COLLEGE', label: 'Medical College' },
];

type FormState = Required<Omit<FacilityInput, 'emergencyAvailable'>> & { emergencyAvailable: boolean };

const EMPTY_FORM: FormState = {
  name: '',
  type: 'PHC',
  district: 'Pune',
  taluka: '',
  village: '',
  address: '',
  phone: '',
  email: '',
  emergencyAvailable: false,
};

const toForm = (f: AdminFacilityRecord): FormState => ({
  name: f.name,
  type: f.type,
  district: f.district,
  taluka: f.taluka ?? '',
  village: f.village ?? '',
  address: f.address ?? '',
  phone: f.phone ?? '',
  email: f.email ?? '',
  emergencyAvailable: f.emergencyAvailable,
});

// Blank optional fields are left out of a new facility rather than sent as ''.
const toInput = (form: FormState): FacilityInput => ({
  name: form.name.trim(),
  type: form.type,
  district: form.district.trim(),
  taluka: form.taluka.trim() || undefined,
  village: form.village.trim() || undefined,
  address: form.address.trim() || undefined,
  phone: form.phone.trim() || undefined,
  email: form.email.trim() || undefined,
  emergencyAvailable: form.emergencyAvailable,
});

export const AdminFacilityManagement: React.FC = () => {
  const toast = useToast();

  const [facilities, setFacilities] = useState<AdminFacilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FacilityType>('all');

  // null = closed, 'new' = registering, otherwise the facility being edited.
  const [editing, setEditing] = useState<AdminFacilityRecord | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await backendApi.getFacilities({ includeInactive: true, limit: 100 });
      setFacilities(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the facility registry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const term = search.trim().toLowerCase();
  const filtered = facilities.filter((f) => {
    const matchesSearch =
      !term ||
      f.name.toLowerCase().includes(term) ||
      f.district.toLowerCase().includes(term) ||
      (f.taluka ?? '').toLowerCase().includes(term);
    return matchesSearch && (typeFilter === 'all' || f.type === typeFilter);
  });

  const active = facilities.filter((f) => f.active);
  const bedsTotal = active.reduce((sum, f) => sum + f.beds.total, 0);
  const bedsFree = active.reduce((sum, f) => sum + f.beds.available, 0);
  const emergencyReady = active.filter((f) => f.emergencyAvailable).length;
  const presentTypes = TYPE_OPTIONS.filter((t) => facilities.some((f) => f.type === t.value));

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing('new');
  };

  const openEdit = (facility: AdminFacilityRecord) => {
    setForm(toForm(facility));
    setEditing(facility);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsSaving(true);
    try {
      if (editing === 'new') {
        const created = await backendApi.createFacility(toInput(form));
        toast.success('Facility registered', `${created.name} is now listed in the directory.`);
      } else {
        // Sent as '' so a cleared field is actually cleared on the server.
        const input = toInput(form);
        const updated = await backendApi.updateFacility(editing.id, {
          ...input,
          taluka: form.taluka.trim(),
          village: form.village.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        });
        toast.success('Facility updated', `${updated.name} has been saved.`);
      }
      setEditing(null);
      await load();
    } catch (err) {
      toast.error('Could not save the facility', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (facility: AdminFacilityRecord) => {
    setIsSaving(true);
    try {
      await backendApi.updateFacility(facility.id, { active: !facility.active });
      toast.success(
        facility.active ? 'Facility closed' : 'Facility reopened',
        facility.active
          ? `${facility.name} is hidden from the public directory.`
          : `${facility.name} is listed in the directory again.`
      );
      setEditing(null);
      await load();
    } catch (err) {
      toast.error('Could not change the facility status', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const field = (key: keyof FormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Facility Infrastructure Management' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Healthcare Facility Registry & Management</h1>
            <p className="text-sm text-ink-soft">Sub-centres, PHCs, CHCs and hospitals registered on the platform</p>
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
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-xl hover:bg-gov-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Register New Facility
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <span className="text-xs font-bold text-blue-800 uppercase">Active Facilities</span>
          <p className="text-2xl font-bold text-blue-950 mt-1">{isLoading ? '…' : active.length}</p>
          <p className="text-xs text-blue-700 mt-1">
            {isLoading ? '' : `${facilities.length - active.length} closed`}
          </p>
        </Card>
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase">Beds Free Now</span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{isLoading ? '…' : `${bedsFree} / ${bedsTotal}`}</p>
          <p className="text-xs text-emerald-700 mt-1">From the live bed register</p>
        </Card>
        <Card className="p-4 bg-rose-50 border-rose-200">
          <span className="text-xs font-bold text-rose-800 uppercase">24/7 Emergency Ready</span>
          <p className="text-2xl font-bold text-rose-950 mt-1">{isLoading ? '…' : emergencyReady}</p>
          <p className="text-xs text-rose-700 mt-1">Active facilities with emergency care</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by facility name, district, or taluka..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[{ value: 'all' as const, label: 'All' }, ...presentTypes.map((t) => ({ value: t.value, label: TYPE_LABELS[t.value] }))].map(tf => (
            <button
              key={tf.value}
              onClick={() => setTypeFilter(tf.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all shrink-0 ${
                typeFilter === tf.value
                  ? 'bg-gov-600 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Facilities Grid */}
      {isLoading ? (
        <Card className="p-8 text-center text-xs text-ink-soft">Loading facilities…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-xs text-ink-soft">
          {facilities.length === 0 ? 'No facilities are registered yet.' : 'No facilities match this search or filter.'}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {filtered.map(fac => (
            <Card key={fac.id} className={`p-5 space-y-4 ${fac.active ? '' : 'opacity-70'}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-ink text-base">{fac.name}</h3>
                  <Badge variant="info" className="uppercase text-[10px]">{TYPE_LABELS[fac.type] ?? fac.type}</Badge>
                  <Badge variant={fac.active ? 'success' : 'default'} className="text-[10px]">
                    {fac.active ? 'Active' : 'Closed'}
                  </Badge>
                </div>
                <p className="text-xs text-ink-soft mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-ink-soft" />
                  {[fac.village, fac.taluka, fac.district].filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-sand-50 rounded-xl border border-line text-center text-xs">
                <div>
                  <span className="text-ink-soft">Beds</span>
                  <p className="font-bold text-ink mt-0.5">
                    {fac.beds.total === 0 ? 'None listed' : `${fac.beds.total} (${fac.beds.available} free)`}
                  </p>
                </div>
                <div>
                  <span className="text-ink-soft">Staff</span>
                  <p className="font-bold text-ink mt-0.5">
                    {fac.doctors} Dr • {fac.ashaWorkers} ASHA
                  </p>
                </div>
                <div>
                  <span className="text-ink-soft">ICU / Vent</span>
                  <p className="font-bold text-ink mt-0.5">{fac.beds.icuTotal} / {fac.beds.ventilators}</p>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap text-[10px]">
                {fac.emergencyAvailable && (
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200 font-semibold">24/7 Emergency</span>
                )}
                {fac.beds.icuTotal > 0 && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-semibold">
                    {fac.beds.icuAvailable} ICU free
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-ink-soft">
                <span>Helpline: <strong>{fac.phone ?? 'Not set'}</strong></span>
                <button onClick={() => openEdit(fac)} className="text-gov-600 font-bold hover:underline">
                  Edit Details →
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Register / Edit Modal */}
      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Register New Healthcare Facility' : 'Edit Facility Details'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Facility Name</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={160}
              placeholder="e.g. Primary Health Centre Pirangut"
              {...field('name')}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Facility Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as FacilityType })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Helpline</label>
              <input
                type="tel"
                maxLength={20}
                pattern="[0-9+\-\s]{6,20}"
                placeholder="e.g. 020-22923011"
                {...field('phone')}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">District</label>
              <input type="text" required minLength={2} maxLength={100} {...field('district')}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Taluka</label>
              <input type="text" maxLength={100} {...field('taluka')}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Village</label>
              <input type="text" maxLength={100} {...field('village')}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Address (optional)</label>
            <input type="text" maxLength={300} {...field('address')}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Email (optional)</label>
            <input type="email" maxLength={160} {...field('email')}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm" />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.emergencyAvailable}
              onChange={e => setForm({ ...form, emergencyAvailable: e.target.checked })}
            />
            Provides 24/7 emergency care
          </label>

          {editing !== 'new' && editing && (
            <p className="text-[11px] text-ink-soft">
              Beds are managed from the bed register and staff from Staff Management, so they are not edited here.
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-lg hover:bg-gov-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : editing === 'new' ? 'Register Facility' : 'Save Changes'}
            </button>
            {editing && editing !== 'new' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void toggleActive(editing)}
                className={`px-4 py-2.5 border text-sm font-semibold rounded-lg disabled:opacity-60 ${
                  editing.active
                    ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {editing.active ? 'Close Facility' : 'Reopen Facility'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2.5 border border-line text-sand-700 text-sm font-semibold rounded-lg hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
