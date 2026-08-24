import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, MapPin, Phone, Search, RefreshCcw, CalendarPlus } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { backendApi, PatientSummary } from '../../services/api/backendApi';
import { dataService } from '../../services/api/dataService';
import { useToast } from '../../hooks/useToast';

/**
 * Patients assigned to the signed-in ASHA worker.
 *
 * The API already scopes /api/patients to the caller's caseload, so no
 * client-side filtering by worker is needed — and none would be trustworthy.
 */
export const AshaMyPatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [villageFilter, setVillageFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await backendApi.getPatients({ limit: 100 });
      setPatients(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your patients.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = dataService.subscribe(({ entity }) => {
      if (entity === 'patients') load();
    });
    return () => unsub();
  }, [load]);

  const villages = useMemo(() => {
    const set = new Set(patients.map((p) => p.village).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [patients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (villageFilter !== 'all' && p.village !== villageFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q) ||
        (p.abhaId ?? '').toLowerCase().includes(q) ||
        (p.village ?? '').toLowerCase().includes(q)
      );
    });
  }, [patients, query, villageFilter]);

  /** Age in whole years, or null when no date of birth was recorded. */
  const ageOf = (p: PatientSummary) => {
    if (!p.dateOfBirth) return null;
    const dob = new Date(p.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    return Math.floor((Date.now() - dob.getTime()) / 31557600000);
  };

  const handleScheduleVisit = async (p: PatientSummary) => {
    try {
      await dataService.saveTask({
        title: `Home visit — ${p.name}`,
        description: `Scheduled from the patient list${p.village ? ` (${p.village})` : ''}.`,
        patientId: p.id,
        type: 'home_visit',
        priority: 'medium',
        dueDate: new Date().toISOString().slice(0, 10),
      } as never);
      toast.success('Visit scheduled', `A task was added for ${p.name}.`);
    } catch (err) {
      toast.error('Could not schedule', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'My Registered Patients' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-gov-700" />
            My Registered Patients
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLoading
              ? 'Loading your caseload…'
              : `${patients.length} patient${patients.length === 1 ? '' : 's'} assigned to you`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCcw className="w-3.5 h-3.5" />}
            onClick={load}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => navigate('/asha/register-patient')}
          >
            Register Patient
          </Button>
        </div>
      </div>

      {/* Search and village filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <SearchInput
            placeholder="Search by name, phone, ABHA ID or village…"
            onChange={setQuery}
          />
        </div>

        {villages.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setVillageFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                villageFilter === 'all' ? 'bg-gov-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All villages
            </button>
            {villages.map((v) => (
              <button
                key={v}
                onClick={() => setVillageFilter(v)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  villageFilter === v ? 'bg-gov-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Patient list */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading patients…</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-3">
          <Users className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500">
            {patients.length === 0
              ? 'No patients are assigned to you yet.'
              : 'No patients match this search.'}
          </p>
          {patients.length === 0 && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => navigate('/asha/register-patient')}
            >
              Register your first patient
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const age = ageOf(p);
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-card transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {age !== null ? `${age} yrs` : 'Age not recorded'}
                      {p.gender ? ` · ${p.gender}` : ''}
                      {p.bloodGroup ? ` · ${p.bloodGroup}` : ''}
                    </p>
                  </div>
                  {p.abhaId && (
                    <Badge variant="primary" size="sm">ABHA</Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  {p.village && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {p.village}
                        {p.taluka ? `, ${p.taluka}` : ''}
                        {p.district ? ` (${p.district})` : ''}
                      </span>
                    </div>
                  )}
                  {p.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{p.phone}</span>
                    </div>
                  )}
                  {p.abhaId && (
                    <div className="text-[11px] font-mono text-gov-700">{p.abhaId}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
                    onClick={() => handleScheduleVisit(p)}
                  >
                    Schedule Visit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/asha/home-visits')}
                  >
                    Record
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Showing {filtered.length} of {patients.length} assigned patients
        </p>
      )}
    </div>
  );
};
