import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, Phone, User, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MAHARASHTRA_DISTRICTS } from '../../data/mockData';
import { useAuth } from '../../services/auth/authContext';
import { isSupabaseConfigured } from '../../services/auth/supabaseAuth';
import { UserRole } from '../../types';

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
  const { signUp } = useAuth();

  const preselectedRole = (location.state as { role?: UserRole } | null)?.role;
  const configured = isSupabaseConfigured();

  const [formData, setFormData] = useState({
    name: '',
    role: preselectedRole || ('patient' as UserRole),
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    district: 'Pune',
    taluka: 'Mulshi',
    village: 'Paud',
    abhaNumber: '',
    // Only sent for a staff claim; recorded on the request for a reviewer to
    // check. It never grants anything on its own.
    registrationNumber: '',
    facilityName: '',
  });

  const [isGeneratedAbha, setIsGeneratedAbha] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleGenerateAbha = () => {
    const abha =
      '91-' + Math.floor(1000 + Math.random() * 9000) +
      '-' + Math.floor(1000 + Math.random() * 9000) +
      '-' + Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, abhaNumber: abha });
    setIsGeneratedAbha(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(formData.email, formData.password, {
        name: formData.name,
        role: formData.role,
        phone: formData.phone || undefined,
        district: formData.district,
        taluka: formData.taluka,
        village: formData.village,
        abhaId: formData.abhaNumber || undefined,
        registrationNumber: formData.registrationNumber || undefined,
        facilityName: formData.facilityName || undefined,
      });

      if (needsEmailConfirmation) {
        setConfirmationSent(true);
      } else if (formData.role !== 'patient') {
        // The account exists as a citizen account; the staff claim is pending.
        // Sending them to a clinical dashboard would only produce a 403.
        navigate('/access-pending');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface py-8 px-6 shadow-card rounded-2xl border border-line space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-extrabold text-ink">Check your email</h2>
            <p className="text-sm text-ink-muted">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-ink">{formData.email}</span>. Click it to
              activate your account, then sign in.
            </p>
            <Link to="/login">
              <Button variant="primary" size="lg" className="w-full font-bold">
                Go to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gov-700 text-white flex items-center justify-center shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-ink text-lg">MahaAarogya Sangam</span>
        </Link>
        <h2 className="mt-3 text-2xl font-extrabold text-ink">
          Create Healthcare / ABHA Account
        </h2>
        <p className="text-xs text-ink-soft mt-1">
          Join Maharashtra's integrated public health network
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-surface py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-line space-y-6">
          {!configured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Registration is not configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env</code>, then restart the dev server.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-sand-700 mb-1.5">Account Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full text-xs border border-sand-300 rounded-lg p-2.5 bg-surface text-ink font-semibold focus:outline-none focus:border-gov-600"
              >
                <option value="patient">Citizen / Patient</option>
                <option value="asha">ASHA Worker</option>
                <option value="doctor">Medical Officer (PHC/CHC)</option>
                <option value="specialist">Specialist Clinician</option>
                <option value="admin">Health Administrator</option>
              </select>

              {formData.role !== 'patient' && (
                <div className="mt-2 p-3 bg-sand-100 border border-sand-300 rounded-lg text-[11px] text-ink-soft space-y-1.5">
                  <p className="font-semibold text-ink">Staff access needs approval</p>
                  <p>
                    Your account is created straight away as a citizen account. A district
                    administrator reviews the details below before clinical access is granted,
                    because these roles can open other people&rsquo;s health records.
                  </p>
                </div>
              )}
            </div>

            {formData.role !== 'patient' && (
              <>
                <Input
                  label={
                    formData.role === 'asha'
                      ? 'ASHA / employee ID'
                      : formData.role === 'admin'
                        ? 'Government employee ID'
                        : 'HPR ID or medical council registration number'
                  }
                  placeholder="Used to verify you against the official register"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                />
                <Input
                  label="Facility / posting"
                  placeholder="e.g. PHC Paud"
                  value={formData.facilityName}
                  onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                />
              </>
            )}

            <Input
              label="Full Name"
              required
              placeholder="e.g. Ramesh Tukaram Patil"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              leftIcon={<User className="w-3.5 h-3.5" />}
            />

            <Input
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="w-3.5 h-3.5" />}
              helperText="Used to sign in. We'll send a confirmation link here."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
              <Input
                label="Password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                leftIcon={<Lock className="w-3.5 h-3.5" />}
              />
              <Input
                label="Confirm Password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                leftIcon={<Lock className="w-3.5 h-3.5" />}
              />
            </div>

            <Input
              label="Mobile Number (optional)"
              type="tel"
              placeholder="+91 98500 44332"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              leftIcon={<Phone className="w-3.5 h-3.5" />}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-sand-700 mb-1.5">District</label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full text-xs border border-sand-300 rounded-lg p-2 bg-surface focus:outline-none focus:border-gov-600"
                >
                  {MAHARASHTRA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
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

            <div className="bg-sand-50 p-3.5 rounded-xl border border-line space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Ayushman Bharat Health Account (ABHA)</span>
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
              disabled={!configured}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Account
            </Button>
          </form>

          <div className="text-center text-xs text-ink-soft pt-2 border-t border-line">
            Already have an account?{' '}
            <Link to="/login" className="text-gov-700 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
