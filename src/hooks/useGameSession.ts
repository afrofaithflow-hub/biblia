import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GameMode,
  GameQuestion,
  RecoverySession,
  REWARD_RULES,
} from '../types/gameContracts';
import {
  addToReviewQueue,
  checkGameAnswer,
  clearRequestedGameMode,
  consumeGameMode,
  createInitialGameState,
  finalizeGame,
  GameSessionState,
  questionBankForMode,
  resolveReviewItemResult,
} from '../lib/gameSession';
import {
  ActiveLessonSession,
  activateRecoveryQuestion,
  canStartRecoveryForQuestion,
  clearActiveLessonSession,
  clearResolvedRecoveryState,
  getEligibleRecoveryQuestions,
  loadActiveLessonSession,
  resolveRecoveryAnswer,
  saveActiveLessonSession,
  startReadingRecovery,
} from '../lib/gameRecovery';

function initActiveSession(defaultMode: GameMode): ActiveLessonSession {
  const { mode: requestedMode, phaseId: requestedPhaseId } = consumeGameMode(defaultMode);
  const existing = loadActiveLessonSession();

  // Hidrata sessão existente se ainda está ativa/em recuperação e corresponde à rota atual
  // (ou se existe uma recuperação ativa vinda do leitor bíblico).
  if (
    existing &&
    existing.state.status !== 'completed' &&
    existing.state.status !== 'failed'
  ) {
    const hasActiveRecovery = Boolean(existing.recovery);
    const sameTarget =
      existing.mode === requestedMode &&
      (existing.phaseId || '') === (requestedPhaseId || '');

    if (hasActiveRecovery || sameTarget) {
      return existing;
    }
  }

  const questions = questionBankForMode(requestedMode, requestedPhaseId);
  const fresh: ActiveLessonSession = {
    attemptId: '',
    mode: requestedMode,
    phaseId: requestedPhaseId,
    questions,
    state: createInitialGameState(requestedPhaseId),
    recoveryAttemptsUsed: 0,
    recoveryAttemptedQuestionIds: [],
    recovery: null,
    savedAt: Date.now(),
  };
  fresh.attemptId = fresh.state.attemptId;
  saveActiveLessonSession(fresh);
  return fresh;
}

export function useGameSession(defaultMode: GameMode) {
  const initialSession = useMemo(() => initActiveSession(defaultMode), [defaultMode]);

  const [mode] = useState<GameMode>(initialSession.mode);
  const [phaseId] = useState<string | undefined>(initialSession.phaseId);
  const [questions] = useState<GameQuestion[]>(initialSession.questions);
  const [state, setState] = useState<GameSessionState>(initialSession.state);
  const [recoveryAttemptsUsed, setRecoveryAttemptsUsed] = useState<number>(
    initialSession.recoveryAttemptsUsed
  );
  const [recoveryAttemptedQuestionIds, setRecoveryAttemptedQuestionIds] = useState<string[]>(
    initialSession.recoveryAttemptedQuestionIds
  );
  const [recovery, setRecovery] = useState<RecoverySession | null>(initialSession.recovery);

  const lastSubmitTimeRef = useRef<number>(0);
  const question = questions[state.questionIndex];

  // Se voltou do BibleReader com leitura validada na Camada A, ativa automaticamente a questão de repescagem
  useEffect(() => {
    if (recovery?.status === 'reading_validated') {
      const activated = activateRecoveryQuestion();
      if (activated) {
        setState(activated.state);
        setRecovery(activated.recovery);
      }
    }
  }, [recovery?.status]);

  const buildSnapshot = useCallback(
    (
      nextState: GameSessionState,
      nextRecovery: RecoverySession | null = recovery,
      nextAttemptsUsed = recoveryAttemptsUsed,
      nextAttemptedIds = recoveryAttemptedQuestionIds
    ): ActiveLessonSession => ({
      attemptId: nextState.attemptId,
      mode,
      phaseId,
      questions,
      state: nextState,
      recoveryAttemptsUsed: nextAttemptsUsed,
      recoveryAttemptedQuestionIds: nextAttemptedIds,
      recovery: nextRecovery,
      savedAt: Date.now(),
    }),
    [mode, phaseId, questions, recovery, recoveryAttemptsUsed, recoveryAttemptedQuestionIds]
  );

  /** Ativa dica contextual honesta (G0/G1) */
  const useHint = useCallback(() => {
    if (state.status !== 'playing' || state.usedHintOnCurrentQuestion) return null;
    const nextState: GameSessionState = {
      ...state,
      usedHintOnCurrentQuestion: true,
    };
    setState(nextState);
    saveActiveLessonSession(buildSnapshot(nextState));
    return question?.hint || question?.reference || 'Consulte o texto sagrado.';
  }, [buildSnapshot, question, state]);

  /** Submete resposta idempotente com regras canônicas de recompensa */
  const submit = useCallback(
    (answer: string | string[]) => {
      if (state.status !== 'playing' || !question) return;

      // Proteção de cadência humana e antiabuso (G6)
      const now = Date.now();
      if (now - lastSubmitTimeRef.current < 250) return;
      lastSubmitTimeRef.current = now;

      const isCorrect = checkGameAnswer(question, answer);
      const usedHint = state.usedHintOnCurrentQuestion;

      let earnedXpDelta = 0;
      let earnedTalentsDelta = 0;

      if (mode === 'review') {
        resolveReviewItemResult(question.id, isCorrect);
        if (isCorrect) {
          earnedXpDelta = REWARD_RULES.SPACED_REVIEW_CORRECT_XP;
          earnedTalentsDelta = REWARD_RULES.SPACED_REVIEW_CORRECT_TALENTS;
        }
      } else if (isCorrect) {
        if (usedHint) {
          earnedXpDelta = REWARD_RULES.CORRECT_WITH_HINT_XP;
          earnedTalentsDelta = REWARD_RULES.CORRECT_WITH_HINT_TALENTS;
        } else {
          earnedXpDelta = REWARD_RULES.CORRECT_NO_HINT_XP;
          earnedTalentsDelta = REWARD_RULES.CORRECT_NO_HINT_TALENTS;
        }
      } else {
        addToReviewQueue({
          questionId: question.id,
          phaseId,
          prompt: question.prompt,
          reference: question.reference,
          topic: question.topic || 'Geral',
          failedCount: 1,
          intervalDays: 1,
          nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const nextState: GameSessionState = {
        ...state,
        lives: isCorrect ? state.lives : Math.max(0, state.lives - 1),
        correct: isCorrect ? state.correct + 1 : state.correct,
        score: isCorrect ? state.score + (usedHint ? 6 : 10) : state.score,
        earnedXp: state.earnedXp + earnedXpDelta,
        earnedTalents: state.earnedTalents + earnedTalentsDelta,
        status: 'answered',
        wasCorrect: isCorrect,
        answersLog: [
          ...state.answersLog,
          {
            questionId: question.id,
            isCorrect,
            usedHint,
          },
        ],
      };

      setState(nextState);
      saveActiveLessonSession(buildSnapshot(nextState));
    },
    [buildSnapshot, mode, phaseId, question, state]
  );

  /** O tempo conta como tentativa errada, para preservar as mesmas regras de coração e revisão. */
  const submitTimeout = useCallback(() => {
    submit([]);
  }, [submit]);

  /** Inicia fluxo Ler -> Compreender -> Recuperar para uma questão errada */
  const beginReadingRecovery = useCallback(
    (targetQuestion: GameQuestion) => {
      const snapshot = buildSnapshot(state);
      const started = startReadingRecovery(snapshot, targetQuestion);
      if (!started) return false;
      setState(started.state);
      setRecovery(started.recovery);
      return true;
    },
    [buildSnapshot, state]
  );

  /** Resolve atomicamente a resposta na questão de repescagem */
  const completeRecoveryAnswer = useCallback((isCorrect: boolean) => {
    const resolved = resolveRecoveryAnswer(isCorrect);
    if (!resolved) return null;
    setState(resolved.session.state);
    setRecovery(resolved.session.recovery);
    setRecoveryAttemptsUsed(resolved.session.recoveryAttemptsUsed);
    setRecoveryAttemptedQuestionIds(resolved.session.recoveryAttemptedQuestionIds);
    return resolved;
  }, []);

  /** Finaliza o feedback da repescagem e continua ou encerra a lição */
  const dismissRecoveryFeedback = useCallback((): 'playing' | 'paused_zero_lives' | 'completed' | 'failed' => {
    const cleared = clearResolvedRecoveryState();
    const latestState = cleared?.state || state;
    const latestUsed = cleared?.recoveryAttemptsUsed ?? recoveryAttemptsUsed;
    const latestAttemptedIds = cleared?.recoveryAttemptedQuestionIds ?? recoveryAttemptedQuestionIds;
    setRecovery(null);

    const remainingEligible = getEligibleRecoveryQuestions(
      cleared || buildSnapshot(latestState, null, latestUsed, latestAttemptedIds)
    );

    if (latestState.lives <= 0) {
      if (
        latestUsed < REWARD_RULES.MAX_RECOVERIES_PER_LESSON &&
        remainingEligible.length > 0
      ) {
        const pausedState: GameSessionState = {
          ...latestState,
          status: 'reading_recovery',
        };
        setState(pausedState);
        saveActiveLessonSession(
          buildSnapshot(pausedState, null, latestUsed, latestAttemptedIds)
        );
        return 'paused_zero_lives';
      }

      const failedState: GameSessionState = { ...latestState, status: 'failed' };
      setState(failedState);
      finalizeGame(mode, failedState, questions.length, phaseId, questions);
      clearActiveLessonSession();
      return 'failed';
    }

    if (latestState.questionIndex >= questions.length - 1) {
      const completedState: GameSessionState = { ...latestState, status: 'completed' };
      setState(completedState);
      finalizeGame(mode, completedState, questions.length, phaseId, questions);
      clearActiveLessonSession();
      return 'completed';
    }

    const nextQuestionState: GameSessionState = {
      ...latestState,
      questionIndex: latestState.questionIndex + 1,
      status: 'playing',
      wasCorrect: null,
      usedHintOnCurrentQuestion: false,
    };
    setState(nextQuestionState);
    saveActiveLessonSession(
      buildSnapshot(nextQuestionState, null, latestUsed, latestAttemptedIds)
    );
    return 'playing';
  }, [
    buildSnapshot,
    mode,
    phaseId,
    questions,
    recoveryAttemptedQuestionIds,
    recoveryAttemptsUsed,
    state,
  ]);

  /** Encerra explicitamente por opção do jogador na tela de pausa a 0 vidas */
  const forfeitLessonNow = useCallback(() => {
    const failedState: GameSessionState = { ...state, status: 'failed' };
    setState(failedState);
    finalizeGame(mode, failedState, questions.length, phaseId, questions);
    clearActiveLessonSession();
  }, [mode, phaseId, questions, state]);

  /** Avança para a próxima questão ou finaliza / pausa a sessão */
  const advance = useCallback((): 'playing' | 'paused_zero_lives' | 'completed' | 'failed' => {
    if (state.status !== 'answered') return 'playing';

    const snapshot = buildSnapshot(state);
    const eligibleNow = getEligibleRecoveryQuestions(snapshot);

    if (state.lives <= 0) {
      if (
        recoveryAttemptsUsed < REWARD_RULES.MAX_RECOVERIES_PER_LESSON &&
        eligibleNow.length > 0
      ) {
        const pausedState: GameSessionState = {
          ...state,
          status: 'reading_recovery',
        };
        setState(pausedState);
        saveActiveLessonSession(buildSnapshot(pausedState));
        return 'paused_zero_lives';
      }

      const failedState: GameSessionState = { ...state, status: 'failed' };
      setState(failedState);
      finalizeGame(mode, failedState, questions.length, phaseId, questions);
      clearActiveLessonSession();
      return 'failed';
    }

    if (state.questionIndex >= questions.length - 1) {
      const completedState: GameSessionState = { ...state, status: 'completed' };
      setState(completedState);
      finalizeGame(mode, completedState, questions.length, phaseId, questions);
      clearActiveLessonSession();
      return 'completed';
    }

    const nextState: GameSessionState = {
      ...state,
      questionIndex: state.questionIndex + 1,
      status: 'playing',
      wasCorrect: null,
      usedHintOnCurrentQuestion: false,
    };
    setState(nextState);
    saveActiveLessonSession(buildSnapshot(nextState));
    return 'playing';
  }, [buildSnapshot, mode, phaseId, questions, recoveryAttemptsUsed, state]);

  /** Mantém compatibilidade com telas legadas */
  const restoreHeartViaReading = useCallback(() => {
    if (question) {
      beginReadingRecovery(question);
    }
  }, [beginReadingRecovery, question]);

  const exitLessonCleanly = useCallback(() => {
    clearActiveLessonSession();
    clearRequestedGameMode();
  }, []);

  const currentSnapshot = useMemo(
    () => buildSnapshot(state),
    [buildSnapshot, state]
  );

  const canRecoverCurrentQuestion = useMemo(() => {
    if (!question) return false;
    return canStartRecoveryForQuestion(currentSnapshot, question.id, question.reference);
  }, [currentSnapshot, question]);

  const eligibleRecoveryQuestions = useMemo(
    () => getEligibleRecoveryQuestions(currentSnapshot),
    [currentSnapshot]
  );

  const isZeroLivesPaused =
    state.status === 'reading_recovery' &&
    !recovery &&
    state.lives <= 0 &&
    recoveryAttemptsUsed < REWARD_RULES.MAX_RECOVERIES_PER_LESSON &&
    eligibleRecoveryQuestions.length > 0;

  return {
    mode,
    phaseId,
    questions,
    question,
    state,
    recovery,
    recoveryAttemptsUsed,
    recoveryLimit: REWARD_RULES.MAX_RECOVERIES_PER_LESSON,
    canRecoverCurrentQuestion,
    eligibleRecoveryQuestions,
    isZeroLivesPaused,
    submit,
    submitTimeout,
    advance,
    useHint,
    restoreHeartViaReading,
    beginReadingRecovery,
    completeRecoveryAnswer,
    dismissRecoveryFeedback,
    forfeitLessonNow,
    exitLessonCleanly,
  };
}
