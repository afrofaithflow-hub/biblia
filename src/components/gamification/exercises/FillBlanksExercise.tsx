/**
 * BiblIA — Exercício de Completar Versículo (Memorização Sagrada)
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { GameQuestion } from '../../../types/gameContracts';
import { gameSfx } from '../../../lib/gameSoundEffects';
import { shuffleArray } from '../../../lib/gameSession';

interface FillBlanksExerciseProps {
  question: GameQuestion;
  isAnswered: boolean;
  onVerify: (answers: string[], isCorrect: boolean) => void;
}

export const FillBlanksExercise: React.FC<FillBlanksExerciseProps> = ({
  question,
  isAnswered,
  onVerify,
}) => {
  const numBlanks = question.answers.length || 2;
  const [placedWords, setPlacedWords] = useState<(string | null)[]>(new Array(numBlanks).fill(null));
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);

  useEffect(() => {
    setPlacedWords(new Array(numBlanks).fill(null));
    setActiveSlotIdx(0);
  }, [question.id, numBlanks]);

  const promptParts = question.prompt.split('___');
  // Nunca expor a sequência correta no banco de palavras: cada questão recebe
  // uma disposição aleatória estável durante a tentativa inteira.
  const options = useMemo(
    () => shuffleArray(question.options || []),
    [question.id]
  );

  const handleSelectWord = (word: string) => {
    if (isAnswered) return;
    gameSfx.play('tap');

    // Procura o próximo slot vazio a partir do activeSlotIdx
    const nextEmpty = placedWords.findIndex((w, i) => i >= activeSlotIdx && w === null);
    const targetIdx = nextEmpty !== -1 ? nextEmpty : placedWords.findIndex((w) => w === null);

    if (targetIdx !== -1) {
      const updated = [...placedWords];
      updated[targetIdx] = word;
      setPlacedWords(updated);

      const nextSlot = updated.findIndex((w) => w === null);
      if (nextSlot !== -1) setActiveSlotIdx(nextSlot);
    }
  };

  const handleRemoveWord = (slotIdx: number) => {
    if (isAnswered) return;
    gameSfx.play('tap');
    const updated = [...placedWords];
    updated[slotIdx] = null;
    setPlacedWords(updated);
    setActiveSlotIdx(slotIdx);
  };

  const handleConfirm = () => {
    if (placedWords.some((w) => w === null)) return;
    const submitted = placedWords.map((w) => (w ? w.toLowerCase() : ''));
    const isCorrect = submitted.every(
      (ans, i) => ans === question.answers[i]?.toLowerCase()
    );
    onVerify(submitted, isCorrect);
  };

  const isReadyToVerify = !placedWords.some((w) => w === null);

  return (
    <div className="w-full space-y-4">
      {/* Texto do Versículo com Slots de Lacuna */}
      <div className="rounded-2xl bg-white dark:bg-surface-dark p-5 border border-slate-200/80 dark:border-white/10 shadow-soft">
        <span className="text-[10px] uppercase font-bold tracking-wider text-sacred-brand dark:text-sacred-neon block mb-2">
          Complete o Versículo • {question.reference}
        </span>

        <div className="text-base sm:text-lg font-serif leading-loose text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-1.5">
          {promptParts.map((part, idx) => (
            <React.Fragment key={idx}>
              <span>{part}</span>
              {idx < numBlanks && (
                <button
                  type="button"
                  onClick={() => handleRemoveWord(idx)}
                  disabled={isAnswered}
                  className={`inline-flex items-center justify-center min-w-[70px] px-2.5 py-1 rounded-xl border-2 text-xs font-sans font-bold transition-all ${
                    placedWords[idx]
                      ? isAnswered
                        ? placedWords[idx]?.toLowerCase() === question.answers[idx]?.toLowerCase()
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                        : 'border-sacred-brand bg-sacred-light text-sacred-brand dark:border-sacred-neon dark:bg-sacred-neon/20 dark:text-sacred-neon'
                      : activeSlotIdx === idx
                      ? 'border-dashed border-sacred-brand dark:border-sacred-neon bg-sacred-brand/5 dark:bg-sacred-neon/10 animate-pulse'
                      : 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  {placedWords[idx] || '_____'}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Banco de Palavras Disponíveis */}
      {!isAnswered && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200/60 dark:border-white/5 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Toque na palavra para preencher
          </span>

          <div className="flex flex-wrap gap-2">
            {options.map((word, wIdx) => {
              const countUsed = placedWords.filter((w) => w === word).length;
              const countInOptions = options.filter((w) => w === word).length;
              const isUsed = countUsed >= countInOptions;

              return (
                <button
                  key={`${word}-${wIdx}`}
                  type="button"
                  onClick={() => handleSelectWord(word)}
                  disabled={isUsed || isAnswered}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    isUsed
                      ? 'border-transparent bg-slate-200/50 dark:bg-slate-800 text-slate-400 opacity-40 cursor-not-allowed'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark hover:border-sacred-brand text-slate-800 dark:text-slate-100 shadow-sm'
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>

          {/* Botão de Verificação das Lacunas */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isReadyToVerify}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                isReadyToVerify
                  ? 'bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 hover:brightness-110 active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-sm">check</span>
              <span>Verificar Lacunas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
