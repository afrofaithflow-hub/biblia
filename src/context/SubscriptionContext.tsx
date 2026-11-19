import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DownloadQuotaResult,
  PlanName,
  PlanTier,
  SubscriptionStatus,
  UserProfile,
  WebhookEventLog,
} from '../types/biblia';
import { SubscriptionService } from '../lib/subscriptionService';
import { AudioService } from '../lib/audioService';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface SubscriptionContextType {
  profile: UserProfile;
  planTier: PlanTier;
  planName: PlanName;
  currentPlan: PlanName; // Alias for planName used in PRD v2.1 components
  isSubscriptionActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  remainingDownloadsToday: number;
  canCreateClan: boolean;
  canJoinClan: boolean;
  hasNoAds: boolean;
  hasNeuralAudio: boolean;
  hasRewardsInQuiz: boolean;
  hasEarlyAccess: boolean;
  isPricingModalOpen: boolean;
  openPricingModal: () => void;
  closePricingModal: () => void;
  activatePlan: (tier: 1 | 2) => Promise<{ checkout_url?: string; error?: string }>;
  cancelSubscription: () => Promise<{ portal_url?: string; error?: string }>;
  checkSubscriptionStatus: () => Promise<void>;
  simulateWebhookEvent: (status: SubscriptionStatus) => void;
  /** Verdadeiro com gateway e Edge Functions configuradas. */
  paymentsAvailable: boolean;
  requestDownload: (chapterRef: string) => DownloadQuotaResult;
  webhookLogs: WebhookEventLog[];
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(() => SubscriptionService.getInitialProfile());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookEventLog[]>([]);
  const [remainingDownloads, setRemainingDownloads] = useState<number>(() =>
    AudioService.getRemainingQuota(profile.id, profile.plan_tier)
  );

  // Sync profile & subscription when auth user changes
  const checkSubscriptionStatus = async () => {
    if (!user || !isSupabaseConfigured) return;

    try {
      // 1. Perfil
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // 2. Subscrição ativa (se existir)
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!profErr && profData) {
        setProfile((prev) => ({
          ...prev,
          id: profData.id,
          email: profData.email || user.email || '',
          display_name: profData.display_name || user.user_metadata?.display_name || prev.display_name,
          plan_tier: (profData.plan_tier as PlanTier) ?? 0,
          is_master_badge: profData.is_master_badge ?? (profData.plan_tier === 2),
          xp: profData.xp ?? prev.xp,
          streak_days: profData.streak_days ?? prev.streak_days,
          active_subscription: subData
            ? {
                id: subData.id,
                user_id: subData.user_id,
                external_subscription_id: subData.stripe_subscription_id || subData.id,
                provider: 'stripe',
                plan_tier: (subData.plan_tier as 1 | 2) || 1,
                status: subData.status as SubscriptionStatus,
                current_period_start: subData.current_period_start || new Date().toISOString(),
                current_period_end: subData.current_period_end || new Date().toISOString(),
                cancel_at_period_end: Boolean(subData.cancel_at_period_end),
                created_at: subData.created_at || new Date().toISOString(),
              }
            : prev.active_subscription,
        }));
      }
    } catch (err) {
      console.warn('Erro ao sincronizar subscrição com Supabase:', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (isSupabaseConfigured) {
      checkSubscriptionStatus();
    } else {
      // Local sandbox user sync
      setProfile((prev) => ({
        ...prev,
        id: user.id,
        email: user.email || prev.email,
        display_name: user.user_metadata?.display_name || prev.display_name,
      }));
    }
  }, [user]);

  const planTier = profile.plan_tier;
  const planName: PlanName = planTier === 2 ? 'MASTER' : planTier === 1 ? 'PREMIUM' : 'FREE';

  // Subscription is active if tier > 0 and status is active (or cancelled but period end not yet reached)
  const isSubscriptionActive =
    planTier > 0 &&
    Boolean(
      profile.active_subscription &&
      (profile.active_subscription.status === 'active' ||
        (profile.active_subscription.status === 'cancelled' &&
          new Date(profile.active_subscription.current_period_end) > new Date()))
    );

  const subscriptionStatus: SubscriptionStatus = profile.active_subscription?.status || 'active';

  // Privilege checks
  const canCreateClan = planTier === 2 && isSubscriptionActive;
  const canJoinClan = planTier >= 1 && isSubscriptionActive;
  const hasNoAds = planTier >= 1 && isSubscriptionActive;
  const hasNeuralAudio = planTier >= 1 && isSubscriptionActive;
  const hasRewardsInQuiz = planTier >= 1 && isSubscriptionActive;
  const hasEarlyAccess = planTier === 2 && isSubscriptionActive;

  useEffect(() => {
    setRemainingDownloads(AudioService.getRemainingQuota(profile.id, planTier));
  }, [profile.id, planTier]);

  // Iniciar checkout via Edge Function payment-checkout (Stripe)
  const activatePlan = async (tier: 1 | 2): Promise<{ checkout_url?: string; error?: string }> => {
    if (!user) {
      return { error: 'Inicie sessão ou crie uma conta para assinar um plano.' };
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
        return { error: error.message || 'Falha ao gerar sessão de pagamento.' };
      }

      if (data?.checkout_url) {
        setIsPricingModalOpen(false);
        window.location.href = data.checkout_url;
        return { checkout_url: data.checkout_url };
      }

      return { error: data?.error || 'URL de pagamento não disponível.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao contactar o servidor de pagamentos.';
      return { error: msg };
    }
  };

  // Redirecionar para o Stripe Customer Portal
  const cancelSubscription = async (): Promise<{ portal_url?: string; error?: string }> => {
    if (!user) {
      return { error: 'Inicie sessão para gerir a sua assinatura.' };
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
        return { error: error.message || 'Falha ao aceder ao portal do cliente.' };
      }

      if (data?.portal_url) {
        setIsPricingModalOpen(false);
        window.location.href = data.portal_url;
        return { portal_url: data.portal_url };
      }

      return { error: data?.error || 'Portal de pagamentos indisponível.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao ligar ao portal Stripe.';
      return { error: msg };
    }
  };

  const simulateWebhookEvent = (status: SubscriptionStatus) => {
    const nextTier: PlanTier = status === 'expired' ? 0 : profile.plan_tier === 0 ? 1 : profile.plan_tier;
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    setProfile((prev) => ({
      ...prev,
      plan_tier: nextTier,
      is_master_badge: nextTier === 2,
      active_subscription:
        nextTier > 0
          ? {
            id: 'sub_sim_' + Date.now(),
            user_id: prev.id,
            external_subscription_id: 'sub_ext_' + Date.now(),
            provider: 'sandbox' as const,
            plan_tier: nextTier as 1 | 2,
            status,
            current_period_start: now.toISOString(),
            current_period_end: futureDate,
            cancel_at_period_end: status === 'cancelled',
            created_at: now.toISOString(),
          }
          : undefined,
    }));

    setWebhookLogs((prev) => [
      {
        id: 'evt_' + Date.now(),
        event_id: 'evt_sim_' + Date.now(),
        provider: 'sandbox',
        event_type:
          status === 'active'
            ? 'payment.succeeded'
            : status === 'past_due'
              ? 'payment.failed'
              : status === 'cancelled'
                ? 'customer.cancel'
                : 'sub.expired',
        status_result: status,
        timestamp: new Date().toLocaleTimeString(),
        payload: { simulated: true, status },
      },
      ...prev,
    ]);
  };

  const requestDownload = (chapterRef: string): DownloadQuotaResult => {
    const res = AudioService.checkAndRegisterDownload(
      profile.id,
      chapterRef,
      planTier,
      isSubscriptionActive
    );
    setRemainingDownloads(AudioService.getRemainingQuota(profile.id, planTier));
    return res;
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
        remainingDownloadsToday: remainingDownloads,
        canCreateClan,
        canJoinClan,
        hasNoAds,
        hasNeuralAudio,
        hasRewardsInQuiz,
        hasEarlyAccess,
        paymentsAvailable: true,
        isPricingModalOpen,
        openPricingModal: () => setIsPricingModalOpen(true),
        closePricingModal: () => setIsPricingModalOpen(false),
        activatePlan,
        cancelSubscription,
        checkSubscriptionStatus,
        simulateWebhookEvent,
        requestDownload,
        webhookLogs,
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
