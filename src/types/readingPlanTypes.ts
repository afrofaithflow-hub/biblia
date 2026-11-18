/**
 * BiblIA — Tipos para Jornadas Gamificadas (Secção 3)
 * Criado: 2026-11-17 | Antigravity AI Engine
 */

// ─── Níveis de acesso por plano de subscrição ───────────────────────────────
export type PlanTier = 'free' | 'plus' | 'master';

// ─── Duração de sprint suportada ─────────────────────────────────────────────
export type SprintDuration = 3 | 5 | 7 | 14 | 15 | 21 | 30 | 90 | 180 | 365;

// ─── Categorias temáticas das jornadas ───────────────────────────────────────
export type JourneyCategory =
  | 'primeiros-passos'   // Novos convertidos
  | 'saude-emocional'    // Ansiedade, paz, força
  | 'historia-biblica'   // Êxodo, Paulo, profetas
  | 'sabedoria'          // Provérbios, Eclesiastes
  | 'oração'             // Salmos, intercesão
  | 'grupo-cla';         // Planos Master / grupo

// ─── Uma passagem bíblica dentro de um dia da jornada ────────────────────────
export interface PlanPassage {
  /** Identificador do livro canônico (ex: "marcos", "salmos") */
  bookId: string;
  /** Número do capítulo (1-based) */
  chapter: number;
  /** Versículo inicial (1-based). Se undefined, começa do 1. */
  verseStart?: number;
  /** Versículo final (1-based). Se undefined, vai até ao fim. */
  verseEnd?: number;
  /** Rótulo de exibição (ex: "Marcos 1:1-20") */
  label: string;
}

// ─── Uma pergunta de mini-quiz ────────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  /** Índice (0-based) da opção correta */
  correctIndex: number;
  /** XP ganho ao acertar */
  xpReward: number;
}

// ─── Um dia dentro de uma jornada ────────────────────────────────────────────
export interface PlanDay {
  dayNumber: number;
  title: string;
  /** "Pílula de Contexto": explicação devocional estática (pre-authored, não IA ao vivo) */
  devotionalSnippet: string;
  /** Referência de onde vem o snippet (ex: "Contexto histórico do século I") */
  devotionalSource?: string;
  /** Pergunta de reflexão aberta ligada ao trecho bíblico */
  reflectionPrompt?: string;
  passages: PlanPassage[];
  quizQuestions: QuizQuestion[];
  /** XP total ganho ao completar o dia (leitura + quiz) */
  xpReward: number;
}

// ─── Uma jornada gamificada completa ─────────────────────────────────────────
export interface ReadingPlan {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: JourneyCategory;
  tier: PlanTier;
  sprintDays: SprintDuration;
  /** Emoji ou código de ícone Material Symbols */
  icon: string;
  /** Cor de destaque (tailwind class ou hex) */
  accentColor: string;
  /** Badge/insígnia desbloqueada ao concluir a jornada */
  badge: {
    icon: string;
    label: string;
  };
  /** XP total da jornada (soma dos dias) */
  totalXp: number;
  /** Bónus adicional por concluir a jornada inteira. */
  completionBonusXp?: number;
  days: PlanDay[];
  /** Data de lançamento (ISO 8601) — permite agendar planos futuros */
  availableFrom?: string;
}

// ─── Progresso do utilizador numa jornada ─────────────────────────────────────
export interface UserPlanProgress {
  planId: string;
  startedAt: string; // ISO 8601
  /** Dias concluídos (1-based, day numbers) */
  completedDays: number[];
  currentDay: number; // próximo dia a completar
  streakDays: number;
  lastActivityAt: string; // ISO 8601
  /** XP acumulado nesta jornada */
  xpEarned: number;
  /** Jornada concluída? */
  isCompleted: boolean;
  /** Badge desbloqueada? (true após concluir) */
  badgeUnlocked: boolean;
}

// ─── Estado de um dia numa jornada (computed) ────────────────────────────────
export type DayStatus = 'completed' | 'active' | 'locked';

// ─── Resultado de completar um dia ───────────────────────────────────────────
export interface DayCompletionResult {
  xpGained: number;
  newStreakDays: number;
  badgeUnlocked?: { icon: string; label: string };
  journeyCompleted: boolean;
}
