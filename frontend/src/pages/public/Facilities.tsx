import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Facility } from '../../types';
import { MAHARASHTRA_DISTRICTS } from '../../data/mockData';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Building2, MapPin, Phone, BedDouble, Navigation, ShieldCheck, HeartPulse, CheckCircle2 } from 'lucide-react';

export const FacilitiesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('search') || '';

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  useEffect(() => {
    dataService.getFacilities().then(setFacilities);
  }, []);

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.services ?? []).some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDistrict = selectedDistrict === 'All' || f.district === selectedDistrict;
    const matchesType = selectedType === 'All' || f.type === selectedType;

    return matchesSearch && matchesDistrict && matchesType;
  });

  return (
    <div className="min-h-screen bg-canvas flex flex-col antialiased">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-gov-700" />
            Maharashtra Healthcare Facility Discovery Directory
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Real-time bed availability, emergency trauma readiness, and service listings across public and empaneled hospitals.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-surface p-4 rounded-xl border border-line shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <SearchInput
                placeholder="Search facility name, trauma, maternity..."
                defaultValue={initialQuery}
                onChange={setSearchQuery}
              />
            </div>

            <div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
              >
                <option value="All">All Districts (36 Districts)</option>
                {MAHARASHTRA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d} District
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
              >
                <option value="All">All Facility Tiers</option>
                <option value="PHC">Primary Health Center (PHC)</option>
                <option value="CHC">Community Health Center (CHC)</option>
                <option value="Sub-District Hospital">Sub-District Hospital (SDH)</option>
                <option value="District Hospital">District General Hospital (DH)</option>
                <option value="GMC">Government Medical College (GMC Apex)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Facility Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {filteredFacilities.length === 0 ? (
            <div className="col-span-full p-12 bg-surface rounded-xl border border-dashed border-sand-300 text-center text-xs text-ink-soft">
              No healthcare facilities found matching your filters. Try selecting "All Districts".
            </div>
          ) : (
            filteredFacilities.map((fac) => (
              <div
                key={fac.id}
                className="bg-surface rounded-xl border border-line p-5 shadow-xs flex flex-col justify-between hover:shadow-card transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="primary" size="sm">
                        {fac.type}
                      </Badge>
                      <h3 className="font-bold text-ink text-sm mt-1.5 leading-snug">
                        {fac.name}
                      </h3>
                      {fac.nameMr && <p className="text-xs text-ink-soft font-medium">{fac.nameMr}</p>}
                    </div>
                    {fac.emergencyReady && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                        24x7 Emergency
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-soft flex items-start gap-1.5 line-clamp-2">
                    <MapPin className="w-3.5 h-3.5 text-ink-soft shrink-0 mt-0.5" />
                    <span>{fac.address}</span>
                  </p>

                  {/* Bed Stats Pills — only shown when capacity was reported */}
                  {fac.totalBeds > 0 || fac.icuBeds > 0 ? (
                    <div className="grid grid-cols-2 gap-2 bg-raised p-2.5 rounded-xl border border-line text-xs">
                      <div>
                        <span className="text-[11px] text-ink-soft">General Beds:</span>
                        <div className="font-bold text-ink tabular-nums">
                          {fac.availableBeds}{' '}
                          <span className="text-[10px] font-normal text-ink-soft">
                            / {fac.totalBeds} free
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-ink-soft">ICU / Ventilators:</span>
                        <div className="font-bold text-emerald-700 tabular-nums">
                          {fac.availableIcuBeds}{' '}
                          <span className="text-[10px] font-normal text-ink-soft">
                            / {fac.icuBeds} free
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-raised p-2.5 rounded-xl border border-dashed border-line text-[11px] text-ink-soft italic">
                      Live bed capacity not published for this facility
                    </div>
                  )}

                  {/* Key Services Tags */}
                  {(fac.services ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {fac.services.slice(0, 3).map((s, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-sand-100 text-ink-muted px-2 py-0.5 rounded-lg"
                        >
                          {s}
                        </span>
                      ))}
                      {fac.services.length > 3 && (
                        <span className="text-[10px] bg-sand-100 text-ink-soft px-1.5 py-0.5 rounded-lg">
                          +{fac.services.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <a
                    href={`tel:${fac.phone}`}
                    className="text-xs font-semibold text-sand-700 hover:text-gov-700 flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-ink-soft" />
                    <span>{fac.phone}</span>
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFacility(fac)}
                  >
                    View Details & Beds
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Facility Details Modal */}
        {selectedFacility && (
          <Modal
            isOpen={!!selectedFacility}
            onClose={() => setSelectedFacility(null)}
            title={selectedFacility.name}
            description={`${selectedFacility.type} • ${selectedFacility.taluka}, ${selectedFacility.district} District`}
            size="lg"
            footer={
              <div className="flex justify-between items-center w-full">
                <a href={`tel:${selectedFacility.phone}`} className="text-xs font-bold text-sand-700 flex items-center gap-1">
                  <Phone className="w-4 h-4 text-gov-700" /> Call Facility: {selectedFacility.phone}
                </a>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedFacility(null)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Navigation className="w-3.5 h-3.5" />}
                    onClick={() => {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedFacility.latitude},${selectedFacility.longitude}`, '_blank');
                    }}
                  >
                    Get Directions
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="bg-raised p-3.5 rounded-xl border border-line text-xs space-y-2">
                <p className="flex items-start gap-1.5 text-ink-muted">
                  <MapPin className="w-4 h-4 text-gov-700 shrink-0 mt-0.5" />
                  <span><strong>Address:</strong> {selectedFacility.address || 'Not published'}</span>
                </p>

                {/* Only the capability facts the record actually carries are
                    stated. Printing "Cylinders Only" for a facility that never
                    reported its oxygen supply would invent a clinical fact. */}
                {(selectedFacility.doctorsCount > 0 ||
                  selectedFacility.bloodBankAvailable ||
                  selectedFacility.oxygenAvailable ||
                  selectedFacility.emergencyReady) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-line">
                    {selectedFacility.doctorsCount > 0 && (
                      <div>
                        <strong>Medical Officers on Duty:</strong> {selectedFacility.doctorsCount} Doctors
                      </div>
                    )}
                    {selectedFacility.bloodBankAvailable && (
                      <div><strong>Blood Bank:</strong> Available (24x7)</div>
                    )}
                    {selectedFacility.oxygenAvailable && (
                      <div><strong>Liquid Oxygen Supply:</strong> Available (PSA Plant/Bulk)</div>
                    )}
                    {selectedFacility.emergencyReady && (
                      <div><strong>Emergency Care:</strong> Emergency services available</div>
                    )}
                  </div>
                )}
              </div>

              {/* Full Roster of Services */}
              {(selectedFacility.services ?? []).length > 0 ? (
                <div>
                  <h5 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                    Clinical Services & Specialized Units:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedFacility.services.map((serv, idx) => (
                      <div key={idx} className="p-2.5 bg-surface border border-line rounded-xl text-xs font-medium text-ink flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-gov-600 shrink-0" />
                        <span>{serv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-soft italic">
                  A detailed service roster has not been published for this facility. Call ahead to
                  confirm availability before travelling.
                </p>
              )}
            </div>
          </Modal>
        )}
      </div>

    </div>
  );
};
