import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Phone, Mail, User, KeyRound, ArrowRight, Sparkles, RotateCw } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MAHARASHTRA_DISTRICTS } from '../../data/mockData';
import { useAuth } from '../../services/auth/authContext';
import { sendPhoneOtp, resetRecaptcha, ConfirmationResult } from '../../services/auth/firebaseClient';
import { normalizePhoneToE164 } from '../../services/auth/phone';
import { UserRole } from '../../types';

function firebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/invalid-verification-code':
      return 'Incorrect code. Please try again.';
    case 'auth/code-expired':
      return 'This code has expired. Please request a new one.';
    default:
      return err instanceof Error ? err.message : 'Something went wrong.';
  }
}

const ROLE_HOME: Record<string, string> = {
  asha: '/asha/dashboard',
  doctor: '/doctor/dashboard',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
  patient: '/patient/dashboard',
};

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { completePhoneAuth } = useAuth();

  const navState = (location.state as { role?: UserRole; phone?: string } | null) || {};

  const [stage, setStage] = useState<'profile' | 'otp'>('profile');
  const [formData, setFormData] = useState({
    name: '',
    role: navState.role || ('patient' as UserRole),
    phone: navState.phone || '',
    email: '',
    district: 'Pune',
    taluka: 'Mulshi',
    village: 'Paud',
    abhaNumber: '',
  });

  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [isGeneratedAbha, setIsGeneratedAbha] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateAbha = () => {
    const randomAbha = '91-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, abhaNumber: randomAbha });
    setIsGeneratedAbha(true);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address, or leave it blank.');
      return;
    }

    const e164 = normalizePhoneToE164(formData.phone);
    if (!e164) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendPhoneOtp(e164, 'recaptcha-container-register');
      setFormData({ ...formData, phone: e164 });
      setConfirmation(result);
      setStage('otp');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation) return;
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      const credential = await confirmation.confirm(otp);
      const idToken = await credential.user.getIdToken();
      const user = await completePhoneAuth(idToken, {
        name: formData.name,
        role: formData.role,
        district: formData.district,
        taluka: formData.taluka,
        village: formData.village,
        abhaId: formData.abhaNumber || undefined,
        email: formData.email || undefined,
      });
      navigate(ROLE_HOME[user.role] ?? '/patient/dashboard');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeDetails = () => {
    resetRecaptcha();
    setConfirmation(null);
    setOtp('');
    setError('');
    setStage('profile');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gov-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-slate-900 text-lg">MahaAarogya Sangam</span>
        </Link>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-900">
          Create Healthcare / ABHA Account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Join Maharashtra's integrated public health network
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-slate-200 space-y-6">
          {stage === 'profile' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-semibold focus:outline-none focus:border-gov-600"
                >
                  <option value="patient">Citizen / Patient</option>
                  <option value="asha">ASHA Worker</option>
                  <option value="doctor">Medical Officer (PHC/CHC)</option>
                  <option value="specialist">Specialist Clinician</option>
                  <option value="admin">Health Administrator</option>
                </select>
              </div>

              <Input
                label="Full Name"
                required
                placeholder="e.g. Ramesh Tukaram Patil"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                leftIcon={<User className="w-3.5 h-3.5" />}
              />

              <Input
                label="Mobile Number"
                type="tel"
                required
                autoComplete="tel"
                placeholder="98500 44332"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                leftIcon={<Phone className="w-3.5 h-3.5" />}
                helperText="We'll send a one-time code by SMS to verify this number."
              />

              <Input
                label="Email Address (optional)"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                leftIcon={<Mail className="w-3.5 h-3.5" />}
                helperText="Just for a welcome email — not used to sign in."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">District</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:border-gov-600"
                  >
                    {MAHARASHTRA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Taluka / Block"
                  placeholder="e.g. Mulshi"
                  value={formData.taluka}
                  onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                />
              </div>

              {/* ABHA Number Generation Tool */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Ayushman Bharat Health Account (ABHA)</span>
                  <button
                    type="button"
                    onClick={handleGenerateAbha}
                    className="text-[11px] text-gov-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {isGeneratedAbha ? 'Regenerate' : 'Generate ABHA ID'}
                  </button>
                </div>
                <Input
                  placeholder="14-digit ABHA (e.g. 91-4521-8890-1200)"
                  value={formData.abhaNumber}
                  onChange={(e) => setFormData({ ...formData, abhaNumber: e.target.value })}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send OTP & Verify Number
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndCreate} className="space-y-4">
              <p className="text-xs text-slate-500 text-center">
                Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{formData.phone}</span>
              </p>

              <Input
                label="6-Digit Code"
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full font-bold" isLoading={isLoading}>
                Verify & Create Account
              </Button>

              <button
                type="button"
                onClick={handleChangeDetails}
                className="w-full text-center text-xs text-gov-700 font-semibold hover:underline flex items-center justify-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Edit details / number
              </button>
            </form>
          )}

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Already have an account?{' '}
            <Link to="/login" className="text-gov-700 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div id="recaptcha-container-register" />
    </div>
  );
};
