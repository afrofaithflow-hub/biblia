/**
 * BiblIA — Exercício de Verdadeiro ou Falso (Discernimento Bíblico)
 */

import React from 'react';
import type { GameQuestion } from '../../../types/gameContracts';

interface TrueFalseExerciseProps {
  question: GameQuestion;
  isAnswered: boolean;
  selectedAnswer: string | null;
  onSelectAnswer: (value: 'true' | 'false', isCorrect: boolean) => void;
}

export const TrueFalseExercise: React.FC<TrueFalseExerciseProps> = ({
  question,
  isAnswered,
  selectedAnswer,
  onSelectAnswer,
}) => {
  const correctAnswer = question.answers[0].toLowerCase();

  const handleChoice = (choice: 'true' | 'false') => {
    if (isAnswered) return;
    const isCorrect = choice === correctAnswer;
    onSelectAnswer(choice, isCorrect);
  };

  return (
    <div className="w-full space-y-4">
      {/* Enunciado da Afirmação */}
      <div className="rounded-2xl bg-white dark:bg-surface-dark p-6 border border-slate-200/80 dark:border-white/10 shadow-soft text-center space-y-3">
        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sacred-brand/10 dark:bg-sacred-neon/10 text-sacred-brand dark:text-sacred-neon">
          Avalie a Afirmação • {question.reference}
        </span>

        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
          "{question.prompt}"
        </p>
      </div>

      {/* Botões Verdadeiro e Falso */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {/* Botão VERDADEIRO */}
        <button
          onClick={() => handleChoice('true')}
          disabled={isAnswered}
          className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-sm ${
            !isAnswered
              ? selectedAnswer === 'true'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark hover:border-emerald-500/50 text-slate-800 dark:text-slate-200'
              : correctAnswer === 'true'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold'
              : selectedAnswer === 'true' && correctAnswer !== 'true'
              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
              : 'border-slate-200/50 dark:border-white/5 opacity-40'
          }`}
        >
          <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl font-bold">check</span>
          </div>
          <span className="text-sm font-extrabold uppercase tracking-wide">Verdadeiro</span>
        </button>

        {/* Botão FALSO */}
        <button
          onClick={() => handleChoice('false')}
          disabled={isAnswered}
          className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-sm ${
            !isAnswered
              ? selectedAnswer === 'false'
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark hover:border-rose-500/50 text-slate-800 dark:text-slate-200'
              : correctAnswer === 'false'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold'
              : selectedAnswer === 'false' && correctAnswer !== 'false'
              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
              : 'border-slate-200/50 dark:border-white/5 opacity-40'
          }`}
        >
          <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl font-bold">close</span>
          </div>
          <span className="text-sm font-extrabold uppercase tracking-wide">Falso</span>
        </button>
      </div>
    </div>
  );
};
