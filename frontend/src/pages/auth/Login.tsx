import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, AuthApiError } from '../../services/auth/authContext';
import { sendPhoneOtp, resetRecaptcha, ConfirmationResult } from '../../services/auth/firebaseClient';
import { normalizePhoneToE164 } from '../../services/auth/phone';
import { Shield, Phone, KeyRound, ArrowRight, RotateCw } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const ROLE_HOME: Record<string, string> = {
  asha: '/asha/dashboard',
  doctor: '/doctor/dashboard',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
  patient: '/patient/dashboard',
};

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

export const LoginPage: React.FC = () => {
  const { completePhoneAuth } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const e164 = normalizePhoneToE164(phone);
    if (!e164) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendPhoneOtp(e164, 'recaptcha-container-login');
      setConfirmation(result);
      setStage('otp');
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
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
      const user = await completePhoneAuth(idToken);
      navigate(ROLE_HOME[user.role] ?? '/patient/dashboard');
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'NEW_USER') {
        const e164 = normalizePhoneToE164(phone) || phone;
        navigate('/register', { state: { phone: e164 } });
        return;
      }
      setError(firebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeNumber = () => {
    resetRecaptcha();
    setConfirmation(null);
    setOtp('');
    setError('');
    setStage('phone');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-12 h-12 rounded-2xl bg-gov-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
            <Shield className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign In to MahaAarogya Sangam
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Government of Maharashtra Digital Public Health Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-slate-200 space-y-6">
          {stage === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Input
                label="Mobile Number"
                type="tel"
                required
                autoComplete="tel"
                placeholder="98500 44332"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-3.5 h-3.5" />}
                helperText="We'll send a one-time code by SMS."
              />

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
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-slate-500 text-center">
                Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{phone}</span>
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Verify & Sign In
              </Button>

              <button
                type="button"
                onClick={handleChangeNumber}
                className="w-full text-center text-xs text-gov-700 font-semibold hover:underline flex items-center justify-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Use a different number
              </button>
            </form>
          )}

          <div className="pt-2 flex items-center justify-center text-xs text-slate-500 border-t border-slate-100">
            <Link to="/register" className="text-gov-700 font-semibold hover:underline">
              New here? Create an Account
            </Link>
          </div>
        </div>
      </div>

      <div id="recaptcha-container-login" />
    </div>
  );
};
