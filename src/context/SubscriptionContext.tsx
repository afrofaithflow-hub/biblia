import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  PlanName,
  PlanTier,
  SubscriptionStatus,
  UserProfile,
} from '../types/biblia';
import { SubscriptionService } from '../lib/subscriptionService';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface SubscriptionContextType {
  profile: UserProfile;
  planTier: PlanTier;
  planName: PlanName;
  currentPlan: PlanName;
  isSubscriptionActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  canCreateClan: boolean;
  canJoinClan: boolean;
  isPricingModalOpen: boolean;
  openPricingModal: () => void;
  closePricingModal: () => void;
  activatePlan: (tier: 1 | 2) => Promise<{ checkout_url?: string; error?: string }>;
  cancelSubscription: () => Promise<{ portal_url?: string; error?: string }>;
  checkSubscriptionStatus: () => Promise<void>;
  /** Verdadeiro quando o ambiente Supabase está configurado para funções de pagamento. */
  paymentsAvailable: boolean;
}

const PAYMENTS_UNAVAILABLE_MSG =
  'Os pagamentos online estão em ativação final. Todo o conteúdo essencial continua disponível gratuitamente.';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function isUnavailablePaymentFunctionError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message || '').toLowerCase()
      : String(error || '').toLowerCase();

  return (
    msg.includes('failed to send a request') ||
    msg.includes('functionsfetcherror') ||
    msg.includes('functionshttperror') ||
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('stripe') ||
    msg.includes('network')
  );
}

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(() => SubscriptionService.getInitialProfile());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;

    try {
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const resolvedProfile: UserProfile = {
        ...SubscriptionService.getVisitorProfile(),
        id: profData?.id || user.id,
        email: profData?.email || user.email || '',
        display_name:
          profData?.display_name ||
          String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Discípulo'),
        avatar_url:
          profData?.avatar_url ||
          String(user.user_metadata?.avatar_url || user.user_metadata?.picture || ''),
        plan_tier: !profErr && profData ? ((profData.plan_tier as PlanTier) ?? 0) : 0,
        is_master_badge: !profErr && profData ? Boolean(profData.is_master_badge ?? profData.plan_tier === 2) : false,
        xp: !profErr && profData ? Number(profData.xp ?? 0) : 0,
        streak_days: !profErr && profData ? Number(profData.streak_days ?? 0) : 0,
        active_subscription: subData
          ? {
              id: subData.id,
              user_id: subData.user_id,
              external_subscription_id: subData.stripe_subscription_id || subData.id,
              provider: subData.provider === 'lemonsqueezy' ? 'lemonsqueezy' : 'stripe',
              plan_tier: (subData.plan_tier as 1 | 2) || 1,
              status: subData.status as SubscriptionStatus,
              current_period_start: subData.current_period_start || new Date().toISOString(),
              current_period_end: subData.current_period_end || new Date().toISOString(),
              cancel_at_period_end: Boolean(subData.cancel_at_period_end),
              created_at: subData.created_at || new Date().toISOString(),
            }
          : undefined,
      };

      setProfile(resolvedProfile);
      SubscriptionService.saveProfile(resolvedProfile);
    } catch (err) {
      console.warn('Erro ao sincronizar subscrição com Supabase:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      SubscriptionService.clearStoredProfile();
      setProfile(SubscriptionService.getVisitorProfile());
      return;
    }

    if (isSupabaseConfigured) {
      void checkSubscriptionStatus();
    }
  }, [user, checkSubscriptionStatus]);

  const planTier = profile.plan_tier;
  const planName: PlanName = planTier === 2 ? 'MASTER' : planTier === 1 ? 'PREMIUM' : 'FREE';

  const isSubscriptionActive =
    planTier > 0 &&
    Boolean(
      profile.active_subscription &&
        (profile.active_subscription.status === 'active' ||
          (profile.active_subscription.status === 'cancelled' &&
            new Date(profile.active_subscription.current_period_end) > new Date()))
    );

  const subscriptionStatus: SubscriptionStatus = profile.active_subscription?.status || 'active';

  // Grupos/células reais abertos a utilizadores autenticados
  const canCreateClan = Boolean(user);
  const canJoinClan = Boolean(user);

  const activatePlan = async (tier: 1 | 2): Promise<{ checkout_url?: string; error?: string }> => {
    if (!user) {
      return { error: 'Inicie sessão ou crie uma conta para assinar um plano.' };
    }
    if (!isSupabaseConfigured) {
      return { error: PAYMENTS_UNAVAILABLE_MSG };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        return { error: 'Sessão expirada. Por favor autentique-se novamente.' };
      }

      const { data, error } = await supabase.functions.invoke('payment-checkout', {
        body: { tier },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        return {
          error: isUnavailablePaymentFunctionError(error)
            ? PAYMENTS_UNAVAILABLE_MSG
            : error.message || PAYMENTS_UNAVAILABLE_MSG,
        };
      }

      if (data?.checkout_url) {
        setIsPricingModalOpen(false);
        window.location.href = data.checkout_url;
        return { checkout_url: data.checkout_url };
      }

      return { error: PAYMENTS_UNAVAILABLE_MSG };
    } catch (err: unknown) {
      return {
        error: isUnavailablePaymentFunctionError(err)
          ? PAYMENTS_UNAVAILABLE_MSG
          : err instanceof Error
          ? err.message
          : PAYMENTS_UNAVAILABLE_MSG,
      };
    }
  };

  const cancelSubscription = async (): Promise<{ portal_url?: string; error?: string }> => {
    if (!user) {
      return { error: 'Inicie sessão para gerir a sua assinatura.' };
    }
    if (!isSupabaseConfigured) {
      return { error: PAYMENTS_UNAVAILABLE_MSG };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        return { error: 'Sessão expirada. Autentique-se novamente.' };
      }

      const { data, error } = await supabase.functions.invoke('payment-portal', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        return {
          error: isUnavailablePaymentFunctionError(error)
            ? PAYMENTS_UNAVAILABLE_MSG
            : error.message || PAYMENTS_UNAVAILABLE_MSG,
        };
      }

      if (data?.portal_url) {
        setIsPricingModalOpen(false);
        window.location.href = data.portal_url;
        return { portal_url: data.portal_url };
      }

      return { error: PAYMENTS_UNAVAILABLE_MSG };
    } catch (err: unknown) {
      return {
        error: isUnavailablePaymentFunctionError(err)
          ? PAYMENTS_UNAVAILABLE_MSG
          : err instanceof Error
          ? err.message
          : PAYMENTS_UNAVAILABLE_MSG,
      };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        profile,
        planTier,
        planName,
        currentPlan: planName,
        isSubscriptionActive,
        subscriptionStatus,
        canCreateClan,
        canJoinClan,
        paymentsAvailable: isSupabaseConfigured,
        isPricingModalOpen,
        openPricingModal: () => setIsPricingModalOpen(true),
        closePricingModal: () => setIsPricingModalOpen(false),
        activatePlan,
        cancelSubscription,
        checkSubscriptionStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
