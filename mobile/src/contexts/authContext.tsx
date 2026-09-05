import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { User, UserRole } from '@arogyasetu/shared/types';
import { authApi, AuthApiError, SessionProfile, MfaState, MfaAction } from '@arogyasetu/shared/services/auth';
import { setAuthTransportAdapter } from '@arogyasetu/shared/services/api';
import * as supabaseAuth from '@arogyasetu/shared/services/auth';
import { rnAuthAdapter, setSessionToken, clearSessionToken, loadStoredToken } from '../services/api/rnAuthAdapter';

/**
 * What sign-in produced.
 *
 * A user is only usable once `mfa.action` is 'none'. Until then the app must
 * route to enrolment or verification rather than into a role stack — mirrors
 * frontend/src/services/auth/authContext.tsx exactly, since the backend
 * enforces the same rule regardless of which client asks.
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
  mfaAction: MfaAction;
  signUp: (email: string, password: string, profile: SessionProfile) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
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
    (async () => {
      // Load whatever bearer token was saved from a previous launch before
      // the first authenticated call, then ask the server whether it is
      // still good and what step (if any) is outstanding.
      await loadStoredToken();
      setAuthTransportAdapter(rnAuthAdapter);

      try {
        const { user, mfa } = await authApi.me();
        setCurrentUser(user);
        setMfaAction(mfa?.action ?? 'none');
      } catch {
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    })();

    // A Supabase sign-out triggered elsewhere (token expiry, another device
    // revoking the session) should clear this session too.
    const unsubscribe = supabaseAuth.isSupabaseConfigured()
      ? supabaseAuth.onAuthStateChange((session) => {
          if (!session) setCurrentUser(null);
        })
      : () => undefined;

    return unsubscribe;
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
      const { user, mfa, sessionToken } = await authApi.createSession(result.session.access_token, profile);
      if (sessionToken) await setSessionToken(sessionToken);
      setCurrentUser(user);
      setMfaAction(mfa?.action ?? 'none');
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { session } = await supabaseAuth.signIn(email, password);
    if (!session) throw new Error('Sign-in did not return a session.');

    const { user, mfa, sessionToken } = await authApi.createSession(session.access_token);
    const state: MfaState = mfa ?? {
      required: false, enrolled: false, satisfied: false, action: 'none',
    };

    if (sessionToken) await setSessionToken(sessionToken);
    setCurrentUser(user);
    setMfaAction(state.action);

    // The caller decides where to navigate: a role stack, enrolment, or a
    // code prompt. It must not assume sign-in is finished.
    return { user, mfa: state };
  };

  /** Clears the pending second-factor step once it has been satisfied. */
  const completeMfa = (user?: User) => {
    if (user) setCurrentUser(user);
    setMfaAction('none');
  };

  const resetPassword = async (email: string) => {
    // A password-reset email opens this deep link; Supabase appends its own
    // token/type query params to whatever base is given here.
    await supabaseAuth.resetPassword(email, Linking.createURL('/'));
  };

  const logout = async () => {
    try {
      await supabaseAuth.signOut().catch(() => undefined);
      await authApi.logout().catch(() => undefined);
    } finally {
      await clearSessionToken();
      setCurrentUser(null);
      setMfaAction('none');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role ?? 'patient',
        // A session with an outstanding second factor is not yet
        // authenticated, so navigation keeps it out of the role stacks until
        // the step is completed.
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
