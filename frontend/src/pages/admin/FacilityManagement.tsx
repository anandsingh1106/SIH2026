import React, { useState } from 'react';
import { Building2, Plus, Search, Filter, MapPin, Phone, Bed, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { INITIAL_FACILITIES } from '../../data/mockData';
import { Facility } from '../../types';

export const AdminFacilityManagement: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFacility, setNewFacility] = useState<{
    name: string;
    type: Facility['type'];
    district: string;
    taluka: string;
    phone: string;
    totalBeds: number;
  }>({
    name: '',
    type: 'PHC',
    district: 'Pune',
    taluka: 'Mulshi',
    phone: '',
    totalBeds: 10,
  });

  const filtered = facilities.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.district.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || f.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name) return;

    const fac: Facility = {
      id: `fac-${Date.now()}`,
      name: newFacility.name,
      type: newFacility.type as Facility['type'],
      district: newFacility.district,
      taluka: newFacility.taluka,
      address: `${newFacility.name}, ${newFacility.taluka}, ${newFacility.district}`,
      phone: newFacility.phone || '020-22923011',
      latitude: 18.5304,
      longitude: 73.5356,
      totalBeds: Number(newFacility.totalBeds) || 10,
      availableBeds: Math.round(Number(newFacility.totalBeds) * 0.4),
      icuBeds: newFacility.type === 'District Hospital' ? 20 : 0,
      availableIcuBeds: newFacility.type === 'District Hospital' ? 5 : 0,
      ventilators: newFacility.type === 'District Hospital' ? 10 : 0,
      availableVentilators: newFacility.type === 'District Hospital' ? 2 : 0,
      emergencyReady: true,
      bloodBankAvailable: newFacility.type === 'District Hospital',
      oxygenAvailable: true,
      services: ['OPD', '24x7 Emergency', 'Immunization', 'Tele-Consultation'],
      doctorsCount: 4,
    };

    setFacilities(prev => [fac, ...prev]);
    setShowAddModal(false);
    setNewFacility({ name: '', type: 'PHC', district: 'Pune', taluka: 'Mulshi', phone: '', totalBeds: 10 });
  };

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
            <p className="text-sm text-ink-soft">Directory of PHCs, CHCs, Subcenters, and District Hospitals across Maharashtra</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-xl hover:bg-gov-700 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Register New Facility
        </button>
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
          {['all', 'PHC', 'CHC', 'Sub-District Hospital', 'District Hospital'].map(tf => (
            <button
              key={tf}
              onClick={() => setTypeFilter(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all shrink-0 ${
                typeFilter === tf
                  ? 'bg-gov-600 text-white shadow-sm'
                  : 'bg-sand-100 text-sand-700 hover:bg-sand-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </Card>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
        {filtered.map(fac => (
          <Card key={fac.id} className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-ink text-base">{fac.name}</h3>
                  <Badge variant="info" className="uppercase text-[10px]">{fac.type}</Badge>
                  <Badge variant="success" className="text-[10px] capitalize">
                    Active
                  </Badge>
                </div>
                <p className="text-xs text-ink-soft mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-ink-soft" /> {fac.taluka}, {fac.district}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-sand-50 rounded-xl border border-line text-center text-xs">
              <div>
                <span className="text-ink-soft">Total Beds</span>
                <p className="font-bold text-ink mt-0.5">{fac.totalBeds} ({fac.availableBeds} free)</p>
              </div>
              <div>
                <span className="text-ink-soft">Doctors</span>
                <p className="font-bold text-ink mt-0.5">{fac.doctorsCount} Doctors</p>
              </div>
              <div>
                <span className="text-ink-soft">ICU / Vent</span>
                <p className="font-bold text-ink mt-0.5">{fac.icuBeds} / {fac.ventilators}</p>
              </div>
            </div>

            {/* Capabilities badges */}
            <div className="flex gap-1.5 flex-wrap text-[10px]">
              {fac.emergencyReady && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200 font-semibold">24/7 Emergency</span>}
              {fac.oxygenAvailable && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-semibold">Oxygen Pipeline</span>}
              {fac.bloodBankAvailable && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-semibold">Blood Bank Hub</span>}
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-ink-soft">
              <span>Helpline: <strong>{fac.phone}</strong></span>
              <button className="text-gov-600 font-bold hover:underline">Edit Configuration →</button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Healthcare Facility"
      >
        <form onSubmit={handleAddFacility} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Facility Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Health Centre Pirangut"
              value={newFacility.name}
              onChange={e => setNewFacility({ ...newFacility, name: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Facility Type</label>
              <select
                value={newFacility.type}
                onChange={e => setNewFacility({ ...newFacility, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
              >
                <option value="PHC">PHC (Primary Health Centre)</option>
                <option value="CHC">CHC (Community Health Centre)</option>
                <option value="District Hospital">District Hospital</option>
                <option value="Sub-District Hospital">Sub-District Hospital</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Total Inpatient Beds</label>
              <input
                type="number"
                value={newFacility.totalBeds}
                onChange={e => setNewFacility({ ...newFacility, totalBeds: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">District</label>
              <input
                type="text"
                value={newFacility.district}
                onChange={e => setNewFacility({ ...newFacility, district: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Taluka</label>
              <input
                type="text"
                value={newFacility.taluka}
                onChange={e => setNewFacility({ ...newFacility, taluka: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-lg hover:bg-gov-700"
            >
              Authorize & Add Facility
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
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
