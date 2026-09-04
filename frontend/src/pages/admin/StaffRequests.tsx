import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { staffAccessApi, AdminStaffRequest } from '@arogyasetu/shared/services/auth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const ROLE_LABEL: Record<string, string> = {
  ASHA: 'ASHA Worker',
  DOCTOR: 'Medical Officer',
  SPECIALIST: 'Specialist Clinician',
  ADMIN: 'Health Administrator',
};

const TABS: Array<{ key: string; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

/**
 * Review queue for staff access requests.
 *
 * Approving one hands a stranger access to other people's health records, so
 * the screen is built to make the reviewer check something concrete — the
 * claimed registration number against the official register — rather than
 * clicking through on a plausible-looking name.
 */
export const StaffRequestsPage: React.FC = () => {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState<AdminStaffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { items } = await staffAccessApi.list({ status, limit: 50 });
      setRequests(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests.');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (request: AdminStaffRequest, approve: boolean) => {
    const note = notes[request.id]?.trim();

    if (!approve && !note) {
      setError('Add a short reason before rejecting, so the applicant can correct it.');
      return;
    }

    // Granting ADMIN is the largest privilege in the system; make it deliberate.
    if (approve && request.requestedRole === 'ADMIN') {
      const ok = window.confirm(
        `Grant Health Administrator access to ${request.applicant.name}?\n\n` +
        'They will be able to read every patient record in the system, approve ' +
        'other staff, and reset anyone\'s two-factor authentication.'
      );
      if (!ok) return;
    }

    setBusyId(request.id);
    setError('');
    try {
      if (approve) {
        await staffAccessApi.approve(request.id, { reviewNote: note });
      } else {
        await staffAccessApi.reject(request.id, { reviewNote: note });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record that decision.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gov-700" />
            Staff Access Requests
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Verify each applicant against the official register before approving. These roles open
            other people&rsquo;s health records.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              status === tab.key
                ? 'bg-gov-700 text-white'
                : 'bg-surface text-ink-soft border border-line hover:border-gov-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {error}
        </div>
      )}

      {isLoading && <p className="text-sm text-ink-soft">Loading…</p>}

      {!isLoading && requests.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink-soft">
            {status === 'PENDING' ? 'No requests awaiting review.' : 'Nothing here.'}
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-ink text-sm">{request.applicant.name}</p>
                <p className="text-xs text-ink-soft">
                  {request.applicant.email}
                  {request.applicant.phone ? ` · ${request.applicant.phone}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-md bg-gov-100 text-gov-800 text-[11px] font-bold">
                  {ROLE_LABEL[request.requestedRole] ?? request.requestedRole}
                </span>
                <p className="text-[11px] text-ink-soft mt-1">
                  currently {request.currentRole}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <dt className="text-ink-soft">Claimed credential</dt>
                <dd className="font-mono text-ink">
                  {request.registrationNumber || <span className="text-amber-700">not provided</span>}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Facility</dt>
                <dd className="text-ink">
                  {request.facility || '—'}
                  {request.facility && !request.facilityMatched && (
                    <span className="ml-1 text-amber-700">(unmatched)</span>
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ink-soft">District</dt>
                <dd className="text-ink">{request.applicant.district || '—'}</dd>
              </div>
            </dl>

            {request.credentialHint && request.status === 'PENDING' && (
              <p className="text-[11px] text-ink-soft flex gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                Check this against the {request.credentialHint}.
              </p>
            )}

            {request.status === 'PENDING' ? (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Review note (required to reject)"
                  value={notes[request.id] ?? ''}
                  onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })}
                  className="w-full text-xs border border-sand-300 rounded-lg p-2 bg-surface text-ink focus:outline-none focus:border-gov-600"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    disabled={busyId === request.id}
                    onClick={() => void decide(request, true)}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={busyId === request.id}
                    onClick={() => void decide(request, false)}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-ink-soft border-t border-line pt-2">
                {request.status}
                {request.reviewedBy ? ` by ${request.reviewedBy}` : ''}
                {request.reviewedAt ? ` on ${new Date(request.reviewedAt).toLocaleDateString()}` : ''}
                {request.reviewNote ? ` — ${request.reviewNote}` : ''}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StaffRequestsPage;
