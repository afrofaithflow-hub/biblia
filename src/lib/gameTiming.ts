import type { GameQuestion } from '../types/gameContracts';

/**
 * Tempos por tipo e dificuldade. São limites para foco, não um teste de
 * velocidade: lacunas recebem mais tempo e uma dica nunca reduz o relógio.
 */
const TIME_LIMITS: Record<GameQuestion['kind'], Record<NonNullable<GameQuestion['difficulty']>, number>> = {
  'multiple-choice': { easy: 22, medium: 28, hard: 34 },
  'true-false': { easy: 15, medium: 19, hard: 24 },
  'fill-blanks': { easy: 32, medium: 40, hard: 50 },
};

export function getQuestionTimeLimit(question: GameQuestion): number {
  return TIME_LIMITS[question.kind][question.difficulty || 'medium'];
}

export function formatGameTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}
