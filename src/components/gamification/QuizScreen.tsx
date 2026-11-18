import React, { useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../../lib/audioEngine';
import { useGameSession } from '../../hooks/useGameSession';
import { gameSfx } from '../../lib/gameSoundEffects';
import { shuffleArray } from '../../lib/gameSession';

interface QuizScreenProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ onNavigate, showToast }) => {
  const [countdown, setCountdown] = useState(12);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isReadingAudio, setIsReadingAudio] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [isSfxMuted, setIsSfxMuted] = useState(gameSfx.getMuted());

  const { questions, question, state, submit, advance, useHint, restoreHeartViaReading } =
    useGameSession('quiz');

  if (!question) return null;

  // Embaralha as opções quando a questão muda para eliminar o vício da alínea A
  const options = useMemo(() => {
    if (!question?.options || question.options.length === 0) return [];
    return shuffleArray(question.options);
  }, [question?.id, state.questionIndex]);

  const isAnswered = state.status === 'answered';
  const correctIdx = options.findIndex((o) => o === question.answers[0]);
  const currentNum = state.questionIndex + 1;

  // ── Countdown timer ──
  useEffect(() => {
    setCountdown(12);
    setHintText(null);
    if (state.status !== 'playing') return;

    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          submit('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.questionIndex, state.status, submit]);

  const readQuestion = async () => {
    setIsReadingAudio(true);
    try {
      await audioEngine.speakText(
        `${question.prompt}. ${question.reference}. Opções: ${options.join(', ')}.`
      );
    } finally {
      setIsReadingAudio(false);
    }
  };

  const handleHint = () => {
    const text = useHint();
    if (text) {
      setHintText(text);
      showToast('Dica ativada — a questão ficará marcada como aprendida com ajuda.', 'lightbulb');
    }
  };

  const continueRound = () => {
    setSelectedIdx(null);
    const result = advance();
    if (result === 'completed') onNavigate('screen-recompensa');
    if (result === 'failed') onNavigate('screen-resumo-licao');
  };

  const handleSelectOption = (index: number, option: string) => {
    if (isAnswered) return;
    setSelectedIdx(index);
    const isCorrect = index === correctIdx;
    if (isCorrect) {
      gameSfx.play('correct');
    } else {
      gameSfx.play('wrong');
    }
    submit(option);
  };

  const handleReadToRecover = () => {
    gameSfx.play('heart_recovered');
    restoreHeartViaReading();
    onNavigate('screen-biblia');
    showToast('Leia a passagem para recuperar um coração e retomar!', 'menu_book');
  };

  const timerDashOffset = ((12 - countdown) / 12) * 113;

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-bg-canvas font-display text-slate-800 transition-colors dark:bg-dark-canvas dark:text-slate-100">
      {/* ── Header ── */}
      <header className="relative z-10 flex flex-col gap-3 px-5 pb-2 pt-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => onNavigate('screen-game-dashboard')}
            className="flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Sair do jogo"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          {/* Progress bar */}
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-sacred-brand transition-all dark:bg-sacred-neon"
              style={{ width: `${(currentNum / questions.length) * 100}%` }}
            />
            <div className="absolute inset-0 flex pointer-events-none">
              {questions.map((item, index) => (
                <div
                  key={item.id}
                  className={index < questions.length - 1 ? 'flex-1 border-r border-white/50 dark:border-dark-canvas/50' : 'flex-1'}
                />
              ))}
            </div>
          </div>

          {/* Lives & Sound Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const muted = gameSfx.toggleMute();
                setIsSfxMuted(muted);
                showToast(muted ? 'Sons desativados' : 'Sons ativados', muted ? 'volume_off' : 'volume_up');
              }}
              className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              title={isSfxMuted ? 'Ativar sons' : 'Desativar sons'}
            >
              <span className="material-symbols-outlined text-[17px]">
                {isSfxMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>

            <div className="flex items-center gap-1.5 rounded-full border border-rose-100 bg-white px-3 py-1 dark:border-rose-900 dark:bg-surface-dark">
              <span className="material-symbols-outlined text-[18px] text-rose-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{state.lives}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] font-bold">
          <span className="uppercase tracking-wider text-slate-400">
            Pergunta {currentNum} de {questions.length}
          </span>
          <span className="rounded-full bg-sacred-brand/10 px-2.5 py-0.5 text-sacred-brand dark:bg-sacred-neon/15 dark:text-sacred-neon">
            {question.reference}
          </span>
        </div>
      </header>

      {/* ── Main scrollable body ── */}
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto px-5 pb-36 pt-2 no-scrollbar">
        {/* Timer + Question */}
        <section className="mb-6 flex flex-col items-center">
          <div className="relative mb-4 flex size-16 items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 40 40" aria-label={`${countdown} segundos restantes`}>
              <circle className="text-slate-200 dark:text-slate-800" cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" />
              <circle
                className={`${countdown <= 4 ? 'text-rose-500' : 'text-gold-radiant'} transition-all duration-1000`}
                cx="20" cy="20" r="18" fill="transparent" stroke="currentColor"
                strokeDasharray="113" strokeDashoffset={timerDashOffset} strokeLinecap="round" strokeWidth="3"
              />
            </svg>
            <span className={`absolute text-base font-bold ${countdown <= 4 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
              {countdown}<small className="ml-0.5 text-[8px]">s</small>
            </span>
          </div>

          <div className="flex items-start gap-2 w-full">
            <h1 className="flex-1 text-center text-xl font-black leading-tight text-slate-900 dark:text-white md:text-2xl">
              {question.prompt}
            </h1>
            <button
              onClick={readQuestion}
              className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${isReadingAudio ? 'animate-pulse bg-sacred-brand text-white' : 'border-slate-200 bg-white text-sacred-brand dark:border-slate-700 dark:bg-surface-dark dark:text-sacred-neon'}`}
              title="Ouvir pergunta"
            >
              <span className="material-symbols-outlined text-[18px]">{isReadingAudio ? 'volume_up' : 'headphones'}</span>
            </button>
          </div>

          {/* Hint display */}
          {hintText && (
            <div className="mt-3 w-full rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 px-3.5 py-2.5 flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-500 text-lg shrink-0">lightbulb</span>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed">{hintText}</p>
            </div>
          )}

          {/* Hint button (only before answering) */}
          {!isAnswered && !hintText && !state.usedHintOnCurrentQuestion && (
            <button
              onClick={handleHint}
              className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-500 transition-colors font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">lightbulb</span>
              Pedir dica (marca como aprendida com ajuda)
            </button>
          )}

          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Escolha a resposta correta com base na passagem indicada.
          </p>
        </section>

        {/* Answer options */}
        <div className="flex w-full flex-col gap-2.5">
          {options.map((option, index) => {
            const isSelected = selectedIdx === index;
            const isCorrect = index === correctIdx;
            let classes =
              'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-surface-dark dark:text-slate-200';
            if (isAnswered && isCorrect)
              classes = 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200';
            else if (isAnswered && isSelected)
              classes = 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200';
            else if (isAnswered)
              classes = 'border-slate-200 bg-white text-slate-400 opacity-50 dark:border-slate-800 dark:bg-surface-dark dark:text-slate-600';
            return (
              <button
                key={option}
                disabled={isAnswered}
                onClick={() => handleSelectOption(index, option)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left shadow-sm transition-all active:scale-[0.99] ${classes}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold dark:bg-slate-800">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 text-base font-semibold">{option}</span>
                {isAnswered && isCorrect && (
                  <span className="material-symbols-outlined text-2xl text-emerald-500">check_circle</span>
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <span className="material-symbols-outlined text-2xl text-rose-500">cancel</span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* ── Feedback Drawer ── */}
      {isAnswered && (
        <div className="absolute inset-x-0 bottom-0 z-20 animate-slide-up border-t border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-surface-dark/95">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <div>
              <p className={`font-bold ${state.wasCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                {state.wasCorrect ? '✓ Correto!' : '✗ Vamos aprender'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {state.wasCorrect
                  ? question.explanation
                  : `${question.explanation} (${question.reference})`}
              </p>
              {!state.wasCorrect && (
                <p className="mt-1 text-[11px] text-indigo-500 dark:text-indigo-400">
                  Passagem adicionada à fila de revisão espaçada.
                </p>
              )}
            </div>

            {/* Zero lives: "Ler para Recuperar" */}
            {state.lives === 0 ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleReadToRecover}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-base font-bold text-white"
                >
                  <span className="material-symbols-outlined text-xl">menu_book</span>
                  <span>Ler passagem para recuperar coração</span>
                </button>
                <button
                  onClick={continueRound}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-bold text-slate-500"
                >
                  Retomar mais tarde
                </button>
              </div>
            ) : (
              <button
                onClick={continueRound}
                className="btn-duo-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-white"
              >
                <span>{currentNum === questions.length ? 'Ver resultado' : 'Continuar'}</span>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
