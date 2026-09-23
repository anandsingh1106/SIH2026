import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Navigation, Search, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { backendApi } from '@arogyasetu/shared/services/api';

type Household = Awaited<ReturnType<typeof backendApi.getAshaHouseholds>>[number];
type Status = Household['status'];

const STATUS: Record<Status, { label: string; dot: string; badge: 'danger' | 'warning' | 'info' | 'success' }> = {
  critical: { label: 'Critical', dot: 'bg-red-600', badge: 'danger' },
  high_risk: { label: 'High risk', dot: 'bg-saffron-500', badge: 'warning' },
  due: { label: 'Visit due', dot: 'bg-gov-600', badge: 'info' },
  routine: { label: 'Up to date', dot: 'bg-emerald-600', badge: 'success' },
};

const ORDER: Status[] = ['critical', 'high_risk', 'due', 'routine'];

const ageOf = (dob?: string) => {
  if (!dob) return undefined;
  const years = (Date.now() - new Date(dob).getTime()) / (365.25 * 86400000);
  return years < 1 ? `${Math.max(0, Math.floor(years * 12))} mo` : `${Math.floor(years)} y`;
};

// Patient records hold a village, not coordinates, so directions search for
// the place rather than pretending to know the exact house.
const directionsUrl = (h: Household) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [h.address, h.village, h.taluka, h.district, 'Maharashtra'].filter(Boolean).join(', ')
  )}`;

export const AshaVillageMapPage: React.FC = () => {
  const [rows, setRows] = useState<Household[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Household | null>(null);

  useEffect(() => {
    backendApi
      .getAshaHouseholds()
      .then(setRows)
      .catch((err) => {
        setRows([]);
        setError(err instanceof Error ? err.message : 'Could not load your households.');
      });
  }, []);

  const term = search.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (h) => (filter === 'all' || h.status === filter) && (!term || h.name.toLowerCase().includes(term) || (h.village ?? '').toLowerCase().includes(term))
  );

  // Grouped by village, the most urgent people first inside each.
  const villages = useMemo(() => {
    const groups = new Map<string, Household[]>();
    for (const h of visible) {
      const key = h.village ?? 'Village not recorded';
      groups.set(key, [...(groups.get(key) ?? []), h]);
    }
    return [...groups.entries()]
      .map(([village, list]) => [village, list.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  const count = (s: Status) => (rows ?? []).filter((h) => h.status === s).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Village Health Grid' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <MapPin className="w-6 h-6 text-gov-700" /> Village Health Grid
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          {rows ? `${rows.length} assigned patients across ${new Set(rows.map((r) => r.village)).size} villages` : 'Loading…'},
          ranked by what their records show
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">{error}</div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-sand-100 p-1 rounded-lg text-xs overflow-x-auto">
          {(['all', ...ORDER] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors shrink-0 ${
                filter === s ? 'bg-surface text-gov-800 shadow-2xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {s === 'all' ? `All (${rows?.length ?? 0})` : `${STATUS[s].label} (${count(s)})`}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search name or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-xs"
          />
        </div>
      </div>

      {rows && villages.length === 0 && (
        <p className="p-8 text-center text-xs text-ink-soft bg-surface border border-dashed border-line rounded-xl">
          {rows.length === 0 ? 'No patients are assigned to you yet.' : 'Nobody matches this filter.'}
        </p>
      )}

      {villages.map(([village, list]) => (
        <div key={village} className="bg-surface rounded-2xl border border-line p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink text-sm">{village}</h3>
            <span className="text-[11px] text-ink-soft">{list.length} patients</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((h) => (
              <button
                key={h.patientId}
                onClick={() => setSelected(h)}
                className="text-left p-3 rounded-xl border border-line bg-sand-50 hover:bg-sand-100 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-bold text-ink text-sm">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS[h.status].dot}`} />
                    {h.name}
                  </span>
                  <span className="text-[11px] text-ink-soft capitalize">
                    {[ageOf(h.dateOfBirth), h.gender].filter(Boolean).join(' • ')}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted truncate">
                  {h.alerts[0] ?? `Last visit ${h.lastVisit ?? 'never'}`}
                  {h.alerts.length > 1 && ` +${h.alerts.length - 1} more`}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        description={selected ? [selected.village, selected.taluka, selected.householdId && `Household ${selected.householdId}`].filter(Boolean).join(' • ') : ''}
      >
        {selected && (
          <div className="space-y-4 text-xs">
            <Badge variant={STATUS[selected.status].badge}>{STATUS[selected.status].label}</Badge>

            {selected.alerts.length > 0 ? (
              <div className="space-y-2">
                {selected.alerts.map((a) => (
                  <div key={a} className="p-3 bg-saffron-50 border border-saffron-200 rounded-xl font-semibold text-saffron-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-saffron-600 shrink-0" /> {a}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ink-soft">Nothing outstanding for this patient.</p>
            )}

            <div className="bg-raised p-3 rounded-xl border border-line space-y-1.5">
              <div className="flex justify-between"><span className="text-ink-soft">Last home visit</span><span className="font-semibold">{selected.lastVisit ?? 'Never'}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Vaccines due</span><span className="font-semibold">{selected.vaccinesDue}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Phone</span><span className="font-semibold">{selected.phone ?? 'Not recorded'}</span></div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/asha/home-visits" className="flex-1 text-center px-3 py-2 bg-gov-600 text-white font-bold rounded-lg hover:bg-gov-700">
                Record a visit
              </Link>
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="flex items-center gap-1.5 px-3 py-2 border border-line font-bold rounded-lg hover:bg-sand-50">
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              <a
                href={directionsUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-line font-bold rounded-lg hover:bg-sand-50"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
