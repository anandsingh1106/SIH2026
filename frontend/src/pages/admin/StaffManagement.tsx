import React, { useState } from 'react';
import { Users, Plus, Search, Filter, ShieldCheck, CheckCircle2, Award, Phone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { UserRole } from '../../types';

interface StaffMember {
  id: string;
  name: string;
  role: UserRole;
  facility: string;
  district: string;
  phone: string;
  activeStatus: 'on_duty' | 'on_leave' | 'transit';
  trainedInNcd: boolean;
  trainingCompletedDate: string;
}

const MOCK_STAFF: StaffMember[] = [
  { id: 'st-1', name: 'Dr. Rajesh Deshmukh', role: 'doctor', facility: 'PHC Paud', district: 'Pune', phone: '+91 98220 11029', activeStatus: 'on_duty', trainedInNcd: true, trainingCompletedDate: 'Jan 2026' },
  { id: 'st-2', name: 'Dr. Priya Kulkarni', role: 'specialist', facility: 'Sassoon Hospital', district: 'Pune', phone: '+91 98220 33918', activeStatus: 'on_duty', trainedInNcd: true, trainingCompletedDate: 'Mar 2025' },
  { id: 'st-3', name: 'Sunita Patil', role: 'asha', facility: 'PHC Paud (Ward 3)', district: 'Pune', phone: '+91 94231 88231', activeStatus: 'on_duty', trainedInNcd: true, trainingCompletedDate: 'Feb 2026' },
  { id: 'st-4', name: 'Meena Gaikwad', role: 'asha', facility: 'CHC Mulshi', district: 'Pune', phone: '+91 94231 00921', activeStatus: 'on_duty', trainedInNcd: true, trainingCompletedDate: 'Feb 2026' },
  { id: 'st-5', name: 'Dr. Arvind Mehra', role: 'doctor', facility: 'District Hospital Aundh', district: 'Pune', phone: '+91 98220 77120', activeStatus: 'on_leave', trainedInNcd: false, trainingCompletedDate: 'Pending' },
];

export const AdminStaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>(MOCK_STAFF);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.facility.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin Command Center' }, { label: 'Healthcare Workforce Management' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Healthcare Workforce Roster & Deployment</h1>
            <p className="text-sm text-slate-500">Medical Officers, Tertiary Specialists, Staff Nurses, and frontline ASHA cadres</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-xl hover:bg-gov-700 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Onboard Healthcare Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-purple-50 border-purple-200">
          <span className="text-xs font-bold text-purple-800 uppercase">State ASHA Cadre</span>
          <p className="text-2xl font-bold text-purple-950 mt-1">74,200 active</p>
          <p className="text-xs text-purple-700 mt-1">Digital PWA-equipped health workers</p>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <span className="text-xs font-bold text-blue-800 uppercase">Medical Officers (PHC / CHC)</span>
          <p className="text-2xl font-bold text-blue-950 mt-1">6,840 posted</p>
          <p className="text-xs text-blue-700 mt-1">98.2% rural retention rate</p>
        </Card>

        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase">NCD Screening Certified</span>
          <p className="text-2xl font-bold text-emerald-950 mt-1">94% Certified</p>
          <p className="text-xs text-emerald-700 mt-1">National NCD module completed</p>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by staff name or posted facility..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {['all', 'doctor', 'specialist', 'asha'].map(rf => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all shrink-0 ${
                roleFilter === rf
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {rf}
            </button>
          ))}
        </div>
      </Card>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(st => (
          <Card key={st.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{st.name}</h3>
                  <Badge variant={st.role === 'specialist' ? 'warning' : st.role === 'doctor' ? 'info' : 'success'} className="uppercase text-[10px]">
                    {st.role}
                  </Badge>
                  <Badge variant={st.activeStatus === 'on_duty' ? 'success' : 'default'} className="text-[10px] capitalize">
                    {st.activeStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Posting: <strong className="text-slate-700">{st.facility}</strong> ({st.district} District)
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-slate-600">NCD & Tele-triage Training:</span>
              </div>
              <span className={`font-bold ${st.trainedInNcd ? 'text-emerald-700' : 'text-amber-700'}`}>
                {st.trainedInNcd ? `Certified (${st.trainingCompletedDate})` : 'Pending Module'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> {st.phone}
              </span>
              <button className="text-purple-600 font-bold hover:underline">View Service Record →</button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Onboard Healthcare Personnel"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input type="text" placeholder="e.g. Dr. Shruti Ranade" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cadre / Role</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="doctor">Medical Officer (PHC)</option>
                <option value="specialist">Tertiary Specialist</option>
                <option value="asha">ASHA Worker</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Facility</label>
              <input type="text" placeholder="e.g. PHC Paud" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700"
            >
              Issue Digital Credentials & ABHA Role
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
