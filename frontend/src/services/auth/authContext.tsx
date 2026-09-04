import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@arogyasetu/shared/types';
import { authApi, AuthApiError, SessionProfile, MfaState, MfaAction } from '@arogyasetu/shared/services/auth';
import { setUnauthorizedHandler } from '@arogyasetu/shared/services/api';
import * as supabaseAuth from './supabaseAuth';

/**
 * What sign-in produced.
 *
 * A user is only usable once `mfa.action` is 'none'. Until then the app must
 * route to enrolment or verification rather than into the dashboard — and the
 * backend enforces the same thing, so this is for UX, not for security.
 */
export interface SignInResult {
  user: User;
  mfa: MfaState;
}

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Outstanding second-factor step, or 'none' when nothing is pending. */
  mfaAction: MfaAction;
  signUp: (email: string, password: string, profile: SessionProfile) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /** Called after a factor is satisfied, to clear the pending state. */
  completeMfa: (user?: User) => void;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mfaAction, setMfaAction] = useState<MfaAction>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore the app session from the httpOnly cookie, if one is still valid.
    // The server reports any outstanding second-factor step, so a reload lands
    // back on the right screen instead of discovering it via a 403.
    authApi
      .me()
      .then(({ user, mfa }) => {
        setCurrentUser(user);
        setMfaAction(mfa?.action ?? 'none');
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setIsLoading(false));

    // Any 401 means the server-side session expired.
    setUnauthorizedHandler(() => setCurrentUser(null));

    // A Supabase sign-out in another tab should clear this tab too.
    const unsubscribe = supabaseAuth.isSupabaseConfigured()
      ? supabaseAuth.onAuthStateChange((session) => {
          if (!session) setCurrentUser(null);
        })
      : () => undefined;

    return () => {
      setUnauthorizedHandler(null);
      unsubscribe();
    };
  }, []);

  /**
   * Creates the Supabase account, then provisions the application user.
   *
   * When email confirmation is required Supabase returns no session, so the
   * app account is created on first sign-in instead.
   */
  const signUp = async (email: string, password: string, profile: SessionProfile) => {
    const result = await supabaseAuth.signUp(email, password, {
      name: profile.name,
      role: profile.role,
      phone: profile.phone,
      district: profile.district,
      taluka: profile.taluka,
      village: profile.village,
      abhaId: profile.abhaId,
    });

    if (result.session) {
      const { user, mfa } = await authApi.createSession(result.session.access_token, profile);
      setCurrentUser(user);
      // A new staff account has no factor yet, so this normally lands on 'enrol'.
      setMfaAction(mfa?.action ?? 'none');
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { session } = await supabaseAuth.signIn(email, password);
    if (!session) throw new Error('Sign-in did not return a session.');

    const { user, mfa } = await authApi.createSession(session.access_token);
    const state: MfaState = mfa ?? {
      required: false, enrolled: false, satisfied: false, action: 'none',
    };

    setCurrentUser(user);
    setMfaAction(state.action);

    // The caller decides where to go: the dashboard, enrolment, or a code
    // prompt. It must not assume sign-in is finished.
    return { user, mfa: state };
  };

  /** Clears the pending second-factor step once it has been satisfied. */
  const completeMfa = (user?: User) => {
    if (user) setCurrentUser(user);
    setMfaAction('none');
  };

  const resetPassword = async (email: string) => {
    await supabaseAuth.resetPassword(email);
  };

  const logout = async () => {
    try {
      await supabaseAuth.signOut().catch(() => undefined);
      await authApi.logout();
    } finally {
      setCurrentUser(null);
      setMfaAction('none');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role ?? 'patient',
        // A session with an outstanding second factor is not yet authenticated,
        // so route guards keep it out of the app until the step is completed.
        isAuthenticated: !!currentUser && mfaAction === 'none',
        isLoading,
        mfaAction,
        signUp,
        signIn,
        completeMfa,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthApiError };
