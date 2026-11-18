/**
 * BiblIA — Exercício de Múltipla Escolha (com embaralhamento aleatório Fisher-Yates)
 * Elimina o vício da resposta correta na alínea 'A'
 */

import React, { useMemo } from 'react';
import type { GameQuestion } from '../../../types/gameContracts';
import { shuffleArray } from '../../../lib/gameSession';

interface MultipleChoiceExerciseProps {
  question: GameQuestion;
  isAnswered: boolean;
  selectedOption: string | null;
  onSelectOption: (option: string, isCorrect: boolean) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const MultipleChoiceExercise: React.FC<MultipleChoiceExerciseProps> = ({
  question,
  isAnswered,
  selectedOption,
  onSelectOption,
}) => {
  // Embaralhamento determinístico por questão
  const shuffledOptions = useMemo(() => {
    if (!question.options || question.options.length === 0) return [];
    return shuffleArray(question.options);
  }, [question.id]);

  const correctAnswer = question.answers[0];

  return (
    <div className="w-full space-y-4">
      {/* Enunciado */}
      <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 border border-slate-200/80 dark:border-white/10 shadow-soft">
        <span className="text-[10px] uppercase font-bold tracking-wider text-sacred-brand dark:text-sacred-neon block mb-1">
          {question.topic || 'Conhecimento Bíblico'} • {question.reference}
        </span>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
          {question.prompt}
        </h3>
      </div>

      {/* Lista de Alternativas */}
      <div className="grid grid-cols-1 gap-2.5">
        {shuffledOptions.map((option, idx) => {
          const letter = OPTION_LETTERS[idx] || String(idx + 1);
          const isSelected = selectedOption === option;
          const isCorrect = option === correctAnswer;

          let cardClasses =
            'w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 shadow-sm active:scale-[0.99] ';

          if (!isAnswered) {
            cardClasses += isSelected
              ? 'border-sacred-brand bg-sacred-light/60 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon font-bold'
              : 'border-slate-200/90 dark:border-white/10 bg-white dark:bg-surface-dark hover:border-sacred-brand/50 text-slate-800 dark:text-slate-200';
          } else if (isCorrect) {
            cardClasses +=
              'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold';
          } else if (isSelected && !isCorrect) {
            cardClasses +=
              'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
          } else {
            cardClasses +=
              'border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-surface-dark/50 text-slate-400 opacity-60';
          }

          return (
            <button
              key={`${question.id}-${idx}-${option}`}
              onClick={() => {
                if (!isAnswered) {
                  onSelectOption(option, isCorrect);
                }
              }}
              disabled={isAnswered}
              className={cardClasses}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`size-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                    isAnswered && isCorrect
                      ? 'bg-emerald-500 text-white'
                      : isAnswered && isSelected && !isCorrect
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {letter}
                </span>
                <span className="text-xs sm:text-sm font-semibold">{option}</span>
              </div>

              {isAnswered && isCorrect && (
                <span className="material-symbols-outlined text-emerald-500 text-xl shrink-0">
                  check_circle
                </span>
              )}
              {isAnswered && isSelected && !isCorrect && (
                <span className="material-symbols-outlined text-rose-500 text-xl shrink-0">
                  cancel
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
