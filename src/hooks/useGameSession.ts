import { useCallback, useMemo, useRef, useState } from 'react';
import {
  GameMode,
  REWARD_RULES,
} from '../types/gameContracts';
import {
  addToReviewQueue,
  checkGameAnswer,
  consumeGameMode,
  createInitialGameState,
  finalizeGame,
  GameSessionState,
  questionBankForMode,
} from '../lib/gameSession';

export function useGameSession(defaultMode: GameMode) {
  const { mode, phaseId } = useMemo(() => consumeGameMode(defaultMode), [defaultMode]);
  const questions = useMemo(() => questionBankForMode(mode, phaseId), [mode, phaseId]);
  const [state, setState] = useState<GameSessionState>(() => createInitialGameState(phaseId));
  const question = questions[state.questionIndex];
  const lastSubmitTimeRef = useRef<number>(0);

  /** Ativa dica contextual honesta (G0/G1) */
  const useHint = useCallback(() => {
    if (state.status !== 'playing' || state.usedHintOnCurrentQuestion) return null;
    setState((current) => ({
      ...current,
      usedHintOnCurrentQuestion: true,
    }));
    return question?.hint || question?.reference || 'Consulte o texto sagrado.';
  }, [question, state.status, state.usedHintOnCurrentQuestion]);

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

      // Recompensas conforme G0 (REWARD_RULES)
      let earnedXpDelta = 0;
      let earnedTalentsDelta = 0;

      if (isCorrect) {
        if (usedHint) {
          earnedXpDelta = REWARD_RULES.CORRECT_WITH_HINT_XP;
          earnedTalentsDelta = REWARD_RULES.CORRECT_WITH_HINT_TALENTS;
        } else {
          earnedXpDelta = REWARD_RULES.CORRECT_NO_HINT_XP;
          earnedTalentsDelta = REWARD_RULES.CORRECT_NO_HINT_TALENTS;
        }
      } else {
        // Envia para a fila de revisão espaçada com intervalo de 1 dia (G0)
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

      setState((current) => ({
        ...current,
        lives: isCorrect ? current.lives : Math.max(0, current.lives - 1),
        correct: isCorrect ? current.correct + 1 : current.correct,
        score: isCorrect ? current.score + (usedHint ? 6 : 10) : current.score,
        earnedXp: current.earnedXp + earnedXpDelta,
        earnedTalents: current.earnedTalents + earnedTalentsDelta,
        status: 'answered',
        wasCorrect: isCorrect,
        answersLog: [
          ...current.answersLog,
          {
            questionId: question.id,
            isCorrect,
            usedHint,
          },
        ],
      }));
    },
    [phaseId, question, state.status, state.usedHintOnCurrentQuestion]
  );

  /** O tempo conta como tentativa errada, para preservar as mesmas regras de coração e revisão. */
  const submitTimeout = useCallback(() => {
    submit([]);
  }, [submit]);

  /** Restaura coração pedagógico através da leitura ("Ler para Recuperar") */
  const restoreHeartViaReading = useCallback(() => {
    setState((current) => ({
      ...current,
      lives: Math.min(REWARD_RULES.MAX_SESSION_HEARTS, current.lives + 1),
      status: 'playing',
      wasCorrect: null,
      usedHintOnCurrentQuestion: false,
    }));
  }, []);

  /** Avança para a próxima questão ou finaliza a sessão */
  const advance = useCallback(() => {
    if (state.status !== 'answered') return 'playing' as const;

    if (state.lives <= 0) {
      const failedState = { ...state, status: 'failed' as const };
      setState(failedState);
      finalizeGame(mode, failedState, questions.length, phaseId);
      return 'failed' as const;
    }

    if (state.questionIndex >= questions.length - 1) {
      const completedState = { ...state, status: 'completed' as const };
      setState(completedState);
      finalizeGame(mode, completedState, questions.length, phaseId);
      return 'completed' as const;
    }

    setState((current) => ({
      ...current,
      questionIndex: current.questionIndex + 1,
      status: 'playing',
      wasCorrect: null,
      usedHintOnCurrentQuestion: false,
    }));
    return 'playing' as const;
  }, [mode, phaseId, questions.length, state]);

  return {
    mode,
    phaseId,
    questions,
    question,
    state,
    submit,
    submitTimeout,
    advance,
    useHint,
    restoreHeartViaReading,
  };
}
