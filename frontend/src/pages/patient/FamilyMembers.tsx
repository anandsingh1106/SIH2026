import React, { useState } from 'react';
import { Users, Plus, UserCheck, ShieldCheck, Heart, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import { INITIAL_PATIENTS } from '../../data/mockData';

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  age: number;
  gender: string;
  abhaId: string;
  isHead: boolean;
  bloodGroup: string;
  activeConditions: string[];
}

const MOCK_FAMILY: FamilyMember[] = [
  {
    id: 'pat-1',
    name: 'Anandi Devi Patil',
    relation: 'Self',
    age: 58,
    gender: 'Female',
    abhaId: '91-8273-1928-4491',
    isHead: false,
    bloodGroup: 'O +ve',
    activeConditions: ['Hypertension', 'Type 2 Diabetes'],
  },
  {
    id: 'pat-2',
    name: 'Dnyaneshwar Patil',
    relation: 'Spouse',
    age: 62,
    gender: 'Male',
    abhaId: '91-1029-4829-1102',
    isHead: true,
    bloodGroup: 'B +ve',
    activeConditions: ['Osteoarthritis'],
  },
  {
    id: 'pat-3',
    name: 'Ramesh Patil',
    relation: 'Son',
    age: 32,
    gender: 'Male',
    abhaId: '91-9923-1182-5501',
    isHead: false,
    bloodGroup: 'O +ve',
    activeConditions: [],
  },
  {
    id: 'pat-4',
    name: 'Aarohi Patil',
    relation: 'Granddaughter',
    age: 4,
    gender: 'Female',
    abhaId: '91-7712-4019-3329',
    isHead: false,
    bloodGroup: 'A +ve',
    activeConditions: ['Child Immunization Track'],
  },
];

export const PatientFamilyMembers: React.FC = () => {
  const [family, setFamily] = useState<FamilyMember[]>(MOCK_FAMILY);
  const [selectedMember, setSelectedMember] = useState<string>('pat-1');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    relation: 'Child',
    age: '',
    gender: 'Female',
    abhaId: '',
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name) return;

    const member: FamilyMember = {
      id: `pat-${Date.now()}`,
      name: newMember.name,
      relation: newMember.relation,
      age: parseInt(newMember.age) || 10,
      gender: newMember.gender,
      abhaId: newMember.abhaId || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-1010`,
      isHead: false,
      bloodGroup: 'Unknown',
      activeConditions: [],
    };

    setFamily(prev => [...prev, member]);
    setShowAddModal(false);
    setNewMember({ name: '', relation: 'Child', age: '', gender: 'Female', abhaId: '' });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Patient Portal' }, { label: 'Family Health Folder' }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Family Health Folder & ABHA Linking</h1>
            <p className="text-sm text-ink-soft">Manage health records, appointments, and consents for all household members</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-xl hover:bg-gov-700 shadow-sm transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Link Family Member ABHA
        </button>
      </div>

      {/* Active Profile Banner */}
      <Card className="p-4 bg-purple-50 border-purple-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
            {family.find(f => f.id === selectedMember)?.name.charAt(0) || 'A'}
          </div>
          <div>
            <p className="text-xs text-purple-700 font-semibold">Active Portal Profile</p>
            <p className="text-sm font-bold text-purple-950">
              {family.find(f => f.id === selectedMember)?.name} ({family.find(f => f.id === selectedMember)?.relation})
            </p>
          </div>
        </div>
        <Badge variant="success" className="bg-purple-100 text-purple-800 border-purple-300">
          Ration Card ID: MH-PUN-MUL-99201
        </Badge>
      </Card>

      {/* Family Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
        {family.map(mem => (
          <Card
            key={mem.id}
            className={`p-5 transition-all cursor-pointer ${
              selectedMember === mem.id
                ? 'ring-2 ring-purple-600 border-transparent shadow-md'
                : 'hover:border-purple-300'
            }`}
            onClick={() => setSelectedMember(mem.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-ink text-base">{mem.name}</h3>
                  {mem.isHead && <Badge variant="warning" className="text-[10px]">Head of Family</Badge>}
                </div>
                <p className="text-xs font-semibold text-ink-soft mt-0.5">
                  {mem.relation} • {mem.age} yrs • {mem.gender}
                </p>
              </div>
              <div className="w-6 h-6 rounded-full border border-sand-300 flex items-center justify-center">
                {selectedMember === mem.id && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-line space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">ABHA Address / ID:</span>
                <span className="font-mono font-medium text-sand-700">{mem.abhaId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-soft">Blood Group:</span>
                <span className="font-semibold text-ink">{mem.bloodGroup}</span>
              </div>
              {mem.activeConditions.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft">Care Program:</span>
                  <span className="font-medium text-purple-700">{mem.activeConditions.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> ABDM Consent Active
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMember(mem.id);
                }}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                Switch Profile <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Link Household Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rohini Patil"
              value={newMember.name}
              onChange={e => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Relationship</label>
              <select
                value={newMember.relation}
                onChange={e => setNewMember({ ...newMember, relation: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
              >
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Grandchild">Grandchild</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Age</label>
              <input
                type="number"
                placeholder="Years"
                value={newMember.age}
                onChange={e => setNewMember({ ...newMember, age: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">14-Digit ABHA ID (Optional)</label>
            <input
              type="text"
              placeholder="91-XXXX-XXXX-XXXX"
              value={newMember.abhaId}
              onChange={e => setNewMember({ ...newMember, abhaId: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm font-mono"
            />
            <p className="text-[11px] text-ink-soft mt-1">If not available, can be generated via Aadhaar OTP later.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700"
            >
              Verify & Link Member
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

export default PatientFamilyMembers;

