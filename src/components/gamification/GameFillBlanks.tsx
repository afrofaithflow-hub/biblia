import React, { useState, useEffect } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { audioEngine } from '../../lib/audioEngine';
import { gameSfx } from '../../lib/gameSoundEffects';

interface GameFillBlanksProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const GameFillBlanks: React.FC<GameFillBlanksProps> = ({ onNavigate, showToast }) => {
  const { questions, question, state, submit, advance, useHint, restoreHeartViaReading } = useGameSession('fill-blanks');
  const isAnswered = state.status === 'answered';
  const currentNum = state.questionIndex + 1;

  // Track placed words for the slots in the current question
  const [placedWords, setPlacedWords] = useState<(string | null)[]>([]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [isReadingAudio, setIsReadingAudio] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(gameSfx.getMuted());

  // Initialize slots when the question changes
  useEffect(() => {
    const numBlanks = question?.answers?.length || 2;
    setPlacedWords(new Array(numBlanks).fill(null));
    setActiveSlotIdx(0);
  }, [question]);

  // Split prompt by '___' to render text with slot blanks
  const promptParts = question.prompt.split('___');
  const options = question.options || ['pastor', 'faltará', 'rei', 'medo', 'luz'];

  const handleSelectWord = (word: string) => {
    if (isAnswered) return;
    gameSfx.play('tap');

    // Find next empty slot starting from activeSlotIdx
    const nextEmpty = placedWords.findIndex((w, i) => i >= activeSlotIdx && w === null);
    const targetIdx = nextEmpty !== -1 ? nextEmpty : placedWords.findIndex((w) => w === null);

    if (targetIdx !== -1) {
      const updated = [...placedWords];
      updated[targetIdx] = word;
      setPlacedWords(updated);

      // Advance active slot
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

  const handleVerify = () => {
    if (placedWords.some((w) => w === null)) {
      showToast('Preencha todas as lacunas antes de verificar.', 'info');
      return;
    }

    const answersSubmitted = placedWords.map((w) => (w ? w.toLowerCase() : ''));
    submit(answersSubmitted);

    const isCorrect = answersSubmitted.every(
      (ans, i) => ans === question.answers[i]?.toLowerCase()
    );

    if (isCorrect) {
      gameSfx.play('correct');
      showToast('Correto! Versículo completado com fidelidade.', 'check_circle');
    } else {
      gameSfx.play('wrong');
      showToast('Quase lá! Leia a referência bíblica para aprender.', 'info');
    }
  };

  const handleReadAloud = async () => {
    try {
      setIsReadingAudio(true);
      await audioEngine.speakText(
        `Complete o versículo de ${question.reference}: ${question.prompt.replace(/___/g, 'lacuna')}.`
      );
    } catch (err) {
      console.warn('TTS error:', err);
    } finally {
      setIsReadingAudio(false);
    }
  };

  const continueRound = () => {
    const result = advance();
    if (result === 'completed') {
      onNavigate('screen-recompensa');
    } else if (result === 'failed') {
      onNavigate('screen-resumo-licao');
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg-canvas font-display text-slate-800 transition-colors dark:bg-dark-canvas dark:text-slate-100">
      {/* Top Navigation */}
      <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={() => onNavigate('screen-game-dashboard')}
          className="flex size-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          title="Sair do jogo"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <h2 className="text-sm font-bold tracking-tight">Completar Versículo</h2>

        {/* Sound Toggle & Lives Counter */}
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

      {/* Progress Bar Section */}
      <div className="shrink-0 px-6 py-2">
        <div className="mb-1.5 flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span className="text-sacred-brand dark:text-sacred-neon font-black tracking-wider uppercase">
            {question.reference}
          </span>
          <span>Versículo {currentNum} de {questions.length}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-sacred-brand dark:bg-sacred-neon transition-all duration-500 shadow-glow-teal"
            style={{ width: `${(currentNum / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-between px-5 py-3 max-w-lg mx-auto w-full overflow-y-auto no-scrollbar">
        {/* Verse Card */}
        <div className="w-full bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-xl border-t-4 border-t-sacred-brand border-x border-b border-slate-200/80 dark:border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {question.reference}
            </span>
            <button
              onClick={handleReadAloud}
              className={`size-7 rounded-full flex items-center justify-center transition-colors ${
                isReadingAudio
                  ? 'bg-sacred-brand text-white animate-pulse'
                  : 'text-slate-400 hover:text-sacred-brand'
              }`}
              title="Ouvir versículo"
            >
              <span className="material-symbols-outlined text-[17px]">
                {isReadingAudio ? 'volume_up' : 'headphones'}
              </span>
            </button>
          </div>

          {/* Verse Text with Interactive Blank Slots */}
          <div className="text-lg md:text-xl font-serif text-slate-900 dark:text-white leading-loose text-center">
            {promptParts.map((part, idx) => (
              <React.Fragment key={idx}>
                <span>{part}</span>
                {idx < question.answers.length && (
                  <button
                    disabled={isAnswered}
                    onClick={() => handleRemoveWord(idx)}
                    className={`inline-flex items-center justify-center min-w-[90px] h-[34px] px-3 mx-1 my-0.5 rounded-xl border-2 border-dashed font-sans font-bold text-xs align-middle transition-all cursor-pointer ${
                      placedWords[idx]
                        ? 'border-sacred-brand bg-sacred-brand/10 text-sacred-brand dark:text-sacred-neon font-black'
                        : activeSlotIdx === idx
                        ? 'border-sacred-brand/70 bg-sacred-brand/5 dark:bg-sacred-neon/10 animate-pulse'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-transparent'
                    }`}
                  >
                    {placedWords[idx] || '________'}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Word Bank (Chips) */}
        <div className="w-full my-auto py-4">
          <div className="flex items-center justify-center gap-1.5 opacity-60 mb-3 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[16px]">touch_app</span>
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Toque nas palavras para preencher as lacunas
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5">
            {options.map((w) => {
              const countUsed = placedWords.filter((pw) => pw === w).length;
              const isUsed = countUsed > 0;

              return (
                <button
                  key={w}
                  disabled={isAnswered || isUsed}
                  onClick={() => handleSelectWord(w)}
                  className={`px-4 py-2.5 rounded-2xl border text-sm font-bold shadow-sm transition-all active:scale-95 ${
                    isUsed
                      ? 'opacity-30 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark text-slate-800 dark:text-white hover:border-sacred-brand active:translate-y-0.5'
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full pb-4">
          <button
            disabled={isAnswered || placedWords.some((w) => w === null)}
            onClick={handleVerify}
            className="w-full btn-duo-primary py-4 text-base font-bold shadow-duo-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Verificar</span>
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </button>
        </div>
      </main>

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
                  {state.wasCorrect ? 'Correto! Você memorizou a Palavra.' : 'Versículo original:'}
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

            {/* Retomar mais tarde quando vidas = 0 */}
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
