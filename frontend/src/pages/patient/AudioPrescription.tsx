import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Volume2, Info, Pill, Calendar, RefreshCcw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { MetricCard } from '../../components/ui/MetricCard';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { AudioPrescriptionPlayer } from '../../components/healthcare/AudioPrescriptionPlayer';
import { backendApi } from '../../services/api/backendApi';
import { mapPrescription } from '../../services/api/dataService';
import { useAuth } from '../../services/auth/authContext';
import { Prescription } from '../../types';

export const PatientAudioPrescription: React.FC = () => {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The backend scopes prescriptions to the logged-in user, so no patient
      // id is needed here.
      const { items } = await backendApi.getPrescriptions();
      // The API returns raw rows that keep medicines in a separate `items`
      // collection; this page reads `medicines` and iterates it unguarded.
      setPrescriptions(items.map(mapPrescription));
    } catch {
      setError('Could not reach the prescription service. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPrescriptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter(
      (pres) =>
        (pres.doctorName ?? '').toLowerCase().includes(q) ||
        (pres.facilityName ?? '').toLowerCase().includes(q) ||
        (pres.date ?? '').toLowerCase().includes(q) ||
        (pres.medicines ?? []).some((m) => (m.name ?? '').toLowerCase().includes(q))
    );
  }, [prescriptions, query]);

  const totalMedicines = useMemo(
    () => prescriptions.reduce((sum, pres) => sum + (pres.medicines?.length ?? 0), 0),
    [prescriptions]
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Audio Prescription' }]} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Volume2 className="w-6 h-6 text-gov-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Audio Prescription</h1>
            <p className="text-sm text-slate-500">Listen to your medicine instructions in Marathi, Hindi, or English</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          onClick={loadData}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-blue-800 text-sm">Accessibility Feature</p>
          <p className="text-xs text-blue-700 mt-1">
            This feature reads out your prescription in simple language.
            It is designed to help patients who have difficulty reading.
            Always follow your doctor's verbal instructions.
          </p>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadData} />}

      {!error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Prescriptions"
              value={isLoading ? '—' : prescriptions.length}
              subtitle="Total on file"
              icon={<Pill className="w-4 h-4" />}
              variant="teal"
            />
            <MetricCard
              title="Medicines"
              value={isLoading ? '—' : totalMedicines}
              subtitle="Across all prescriptions"
              icon={<Volume2 className="w-4 h-4" />}
              variant="blue"
            />
            <MetricCard
              title="Most Recent"
              value={isLoading ? '—' : prescriptions[0]?.date ?? '—'}
              subtitle={isLoading ? '' : prescriptions[0]?.doctorName ?? 'No prescriptions yet'}
              icon={<Calendar className="w-4 h-4" />}
              variant="amber"
            />
          </div>

          {!isLoading && prescriptions.length > 0 && (
            <SearchInput
              placeholder="Search by doctor, facility, date, or medicine..."
              value={query}
              onChange={setQuery}
              debounceMs={150}
            />
          )}

          <div className="space-y-6">
            {isLoading && (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            )}

            {!isLoading && prescriptions.length === 0 && (
              <EmptyState
                title="No prescriptions yet"
                description="Once your doctor issues an e-prescription, you'll be able to listen to it here in your preferred language."
                icon={<Pill className="w-8 h-8" />}
              />
            )}

            {!isLoading && prescriptions.length > 0 && filteredPrescriptions.length === 0 && (
              <EmptyState
                title="No matching prescriptions"
                description={`Nothing matches "${query}". Try a different doctor, facility, or medicine name.`}
                actionLabel="Clear search"
                onAction={() => setQuery('')}
              />
            )}

            {!isLoading &&
              filteredPrescriptions.map((pres) => (
                <Card key={pres.id} className="overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                    <p className="font-bold text-slate-800">Prescription — {pres.date}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{pres.doctorName} · {pres.facilityName}</p>
                  </div>
                  <div className="p-5">
                    <AudioPrescriptionPlayer
                      patientName={currentUser?.name || 'Patient'}
                      doctorName={pres.doctorName}
                      facilityName={pres.facilityName}
                      date={pres.date}
                      medicines={pres.medicines}
                      generalAdvice={pres.generalAdvice}
                      generalAdviceMr={pres.generalAdviceMr}
                      generalAdviceHi={pres.generalAdviceHi}
                    />
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PatientAudioPrescription;
