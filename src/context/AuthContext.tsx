import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile, PlanTier } from '../types/biblia';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: AuthError | Error | null }>;
  signInWithOAuth: (
    provider: 'google' | 'apple' | 'facebook'
  ) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage key for sandbox guest sessions
const SANDBOX_USER_KEY = 'biblia_sandbox_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // 1. Check current Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // 2. Listen to real auth events
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // 3. Sandbox / Local offline-first session restoration
      const stored = localStorage.getItem(SANDBOX_USER_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
        } catch {
          localStorage.removeItem(SANDBOX_USER_KEY);
        }
      }
      setLoading(false);
    }
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // Sandbox simulation: create local mock user
      const mockUser = {
        id: `usr-sandbox-${Date.now()}`,
        email,
        user_metadata: { display_name: email.split('@')[0] || 'Discípulo' },
      } as unknown as User;
      setUser(mockUser);
      localStorage.setItem(SANDBOX_USER_KEY, JSON.stringify(mockUser));
      closeAuthModal();
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) closeAuthModal();
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    if (!isSupabaseConfigured) {
      const mockUser = {
        id: `usr-sandbox-${Date.now()}`,
        email,
        user_metadata: { display_name: displayName.trim() || 'Discípulo' },
      } as unknown as User;
      setUser(mockUser);
      localStorage.setItem(SANDBOX_USER_KEY, JSON.stringify(mockUser));
      closeAuthModal();
      return { error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (!error && data.user) {
      // Upsert user profile row in database
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        display_name: displayName.trim(),
        plan_tier: 0,
      });
      closeAuthModal();
    }

    return { error };
  };

  const signInWithOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    if (!isSupabaseConfigured) {
      const mockUser = {
        id: `usr-oauth-${Date.now()}`,
        email: `usuario.${provider}@biblia.app`,
        user_metadata: { display_name: `Discípulo (${provider === 'facebook' ? 'Facebook' : provider.toUpperCase()})` },
      } as unknown as User;
      setUser(mockUser);
      localStorage.setItem(SANDBOX_USER_KEY, JSON.stringify(mockUser));
      closeAuthModal();
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(SANDBOX_USER_KEY);
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signInWithEmail,
        signUpWithEmail,
        signInWithOAuth,
        signOut,
        resetPassword,
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
