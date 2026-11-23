import {
  GameMode,
  GameQuestion,
  RecoverySession,
  REWARD_RULES,
} from '../types/gameContracts';
import type { GameSessionState } from './gameSession';
import { ALL_LEGACY_QUESTIONS } from './gameContent';
import { WORLD_1_QUESTIONS } from '../data/canonicalGameData';
import { parseScriptureReference, queueBibleReference } from './scriptureReference';

const ACTIVE_LESSON_SESSION_KEY = 'biblia:active-lesson-session';
const LESSON_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

export interface ActiveLessonSession {
  attemptId: string;
  mode: GameMode;
  phaseId?: string;
  questions: GameQuestion[];
  state: GameSessionState;
  recoveryAttemptsUsed: number;
  recoveryAttemptedQuestionIds: string[];
  recovery: RecoverySession | null;
  savedAt: number;
}

export function saveActiveLessonSession(session: ActiveLessonSession): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const payload: ActiveLessonSession = {
      ...session,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(ACTIVE_LESSON_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Falha silenciosa se storage estiver indisponível
  }
}

export function loadActiveLessonSession(): ActiveLessonSession | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(ACTIVE_LESSON_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ActiveLessonSession;
    if (!parsed || !parsed.attemptId || !Array.isArray(parsed.questions) || !parsed.state) {
      return null;
    }

    if (Date.now() - (parsed.savedAt || 0) > LESSON_SESSION_TTL_MS) {
      clearActiveLessonSession();
      return null;
    }

    return {
      ...parsed,
      recoveryAttemptsUsed: parsed.recoveryAttemptsUsed ?? 0,
      recoveryAttemptedQuestionIds: parsed.recoveryAttemptedQuestionIds ?? [],
      recovery: parsed.recovery ?? null,
    };
  } catch {
    return null;
  }
}

export function clearActiveLessonSession(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(ACTIVE_LESSON_SESSION_KEY);
  } catch {
    // Ignora falha de storage
  }
}

export function canStartRecoveryForQuestion(
  session: ActiveLessonSession | null,
  questionId: string,
  reference: string
): boolean {
  if (!session) return false;
  if (session.state.status === 'completed' || session.state.status === 'failed') return false;
  if (session.state.lives >= REWARD_RULES.MAX_SESSION_HEARTS) return false;
  if (session.recoveryAttemptsUsed >= REWARD_RULES.MAX_RECOVERIES_PER_LESSON) return false;
  if (session.recoveryAttemptedQuestionIds.includes(questionId)) return false;

  const wrongEntry = session.state.answersLog.find(
    (entry) => entry.questionId === questionId && !entry.isCorrect
  );
  if (!wrongEntry) return false;

  return parseScriptureReference(reference) !== null;
}

export function getEligibleRecoveryQuestions(session: ActiveLessonSession | null): GameQuestion[] {
  if (!session) return [];
  if (session.recoveryAttemptsUsed >= REWARD_RULES.MAX_RECOVERIES_PER_LESSON) return [];

  const attempted = new Set(session.recoveryAttemptedQuestionIds);
  const wrongIds = new Set(
    session.state.answersLog.filter((entry) => !entry.isCorrect).map((entry) => entry.questionId)
  );

  return session.questions.filter(
    (q) => wrongIds.has(q.id) && !attempted.has(q.id) && parseScriptureReference(q.reference) !== null
  );
}

/**
 * Inicia a etapa de leitura orientada ("Ler na Bíblia") para uma questão errada.
 * Guarda atomicamente a sessão e prepara a referência no BibleReader.
 */
export function startReadingRecovery(
  session: ActiveLessonSession,
  question: GameQuestion
): ActiveLessonSession | null {
  if (!canStartRecoveryForQuestion(session, question.id, question.reference)) {
    return null;
  }

  const parsed = queueBibleReference(question.reference);
  if (!parsed) return null;

  const recovery: RecoverySession = {
    attemptId: session.attemptId,
    questionId: question.id,
    sourceReference: parsed.label,
    targetBook: parsed.book,
    targetChapter: parsed.chapter,
    targetVerses: parsed.targetVerses,
    contextStartVerse: parsed.contextStartVerse,
    contextEndVerse: parsed.contextEndVerse,
    minReadSeconds: 6,
    status: 'reading_pending',
    readingStartedAt: Date.now(),
    accumulatedVisibleTimeMs: 0,
    sawStartVerse: false,
    sawEndVerse: false,
    recoveryQuestion: null,
    lifeAwarded: false,
    updatedAt: Date.now(),
  };

  const updated: ActiveLessonSession = {
    ...session,
    state: {
      ...session.state,
      status: 'reading_recovery',
    },
    recovery,
  };

  saveActiveLessonSession(updated);
  return updated;
}

/**
 * Atualiza os sensores da Camada A (Evidência de leitura real) no BibleReader.
 */
export function updateReadingProgress(patch: {
  accumulatedVisibleTimeMs: number;
  sawStartVerse: boolean;
  sawEndVerse: boolean;
  minReadSeconds: number;
}): RecoverySession | null {
  const session = loadActiveLessonSession();
  if (!session || !session.recovery) return null;

  const current = session.recovery;
  if (
    current.status !== 'reading_pending' &&
    current.status !== 'reading_in_progress' &&
    current.status !== 'reading_validated'
  ) {
    return current;
  }

  const nextTime = Math.max(current.accumulatedVisibleTimeMs, patch.accumulatedVisibleTimeMs);
  const nextSawStart = current.sawStartVerse || patch.sawStartVerse;
  const nextSawEnd = current.sawEndVerse || patch.sawEndVerse;
  const minSeconds = Math.max(5, patch.minReadSeconds || current.minReadSeconds);

  const meetsAllCriteria =
    nextTime >= minSeconds * 1000 && nextSawStart && nextSawEnd;

  // Uma vez validada a leitura na Camada A, não retrocede.
  const nextStatus: RecoverySession['status'] =
    current.status === 'reading_validated' || meetsAllCriteria
      ? 'reading_validated'
      : nextTime > 0 || nextSawStart
      ? 'reading_in_progress'
      : 'reading_pending';

  const nextRecovery: RecoverySession = {
    ...current,
    accumulatedVisibleTimeMs: nextTime,
    sawStartVerse: nextSawStart,
    sawEndVerse: nextSawEnd,
    minReadSeconds: minSeconds,
    status: nextStatus,
    updatedAt: Date.now(),
  };

  saveActiveLessonSession({
    ...session,
    recovery: nextRecovery,
  });

  return nextRecovery;
}

/**
 * Cancela uma leitura que não foi concluída sem consumir tentativa nem conceder vida.
 */
export function cancelReadingRecovery(): ActiveLessonSession | null {
  const session = loadActiveLessonSession();
  if (!session) return null;

  const restoredStatus =
    session.state.status === 'reading_recovery' ? 'answered' : session.state.status;

  const updated: ActiveLessonSession = {
    ...session,
    state: {
      ...session.state,
      status: restoredStatus,
    },
    recovery: null,
  };

  saveActiveLessonSession(updated);
  return updated;
}

const PT_STOPWORDS = new Set([
  'disse', 'foram', 'entre', 'sobre', 'porque', 'assim', 'entao', 'quando',
  'todos', 'todas', 'toda', 'todo', 'desta', 'desse', 'nossa', 'nosso',
  'vossa', 'vosso', 'minha', 'meus', 'suas', 'seus', 'pelo', 'pela', 'para',
  'como', 'com', 'esta', 'este', 'isto', 'aquele', 'aquela', 'houve', 'haja',
  'senhor', 'deus', 'terra', 'ceus',
]);

const FALLBACK_DISTRACTORS = [
  'esperança', 'justiça', 'aliança', 'sabedoria', 'fidelidade',
  'verdade', 'promessa', 'misericórdia', 'glória', 'caminho',
];

function getAllCatalogQuestions(): GameQuestion[] {
  const worldQuestions = Object.values(WORLD_1_QUESTIONS).flat();
  return [...worldQuestions, ...ALL_LEGACY_QUESTIONS];
}

/**
 * Constrói uma questão de repescagem reformulada (nunca repete o mesmo enunciado).
 * Prioridade 1: `recoveryVariant` curada editorialmente.
 * Prioridade 2: derivação real sobre os versículos da passagem lida.
 * Prioridade 3: questão correlata do mesmo livro/tema no catálogo.
 */
export function buildRecoveryQuestion(
  originalQuestion: GameQuestion,
  chapterVerses?: Array<{ num: number; text: string }>
): GameQuestion {
  const recId = `${originalQuestion.id}-rec`;

  // 1. Variante editorial curada
  if (originalQuestion.recoveryVariant) {
    const v = originalQuestion.recoveryVariant;
    return {
      id: recId,
      kind: v.kind,
      prompt: v.prompt,
      reference: originalQuestion.reference,
      options: v.options,
      answers: v.answers,
      explanation: v.explanation,
      hint: '',
      topic: originalQuestion.topic,
      difficulty: originalQuestion.difficulty || 'easy',
    };
  }

  // 2. Derivação baseada no texto real lido no BibleReader
  const parsedRef = parseScriptureReference(originalQuestion.reference);
  if (chapterVerses && chapterVerses.length > 0 && parsedRef) {
    const candidateVerses = chapterVerses.filter((v) =>
      parsedRef.targetVerses.includes(v.num)
    );
    const chosenVerse = candidateVerses[0] || chapterVerses[Math.max(0, parsedRef.contextStartVerse - 1)];

    if (chosenVerse && chosenVerse.text) {
      const priorAnswers = new Set(originalQuestion.answers.map((a) => a.toLowerCase()));
      const words = chosenVerse.text
        .replace(/[.,;:!?()"'«»—]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !PT_STOPWORDS.has(w.toLowerCase()) && !priorAnswers.has(w.toLowerCase()));

      if (words.length > 0) {
        // Escolhe palavra intermediária do versículo para montar fill-blanks distinto
        const targetWord = words[Math.min(words.length - 1, Math.floor(words.length / 2))];
        const blankedText = chosenVerse.text.replace(new RegExp(`\\b${targetWord}\\b`), '___');

        if (blankedText !== chosenVerse.text) {
          const distractors = FALLBACK_DISTRACTORS.filter(
            (d) => d.toLowerCase() !== targetWord.toLowerCase()
          ).slice(0, 3);

          return {
            id: recId,
            kind: 'fill-blanks',
            prompt: `Após ler a passagem, complete ${parsedRef.book} ${parsedRef.chapter}:${chosenVerse.num}: "${blankedText}"`,
            reference: `${parsedRef.book} ${parsedRef.chapter}:${chosenVerse.num}`,
            options: [targetWord, ...distractors],
            answers: [targetWord],
            explanation: `O versículo completo declara: "${chosenVerse.text}"`,
            hint: '',
            topic: originalQuestion.topic,
            difficulty: 'easy',
          };
        }
      }
    }
  }

  // 3. Fallback determinístico para questão correlata com enunciado diferente
  const all = getAllCatalogQuestions();
  const sameRefDifferentId = all.find(
    (q) =>
      q.id !== originalQuestion.id &&
      q.prompt !== originalQuestion.prompt &&
      q.reference === originalQuestion.reference
  );
  if (sameRefDifferentId) {
    return { ...sameRefDifferentId, id: recId, hint: '' };
  }

  const sameTopicDifferentId = all.find(
    (q) =>
      q.id !== originalQuestion.id &&
      q.prompt !== originalQuestion.prompt &&
      q.topic &&
      q.topic === originalQuestion.topic
  );
  if (sameTopicDifferentId) {
    return { ...sameTopicDifferentId, id: recId, hint: '' };
  }

  // Último recurso seguro: reforma em Verdadeiro/Falso baseada na explicação
  return {
    id: recId,
    kind: 'true-false',
    prompt: `De acordo com ${originalQuestion.reference}, isto é verdadeiro: ${originalQuestion.explanation}`,
    reference: originalQuestion.reference,
    answers: ['true'],
    explanation: originalQuestion.explanation,
    hint: '',
    topic: originalQuestion.topic,
    difficulty: 'easy',
  };
}

/**
 * Converte leitura validada na questão de repescagem correspondente.
 * Se já estiver em 'recovery_question', devolve exatamente a mesma questão (anti-roletagem).
 */
export function activateRecoveryQuestion(
  chapterVerses?: Array<{ num: number; text: string }>
): ActiveLessonSession | null {
  const session = loadActiveLessonSession();
  if (!session || !session.recovery) return null;

  if (session.recovery.status === 'recovery_question' && session.recovery.recoveryQuestion) {
    return session;
  }

  if (session.recovery.status !== 'reading_validated') {
    return null;
  }

  const original = session.questions.find((q) => q.id === session.recovery?.questionId);
  if (!original) return null;

  const recoveryQuestion = buildRecoveryQuestion(original, chapterVerses);
  const updated: ActiveLessonSession = {
    ...session,
    recovery: {
      ...session.recovery,
      status: 'recovery_question',
      recoveryQuestion,
      updatedAt: Date.now(),
    },
  };

  saveActiveLessonSession(updated);
  return updated;
}

/**
 * Resolve atomicamente e de forma idempotente o resultado da questão de repescagem.
 * Garante o teto de MAX_RECOVERIES_PER_LESSON e nunca altera o histórico da questão original.
 */
export function resolveRecoveryAnswer(isCorrect: boolean): {
  session: ActiveLessonSession;
  isCorrect: boolean;
  lifeAwarded: boolean;
} | null {
  const session = loadActiveLessonSession();
  if (!session || !session.recovery) return null;

  const rec = session.recovery;
  if (rec.status !== 'recovery_question') return null;
  if (rec.lifeAwarded) return null;
  if (session.recoveryAttemptedQuestionIds.includes(rec.questionId)) return null;
  if (session.recoveryAttemptsUsed >= REWARD_RULES.MAX_RECOVERIES_PER_LESSON) return null;

  const awardLife =
    isCorrect && session.state.lives < REWARD_RULES.MAX_SESSION_HEARTS;

  const nextLives = awardLife
    ? Math.min(REWARD_RULES.MAX_SESSION_HEARTS, session.state.lives + 1)
    : session.state.lives;

  const updated: ActiveLessonSession = {
    ...session,
    recoveryAttemptsUsed: session.recoveryAttemptsUsed + 1,
    recoveryAttemptedQuestionIds: [...session.recoveryAttemptedQuestionIds, rec.questionId],
    state: {
      ...session.state,
      lives: nextLives,
      // A questão original mantém intacto answersLog, correct, score, xp e talentos
      status: 'reading_recovery',
    },
    recovery: {
      ...rec,
      status: isCorrect ? 'recovered' : 'failed',
      lifeAwarded: awardLife,
      updatedAt: Date.now(),
    },
  };

  saveActiveLessonSession(updated);
  return { session: updated, isCorrect, lifeAwarded: awardLife };
}

/**
 * Conclui o painel de feedback da repescagem, retornando a sessão para continuar a lição.
 */
export function clearResolvedRecoveryState(): ActiveLessonSession | null {
  const session = loadActiveLessonSession();
  if (!session) return null;

  const updated: ActiveLessonSession = {
    ...session,
    recovery: null,
  };
  saveActiveLessonSession(updated);
  return updated;
}
