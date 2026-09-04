import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../../services/auth/authContext';
import { authApi } from '@arogyasetu/shared/services/auth';
import * as supabaseAuth from '../../services/auth/supabaseAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { demoTotpCode, secondsUntilRollover } from '../../utils/demoTotp';

const ROLE_HOME: Record<string, string> = {
  asha: '/asha/dashboard',
  doctor: '/doctor/dashboard',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
  patient: '/patient/dashboard',
};

/**
 * Second-factor prompt for a user who signed in with a password only.
 *
 * Offers the authenticator code, and a recovery code as a fallback — an ASHA
 * worker in the field who has lost their phone still needs a way in.
 */
export const VerifyTwoFactorPage: React.FC = () => {
  const { currentUser, currentRole, completeMfa, logout } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'totp' | 'recovery'>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  // Development convenience only — see utils/demoTotp, which compiles to
  // nothing in a production build.
  const [isDemoFilled, setIsDemoFilled] = useState(false);

  /**
   * Pre-fills the code for a demo account during development.
   *
   * The code is real and still verified by Supabase and the API; this only
   * saves reading it off a terminal mid-presentation. It refreshes itself when
   * the 30-second window rolls over, so the field never holds a stale code.
   */
  useEffect(() => {
    if (mode !== 'totp' || !currentUser?.email) return;

    let cancelled = false;
    let timer: number;

    const fill = async () => {
      const demoCode = await demoTotpCode(currentUser.email!);
      if (cancelled || !demoCode) return;

      setCode(demoCode);
      setIsDemoFilled(true);
      // Re-fill just after the current code expires.
      timer = window.setTimeout(fill, (secondsUntilRollover() + 1) * 1000);
    };

    void fill();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, currentUser?.email]);

  const goHome = () => {
    completeMfa();
    navigate(ROLE_HOME[currentRole] ?? '/patient/dashboard');
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const factorId = await supabaseAuth.getPrimaryTotpFactorId();
      if (!factorId) {
        setError('No authenticator is registered on this account. Use a recovery code instead.');
        setMode('recovery');
        return;
      }

      const accessToken = await supabaseAuth.verifyTotp(factorId, code);
      await authApi.mfa.verify(accessToken);
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { remaining: left } = await authApi.mfa.useRecoveryCode(code);
      setRemaining(left);

      // Warn while the user is still in front of the screen, rather than
      // letting them discover it when the last code is gone.
      if (left <= 2) {
        window.setTimeout(
          () =>
            window.alert(
              `${left} recovery code${left === 1 ? '' : 's'} left. Generate a new set from Settings once you are signed in.`
            ),
          0
        );
      }
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That recovery code is not valid.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: 'totp' | 'recovery') => {
    setMode(next);
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gov-700 text-white items-center justify-center shadow-md">
          {mode === 'totp' ? <ShieldCheck className="w-7 h-7" /> : <KeyRound className="w-7 h-7" />}
        </div>
        <h2 className="mt-3 text-2xl font-extrabold text-ink tracking-tight">
          {mode === 'totp' ? 'Two-Factor Verification' : 'Use a Recovery Code'}
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          {mode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Enter one of the codes you saved when you set up two-factor authentication.'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-surface py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-line space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
            >
              {error}
            </div>
          )}

          {remaining !== null && remaining <= 2 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              Only {remaining} recovery code{remaining === 1 ? '' : 's'} left.
            </div>
          )}

          {mode === 'totp' ? (
            <form onSubmit={handleTotp} className="space-y-4">
              <Input
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  setIsDemoFilled(false);
                }}
              />

              {isDemoFilled && (
                <p className="text-[11px] text-ink-soft -mt-2">
                  Demo code filled in automatically (development only).
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== 6}>
                {isSubmitting ? 'Verifying…' : 'Verify'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRecovery} className="space-y-4">
              <Input
                label="Recovery code"
                placeholder="XXXXX-XXXXX"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting || code.length < 8}>
                {isSubmitting ? 'Checking…' : 'Use recovery code'}
              </Button>
            </form>
          )}

          <div className="text-center text-xs space-y-2">
            <button
              type="button"
              onClick={() => switchMode(mode === 'totp' ? 'recovery' : 'totp')}
              className="text-gov-700 hover:underline"
            >
              {mode === 'totp'
                ? 'Lost your phone? Use a recovery code'
                : 'Use your authenticator app instead'}
            </button>

            <p className="text-ink-soft">
              Lost both?{' '}
              <span className="text-ink">Ask an administrator to reset your two-factor setup.</span>
            </p>

            <button
              type="button"
              onClick={() => void logout().then(() => navigate('/login'))}
              className="text-ink-soft hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyTwoFactorPage;
