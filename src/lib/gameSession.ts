import {
  GameMode,
  GameQuestion,
  ReviewQueueItem,
  REWARD_RULES,
  UserProgressTracks,
} from '../types/gameContracts';
import {
  GAME_MODE_LABELS,
  questionsForMode,
} from './gameContent';
import { WORLD_1_QUESTIONS } from '../data/canonicalGameData';
import { recordPhaseResult } from './gameJourney';

const RESULT_KEY = 'biblia:latest-game-result';
const DAILY_DATES_KEY = 'biblia:daily-completions';
const PENDING_MODE_KEY = 'biblia:pending-game-mode';
const PENDING_PHASE_KEY = 'biblia:pending-phase-id';
const PROGRESS_TRACKS_KEY = 'biblia:user-progress-tracks';
const REVIEW_QUEUE_KEY = 'biblia:review-queue';

export interface GameResult {
  mode: GameMode;
  modeLabel: string;
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
  talentsEarned: number;
  starsEarned: number;
  livesRemaining: number;
  completed: boolean;
  finishedAt: string;
  phaseId?: string;
  reviewItemsAddedCount: number;
}

export interface DailyProgress {
  completedToday: boolean;
  currentStreak: number;
  completedDates: Set<string>;
}

export interface GameSessionState {
  questionIndex: number;
  lives: number;
  correct: number;
  score: number;
  earnedXp: number;
  earnedTalents: number;
  usedHintOnCurrentQuestion: boolean;
  status: 'playing' | 'answered' | 'completed' | 'failed' | 'reading_recovery';
  wasCorrect: boolean | null;
  phaseId?: string;
  attemptId: string;
  answersLog: Array<{
    questionId: string;
    isCorrect: boolean;
    usedHint: boolean;
  }>;
}

export const MAX_GAME_LIVES = REWARD_RULES.MAX_SESSION_HEARTS;

const EMPTY_PROGRESS_TRACKS: UserProgressTracks = {
  lifetimeXp: 0,
  walkLevel: 1,
  masteryStars: 0,
  topicMastery: {},
  weeklyTalents: 0,
  weeklyLeague: 'seed',
  leagueRank: 0,
  streakDays: 0,
  lastDailyDate: null,
  hearts: MAX_GAME_LIVES,
};

function isLegacyDemoProgress(tracks: UserProgressTracks): boolean {
  return (
    tracks.lifetimeXp === 1240 &&
    tracks.walkLevel === 6 &&
    tracks.masteryStars === 18 &&
    tracks.weeklyTalents === 240 &&
    tracks.leagueRank === 4 &&
    tracks.streakDays === 7
  );
}

/** Retorna a chave de data no fuso de Maputo (AAAA-MM-DD) */
export function getMaputoDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function readDailyDates(): Set<string> {
  try {
    const value = localStorage.getItem(DAILY_DATES_KEY);
    return new Set(value ? (JSON.parse(value) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function getDailyProgress(): DailyProgress {
  const completedDates = readDailyDates();
  const today = getMaputoDateKey();
  const completedToday = completedDates.has(today);
  const cursor = new Date(`${today}T10:00:00Z`);
  if (!completedToday) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let currentStreak = 0;
  while (completedDates.has(getMaputoDateKey(cursor))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { completedToday, currentStreak, completedDates };
}

/** ─── GERENCIAMENTO DAS 3 TRILHAS DE PROGRESSO DO UTILIZADOR ─── */
export function getUserProgressTracks(): UserProgressTracks {
  try {
    const raw = localStorage.getItem(PROGRESS_TRACKS_KEY);
    if (raw) {
      const tracks = JSON.parse(raw) as UserProgressTracks;
      if (!isLegacyDemoProgress(tracks)) {
        return {
          ...EMPTY_PROGRESS_TRACKS,
          ...tracks,
          topicMastery: tracks.topicMastery || {},
        };
      }
      // Os números do protótipo nunca foram uma conquista do utilizador.
      localStorage.removeItem(PROGRESS_TRACKS_KEY);
    }
  } catch {
    // fallback
  }

  return { ...EMPTY_PROGRESS_TRACKS, topicMastery: {} };
}

export function saveUserProgressTracks(tracks: UserProgressTracks): void {
  try {
    localStorage.setItem(PROGRESS_TRACKS_KEY, JSON.stringify(tracks));
  } catch {
    // Local storage indisponível
  }
}

/** ─── FILA DE REVISÃO ESPAÇADA (REVISAR PARA DOMINAR) ─── */
export function getReviewQueue(): ReviewQueueItem[] {
  try {
    const raw = localStorage.getItem(REVIEW_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as ReviewQueueItem[]) : [];
  } catch {
    return [];
  }
}

export function addToReviewQueue(item: Omit<ReviewQueueItem, 'id' | 'createdAt'>): void {
  try {
    const queue = getReviewQueue();
    const existingIndex = queue.findIndex((q) => q.questionId === item.questionId);
    const now = new Date();
    const nextDate = new Date(now.getTime() + item.intervalDays * 24 * 60 * 60 * 1000);

    const newItem: ReviewQueueItem = {
      ...item,
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now.toISOString(),
      nextReviewDate: nextDate.toISOString(),
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = {
        ...queue[existingIndex],
        failedCount: queue[existingIndex].failedCount + 1,
        intervalDays: item.intervalDays,
        nextReviewDate: newItem.nextReviewDate,
      };
    } else {
      queue.unshift(newItem);
    }

    localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue.slice(0, 100)));
  } catch {
    // ignora falha de storage
  }
}

/** ─── PERSISTÊNCIA DE RESULTADOS E SESSÃO ─── */
export function saveGameResult(result: GameResult): void {
  clearRequestedGameMode();
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify(result));
    if (result.mode === 'daily' && result.completed) {
      const dates = readDailyDates();
      dates.add(getMaputoDateKey());
      localStorage.setItem(DAILY_DATES_KEY, JSON.stringify([...dates].sort()));
    }

    // Atualiza as 3 trilhas permanentes no perfil local
    const currentTracks = getUserProgressTracks();
    const updatedTracks: UserProgressTracks = {
      ...currentTracks,
      lifetimeXp: currentTracks.lifetimeXp + result.xpEarned,
      weeklyTalents: currentTracks.weeklyTalents + result.talentsEarned,
      masteryStars: currentTracks.masteryStars + result.starsEarned,
      walkLevel: Math.floor((currentTracks.lifetimeXp + result.xpEarned) / 250) + 1,
    };
    saveUserProgressTracks(updatedTracks);
    recordPhaseResult(result.phaseId, result);
  } catch {
    // Keep the completed round usable if browser storage is unavailable.
  }
}

export function getLatestGameResult(): GameResult | null {
  try {
    const value = localStorage.getItem(RESULT_KEY);
    return value ? (JSON.parse(value) as GameResult) : null;
  } catch {
    return null;
  }
}

export function requestGameMode(mode: GameMode, phaseId?: string): void {
  try {
    sessionStorage.setItem(PENDING_MODE_KEY, mode);
    if (phaseId) {
      sessionStorage.setItem(PENDING_PHASE_KEY, phaseId);
    }
  } catch {
    // Fallback
  }
}

export function consumeGameMode(fallback: GameMode): { mode: GameMode; phaseId?: string } {
  try {
    const requested = sessionStorage.getItem(PENDING_MODE_KEY) as GameMode | null;
    const phaseId = sessionStorage.getItem(PENDING_PHASE_KEY) || undefined;
    return {
      mode: requested && requested in GAME_MODE_LABELS ? requested : fallback,
      phaseId,
    };
  } catch {
    return { mode: fallback };
  }
}

export function clearRequestedGameMode(): void {
  try {
    sessionStorage.removeItem(PENDING_MODE_KEY);
    sessionStorage.removeItem(PENDING_PHASE_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function createInitialGameState(phaseId?: string): GameSessionState {
  return {
    questionIndex: 0,
    lives: MAX_GAME_LIVES,
    correct: 0,
    score: 0,
    earnedXp: 0,
    earnedTalents: 0,
    usedHintOnCurrentQuestion: false,
    status: 'playing',
    wasCorrect: null,
    phaseId,
    attemptId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    answersLog: [],
  };
}

export function checkGameAnswer(question: GameQuestion, answer: string | string[]): boolean {
  const actual = (Array.isArray(answer) ? answer : [answer]).map(normalizeAnswer);
  const expected = question.answers.map(normalizeAnswer);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

/**
 * Embaralha um array de opções de forma uniforme (Fisher-Yates) sem mutar o original
 */
export function shuffleArray<T>(array: readonly T[] | T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeAnswer(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt');
}

export function questionBankForMode(mode: GameMode, phaseId?: string): GameQuestion[] {
  if (phaseId && WORLD_1_QUESTIONS[phaseId] && WORLD_1_QUESTIONS[phaseId].length > 0) {
    return WORLD_1_QUESTIONS[phaseId];
  }
  return questionsForMode(mode);
}

/**
 * Finaliza a sessão calculando as recompensas canônicas (G0)
 */
export function finalizeGame(
  mode: GameMode,
  state: GameSessionState,
  total: number,
  phaseId?: string
): GameResult {
  const completed = state.lives > 0 && state.questionIndex >= total - 1;

  // Cálculo das 3 trilhas conforme REWARD_RULES
  let xpEarned = state.earnedXp;
  let talentsEarned = state.earnedTalents;

  if (completed) {
    if (mode === 'daily') {
      xpEarned += REWARD_RULES.DAILY_CHALLENGE_XP;
      talentsEarned += REWARD_RULES.DAILY_CHALLENGE_TALENTS;
    } else {
      xpEarned += REWARD_RULES.LESSON_COMPLETED_XP;
      talentsEarned += REWARD_RULES.LESSON_COMPLETED_TALENTS;
    }
  }

  // Estrelas de Domínio (G0):
  // 1 estrela por conclusão; 2 estrelas por precisão >= 80%
  let starsEarned = 0;
  const precision = total > 0 ? state.correct / total : 0;
  if (completed) {
    starsEarned = precision >= 0.8 ? 2 : 1;
  }

  // Quantidade de itens adicionados para revisão
  const reviewItemsAddedCount = state.answersLog.filter((a) => !a.isCorrect || a.usedHint).length;

  const result: GameResult = {
    mode,
    modeLabel: GAME_MODE_LABELS[mode],
    correct: state.correct,
    total,
    score: state.score,
    xpEarned,
    talentsEarned,
    starsEarned,
    livesRemaining: state.lives,
    completed,
    finishedAt: new Date().toISOString(),
    phaseId,
    reviewItemsAddedCount,
  };

  saveGameResult(result);

  // Sincronização assíncrona G3 com Supabase (offline-first, idempotente via attemptId)
  if (typeof window !== 'undefined') {
    import('./gameSyncService')
      .then(({ syncGameAttempt }) => {
        syncGameAttempt(state.attemptId, result, state.answersLog).catch((err) => {
          console.warn('[gameSession] Tentativa offline arquivada:', err);
        });
      })
      .catch(() => {
        // Silencioso se módulo ainda carregando
      });
  }

  return result;
}
