import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../services/auth/authContext';
import { staffAccessApi, StaffAccessRequest } from '@arogyasetu/shared/services/auth';
import { Button } from '../../components/ui/Button';

const ROLE_LABEL: Record<string, string> = {
  ASHA: 'ASHA Worker',
  DOCTOR: 'Medical Officer',
  SPECIALIST: 'Specialist Clinician',
  ADMIN: 'Health Administrator',
};

/**
 * Shown after someone signs up claiming a staff role.
 *
 * Their account already works as a citizen account — this explains why the
 * clinical side is not open yet, rather than leaving them to discover it
 * through a permission error.
 */
export const AccessPendingPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<StaffAccessRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    staffAccessApi
      .mine()
      .then(({ request: r }) => setRequest(r))
      .catch(() => setRequest(null))
      .finally(() => setIsLoading(false));
  }, []);


  return (
    <div className="min-h-screen bg-sand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-surface py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-line space-y-5">
          {isLoading && <p className="text-sm text-ink-soft text-center">Loading…</p>}

          {!isLoading && request?.status === 'PENDING' && (
            <>
              <div className="text-center">
                <Clock className="w-12 h-12 text-amber-500 mx-auto" />
                <h1 className="mt-3 text-xl font-extrabold text-ink">Awaiting approval</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Your request for{' '}
                  <strong>{ROLE_LABEL[request.requestedRole] ?? request.requestedRole}</strong>{' '}
                  access is with a district administrator.
                </p>
              </div>

              <div className="p-3 bg-sand-100 border border-sand-300 rounded-lg text-xs text-ink-soft space-y-2">
                <p>
                  These roles can open other people&rsquo;s health records, so each one is checked
                  against the official register by a person before it is granted.
                </p>
                <p>
                  You will be notified once it is reviewed. In the meantime your account works as a
                  citizen account — you can see your own records.
                </p>
              </div>

              <Link to="/patient/dashboard">
                <Button variant="primary" className="w-full">
                  Continue as a citizen <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </>
          )}

          {!isLoading && request?.status === 'APPROVED' && (
            <>
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h1 className="mt-3 text-xl font-extrabold text-ink">Access approved</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  You now have{' '}
                  <strong>{ROLE_LABEL[request.requestedRole] ?? request.requestedRole}</strong>{' '}
                  access.
                </p>
              </div>

              <div className="p-3 bg-sand-100 border border-sand-300 rounded-lg text-xs text-ink-soft">
                Sign in again to pick up the new role, then set up two-factor authentication —
                it is required for every staff account.
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => void logout().then(() => navigate('/login'))}
              >
                Sign out and sign in again
              </Button>
            </>
          )}

          {!isLoading && request?.status === 'REJECTED' && (
            <>
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h1 className="mt-3 text-xl font-extrabold text-ink">Request not approved</h1>
              </div>

              {request.reviewNote && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {request.reviewNote}
                </div>
              )}

              <p className="text-xs text-ink-soft">
                Your citizen account still works normally. If you believe this is a mistake,
                contact your district health office — they can review it again with the correct
                registration details.
              </p>

              <Link to="/patient/dashboard">
                <Button variant="secondary" className="w-full">
                  Continue as a citizen
                </Button>
              </Link>
            </>
          )}

          {!isLoading && !request && (
            <>
              <h1 className="text-xl font-extrabold text-ink text-center">No request found</h1>
              <p className="text-sm text-ink-muted text-center">
                {currentUser
                  ? 'Your account does not have a staff access request on file.'
                  : 'Please sign in first.'}
              </p>
              <Link to={currentUser ? '/patient/dashboard' : '/login'}>
                <Button variant="secondary" className="w-full">
                  {currentUser ? 'Go to dashboard' : 'Sign in'}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessPendingPage;
