/**
 * BiblIA Jogo — Contratos de Dados, Tipos Canônicos e Regras de Recompensa
 * Alinhado a: PLANO_JOGO_BIBLIA.md (Codex) e plano_game_biblia_experiencia_completa.md (Antigravity)
 * Fuso horário canônico: Africa/Maputo
 */

export type GameMode = 'quiz' | 'true-false' | 'fill-blanks' | 'daily' | 'review';

export type GameQuestionKind = 'multiple-choice' | 'true-false' | 'fill-blanks';

export type NodeType =
  | 'lesson'          // Lição mista com 5-8 questões
  | 'memory'          // Completar versículo e memorização
  | 'guided_reading'  // Leitura contextual preparatória
  | 'blessing_chest'  // Marco de exploração (cosmético/conquista)
  | 'world_review';   // Revisão de síntese de mundo

export type LeagueDivision =
  | 'seed'       // Semente (Bronze)
  | 'path'       // Caminho (Prata)
  | 'disciple'   // Discípulo (Ouro)
  | 'messenger'  // Mensageiro (Diamante)
  | 'celestial'; // Celestial

/** ─── A HIERARQUIA CANÔNICA DE CONTEÚDO ─── */
export interface CanonicalWorld {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  testament: 'AT' | 'NT';
  focus: string;
  themeColor: string;
  icon: string;
  totalPhases: number;
  reviewTitle: string;
  achievementBadge: string;
  isUnlocked: boolean;
}

export interface CanonicalPhase {
  id: string;
  worldId: number;
  phaseNumber: number;
  title: string;
  description: string;
  nodeType: NodeType;
  scriptureReference: string;
  estimatedMinutes: number;
  mode: GameMode;
  topics: string[];
  stars: number; // 0 a 3
  isCompleted: boolean;
  isUnlocked: boolean;
  lastCompletedAt?: string;
  retentionReviewedAt?: string;
}

export interface RecoveryVariant {
  kind: GameQuestionKind;
  prompt: string;
  options?: string[];
  answers: string[];
  explanation: string;
}

export interface GameQuestion {
  id: string;
  kind: GameQuestionKind;
  prompt: string;
  reference: string;
  options?: string[];
  answers: string[];
  explanation: string;
  hint: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  recoveryVariant?: RecoveryVariant;
}

/** ─── MÁQUINA DE ESTADOS DE RECUPERAÇÃO (LER -> COMPREENDER -> RECUPERAR) ─── */
export type RecoveryStatus =
  | 'not_available'
  | 'reading_pending'
  | 'reading_in_progress'
  | 'reading_validated'
  | 'recovery_question'
  | 'recovered'
  | 'failed';

export interface RecoverySession {
  attemptId: string;
  questionId: string;
  sourceReference: string;
  targetBook: string;
  targetChapter: number;
  targetVerses: number[];
  contextStartVerse: number;
  contextEndVerse: number;
  minReadSeconds: number;
  status: RecoveryStatus;
  readingStartedAt: number | null;
  accumulatedVisibleTimeMs: number;
  sawStartVerse: boolean;
  sawEndVerse: boolean;
  recoveryQuestion: GameQuestion | null;
  lifeAwarded: boolean;
  updatedAt: number;
}

/** ─── AS TRÊS TRILHAS SEPARADAS DE PROGRESSO ─── */
export interface UserProgressTracks {
  /** 1. XP de Caminhada: permanente e intransferível */
  lifetimeXp: number;
  walkLevel: number;

  /** 2. Estrelas de Domínio: retenção e compreensão (0 a 3 por fase) */
  masteryStars: number;
  topicMastery: Record<string, number>; // tema -> percentagem (0 a 100)

  /** 3. Talentos da Semana: pontuação volátil da liga semanal, zera todo domingo/segunda */
  weeklyTalents: number;
  weeklyLeague: LeagueDivision;
  leagueRank: number;

  /** Estatísticas de Hábito Diário */
  streakDays: number;
  lastDailyDate: string | null;
  hearts: number; // Corações de sessão (máximo 5)
}

/** ─── TABELA DE REGRAS DE RECOMPENSA CANÔNICA (G0) ─── */
export const REWARD_RULES = {
  LESSON_COMPLETED_XP: 20,
  LESSON_COMPLETED_TALENTS: 10,
  CORRECT_NO_HINT_XP: 5,
  CORRECT_NO_HINT_TALENTS: 2,
  CORRECT_WITH_HINT_XP: 3,
  CORRECT_WITH_HINT_TALENTS: 1,
  SPACED_REVIEW_CORRECT_XP: 8,
  SPACED_REVIEW_CORRECT_TALENTS: 2,
  DAILY_CHALLENGE_XP: 25,
  DAILY_CHALLENGE_TALENTS: 15,
  READ_SCRIPTURE_CONTEXT_XP: 5,
  MAX_DAILY_LEAGUE_TALENTS: 150, // Limite diário de talentos de ranking para evitar burnout
  MAX_SESSION_HEARTS: 5,
  MAX_RECOVERIES_PER_LESSON: 2,
} as const;

/** ─── FILA DE REVISÃO ESPAÇADA (REVISAR PARA DOMINAR) ─── */
export interface ReviewQueueItem {
  id: string;
  questionId: string;
  phaseId?: string;
  prompt: string;
  reference: string;
  topic: string;
  failedCount: number;
  intervalDays: 1 | 3 | 7 | 14 | 30;
  nextReviewDate: string; // ISO String (calculado em Africa/Maputo)
  createdAt: string;
}

/** ─── CONTRATO DE UMA SESSÃO DE APRENDIZAGEM (G1) ─── */
export interface SessionAttempt {
  attemptId: string;
  lessonId: string;
  mode: GameMode;
  startedAt: string;
  questionIndex: number;
  totalQuestions: number;
  livesRemaining: number;
  hintsUsedCount: number;
  correctAnswersCount: number;
  status: 'playing' | 'answered' | 'completed' | 'failed' | 'reviewing_scripture';
  wasCorrect: boolean | null;
  usedHintOnCurrentQuestion: boolean;
  earnedXp: number;
  earnedTalents: number;
  awardedStars: number;
  answers: Array<{
    questionId: string;
    providedAnswer: string | string[];
    isCorrect: boolean;
    usedHint: boolean;
    timestamp: string;
  }>;
}

/** ─── MODELO SOCIAL ÉTICO E SEGURO ─── */
export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface SocialFriend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  walkLevel: number;
  weeklyTalents: number;
  status: FriendStatus;
  isMutual: boolean;
}

export interface ChurchGroup {
  id: string;
  name: string;
  code: string; // Código de 6 dígitos para entrada voluntária
  avatar: string;
  membersCount: number;
  weeklyGoalProgress: number; // e.g. 75%
  goalTargetDescription: string;
}
