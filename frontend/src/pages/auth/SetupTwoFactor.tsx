import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ShieldCheck, Copy, Check, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../services/auth/authContext';
import { authApi } from '../../services/auth/authApi';
import * as supabaseAuth from '../../services/auth/supabaseAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const ROLE_HOME: Record<string, string> = {
  asha: '/asha/dashboard',
  doctor: '/doctor/dashboard',
  specialist: '/specialist/dashboard',
  admin: '/admin/dashboard',
  patient: '/patient/dashboard',
};

type Step = 'loading' | 'scan' | 'codes' | 'error';

/**
 * Mandatory two-factor setup for staff accounts.
 *
 * Three steps: scan a QR code, confirm with a generated code, then save the
 * recovery codes. The last step is deliberately hard to skip past — the codes
 * are shown exactly once and cannot be recovered afterwards.
 */
export const SetupTwoFactorPage: React.FC = () => {
  const { currentUser, currentRole, completeMfa } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const beginEnrolment = useCallback(async () => {
    setStep('loading');
    setError('');
    try {
      const enrolment = await supabaseAuth.enrolTotp();
      setFactorId(enrolment.factorId);
      setSecret(enrolment.secret);
      // Rendered locally — the secret must not travel to a QR service.
      setQrDataUrl(
        await QRCode.toDataURL(enrolment.qrCodeUri, { width: 220, margin: 1 })
      );
      setStep('scan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start setup.');
      setStep('error');
    }
  }, []);

  useEffect(() => {
    void beginEnrolment();
  }, [beginEnrolment]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      // Supabase verifies the code and returns an aal2 token; the backend
      // re-verifies that token before recording enrolment.
      const accessToken = await supabaseAuth.verifyTotp(factorId, code);
      const { recoveryCodes: codes } = await authApi.mfa.completeEnrolment(accessToken);

      setRecoveryCodes(codes);
      setStep('codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the codes are on screen regardless.
      setError('Could not copy automatically — please write the codes down.');
    }
  };

  const downloadCodes = () => {
    const body = [
      'ArogyaSetu — two-factor recovery codes',
      `Account: ${currentUser?.email ?? currentUser?.name ?? ''}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Each code works once. Keep them somewhere safe and private —',
      'anyone holding one can sign in as you.',
      '',
      ...recoveryCodes,
    ].join('\n');

    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arogyasetu-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const finish = () => {
    completeMfa();
    navigate(ROLE_HOME[currentRole] ?? '/patient/dashboard');
  };

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gov-700 text-white items-center justify-center shadow-md">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="mt-3 text-2xl font-extrabold text-ink tracking-tight">
          Set Up Two-Factor Authentication
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Required for staff accounts, because they can open other people&rsquo;s health records.
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

          {step === 'loading' && (
            <div className="flex items-center justify-center py-8 text-ink-soft gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Preparing your authenticator…</span>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">
                Setup could not be started. This is usually temporary.
              </p>
              <Button onClick={() => void beginEnrolment()} className="w-full">
                Try again
              </Button>
            </div>
          )}

          {step === 'scan' && (
            <>
              <ol className="text-xs text-ink-soft space-y-1 list-decimal list-inside">
                <li>Install an authenticator app (Google Authenticator, Authy, or similar).</li>
                <li>Scan this code with it.</li>
                <li>Enter the 6-digit number it shows.</li>
              </ol>

              <div className="flex justify-center">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR code for setting up your authenticator app"
                    className="rounded-lg border border-line"
                    width={220}
                    height={220}
                  />
                )}
              </div>

              <details className="text-xs text-ink-soft">
                <summary className="cursor-pointer">Can&rsquo;t scan the code?</summary>
                <p className="mt-2">Enter this key into your app by hand:</p>
                <code className="mt-1 block break-all rounded bg-sand-100 p-2 font-mono text-[11px] text-ink">
                  {secret}
                </code>
              </details>

              <form onSubmit={handleVerify} className="space-y-4">
                <Input
                  label="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || code.length !== 6}
                >
                  {isSubmitting ? 'Verifying…' : 'Verify and continue'}
                </Button>
              </form>
            </>
          )}

          {step === 'codes' && (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Save these now.</strong> They are shown only once. Each one works a
                  single time and lets you sign in if you lose your phone.
                </div>
              </div>

              <ul className="grid grid-cols-2 gap-2 font-mono text-xs">
                {recoveryCodes.map((recoveryCode) => (
                  <li
                    key={recoveryCode}
                    className="rounded bg-sand-100 px-2 py-1.5 text-center text-ink"
                  >
                    {recoveryCode}
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={copyCodes} className="flex-1">
                  {copied ? (
                    <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>
                  )}
                </Button>
                <Button variant="secondary" onClick={downloadCodes} className="flex-1">
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>

              <label className="flex items-start gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={confirmedSaved}
                  onChange={(e) => setConfirmedSaved(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I have saved these codes somewhere safe.</span>
              </label>

              <Button onClick={finish} className="w-full" disabled={!confirmedSaved}>
                Continue to ArogyaSetu
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupTwoFactorPage;
