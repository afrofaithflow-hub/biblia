// ==============================================================================
// BiblIA — PRD Final v2.1 Types
// ==============================================================================

export type PlanTier = 0 | 1 | 2; // 0=FREE, 1=PREMIUM, 2=MASTER

export type PlanName = 'FREE' | 'PREMIUM' | 'MASTER';

export type SubscriptionStatus =
  | 'active'
  | 'pending'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'incomplete';

export interface Subscription {
  id: string;
  user_id: string;
  external_subscription_id: string;
  provider: 'sandbox' | 'stripe' | 'lemonsqueezy';
  plan_tier: 1 | 2;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  plan_tier: PlanTier;
  is_master_badge: boolean;
  xp: number;
  streak_days: number;
  streak_frozen: boolean;
  streak_last_date: string;
  active_subscription?: Subscription;
}

export interface PlanPricing {
  id?: string;
  tier: PlanTier;
  name: PlanName;
  priceUsd: number;
  priceFormatted: string;
  period: 'Gratuito' | 'Mensal';
  tag?: string;
  tagline?: string;
  description: string;
  benefits: string[];
  features?: string[];
  limitations?: string[];
  isRecommended?: boolean;
}

export interface AudioCatalogItem {
  id: string;
  cache_key: string;
  book: string;
  chapter: number;
  language: string;
  translation: string;
  voice_id: string;
  ambient_id: string;
  storage_path: string;
  duration_seconds: number;
  file_size_bytes: number;
  tts_provider: string;
  generation_cost_usd: number;
  play_count: number;
  status: 'generating' | 'ready' | 'failed';
  created_at: string;
}

export interface DownloadQuotaResult {
  allowed: boolean;
  tier: PlanTier;
  remaining_today: number;
  unlimited?: boolean;
  already_downloaded_today?: boolean;
  reason?: 'requires_premium_or_master' | 'daily_limit_reached' | 'user_not_found';
}

export interface Clan {
  id: string;
  name: string;
  description: string;
  leader_id: string;
  leader_name: string;
  member_count: number;
  badge_url: string;
  created_at: string;
}

export interface WebhookEventLog {
  id: string;
  event_id: string;
  provider: string;
  event_type: string;
  status_result: SubscriptionStatus;
  timestamp: string;
  payload: Record<string, unknown>;
}
