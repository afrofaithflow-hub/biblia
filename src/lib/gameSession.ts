import {
  GameMode,
  GameQuestion,
  ReviewQueueItem,
  REWARD_RULES,
  UserProgressTracks,
} from '../types/gameContracts';
import {
  ALL_LEGACY_QUESTIONS,
  GAME_MODE_LABELS,
  questionsForMode,
} from './gameContent';
import { WORLD_1_QUESTIONS } from '../data/canonicalGameData';
import {
  awardThirdMasteryStar,
  getJourneyPhase,
  getTotalMasteryStars,
  recordPhaseResult,
} from './gameJourney';

const RESULT_KEY = 'biblia:latest-game-result';
const DAILY_DATES_KEY = 'biblia:daily-completions';
const PENDING_MODE_KEY = 'biblia:pending-game-mode';
const PENDING_PHASE_KEY = 'biblia:pending-phase-id';
const PROGRESS_TRACKS_KEY = 'biblia:user-progress-tracks';
const REVIEW_QUEUE_KEY = 'biblia:review-queue';
const TOPIC_STATS_KEY = 'biblia:topic-stats';
const DAILY_TALENTS_KEY = 'biblia:daily-talents';

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

function generateAttemptUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

/**
 * Retorna os últimos N dias reais de prática em Africa/Maputo (zero mocks).
 */
export function getRecentPracticeDates(
  days = 28
): Array<{ dateKey: string; label: string; active: boolean; isToday: boolean }> {
  const completedDates = readDailyDates();
  const todayKey = getMaputoDateKey();
  const baseDate = new Date(`${todayKey}T12:00:00Z`);

  return Array.from({ length: days }, (_, index) => {
    const cursor = new Date(baseDate);
    cursor.setUTCDate(cursor.getUTCDate() - (days - 1 - index));
    const dateKey = cursor.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('pt', {
      timeZone: 'Africa/Maputo',
      day: '2-digit',
      month: 'short',
    }).format(cursor);
    return {
      dateKey,
      label,
      active: completedDates.has(dateKey),
      isToday: dateKey === todayKey,
    };
  });
}

/** ─── GERENCIAMENTO DAS 3 TRILHAS DE PROGRESSO DO UTILIZADOR ─── */
export function getUserProgressTracks(): UserProgressTracks {
  try {
    const raw = localStorage.getItem(PROGRESS_TRACKS_KEY);
    if (raw) {
      const tracks = JSON.parse(raw) as UserProgressTracks;
      if (!isLegacyDemoProgress(tracks)) {
        const daily = getDailyProgress();
        return {
          ...EMPTY_PROGRESS_TRACKS,
          ...tracks,
          masteryStars: Math.max(tracks.masteryStars || 0, getTotalMasteryStars()),
          streakDays: Math.max(tracks.streakDays || 0, daily.currentStreak),
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
      nextReviewDate: item.nextReviewDate || nextDate.toISOString(),
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = {
        ...queue[existingIndex],
        phaseId: item.phaseId || queue[existingIndex].phaseId,
        failedCount: queue[existingIndex].failedCount + 1,
        intervalDays: item.intervalDays,
        nextReviewDate: nextDate.toISOString(),
      };
    } else {
      queue.unshift(newItem);
    }

    localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue.slice(0, 100)));
  } catch {
    // ignora falha de storage
  }
}

const LEITNER_STEPS: Array<ReviewQueueItem['intervalDays']> = [1, 3, 7, 14, 30];

/**
 * Promove ou reinicia um item na fila de revisão espaçada Leitner (1 -> 3 -> 7 -> 14 -> 30 dias).
 * Quando uma revisão consolidada está vinculada a uma fase, desbloqueia a 3ª estrela de domínio.
 */
export function resolveReviewItemResult(
  questionId: string,
  isCorrect: boolean
): {
  promoted: boolean;
  completedPhaseThirdStar: boolean;
  nextIntervalDays?: number;
} {
  try {
    const queue = getReviewQueue();
    const idx = queue.findIndex((item) => item.questionId === questionId);
    if (idx < 0) {
      return { promoted: false, completedPhaseThirdStar: false };
    }

    const current = queue[idx];
    const now = Date.now();

    if (isCorrect) {
      const currentStepIdx = LEITNER_STEPS.indexOf(current.intervalDays);
      let completedPhaseThirdStar = false;

      if (currentStepIdx >= LEITNER_STEPS.length - 1) {
        // Completou os 30 dias — item totalmente dominado
        queue.splice(idx, 1);
      } else {
        const nextInterval = LEITNER_STEPS[Math.max(0, currentStepIdx) + 1];
        queue[idx] = {
          ...current,
          intervalDays: nextInterval,
          nextReviewDate: new Date(now + nextInterval * 24 * 60 * 60 * 1000).toISOString(),
        };
      }

      // Desbloqueia a 3ª estrela quando a revisão confirma retenção da fase
      if (current.phaseId) {
        const phase = getJourneyPhase(current.phaseId);
        const daysSincePhaseCompleted = phase?.lastCompletedAt
          ? (now - new Date(phase.lastCompletedAt).getTime()) / (24 * 60 * 60 * 1000)
          : 0;
        const remainingForPhase = queue.some((q) => q.phaseId === current.phaseId && new Date(q.nextReviewDate).getTime() <= now);

        if (current.intervalDays >= 3 || daysSincePhaseCompleted >= 3 || !remainingForPhase) {
          completedPhaseThirdStar = awardThirdMasteryStar(current.phaseId);
          if (completedPhaseThirdStar) {
            const tracks = getUserProgressTracks();
            saveUserProgressTracks({
              ...tracks,
              masteryStars: getTotalMasteryStars(),
            });
          }
        }
      }

      localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
      return {
        promoted: true,
        completedPhaseThirdStar,
        nextIntervalDays:
          currentStepIdx >= LEITNER_STEPS.length - 1
            ? undefined
            : LEITNER_STEPS[Math.max(0, currentStepIdx) + 1],
      };
    }

    // Errou na revisão: volta para intervalo de 1 dia
    queue[idx] = {
      ...current,
      failedCount: current.failedCount + 1,
      intervalDays: 1,
      nextReviewDate: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
    return { promoted: false, completedPhaseThirdStar: false, nextIntervalDays: 1 };
  } catch {
    return { promoted: false, completedPhaseThirdStar: false };
  }
}

/** ─── ESTATÍSTICAS POR TÓPICO E TETO DIÁRIO DE TALENTOS ─── */
function readTopicStats(): Record<string, { correct: number; total: number }> {
  try {
    const raw = localStorage.getItem(TOPIC_STATS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, { correct: number; total: number }>) : {};
  } catch {
    return {};
  }
}

function updateTopicStats(
  answersLog: GameSessionState['answersLog'],
  questionsLookup: Map<string, GameQuestion>
): Record<string, number> {
  const stats = readTopicStats();
  for (const entry of answersLog) {
    const q = questionsLookup.get(entry.questionId);
    const topic = q?.topic?.trim();
    if (!topic) continue;
    const prev = stats[topic] || { correct: 0, total: 0 };
    stats[topic] = {
      correct: prev.correct + (entry.isCorrect ? 1 : 0),
      total: prev.total + 1,
    };
  }

  try {
    localStorage.setItem(TOPIC_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignora erro de storage
  }

  const mastery: Record<string, number> = {};
  for (const [topic, { correct, total }] of Object.entries(stats)) {
    if (total > 0) {
      mastery[topic] = Math.round((correct / total) * 100);
    }
  }
  return mastery;
}

function applyDailyTalentsCap(
  rawTalents: number,
  mode: GameMode,
  phaseAlreadyMastered: boolean
): number {
  if (rawTalents <= 0) return 0;

  let adjusted = rawTalents;
  if (phaseAlreadyMastered && mode !== 'daily' && mode !== 'review') {
    adjusted = Math.min(5, Math.max(1, Math.round(rawTalents * 0.3)));
  }

  const today = getMaputoDateKey();
  let earnedToday = 0;
  try {
    const raw = localStorage.getItem(DAILY_TALENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { dateKey?: string; earned?: number };
      if (parsed.dateKey === today) {
        earnedToday = Math.max(0, Number(parsed.earned) || 0);
      }
    }
  } catch {
    earnedToday = 0;
  }

  const remainingCap = Math.max(0, REWARD_RULES.MAX_DAILY_LEAGUE_TALENTS - earnedToday);
  const granted = Math.min(adjusted, remainingCap);

  try {
    localStorage.setItem(
      DAILY_TALENTS_KEY,
      JSON.stringify({ dateKey: today, earned: earnedToday + granted })
    );
  } catch {
    // ignora falha de storage
  }

  return granted;
}

/** ─── PERSISTÊNCIA DE RESULTADOS E SESSÃO ─── */
export function saveGameResult(
  result: GameResult,
  extra?: { answersLog?: GameSessionState['answersLog']; questions?: GameQuestion[] }
): void {
  clearRequestedGameMode();
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify(result));
    const today = getMaputoDateKey();

    if (result.completed) {
      const dates = readDailyDates();
      dates.add(today);
      localStorage.setItem(DAILY_DATES_KEY, JSON.stringify([...dates].sort()));
    }

    // Regista estrelas/desbloqueio da fase ANTES de calcular total de estrelas
    recordPhaseResult(result.phaseId, result);
    const daily = getDailyProgress();
    const totalStars = getTotalMasteryStars();

    // Atualiza domínio por tópico com base no answersLog real
    const allCatalog = getAllQuestionsPool();
    const lookup = new Map<string, GameQuestion>(allCatalog.map((q) => [q.id, q]));
    if (extra?.questions) {
      for (const q of extra.questions) {
        lookup.set(q.id, q);
      }
    }
    const currentTracks = getUserProgressTracks();
    const nextTopicMastery =
      extra?.answersLog && extra.answersLog.length > 0
        ? { ...currentTracks.topicMastery, ...updateTopicStats(extra.answersLog, lookup) }
        : currentTracks.topicMastery;

    const nextXp = currentTracks.lifetimeXp + result.xpEarned;
    const updatedTracks: UserProgressTracks = {
      ...currentTracks,
      lifetimeXp: nextXp,
      weeklyTalents: currentTracks.weeklyTalents + result.talentsEarned,
      masteryStars: Math.max(totalStars, result.starsEarned),
      walkLevel: Math.floor(nextXp / 250) + 1,
      streakDays: daily.currentStreak,
      lastDailyDate: result.completed ? today : currentTracks.lastDailyDate,
      topicMastery: nextTopicMastery,
    };
    saveUserProgressTracks(updatedTracks);
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
    } else {
      sessionStorage.removeItem(PENDING_PHASE_KEY);
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
    attemptId: generateAttemptUuid(),
    answersLog: [],
  };
}

export function checkGameAnswer(question: GameQuestion, answer: string | string[]): boolean {
  const actual = (Array.isArray(answer) ? answer : [answer]).map(normalizeAnswer);
  const expected = question.answers.map(normalizeAnswer);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

/**
 * Embaralha um array de opções de forma uniforme (Fisher-Yates) sem mutar o original.
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

/**
 * Garante que o banco de palavras de fill-blanks contenha ao menos tantas ocorrências
 * de cada resposta quanto o número de lacunas que exigem aquela palavra (ex: "Haja luz; e houve luz").
 */
export function ensureWordBankHasRequiredAnswers(
  options: readonly string[] | undefined,
  answers: readonly string[]
): string[] {
  const base = options ? [...options] : [];
  const requiredCounts = new Map<string, { count: number; sample: string }>();

  for (const ans of answers) {
    const key = normalizeAnswer(ans);
    if (!key) continue;
    const prev = requiredCounts.get(key);
    requiredCounts.set(key, {
      count: (prev?.count || 0) + 1,
      sample: prev?.sample || ans,
    });
  }

  const existingCounts = new Map<string, number>();
  for (const opt of base) {
    const key = normalizeAnswer(opt);
    existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
  }

  for (const [key, { count, sample }] of requiredCounts.entries()) {
    const currentCount = existingCounts.get(key) || 0;
    for (let i = currentCount; i < count; i++) {
      base.push(sample);
    }
  }

  return shuffleArray(base);
}

function getAllQuestionsPool(): GameQuestion[] {
  const map = new Map<string, GameQuestion>();
  for (const q of Object.values(WORLD_1_QUESTIONS).flat()) {
    map.set(q.id, q);
  }
  for (const q of ALL_LEGACY_QUESTIONS) {
    if (!map.has(q.id)) map.set(q.id, q);
  }
  return [...map.values()];
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicShuffle<T>(items: readonly T[], seedStr: string): T[] {
  const copy = [...items];
  let seed = hashSeed(seedStr) || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Rotação diária determinística pela data de Maputo (AAAA-MM-DD):
 * todos os jogadores recebem o mesmo desafio no dia, mudando automaticamente a cada dia.
 */
export function getDailyQuestionsForDate(dateKey = getMaputoDateKey()): GameQuestion[] {
  const pool = getAllQuestionsPool();
  const mc = deterministicShuffle(
    pool.filter((q) => q.kind === 'multiple-choice'),
    `${dateKey}:mc`
  );
  const tf = deterministicShuffle(
    pool.filter((q) => q.kind === 'true-false'),
    `${dateKey}:tf`
  );
  const fb = deterministicShuffle(
    pool.filter((q) => q.kind === 'fill-blanks'),
    `${dateKey}:fb`
  );

  const selected = [mc[0], tf[0], fb[0], mc[1]].filter(Boolean);
  return selected.length >= 3 ? selected : questionsForMode('daily');
}

/**
 * Monta sessão de Revisão Espaçada a partir dos itens pendentes reais de reviewQueue.
 */
export function getReviewSessionQuestions(): GameQuestion[] {
  const queue = getReviewQueue();
  if (queue.length === 0) {
    return questionsForMode('true-false').slice(0, 3);
  }

  const now = Date.now();
  const due = queue.filter((item) => new Date(item.nextReviewDate).getTime() <= now);
  const targetItems = (due.length > 0 ? due : queue).slice(0, 5);

  const lookup = new Map<string, GameQuestion>(getAllQuestionsPool().map((q) => [q.id, q]));
  const resolved = targetItems
    .map((item) => lookup.get(item.questionId))
    .filter((q): q is GameQuestion => Boolean(q));

  return resolved.length > 0 ? resolved : questionsForMode('true-false').slice(0, 3);
}

export function questionBankForMode(mode: GameMode, phaseId?: string): GameQuestion[] {
  if (mode === 'review') {
    return getReviewSessionQuestions();
  }
  if (mode === 'daily') {
    return getDailyQuestionsForDate();
  }
  if (phaseId && WORLD_1_QUESTIONS[phaseId] && WORLD_1_QUESTIONS[phaseId].length > 0) {
    return WORLD_1_QUESTIONS[phaseId];
  }
  return questionsForMode(mode);
}

/**
 * Finaliza a sessão calculando as recompensas canônicas (G0) e anti-farm de Talentos.
 */
export function finalizeGame(
  mode: GameMode,
  state: GameSessionState,
  total: number,
  phaseId?: string,
  questions?: GameQuestion[]
): GameResult {
  const completed = state.lives > 0 && state.questionIndex >= total - 1;
  const existingPhase = phaseId ? getJourneyPhase(phaseId) : undefined;
  const phaseAlreadyMastered = Boolean(existingPhase?.isCompleted && existingPhase.stars >= 2);

  // Cálculo das 3 trilhas conforme REWARD_RULES
  let xpEarned = state.earnedXp;
  let rawTalents = state.earnedTalents;

  if (completed) {
    if (mode === 'daily') {
      xpEarned += REWARD_RULES.DAILY_CHALLENGE_XP;
      rawTalents += REWARD_RULES.DAILY_CHALLENGE_TALENTS;
    } else if (mode === 'review') {
      xpEarned += REWARD_RULES.SPACED_REVIEW_CORRECT_XP;
      rawTalents += REWARD_RULES.SPACED_REVIEW_CORRECT_TALENTS;
    } else {
      xpEarned += REWARD_RULES.LESSON_COMPLETED_XP;
      rawTalents += REWARD_RULES.LESSON_COMPLETED_TALENTS;
    }
  }

  const talentsEarned = applyDailyTalentsCap(rawTalents, mode, phaseAlreadyMastered);

  // Estrelas de Domínio (G0):
  // 1 estrela por conclusão; 2 estrelas por precisão >= 80%
  let starsEarned = 0;
  const precision = total > 0 ? state.correct / total : 0;
  if (completed) {
    starsEarned = precision >= 0.8 ? 2 : 1;
  }

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

  saveGameResult(result, { answersLog: state.answersLog, questions });

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
