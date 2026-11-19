import {
  PlanPricing,
  PlanTier,
  Subscription,
  SubscriptionStatus,
  UserProfile,
  WebhookEventLog,
} from '../types/biblia';

export const PLANS: PlanPricing[] = [
  {
    tier: 0,
    name: 'FREE',
    priceUsd: 0.0,
    priceFormatted: 'US$ 0,00',
    period: 'Gratuito',
    description: 'A Palavra de Deus aberta e livre para todas as nações e línguas.',
    benefits: [
      'Leitura dos 66 livros da Bíblia Livre em português',
      'Narração do texto com vozes instaladas no dispositivo',
      'Jornada introdutória de gamificação (Mundo 1: Éden)',
      'Ofensivas diárias básicas (streak simples)',
      'Consulta de rankings e resultados públicos',
      'Consulta de conteúdo público da comunidade',
    ],
    limitations: [
      'Anúncios ocasionais em banners discretos',
      'Não inclui gravações profissionais de narração',
      'Sem criação ou entrada em clãs',
    ],
  },
  {
    tier: 1,
    name: 'PREMIUM',
    priceUsd: 1.49,
    priceFormatted: 'US$ 1,49',
    period: 'Mensal',
    tag: 'Mais recomendado',
    isRecommended: true,
    description: 'Mais recursos de comunidade e personalização da experiência de leitura.',
    benefits: [
      'Tudo incluído no plano FREE',
      'Experiência 100% sem anúncios',
      'Escolha de vozes disponíveis no dispositivo e ambientes sonoros locais',
      'Acesso a todas as jornadas bíblicas e mapas de mundos',
      'Participação em quizzes e rankings com recompensas de talentos',
      'Desafios de recuperação de ofensivas (salvar chamas)',
      'Entrada em grupos e clãs existentes',
      'Avatares e insígnias bíblicas adicionais',
    ],
    limitations: ['Não permite criar novos clãs'],
  },
  {
    tier: 2,
    name: 'MASTER',
    priceUsd: 2.99,
    priceFormatted: 'US$ 2,99',
    period: 'Mensal',
    tag: 'Mais completo',
    description: 'Liderança, acesso antecipado e distinção dourada.',
    benefits: [
      'Tudo incluído no plano PREMIUM',
      'Recursos avançados de leitura e acompanhamento bíblico',
      'Acesso antecipado de 14 dias às novas jornadas elegíveis',
      'Destaque visual dourado nos rankings globais (sem alterar pontuação)',
      'Criação e liderança de grupos ou clãs bíblicos',
      'Selo dourado MASTER no perfil global',
    ],
  },
];

const STORAGE_KEY_PROFILE = 'biblia_user_profile_v2.1';
const STORAGE_KEY_WEBHOOK_LOGS = 'biblia_webhook_logs_v2.1';

export class SubscriptionService {
  public static getInitialProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        const profile = JSON.parse(stored) as UserProfile;
        // Remove o antigo perfil demonstrativo, que nunca representou uma conta real.
        if (profile.id !== 'usr-default-01') return profile;
        localStorage.removeItem(STORAGE_KEY_PROFILE);
      }
    } catch {
      // fallback
    }

    const defaultProfile: UserProfile = {
      id: 'visitor-local',
      email: '',
      display_name: 'Visitante',
      avatar_url: '',
      plan_tier: 0, // Starts FREE
      is_master_badge: false,
      xp: 0,
      streak_days: 0,
      streak_frozen: false,
      streak_last_date: new Date().toISOString().split('T')[0],
      active_subscription: undefined,
    };

    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(defaultProfile));
    return defaultProfile;
  }

  public static saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  public static getWebhookLogs(): WebhookEventLog[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WEBHOOK_LOGS);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }

  public static logWebhook(event: WebhookEventLog): void {
    try {
      const current = this.getWebhookLogs();
      current.unshift(event);
      if (current.length > 50) current.pop();
      localStorage.setItem(STORAGE_KEY_WEBHOOK_LOGS, JSON.stringify(current));
    } catch {
      // ignore
    }
  }

  // Activate or simulate subscription activation (PREMIUM or MASTER)
  public static activatePlan(
    profile: UserProfile,
    targetTier: 1 | 2,
    provider: 'sandbox' | 'stripe' | 'lemonsqueezy' = 'sandbox'
  ): { updatedProfile: UserProfile; subscription: Subscription } {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    const newSub: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: profile.id,
      external_subscription_id: `ext_sub_${targetTier}_${Date.now()}`,
      provider,
      plan_tier: targetTier,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      created_at: now.toISOString(),
    };

    const updatedProfile: UserProfile = {
      ...profile,
      plan_tier: targetTier,
      is_master_badge: targetTier === 2,
      active_subscription: newSub,
    };

    this.saveProfile(updatedProfile);

    this.logWebhook({
      id: `evt_${Date.now()}`,
      event_id: `evt_activate_${newSub.id}`,
      provider,
      event_type: 'subscription.activated',
      status_result: 'active',
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        plan_tier: targetTier,
        amount_usd: targetTier === 1 ? 1.49 : 2.99,
        status: 'active',
        period_end: periodEnd.toISOString(),
      },
    });

    return { updatedProfile, subscription: newSub };
  }

  // Cancel subscription: marks cancel_at_period_end = true (user retains access until period ends)
  public static cancelSubscription(profile: UserProfile): UserProfile {
    if (!profile.active_subscription) return profile;

    const updatedSub: Subscription = {
      ...profile.active_subscription,
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
      status: 'cancelled',
    };

    const updatedProfile: UserProfile = {
      ...profile,
      active_subscription: updatedSub,
      // Access remains until period ends according to PRD Section 3.3
    };

    this.saveProfile(updatedProfile);

    this.logWebhook({
      id: `evt_${Date.now()}`,
      event_id: `evt_cancel_${updatedSub.id}`,
      provider: updatedSub.provider,
      event_type: 'subscription.cancelled',
      status_result: 'cancelled',
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        access_retained_until: updatedSub.current_period_end,
        message: 'Cancelamento agendado. Acesso pago ativo até ao fim do período pago.',
      },
    });

    return updatedProfile;
  }

  // Expire or fail payment (simulates downgrade back to FREE)
  public static triggerStatusChange(
    profile: UserProfile,
    newStatus: SubscriptionStatus
  ): UserProfile {
    let updatedTier: PlanTier = profile.plan_tier;
    let badge = profile.is_master_badge;

    if (newStatus === 'expired' || newStatus === 'incomplete') {
      // Revert back to FREE
      updatedTier = 0;
      badge = false;
    }

    const updatedSub: Subscription | undefined = profile.active_subscription
      ? {
          ...profile.active_subscription,
          status: newStatus,
        }
      : undefined;

    const updatedProfile: UserProfile = {
      ...profile,
      plan_tier: updatedTier,
      is_master_badge: badge,
      active_subscription: updatedSub,
    };

    this.saveProfile(updatedProfile);

    this.logWebhook({
      id: `evt_${Date.now()}`,
      event_id: `evt_status_${newStatus}_${Date.now()}`,
      provider: updatedSub?.provider || 'sandbox',
      event_type: `subscription.status_${newStatus}`,
      status_result: newStatus,
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        new_status: newStatus,
        effective_tier: updatedTier,
        bible_reading_accessible: true, // Always true!
      },
    });

    return updatedProfile;
  }
}
