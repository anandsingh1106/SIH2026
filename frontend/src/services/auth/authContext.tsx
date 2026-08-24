import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../../types';
import { authApi, AuthApiError, SessionProfile } from './authApi';
import { setUnauthorizedHandler } from '../api/apiClient';
import * as supabaseAuth from './supabaseAuth';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, profile: SessionProfile) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore the app session from the httpOnly cookie, if one is still valid.
    authApi
      .me()
      .then(({ user }) => setCurrentUser(user))
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
      const { user } = await authApi.createSession(result.session.access_token, profile);
      setCurrentUser(user);
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  };

  const signIn = async (email: string, password: string) => {
    const { session } = await supabaseAuth.signIn(email, password);
    if (!session) throw new Error('Sign-in did not return a session.');

    const { user } = await authApi.createSession(session.access_token);
    setCurrentUser(user);
    return user;
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
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role ?? 'patient',
        isAuthenticated: !!currentUser,
        isLoading,
        signUp,
        signIn,
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
