import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Patient, PatientTimelineEvent } from '../../types';
import { FileText, Search, User, Clock, AlertOctagon, Pill, FlaskConical, Stethoscope, ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PatientSummaryCard } from '../../components/healthcare/PatientSummaryCard';

/**
 * Several visits can share a day, so the time is kept when there is one --
 * otherwise repeat consultations read as duplicates of each other.
 */
function formatEventDate(value: string): string {
  if (!value) return '';
  const day = value.slice(0, 10);
  const parsed = new Date(value);
  if (value.length <= 10 || Number.isNaN(parsed.getTime())) return day;
  return `${day} • ${parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/** How many patients the registry lists before asking to show the rest. */
const REGISTRY_PREVIEW_SIZE = 30;

const TYPE_LABEL: Record<PatientTimelineEvent['type'], string> = {
  consultation: 'Consultation',
  prescription: 'Prescription',
  lab: 'Lab Order',
  registration: 'Registration',
};

const TYPE_DOT: Record<PatientTimelineEvent['type'], string> = {
  consultation: 'bg-gov-700',
  prescription: 'bg-emerald-600',
  lab: 'bg-saffron-500',
  registration: 'bg-sand-500',
};

export const DoctorPatientRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [timeline, setTimeline] = useState<PatientTimelineEvent[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  useEffect(() => {
    dataService.getPatients().then((list) => {
      setPatients(list);
      if (list.length > 0) setSelectedPatient(list[0]);
    });
  }, []);

  // The timeline belongs to the selected patient, so it has to reload whenever
  // the selection changes rather than showing one patient's history for all.
  useEffect(() => {
    if (!selectedPatient) {
      setTimeline([]);
      return;
    }
    let cancelled = false;
    setIsTimelineLoading(true);
    dataService.getPatientTimeline(selectedPatient.id).then((events) => {
      // A slow request for a patient the user already moved away from must not
      // overwrite the newer one.
      if (cancelled) return;
      setTimeline(events);
      setIsTimelineLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedPatient]);

  const filtered = patients.filter((p) => {
    return (
      (p.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.abhaId ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone ?? '').includes(searchQuery)
    );
  });

  // A registry of every patient is unreadable to scroll, so only the most
  // recent are listed up front. Searching still reaches the whole registry,
  // and "show all" is there when someone wants to browse.
  const isSearching = searchQuery.trim().length > 0;
  const visiblePatients = showAllPatients || isSearching ? filtered : filtered.slice(0, REGISTRY_PREVIEW_SIZE);
  const hiddenCount = filtered.length - visiblePatients.length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Doctor Workspace', href: '/doctor/dashboard' },
          { label: 'Longitudinal EHR & Patient Health Records' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <FileText className="w-6 h-6 text-gov-700" />
          Longitudinal Electronic Health Records (EHR)
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Unified patient health histories anchored on Ayushman Bharat Health Account (ABHA) IDs
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-surface p-4 rounded-xl border border-line shadow-xs">
        <SearchInput
          placeholder="Search patient by Name, 14-digit ABHA ID, or Phone..."
          onChange={setSearchQuery}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Selection List (Left 4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-sand-700 uppercase tracking-wider">
            Patient Registry ({visiblePatients.length}
            {hiddenCount > 0 ? ` of ${filtered.length}` : ''})
          </h3>

          <div className="space-y-2">
            {visiblePatients.map((p) => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gov-50/60 border-gov-600 shadow-xs font-semibold'
                      : 'bg-surface border-line hover:bg-sand-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">{p.name}</span>
                    <Badge variant={p.riskCategory === 'critical' ? 'critical' : p.riskCategory === 'high' ? 'danger' : 'primary'} size="sm">
                      {(p.riskCategory ?? 'normal').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-ink-soft font-mono mt-0.5">ABHA: {p.abhaId}</div>
                  <div className="text-[11px] text-ink-soft mt-1 flex justify-between">
                    <span>{p.age} Yrs / {p.gender}</span>
                    <span>{p.village}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowAllPatients(true)}
            >
              Show all {filtered.length} patients ({hiddenCount} more)
            </Button>
          )}

          {showAllPatients && !isSearching && filtered.length > REGISTRY_PREVIEW_SIZE && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowAllPatients(false)}
            >
              Show fewer
            </Button>
          )}
        </div>

        {/* Longitudinal History Timeline (Right 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPatient ? (
            <div className="space-y-4">
              <PatientSummaryCard patient={selectedPatient} />

              <div className="bg-surface rounded-2xl border border-line p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="font-bold text-ink text-sm uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gov-700" />
                    Longitudinal Care Timeline & Historical Consultations
                  </h3>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                    onClick={() =>
                      navigate('/doctor/consultation', { state: { patientId: selectedPatient.id } })
                    }
                  >
                    Start Consultation for {(selectedPatient.name ?? '').split(' ')[0]}
                  </Button>
                </div>

                {/* Timeline Feed */}
                {isTimelineLoading && (
                  <div className="py-8 text-center text-xs text-ink-soft">Loading clinical history…</div>
                )}

                {!isTimelineLoading && timeline.length === 0 && (
                  <div className="py-8 text-center text-xs text-ink-soft">
                    No consultations, prescriptions or lab orders recorded for this patient yet.
                  </div>
                )}

                {!isTimelineLoading && timeline.length > 0 && (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-sand-200">
                    {timeline.map((evt) => (
                      <div key={`${evt.type}-${evt.id}`} className="relative flex items-start gap-4 pl-8">
                        <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-2xs ${TYPE_DOT[evt.type]}`} />
                        <div className="bg-sand-50 p-4 rounded-xl border border-line w-full space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-ink text-sm">{evt.title}</span>
                            <span className="text-[11px] text-ink-soft font-semibold shrink-0">{formatEventDate(evt.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" size="sm">{TYPE_LABEL[evt.type]}</Badge>
                            <span className="text-[11px] text-gov-800 font-medium">{evt.actor}</span>
                          </div>
                          <p className="text-ink-muted leading-relaxed">{evt.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 bg-surface rounded-2xl border border-line text-center text-xs text-ink-soft">
              Select a patient record to inspect their complete clinical timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
