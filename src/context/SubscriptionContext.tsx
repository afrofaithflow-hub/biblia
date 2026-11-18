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
  activatePlan: (tier: 1 | 2) => void;
  cancelSubscription: () => void;
  simulateWebhookEvent: (status: SubscriptionStatus) => void;
  requestDownload: (chapterRef: string) => DownloadQuotaResult;
  webhookLogs: WebhookEventLog[];
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(() => SubscriptionService.getInitialProfile());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookEventLog[]>(() =>
    SubscriptionService.getWebhookLogs()
  );
  const [remainingDownloads, setRemainingDownloads] = useState<number>(() =>
    AudioService.getRemainingQuota(profile.id, profile.plan_tier)
  );

  // Sync profile when auth user changes
  useEffect(() => {
    if (!user) return;

    if (isSupabaseConfigured) {
      // Fetch profile from Supabase
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setProfile((prev) => ({
              ...prev,
              id: data.id,
              email: data.email || user.email || '',
              display_name: data.display_name || user.user_metadata?.display_name || prev.display_name,
              plan_tier: (data.plan_tier as PlanTier) ?? 0,
              is_master_badge: data.is_master_badge ?? (data.plan_tier === 2),
              xp: data.xp ?? prev.xp,
              streak_days: data.streak_days ?? prev.streak_days,
            }));
          }
        });
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

  const activatePlan = async (tier: 1 | 2) => {
    const { updatedProfile } = SubscriptionService.activatePlan(profile, tier, 'sandbox');
    setProfile(updatedProfile);
    setWebhookLogs(SubscriptionService.getWebhookLogs());
    setIsPricingModalOpen(false);

    // If Supabase is configured, sync to database
    if (isSupabaseConfigured && user) {
      await supabase.from('profiles').update({
        plan_tier: tier,
        is_master_badge: tier === 2,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
    }
  };

  const cancelSubscription = async () => {
    const updated = SubscriptionService.cancelSubscription(profile);
    setProfile(updated);
    setWebhookLogs(SubscriptionService.getWebhookLogs());

    if (isSupabaseConfigured && user) {
      await supabase.from('subscriptions').update({
        cancel_at_period_end: true,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      }).eq('user_id', user.id);
    }
  };

  const simulateWebhookEvent = (status: SubscriptionStatus) => {
    const updated = SubscriptionService.triggerStatusChange(profile, status);
    setProfile(updated);
    setWebhookLogs(SubscriptionService.getWebhookLogs());
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
        isPricingModalOpen,
        openPricingModal: () => setIsPricingModalOpen(true),
        closePricingModal: () => setIsPricingModalOpen(false),
        activatePlan,
        cancelSubscription,
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
