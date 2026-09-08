import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, ShieldCheck, ShieldAlert, Phone, Building2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { backendApi, type StaffRecord } from '@arogyasetu/shared/services/api';

const ROLE_FILTERS = ['all', 'doctor', 'specialist', 'asha', 'admin'] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const ROLE_LABEL: Record<string, string> = {
  doctor: 'Medical Officer',
  specialist: 'Tertiary Specialist',
  asha: 'ASHA Worker',
  admin: 'Administrator',
};

/** A phone column reads badly when the demo accounts carry `demo:doctor`. */
const isRealPhone = (phone: string) => /\d/.test(phone);

function formatLastSeen(iso?: string): string {
  if (!iso) return 'Never signed in';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never signed in';
  return `Last seen ${d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  })}`;
}

export const AdminStaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  useEffect(() => {
    let cancelled = false;
    backendApi
      .getStaff()
      .then((res) => {
        if (!cancelled) setStaff(res.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the staff roster.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      const matchesSearch =
        q === '' ||
        s.name.toLowerCase().includes(q) ||
        (s.facility ?? '').toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [staff, search, roleFilter]);

  // Staff cannot open a health record until a second factor is enrolled, so
  // this is the roster's real readiness figure rather than a training count.
  const awaitingMfa = staff.filter((s) => !s.mfaEnrolled).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Healthcare Workforce Management' }]} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">Healthcare Workforce Roster</h1>
          <p className="text-sm text-ink-soft">
            Medical Officers, Tertiary Specialists and frontline ASHA cadres registered on this platform
          </p>
        </div>
      </div>

      {/* Stats — counts of the accounts this deployment actually holds. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-purple-50 border-purple-200">
          <span className="text-xs font-bold text-purple-800 uppercase">Staff accounts</span>
          <p className="text-2xl font-bold text-purple-950 mt-1">{loading ? '—' : staff.length}</p>
          <p className="text-xs text-purple-700 mt-1">Registered on this platform</p>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <span className="text-xs font-bold text-blue-800 uppercase">Clinicians</span>
          <p className="text-2xl font-bold text-blue-950 mt-1">
            {loading ? '—' : staff.filter((s) => s.role === 'doctor' || s.role === 'specialist').length}
          </p>
          <p className="text-xs text-blue-700 mt-1">Medical officers and specialists</p>
        </Card>

        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase">Two-factor enrolled</span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">
            {loading ? '—' : `${staff.length - awaitingMfa} of ${staff.length}`}
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            {awaitingMfa === 0 ? 'Every account can open a record' : `${awaitingMfa} awaiting enrolment`}
          </p>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by staff name or posted facility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all shrink-0 ${
                roleFilter === rf
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {rf}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-rose-50 border-rose-200 text-sm text-rose-800">{error}</Card>
      )}

      {loading && (
        <Card className="p-8 text-center text-ink-soft text-sm">Loading workforce roster…</Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card className="p-8 text-center text-ink-soft text-sm">
          {staff.length === 0
            ? 'No staff accounts are registered yet.'
            : 'No staff match this search.'}
        </Card>
      )}

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
        {filtered.map((st) => (
          <Card key={st.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-ink text-base">{st.name}</h3>
                  <Badge
                    variant={st.role === 'specialist' ? 'warning' : st.role === 'doctor' ? 'info' : 'success'}
                    className="uppercase text-[10px]"
                  >
                    {ROLE_LABEL[st.role] ?? st.role}
                  </Badge>
                  {st.status !== 'ACTIVE' && (
                    <Badge variant="default" className="text-[10px] capitalize">
                      {st.status.toLowerCase()}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-ink-soft mt-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {st.facility ? (
                    <>
                      Posting: <strong className="text-sand-700">{st.facility}</strong>
                      {st.district && ` (${st.district} District)`}
                    </>
                  ) : (
                    <>{st.district ? `${st.district} District` : 'No facility assigned'}</>
                  )}
                </p>
              </div>
            </div>

            <div className="p-3 bg-sand-50 rounded-xl border border-line flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {st.mfaEnrolled ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                )}
                <span className="text-ink-muted">Two-factor authentication</span>
              </div>
              <span className={`font-bold ${st.mfaEnrolled ? 'text-emerald-700' : 'text-amber-700'}`}>
                {st.mfaEnrolled ? 'Enrolled' : 'Not enrolled'}
              </span>
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-ink-soft gap-2">
              {isRealPhone(st.phone) ? (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-ink-soft" /> {st.phone}
                </span>
              ) : (
                <span className="truncate">{st.email ?? '—'}</span>
              )}
              <span className="shrink-0">{formatLastSeen(st.lastLoginAt)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
