import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile, PlanTier } from '../types/biblia';
import { performGuestMigration } from '../lib/guestMigrationService';

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
  signInWithOtp: (email: string) => Promise<{ error: AuthError | Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: AuthError | Error | null }>;
  signInWithOAuth: (
    provider: 'google' | 'apple'
  ) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UNAVAILABLE_AUTH_ERROR = new Error(
  'A ligação a contas ainda não está configurada. Pode continuar como visitante neste dispositivo.'
);

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
        if (session?.user) {
          performGuestMigration(session.user.id).catch(() => {});
        }
      });

      // 2. Listen to real auth events
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          performGuestMigration(session.user.id).catch(() => {});
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Um visitante local não é uma conta fictícia nem cria sessão simulada.
      setLoading(false);
    }
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: UNAVAILABLE_AUTH_ERROR };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) closeAuthModal();
    return { error };
  };

  const signInWithOtp = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: UNAVAILABLE_AUTH_ERROR };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
      },
    });
    return { error };
  };

  const verifyOtp = async (email: string, token: string) => {
    if (!isSupabaseConfigured) {
      return { error: UNAVAILABLE_AUTH_ERROR };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });

    if (!error && data.user) {
      // Criação/atualização defensiva de perfil
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        display_name: data.user.email?.split('@')[0] || 'Crente',
        plan_tier: 0,
      });
      performGuestMigration(data.user.id).catch(() => {});
      closeAuthModal();
    }

    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    if (!isSupabaseConfigured) {
      return { error: UNAVAILABLE_AUTH_ERROR };
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

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    if (!isSupabaseConfigured) {
      return { error: UNAVAILABLE_AUTH_ERROR };
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
        signInWithOtp,
        verifyOtp,
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
