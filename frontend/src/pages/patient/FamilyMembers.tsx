import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, RefreshCcw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Modal } from '../../components/ui/Modal';
import {
  backendApi,
  type FamilyMemberRecord,
  type PatientSummary,
} from '@arogyasetu/shared/services/api';
import { useToast } from '../../hooks/useToast';

const DAY_MS = 24 * 60 * 60 * 1000;

function ageFrom(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * DAY_MS);
  return Number.isFinite(years) && years >= 0 ? Math.floor(years) : null;
}

/** Only the age is asked, so the stored birth date is approximate. */
function approximateDateOfBirth(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

const capitalise = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

const EMPTY_MEMBER = { name: '', relation: 'Child', age: '', gender: 'FEMALE', abhaId: '' };

interface MemberCardProps {
  name: string;
  relation: string;
  dateOfBirth?: string;
  gender?: string;
  abhaId?: string;
  bloodGroup?: string;
  isSelf?: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({ name, relation, dateOfBirth, gender, abhaId, bloodGroup, isSelf }) => {
  const age = ageFrom(dateOfBirth);
  const details = [relation, age !== null ? `${age} yrs` : null, capitalise(gender) || null].filter(Boolean);
  return (
    <Card className={`p-5 ${isSelf ? 'ring-2 ring-purple-600 border-transparent shadow-md' : ''}`}>
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-ink text-base">{name}</h3>
        {isSelf && <Badge variant="info" className="text-[10px]">You</Badge>}
      </div>
      <p className="text-xs font-semibold text-ink-soft mt-0.5">{details.join(' • ')}</p>

      <div className="mt-4 pt-3 border-t border-line space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-ink-soft">ABHA Address / ID:</span>
          <span className="font-mono font-medium text-sand-700">{abhaId ?? 'Not linked'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-soft">Blood Group:</span>
          <span className="font-semibold text-ink">{bloodGroup ?? 'Not recorded'}</span>
        </div>
      </div>
    </Card>
  );
};

export const PatientFamilyMembers: React.FC = () => {
  const toast = useToast();

  const [me, setMe] = useState<PatientSummary | null>(null);
  const [family, setFamily] = useState<FamilyMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState(EMPTY_MEMBER);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // A patient's own record is the only one the API returns to them.
      const { items } = await backendApi.getPatients({ limit: 1 });
      const own = items[0];
      if (!own) {
        setMe(null);
        setError('No health record is linked to this account yet.');
        return;
      }
      setMe(own);
      setFamily(await backendApi.getFamilyMembers(own.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your family folder.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || !newMember.name.trim()) return;
    setIsSaving(true);
    try {
      const age = parseInt(newMember.age, 10);
      await backendApi.addFamilyMember(me.id, {
        name: newMember.name.trim(),
        relationship: newMember.relation,
        gender: newMember.gender as 'MALE' | 'FEMALE' | 'OTHER',
        dateOfBirth: Number.isFinite(age) ? approximateDateOfBirth(age) : undefined,
        abhaId: newMember.abhaId.trim() || undefined,
      });
      toast.success('Family member added', `${newMember.name.trim()} is now in your family folder.`);
      setShowAddModal(false);
      setNewMember(EMPTY_MEMBER);
      await load();
    } catch (err) {
      toast.error('Could not add the member', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
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
            <p className="text-sm text-ink-soft">Keep your household members and their ABHA IDs in one place</p>
          </div>
        </div>

        <div className="flex gap-2 self-start md:self-auto">
          <button
            onClick={() => void load()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2.5 border border-line text-sm font-semibold rounded-xl hover:bg-sand-50 disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!me}
            className="flex items-center gap-2 px-4 py-2.5 bg-gov-600 text-white text-sm font-semibold rounded-xl hover:bg-gov-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Link Family Member ABHA
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs text-ink-soft">Loading your family folder…</div>
      ) : me ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
            <MemberCard
              name={me.name}
              relation="Self"
              dateOfBirth={me.dateOfBirth}
              gender={me.gender}
              abhaId={me.abhaId}
              bloodGroup={me.bloodGroup}
              isSelf
            />
            {family.map((mem) => (
              <MemberCard
                key={mem.id}
                name={mem.name ?? 'Unnamed member'}
                relation={mem.relationship}
                dateOfBirth={mem.dateOfBirth}
                gender={mem.gender}
                abhaId={mem.abhaId}
                bloodGroup={mem.bloodGroup}
              />
            ))}
          </div>
          {family.length === 0 && (
            <p className="text-xs text-ink-soft text-center">
              No family members added yet. Use “Link Family Member ABHA” to add your household.
            </p>
          )}
        </>
      ) : null}

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
              minLength={2}
              placeholder="e.g. Rohini Patil"
              value={newMember.name}
              onChange={e => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                min={0}
                max={120}
                placeholder="Years"
                value={newMember.age}
                onChange={e => setNewMember({ ...newMember, age: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sand-700 mb-1">Gender</label>
              <select
                value={newMember.gender}
                onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-sand-700 mb-1">14-Digit ABHA ID or ABHA Address (Optional)</label>
            <input
              type="text"
              placeholder="91-XXXX-XXXX-XXXX or name@abdm"
              value={newMember.abhaId}
              onChange={e => setNewMember({ ...newMember, abhaId: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm font-mono"
            />
            <p className="text-[11px] text-ink-soft mt-1">If not available, it can be added later.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Add Member'}
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
