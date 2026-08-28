import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/api/dataService';
import { Patient } from '../../types';
import { UserPlus, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Heart, User, MapPin, Phone } from 'lucide-react';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { VitalsInputGroup } from '../../components/healthcare/VitalsInputGroup';
import confetti from 'canvas-confetti';

export const AshaRegisterPatientPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    nameMr: '',
    age: 32,
    gender: 'female',
    phone: '',
    address: '',
    village: 'Paud',
    taluka: 'Mulshi',
    district: 'Pune',
    pincode: '412108',
    bloodGroup: 'B+',
    allergies: [],
    chronicConditions: [],
    emergencyContact: {
      name: '',
      relationship: 'Spouse',
      phone: '',
    },
    vitals: {
      bpSystolic: 120,
      bpDiastolic: 80,
      pulse: 76,
      spo2: 98,
      temperature: 98.4,
      bloodSugarRandom: 110,
    },
    riskCategory: 'normal',
    assignedAshaId: 'usr-asha-1',
  });

  const handleGenerateAbha = () => {
    const abha = '91-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, abhaId: abha });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPatient: Patient = {
      id: 'pat-' + Date.now(),
      abhaId: formData.abhaId || '91-' + Math.floor(1000 + Math.random() * 9000) + '-4521-8890',
      name: formData.name || 'New Registered Patient',
      nameMr: formData.nameMr,
      age: formData.age || 30,
      gender: (formData.gender as 'male' | 'female' | 'other') || 'female',
      phone: formData.phone || '+91 98000 00000',
      address: formData.address || 'Paud Village',
      village: formData.village || 'Paud',
      taluka: formData.taluka || 'Mulshi',
      district: formData.district || 'Pune',
      pincode: formData.pincode || '412108',
      bloodGroup: formData.bloodGroup || 'O+',
      allergies: formData.allergies || [],
      chronicConditions: formData.chronicConditions || [],
      emergencyContact: formData.emergencyContact || { name: 'Family', relationship: 'Spouse', phone: '+91 98000 00000' },
      vitals: formData.vitals,
      riskCategory: formData.riskCategory || 'normal',
      assignedAshaId: 'usr-asha-1',
      registeredDate: new Date().toISOString().substring(0, 10),
    };

    await dataService.savePatient(newPatient);
    setIsSuccess(true);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'ASHA Workspace', href: '/asha/dashboard' },
          { label: 'Register New Patient (Progressive Form)' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-gov-700" />
          Frontline Patient ABHA Registration
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Step-by-step registration with offline IndexedDB storage and automatic queue sync
        </p>
      </div>

      {isSuccess ? (
        <div className="bg-surface rounded-2xl border border-emerald-200 p-8 shadow-card text-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-ink">
            Patient Registered Successfully!
          </h2>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {formData.name} has been enrolled into the Maharashtra Health Grid with ABHA ID{' '}
            <strong className="font-mono text-gov-800">{formData.abhaId}</strong>. Record saved offline and queued for server sync.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSuccess(false);
                setStep(1);
                setFormData({ ...formData, name: '', nameMr: '', phone: '' });
              }}
            >
              Register Another Citizen
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/asha/home-visits')}
            >
              Record Initial Home Visit →
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
          {/* Stepper Header */}
          <div className="grid grid-cols-4 bg-sand-50 border-b border-line text-[11px] sm:text-xs font-semibold text-center divide-x divide-line">
            <div className={`p-2 sm:p-3.5 ${step === 1 ? 'bg-gov-700 text-white font-bold' : step > 1 ? 'text-gov-800' : 'text-ink-soft'}`}>
              <span className="sm:hidden">1. Details</span>
              <span className="hidden sm:inline">1. Demographics &amp; ABHA</span>
            </div>
            <div className={`p-2 sm:p-3.5 ${step === 2 ? 'bg-gov-700 text-white font-bold' : step > 2 ? 'text-gov-800' : 'text-ink-soft'}`}>
              <span className="sm:hidden">2. Address</span>
              <span className="hidden sm:inline">2. Address &amp; Village</span>
            </div>
            <div className={`p-2 sm:p-3.5 ${step === 3 ? 'bg-gov-700 text-white font-bold' : step > 3 ? 'text-gov-800' : 'text-ink-soft'}`}>
              <span className="sm:hidden">3. Vitals</span>
              <span className="hidden sm:inline">3. Baseline Vitals</span>
            </div>
            <div className={`p-2 sm:p-3.5 ${step === 4 ? 'bg-gov-700 text-white font-bold' : 'text-ink-soft'}`}>
              <span className="sm:hidden">4. Consent</span>
              <span className="hidden sm:inline">4. Emergency &amp; Consent</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
                  <Input
                    label="Patient Full Name (English)"
                    required
                    placeholder="e.g. Vandana Suresh Jadhav"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Full Name (मराठी)"
                    placeholder="उदा. वंदना सुरेश जाधव"
                    value={formData.nameMr}
                    onChange={(e) => setFormData({ ...formData, nameMr: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Age in Years"
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1.5">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
                    >
                      <option value="female">Female (स्त्री)</option>
                      <option value="male">Male (पुरुष)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Input
                    label="Mobile Number"
                    type="tel"
                    required
                    placeholder="+91 97654 32109"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                {/* ABHA Generation */}
                <div className="bg-sand-50 p-4 rounded-xl border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Ayushman Bharat Health Account (ABHA ID)</span>
                    <button
                      type="button"
                      onClick={handleGenerateAbha}
                      className="text-xs text-gov-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Generate ABHA ID
                    </button>
                  </div>
                  <Input
                    placeholder="e.g. 91-4521-8890-1200"
                    value={formData.abhaId || ''}
                    onChange={(e) => setFormData({ ...formData, abhaId: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <Input
                  label="House Number & Street / Pada Name"
                  required
                  placeholder="House No. 78, Gaothan Pada, Near Maruti Temple"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Village / Gram Panchayat"
                    required
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  />
                  <Input
                    label="Taluka / Block"
                    required
                    value={formData.taluka}
                    onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                  />
                  <Input
                    label="District"
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <VitalsInputGroup
                  vitals={formData.vitals || {}}
                  onChange={(v) => setFormData({ ...formData, vitals: v })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1.5">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink focus:outline-none focus:border-gov-600"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 mb-1.5">Triage Vulnerability Tier</label>
                    <select
                      value={formData.riskCategory}
                      onChange={(e) => setFormData({ ...formData, riskCategory: e.target.value as any })}
                      className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink font-semibold focus:outline-none focus:border-gov-600"
                    >
                      <option value="normal">Normal / Low Risk</option>
                      <option value="moderate">Moderate Monitoring</option>
                      <option value="high">High Risk (Chronic)</option>
                      <option value="critical">Critical / Immediate Alert</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-sand-50 p-4 rounded-xl border border-line space-y-3">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Emergency Contact Person</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Contact Name"
                      placeholder="e.g. Suresh Jadhav"
                      value={formData.emergencyContact?.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: { ...formData.emergencyContact!, name: e.target.value },
                        })
                      }
                    />
                    <Input
                      label="Relationship"
                      placeholder="e.g. Husband / Mother"
                      value={formData.emergencyContact?.relationship}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: { ...formData.emergencyContact!, relationship: e.target.value },
                        })
                      }
                    />
                    <Input
                      label="Emergency Phone"
                      placeholder="+91 97654 32110"
                      value={formData.emergencyContact?.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: { ...formData.emergencyContact!, phone: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="p-4 bg-gov-50/60 border border-gov-200 rounded-xl text-xs text-gov-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-gov-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Informed Consent Declaration:</strong> The patient has been informed and given oral/written consent for registration in Maharashtra Health Grid under National Health Mission protocols. Data remains private and protected.
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-line flex items-center justify-between">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                  onClick={() => setStep(step - 1)}
                >
                  Previous Step
                </Button>
              ) : <div />}

              {step < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setStep(step + 1)}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  className="font-bold bg-emerald-700 hover:bg-emerald-800"
                >
                  Save & Register Patient Offline
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
