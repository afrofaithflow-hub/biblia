import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { performGuestMigration } from '../lib/guestMigrationService';

export type AuthModalTab = 'signin' | 'signup';

interface SignUpResult {
  error: AuthError | Error | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isAuthModalOpen: boolean;
  authModalInitialTab: AuthModalTab;
  isPasswordRecovery: boolean;
  openAuthModal: (tab?: AuthModalTab) => void;
  closeAuthModal: () => void;
  clearPasswordRecovery: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<SignUpResult>;
  signInWithOtp: (email: string, displayName?: string) => Promise<{ error: AuthError | Error | null }>;
  verifyOtp: (
    email: string,
    token: string,
    displayName?: string
  ) => Promise<{ error: AuthError | Error | null }>;
  signInWithOAuth: (
    provider: 'google' | 'apple'
  ) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | Error | null }>;
  updateDisplayName: (displayName: string) => Promise<{ error: Error | null }>;
  updateAvatarUrl: (avatarUrl: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UNAVAILABLE_AUTH_ERROR = new Error(
  'A ligação a contas ainda não está configurada neste ambiente. Pode continuar como visitante.'
);

async function ensureUserProfile(authUser: User, explicitDisplayName?: string): Promise<void> {
  if (!isSupabaseConfigured || !authUser?.id) return;

  try {
    const cleanExplicitName = explicitDisplayName?.trim();
    const derivedAvatar =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      null;

    const { data: existing, error: readErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();

    if (readErr) return;

    if (!existing) {
      const derivedName =
        cleanExplicitName ||
        String(authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || '').trim() ||
        authUser.email?.split('@')[0] ||
        'Discípulo';

      // Nunca envia plan_tier do cliente — respeita DEFAULT 0 do banco de dados
      await supabase.from('profiles').insert({
        id: authUser.id,
        email: authUser.email,
        display_name: derivedName,
        avatar_url: derivedAvatar,
      });
    } else {
      const updates: Record<string, unknown> = {};
      const identities = authUser.identities || [];
      const identityData = (identities.length > 0 && identities[0]?.identity_data)
        ? (identities[0].identity_data as Record<string, any>)
        : {};
      const metaFullName = String(
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        identityData.full_name ||
        identityData.name ||
        [authUser.user_metadata?.given_name || identityData.given_name, authUser.user_metadata?.family_name || identityData.family_name].filter(Boolean).join(' ') ||
        ''
      ).trim();

      const emailPrefix = authUser.email?.split('@')[0]?.toLowerCase().trim();

      if (cleanExplicitName && cleanExplicitName !== existing.display_name) {
        updates.display_name = cleanExplicitName;
      } else if (
        metaFullName &&
        (!existing.display_name || (emailPrefix && existing.display_name.toLowerCase() === emailPrefix))
      ) {
        // Atualiza display_name para o nome real do Google caso o banco tenha apenas o prefixo do email
        updates.display_name = metaFullName;
      }

      if (!existing.avatar_url && derivedAvatar) {
        updates.avatar_url = derivedAvatar;
      }
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', authUser.id);
      }
    }
  } catch {
    // Falha não-fatal: o trigger handle_new_user no servidor garante integridade
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<AuthModalTab>('signin');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      if (currentSession?.user) {
        ensureUserProfile(currentSession.user).catch(() => {});
        performGuestMigration(currentSession.user.id).catch(() => {});
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setAuthModalInitialTab('signin');
        setIsAuthModalOpen(true);
      }

      if (nextSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        ensureUserProfile(nextSession.user).catch(() => {});
        performGuestMigration(nextSession.user.id).catch(() => {});
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((tab?: AuthModalTab) => {
    setAuthModalInitialTab(tab === 'signup' ? 'signup' : 'signin');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: UNAVAILABLE_AUTH_ERROR };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (!error && data.user) {
      await ensureUserProfile(data.user);
      performGuestMigration(data.user.id).catch(() => {});
      closeAuthModal();
    }
    return { error };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<SignUpResult> => {
    if (!isSupabaseConfigured) return { error: UNAVAILABLE_AUTH_ERROR };

    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: cleanName,
        },
      },
    });

    if (error) {
      return { error };
    }

    // Se a confirmação de e-mail estiver ativa no Supabase, data.session virá nulo
    if (data.session && data.user) {
      await ensureUserProfile(data.user, cleanName);
      performGuestMigration(data.user.id).catch(() => {});
      closeAuthModal();
      return { error: null, needsEmailConfirmation: false };
    }

    return { error: null, needsEmailConfirmation: true };
  };

  const signInWithOtp = async (email: string, displayName?: string) => {
    if (!isSupabaseConfigured) return { error: UNAVAILABLE_AUTH_ERROR };

    const cleanName = displayName?.trim();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: cleanName ? { display_name: cleanName } : undefined,
      },
    });
    return { error };
  };

  const verifyOtp = async (email: string, token: string, displayName?: string) => {
    if (!isSupabaseConfigured) return { error: UNAVAILABLE_AUTH_ERROR };

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });

    if (!error && data.user) {
      await ensureUserProfile(data.user, displayName);
      performGuestMigration(data.user.id).catch(() => {});
      closeAuthModal();
    }

    return { error };
  };

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    if (!isSupabaseConfigured) return { error: UNAVAILABLE_AUTH_ERROR };

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
    setIsPasswordRecovery(false);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) return { error: UNAVAILABLE_AUTH_ERROR };

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) return { error: UNAVAILABLE_AUTH_ERROR };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setIsPasswordRecovery(false);
      closeAuthModal();
    }
    return { error };
  };

  const updateDisplayName = async (displayName: string): Promise<{ error: Error | null }> => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      return { error: new Error('O nome deve ter pelo menos 2 caracteres.') };
    }
    if (!isSupabaseConfigured || !user) {
      return { error: new Error('Entre na sua conta para atualizar o perfil.') };
    }

    const { data: updatedAuth, error: authErr } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    });
    if (authErr) {
      return { error: authErr };
    }
    if (updatedAuth.user) {
      setUser(updatedAuth.user);
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', user.id);

    if (profErr) {
      return { error: new Error(profErr.message) };
    }

    return { error: null };
  };

  const updateAvatarUrl = async (avatarUrl: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !user) {
      return { error: new Error('Entre na sua conta para atualizar o avatar.') };
    }

    const { data: updatedAuth, error: authErr } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl, picture: avatarUrl },
    });
    if (authErr) {
      return { error: authErr };
    }
    if (updatedAuth.user) {
      setUser(updatedAuth.user);
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (profErr) {
      return { error: new Error(profErr.message) };
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isAuthModalOpen,
        authModalInitialTab,
        isPasswordRecovery,
        openAuthModal,
        closeAuthModal,
        clearPasswordRecovery,
        signInWithEmail,
        signUpWithEmail,
        signInWithOtp,
        verifyOtp,
        signInWithOAuth,
        signOut,
        resetPassword,
        updatePassword,
        updateDisplayName,
        updateAvatarUrl,
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
