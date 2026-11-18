import React, { useState } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { audioEngine } from '../../lib/audioEngine';
import { gameSfx } from '../../lib/gameSoundEffects';

interface GameTrueFalseProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const GameTrueFalse: React.FC<GameTrueFalseProps> = ({ onNavigate, showToast }) => {
  const [showHint, setShowHint] = useState(false);
  const [isReadingAudio, setIsReadingAudio] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(gameSfx.getMuted());
  const { questions, question, state, submit, advance, useHint, restoreHeartViaReading } = useGameSession('true-false');
  const isAnswered = state.status === 'answered';
  const currentNum = state.questionIndex + 1;

  const handleAnswer = (value: boolean) => {
    if (isAnswered) return;
    submit(String(value));
    const isCorrect = question.answers[0] === String(value);
    if (isCorrect) {
      gameSfx.play('correct');
      showToast('Correto! Você tem discernimento.', 'check_circle');
    } else {
      gameSfx.play('wrong');
      showToast('Quase lá! Leia a explicação para aprender.', 'info');
    }
  };

  const handleReadAloud = async () => {
    try {
      setIsReadingAudio(true);
      await audioEngine.speakText(
        `Avalie esta afirmação: ${question.prompt}. Referência: ${question.reference}. É Verdadeiro ou Falso?`
      );
    } catch (err) {
      console.warn('TTS error:', err);
    } finally {
      setIsReadingAudio(false);
    }
  };

  const continueRound = () => {
    setShowHint(false);
    const result = advance();
    if (result === 'completed') {
      onNavigate('screen-recompensa');
    } else if (result === 'failed') {
      onNavigate('screen-resumo-licao');
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg-canvas font-display text-slate-800 transition-colors dark:bg-dark-canvas dark:text-slate-100">
      {/* Top Header */}
      <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="flex size-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          title="Sair do desafio"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <h2 className="text-sm font-bold tracking-tight">Verdadeiro ou Falso</h2>

        {/* Sound & Lives Counter */}
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

          <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1 shadow-sm dark:border-rose-900/50 dark:bg-surface-dark">
            <span className="material-symbols-outlined text-[18px] text-rose-500" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
            <span className="text-xs font-black text-rose-600 dark:text-rose-400">{state.lives}</span>
          </div>
        </div>
      </header>

      {/* Segmented Progress Bar */}
      <div className="shrink-0 px-6 py-2">
        <div className="mb-1.5 flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span>Pergunta {currentNum} de {questions.length}</span>
          <span className="text-sacred-brand dark:text-sacred-neon bg-sacred-brand/10 dark:bg-sacred-neon/15 px-2 py-0.5 rounded-full">
            {question.reference}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-sacred-brand dark:bg-sacred-neon transition-all duration-500 shadow-glow-teal"
            style={{ width: `${(currentNum / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-4 no-scrollbar max-w-lg mx-auto w-full">
        {/* 3D Mascot Avatar Peeking over the Card */}
        <div className="w-full flex justify-center -mb-8 z-20 relative">
          <div className="size-20 rounded-full border-4 border-white dark:border-surface-dark shadow-xl overflow-hidden bg-sacred-brand/10 dark:bg-sacred-neon/20 ring-2 ring-sacred-brand/20">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBN8YCRWbNqM0tcY-mw3S5S1XsaVmXZ9yiGVRY5l0bAjeHI47lfnV2RXCZyZP1LSdWShyShgzX1Szg6-e1N21f0v9oDyHovfDYCtdf4opWP5_SpyH9wFalrxszBqHAUNvA7QTI9zALhcJGIDuUrwJY0dq4gJlMqRYOTZQ35r2owBfQcvyPCkdNgRDDXeLZwVoKu6VyvX04sENkgzqvJ211BPW5bAItdARMi7NCbEVlpSPaF0hGq2cj2HQ2VYLXR_td7qMfT6prxJPU"
              alt="Mascote Bíblico"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="w-full bg-white dark:bg-surface-dark rounded-3xl shadow-xl p-6 pt-11 pb-7 flex flex-col items-center text-center relative border border-slate-200/80 dark:border-white/10">
          <div className="absolute top-4 right-4 text-slate-300 dark:text-slate-700 opacity-60">
            <span className="material-symbols-outlined text-3xl">format_quote</span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-sacred-brand dark:text-sacred-neon">
              Avalie esta afirmação
            </span>
            <button
              onClick={handleReadAloud}
              className={`size-6 rounded-full flex items-center justify-center transition-colors ${
                isReadingAudio
                  ? 'bg-sacred-brand text-white animate-pulse'
                  : 'text-slate-400 hover:text-sacred-brand'
              }`}
              title="Ouvir afirmação"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isReadingAudio ? 'volume_up' : 'headphones'}
              </span>
            </button>
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-snug mb-5 px-1 font-serif">
            "{question.prompt}"
          </h3>

          {/* Context/Hint Button */}
          <div className="w-full border-t border-slate-100 dark:border-white/10 pt-3">
            {showHint ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 p-3 text-left text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
                <strong className="mb-1 flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-sm text-amber-500">lightbulb</span>
                  Dica Pastoral
                  {state.usedHintOnCurrentQuestion && (
                    <span className="ml-auto text-[10px] font-normal text-amber-500 opacity-80">dica usada</span>
                  )}
                </strong>
                {question.hint}
              </div>
            ) : (
              <button
                onClick={() => { useHint(); setShowHint(true); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-sacred-brand/20 bg-sacred-brand/5 px-3.5 py-1.5 text-xs font-bold text-sacred-brand dark:text-sacred-neon hover:bg-sacred-brand/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">smart_toy</span>
                <span>Pedir dica à IA</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 3D Action Buttons (Falso vs Verdadeiro) */}
      <footer className="mx-auto grid w-full max-w-lg shrink-0 grid-cols-2 gap-4 px-5 pb-6 pt-2">
        {/* Falso Button */}
        <button
          disabled={isAnswered}
          onClick={() => handleAnswer(false)}
          className={`flex min-h-[68px] items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-4 text-lg font-bold transition-all active:translate-y-1 active:shadow-none shadow-[0_4px_0_#9f1239] disabled:opacity-70 ${
            isAnswered && question.answers[0] === 'false'
              ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_4px_0_#065f46]'
              : isAnswered && state.wasCorrect === false && question.answers[0] === 'true'
              ? 'border-rose-600 bg-rose-600 text-white'
              : 'border-rose-400 bg-rose-500 hover:bg-rose-600 text-white'
          }`}
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white">
            <span className="material-symbols-outlined text-lg">close</span>
          </div>
          <span>Falso</span>
        </button>

        {/* Verdadeiro Button */}
        <button
          disabled={isAnswered}
          onClick={() => handleAnswer(true)}
          className={`flex min-h-[68px] items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-4 text-lg font-bold transition-all active:translate-y-1 active:shadow-none shadow-[0_4px_0_#0e302c] disabled:opacity-70 ${
            isAnswered && question.answers[0] === 'true'
              ? 'border-emerald-500 bg-emerald-600 text-white shadow-[0_4px_0_#065f46]'
              : isAnswered && state.wasCorrect === false && question.answers[0] === 'false'
              ? 'border-rose-600 bg-rose-600 text-white shadow-[0_4px_0_#9f1239]'
              : 'border-sacred-brand bg-sacred-brand hover:bg-sacred-brand/95 text-white'
          }`}
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white">
            <span className="material-symbols-outlined text-lg">check</span>
          </div>
          <span>Verdadeiro</span>
        </button>
      </footer>

      {/* Floating Bottom Drawer on Answer */}
      {isAnswered && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-surface-dark/95 p-5 shadow-2xl backdrop-blur-md animate-slide-up">
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`size-9 rounded-full flex items-center justify-center text-white ${
                  state.wasCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              >
                <span className="material-symbols-outlined text-xl font-bold">
                  {state.wasCorrect ? 'check' : 'close'}
                </span>
              </div>
              <div>
                <p
                  className={`font-bold text-base leading-none ${
                    state.wasCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {state.wasCorrect ? 'Correto! Você acertou.' : 'Vamos aprender juntos:'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>

            {/* Ler para Recuperar — aparece quando vidas = 0 e errou */}
            {!state.wasCorrect && state.lives === 0 && (
              <button
                onClick={() => {
                  gameSfx.play('heart_recovered');
                  restoreHeartViaReading();
                  onNavigate('screen-biblia');
                }}
                className="w-full py-3 rounded-xl border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">menu_book</span>
                <span>Ler passagem para recuperar coração</span>
              </button>
            )}

            <button
              onClick={continueRound}
              className="w-full btn-duo-primary py-3.5 text-base font-bold shadow-duo-primary flex items-center justify-center gap-2"
            >
              <span>{currentNum === questions.length ? 'Ver Resultado' : 'Continuar'}</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>

            {/* Retomar mais tarde — alternativa quando vidas = 0 */}
            {state.lives === 0 && (
              <button
                onClick={() => onNavigate('screen-game-dashboard')}
                className="w-full py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors text-center"
              >
                Retomar mais tarde
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
