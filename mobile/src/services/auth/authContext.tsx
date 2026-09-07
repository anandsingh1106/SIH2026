import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@arogyasetu/shared/types';
import { authApi, AuthApiError, SessionProfile, MfaState, MfaAction } from '@arogyasetu/shared/services/auth';
import { setUnauthorizedHandler, setAuthTransportAdapter } from '@arogyasetu/shared/services/api';
import * as supabaseAuth from '@arogyasetu/shared/services/auth';
import { rnAuthAdapter, loadStoredToken, setSessionToken, clearSessionToken } from '../api/rnAuthAdapter';

/**
 * Mirrors frontend/src/services/auth/authContext.tsx exactly — same shape,
 * same state machine — so screens ported from web behave identically. The
 * only difference: sign-in and sign-up also persist the bearer token this
 * platform authenticates with, since there is no session cookie to fall back
 * on.
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
  completeMfa: (sessionToken?: string, user?: User) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mfaAction, setMfaAction] = useState<MfaAction>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Registers this platform's bearer-token adapter with the shared
    // apiClient, then restores whatever token was saved from a previous
    // launch before the first request goes out — otherwise authApi.me()
    // below would fire with no Authorization header and always fail.
    setAuthTransportAdapter(rnAuthAdapter);

    let cancelled = false;
    loadStoredToken()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        // Restore the app session from the stored bearer token, if one is
        // still valid. The server reports any outstanding second-factor step,
        // so a cold start lands back on the right screen instead of
        // discovering it via a 401/403 on the first real request.
        authApi
          .me()
          .then(({ user, mfa }) => {
            if (cancelled) return;
            setCurrentUser(user);
            setMfaAction(mfa?.action ?? 'none');
          })
          .catch(() => {
            if (!cancelled) setCurrentUser(null);
          })
          .finally(() => {
            if (!cancelled) setIsLoading(false);
          });
      });

    // Any 401 means the server-side session expired.
    setUnauthorizedHandler(() => setCurrentUser(null));

    const unsubscribe = supabaseAuth.isSupabaseConfigured()
      ? supabaseAuth.onAuthStateChange((session) => {
          if (!session) setCurrentUser(null);
        })
      : () => undefined;

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
      unsubscribe();
    };
  }, []);

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
      // A new staff account has no factor yet, so this normally lands on 'enrol'.
      setMfaAction(mfa?.action ?? 'none');
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { session } = await supabaseAuth.signIn(email, password);
    if (!session) throw new Error('Sign-in did not return a session.');

    const { user, mfa, sessionToken } = await authApi.createSession(session.access_token);
    if (sessionToken) await setSessionToken(sessionToken);

    const state: MfaState = mfa ?? {
      required: false, enrolled: false, satisfied: false, action: 'none',
    };

    setCurrentUser(user);
    setMfaAction(state.action);

    return { user, mfa: state };
  };

  const completeMfa = async (sessionToken?: string, user?: User) => {
    // Passing 2FA re-issues the session at aal2. The web client picks that up
    // from the refreshed cookie; here the new bearer token must replace the
    // stored aal1 one before anything else calls the API, or every request
    // still presents the un-upgraded token and mfaGate keeps rejecting it.
    if (sessionToken) await setSessionToken(sessionToken);
    if (user) setCurrentUser(user);
    setMfaAction('none');
  };

  const resetPassword = async (email: string) => {
    // arogyasetu:// is the scheme declared in app.json — Supabase's reset
    // link reopens the app on this instead of a web origin.
    await supabaseAuth.resetPassword(email, 'arogyasetu://');
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
