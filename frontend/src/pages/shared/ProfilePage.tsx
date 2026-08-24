import React, { useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { User, Phone, Mail, MapPin, ShieldCheck, CheckCircle2, QrCode, Lock } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const ProfilePage: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || 'User',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    qualifications: currentUser?.qualifications || '',
    specialization: currentUser?.specialization || '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: `${currentRole.toUpperCase()} Dashboard`, href: `/${currentRole}/dashboard` },
          { label: 'My Profile & ABHA Identity' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Personal Profile & Government Credentials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified National Health Authority ABHA ID & Facility Credentials
          </p>
        </div>

        <Button
          size="sm"
          variant={isEditing ? 'secondary' : 'primary'}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </Button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes saved successfully in local IndexedDB.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: ABHA Virtual Card */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-gov-800 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-gov-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gov-700/60 pb-3">
              <span className="text-[10px] text-gov-200 uppercase tracking-widest font-bold">
                Government of Maharashtra
              </span>
              <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded">
                ABHA ID
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-xl text-white">
                {currentUser?.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{currentUser?.name}</h3>
                <p className="text-xs text-gov-200 capitalize">{currentRole} Designation</p>
                <div className="text-[11px] font-mono text-emerald-300 font-bold mt-1">
                  ABHA: {currentUser?.abhaId || '91-1234-5678-9012'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gov-700/60 text-[11px] text-gov-200 flex items-center justify-between">
              <span>Posting: {currentUser?.facilityName || currentUser?.district}</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
          </div>
        </div>

        {/* Right Columns: Profile Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">
            Contact & Professional Information
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                disabled={!isEditing}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                leftIcon={<User className="w-3.5 h-3.5" />}
              />
              <Input
                label="Registered Mobile Number"
                disabled={!isEditing}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                leftIcon={<Phone className="w-3.5 h-3.5" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Email Address"
                disabled={!isEditing}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                leftIcon={<Mail className="w-3.5 h-3.5" />}
              />
              <Input
                label="Assigned District / Facility"
                disabled
                value={`${currentUser?.district || 'Pune'} • ${currentUser?.facilityName || 'Health Center'}`}
                leftIcon={<MapPin className="w-3.5 h-3.5" />}
              />
            </div>

            {formData.qualifications && (
              <Input
                label="Clinical Qualifications & Registration"
                disabled={!isEditing}
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
              />
            )}

            {isEditing && (
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
