// ==============================================================================
// BiblIA — Tipos Canônicos de Membresia e Comunidade
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
  provider: 'stripe' | 'lemonsqueezy';
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

export interface ChurchGroup {
  id: string;
  name: string;
  group_code: string;
  motto: string;
  leader_id: string;
  weekly_goal_xp: number;
  current_weekly_xp: number;
  member_count: number;
  my_role: 'leader' | 'admin' | 'member';
  created_at: string;
}

