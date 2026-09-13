import React, { useState } from 'react';
import { ShieldCheck, Check, Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { validateAbhaIdentifier, formatAbhaNumber } from '@arogyasetu/shared/utils';

/**
 * "Continue with ABHA" — the provider-style entry point to linking an Ayushman
 * Bharat Health Account at sign-up.
 *
 * It deliberately looks like the Google/Apple buttons it sits beside, but it is
 * NOT an OAuth button today. ABDM's hosted login needs client credentials
 * issued by the National Health Authority after sandbox registration and M1
 * certification, which this deployment does not hold. So the button opens a
 * step that captures and structurally validates the ABHA the person already
 * has, and the account records it as UNVERIFIED.
 *
 * When credentials arrive, this same button becomes the real thing: the modal
 * gains ABDM's OTP round trip (see backend services/abha/abdmClient.js) and the
 * result stops being unverified. The surrounding form does not have to change.
 */

interface AbhaConnectButtonProps {
  /** Normalised identifier, or '' when nothing is linked yet. */
  value: string;
  onChange: (normalized: string) => void;
  /** Marks the field required in the UI and blocks "skip". */
  required?: boolean;
}

export const AbhaConnectButton: React.FC<AbhaConnectButtonProps> = ({
  value,
  onChange,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const open = () => {
    setDraft(value);
    setError('');
    setIsOpen(true);
  };

  const handleLink = () => {
    const result = validateAbhaIdentifier(draft);
    if (!result.valid) {
      setError(result.error ?? 'Check your ABHA identifier.');
      return;
    }
    onChange(result.normalized ?? '');
    setIsOpen(false);
  };

  const display = value.includes('@') ? value : formatAbhaNumber(value);

  return (
    <>
      {value ? (
        // Linked state: show what was linked, and be honest that nothing
        // checked it against ABDM.
        <div className="w-full border border-emerald-200 bg-emerald-50 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink">ABHA linked</p>
                <p className="text-[11px] text-ink-muted font-mono truncate">{display}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={open}
              className="text-[11px] text-gov-700 font-bold hover:underline flex items-center gap-1 shrink-0"
            >
              <Pencil className="w-3 h-3" />
              Change
            </button>
          </div>
          <p className="text-[10px] text-amber-800 bg-amber-100 border border-amber-200 rounded px-2 py-1">
            Recorded as <strong>unverified</strong> — ABDM verification is not enabled on this
            deployment.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          className="w-full flex items-center justify-center gap-3 border border-sand-300 rounded-xl px-4 py-3 bg-surface hover:bg-sand-50 hover:border-gov-300 transition-colors"
        >
          <ShieldCheck className="w-5 h-5 text-gov-700 shrink-0" />
          <span className="text-sm font-semibold text-ink">Continue with ABHA</span>
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Link your ABHA"
        description="Ayushman Bharat Health Account"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            {!required && (
              <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
                Skip for now
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleLink}>
              Link ABHA
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="ABHA number or ABHA address"
            placeholder="14-digit number, or name@abdm"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError('');
            }}
            error={error || undefined}
            autoFocus
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 leading-relaxed">
            <strong>Not verified against ABDM.</strong> This deployment has no National Health
            Authority credentials, so your ABHA is recorded exactly as you enter it and shown as
            unverified. It is never used to release anyone&rsquo;s health records on its own.
          </div>

          <p className="text-[11px] text-ink-soft leading-relaxed">
            Don&rsquo;t have an ABHA yet? Create one free at{' '}
            <a
              href="https://abha.abdm.gov.in/abha/v3/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gov-700 font-semibold hover:underline"
            >
              abha.abdm.gov.in
            </a>
            , then come back and link it here.
          </p>
        </div>
      </Modal>
    </>
  );
};
