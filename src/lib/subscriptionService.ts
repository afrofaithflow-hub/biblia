import { PlanPricing, PlanTier, UserProfile } from '../types/biblia';

export const PLANS: PlanPricing[] = [
  {
    tier: 0,
    name: 'FREE',
    priceUsd: 0.0,
    priceFormatted: 'US$ 0,00',
    period: 'Gratuito',
    description: 'A Palavra de Deus aberta e livre para todos.',
    benefits: [
      'Leitura completa dos 66 livros (BLIVRE) com suporte offline',
      'Narração por voz do dispositivo e paisagens sonoras locais',
      'Jornada Bíblica interativa, Desafio Diário e Revisão Espaçada',
      'Planos de leitura gratuitos e histórico no dispositivo',
      'Assistente Teológico com cota diária gratuita',
      'Ranking semanal, amigos e grupos/células de estudo',
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
    description: 'Desbloqueie todas as jornadas temáticas e apoie o projeto.',
    benefits: [
      'Tudo incluído no plano FREE',
      'Acesso a todas as Jornadas de Leitura Premium e devocionais profundos',
      'Maior cota diária de consultas no Assistente Teológico',
      'Apoio direto ao desenvolvimento e acesso gratuito das Escrituras',
    ],
  },
  {
    tier: 2,
    name: 'MASTER',
    priceUsd: 2.99,
    priceFormatted: 'US$ 2,99',
    period: 'Mensal',
    tag: 'Mais completo',
    description: 'Selo dourado de apoiador e acesso antecipado às novidades.',
    benefits: [
      'Tudo incluído no plano PREMIUM',
      'Selo dourado MASTER visível no perfil e nos rankings',
      'Acesso antecipado a novos mundos, fases e planos editoriais',
      'Apoio missionário ampliado para manter a Bíblia livre para todos',
    ],
  },
];

const STORAGE_KEY_PROFILE = 'biblia_user_profile_v2.1';

export class SubscriptionService {
  public static getVisitorProfile(): UserProfile {
    return {
      id: 'visitor-local',
      email: '',
      display_name: 'Visitante',
      avatar_url: '',
      plan_tier: 0,
      is_master_badge: false,
      xp: 0,
      streak_days: 0,
      streak_frozen: false,
      streak_last_date: new Date().toISOString().split('T')[0],
      active_subscription: undefined,
    };
  }

  public static getInitialProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        const profile = JSON.parse(stored) as UserProfile;
        if (profile.id && profile.id !== 'usr-default-01') {
          return profile;
        }
        localStorage.removeItem(STORAGE_KEY_PROFILE);
      }
    } catch {
      // fallback
    }

    return this.getVisitorProfile();
  }

  public static saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  public static clearStoredProfile(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_PROFILE);
    } catch {
      // ignore
    }
  }
}
