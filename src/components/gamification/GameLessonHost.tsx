/**
 * BiblIA — Orquestrador Dinâmico de Lições Híbridas (GameLessonHost)
 * 
 * Executa lições completas intercalando Múltipla Escolha, Verdadeiro ou Falso e Completar Versículo.
 * Unifica barra de progresso, vidas pedagógicas, dicas e feedback canônico.
 * 
 * Data: 17 de novembro de 2026 | Antigravity AI Engine
 */

import React, { useEffect, useRef, useState } from 'react';
import type { GameMode } from '../../types/gameContracts';
import { useGameSession } from '../../hooks/useGameSession';
import { audioEngine } from '../../lib/audioEngine';
import { gameSfx } from '../../lib/gameSoundEffects';
import { MultipleChoiceExercise } from './exercises/MultipleChoiceExercise';
import { TrueFalseExercise } from './exercises/TrueFalseExercise';
import { FillBlanksExercise } from './exercises/FillBlanksExercise';
import { formatGameTime, getQuestionTimeLimit } from '../../lib/gameTiming';

interface GameLessonHostProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
  defaultMode?: GameMode;
}

export const GameLessonHost: React.FC<GameLessonHostProps> = ({
  onNavigate,
  showToast,
  defaultMode = 'quiz',
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isReadingAudio, setIsReadingAudio] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [isSfxMuted, setIsSfxMuted] = useState(gameSfx.getMuted());
  const [timeLeft, setTimeLeft] = useState(0);
  const [didTimeOut, setDidTimeOut] = useState(false);
  const pausedAtRef = useRef<number | null>(null);
  const submitTimeoutRef = useRef<() => void>(() => undefined);

  const {
    questions,
    question,
    state,
    submit,
    submitTimeout,
    advance,
    useHint,
    restoreHeartViaReading,
  } = useGameSession(defaultMode);

  if (!question) return null;

  const totalQuestions = questions.length;
  const currentNum = state.questionIndex + 1;
  const progressPercent = Math.round(((currentNum - 1) / totalQuestions) * 100);
  const isAnswered = state.status === 'answered';
  const timeLimit = getQuestionTimeLimit(question);

  useEffect(() => {
    submitTimeoutRef.current = submitTimeout;
  }, [submitTimeout]);

  // Relógio único, justo e pausado quando a aplicação deixa de estar visível.
  // A validação usa uma data limite real, para não atrasar em aparelhos lentos.
  useEffect(() => {
    if (state.status !== 'playing') return;
    let deadline = Date.now() + timeLimit * 1000;
    let expired = false;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !expired) {
        expired = true;
        setDidTimeOut(true);
        gameSfx.play('wrong');
        submitTimeoutRef.current();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        pausedAtRef.current = Date.now();
        return;
      }
      if (pausedAtRef.current) {
        deadline += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      tick();
    };

    setDidTimeOut(false);
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      pausedAtRef.current = null;
    };
  }, [question.id, state.status, timeLimit]);

  // Leitura acessível por voz do enunciado e referência
  const handleReadAloud = async () => {
    try {
      setIsReadingAudio(true);
      await audioEngine.speakText(
        `${question.prompt}. Referência: ${question.reference}.`
      );
    } catch (err) {
      console.warn('TTS error:', err);
    } finally {
      setIsReadingAudio(false);
    }
  };

  // Pedir dica honesta
  const handleUseHint = () => {
    const text = useHint();
    if (text) {
      setHintText(text);
      showToast('Dica bíblica ativada.', 'lightbulb');
    }
  };

  // Submissão de resposta
  const handleAnswerSelected = (answer: string | string[], isCorrect: boolean) => {
    setSelectedAnswer(Array.isArray(answer) ? answer.join(' ') : answer);
    if (isCorrect) {
      gameSfx.play('correct');
    } else {
      gameSfx.play('wrong');
    }
    submit(answer);
  };

  // Avançar para a próxima questão ou tela final
  const handleContinue = () => {
    setSelectedAnswer(null);
    setHintText(null);
    setDidTimeOut(false);
    const result = advance();
    if (result === 'completed') {
      onNavigate('screen-recompensa');
    } else if (result === 'failed') {
      onNavigate('screen-resumo-licao');
    }
  };

  // Ler na Bíblia para recuperar coração
  const handleReadToRecover = () => {
    gameSfx.play('heart_recovered');
    restoreHeartViaReading();
    onNavigate('screen-biblia');
    showToast('Leia a passagem para restaurar um coração!', 'menu_book');
  };

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-bg-canvas font-display text-slate-800 transition-colors dark:bg-dark-canvas dark:text-slate-100">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex shrink-0 flex-col gap-2.5 px-5 pt-4 pb-2 border-b border-slate-200/60 dark:border-white/5 bg-white/50 dark:bg-dark-canvas/50 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          {/* Botão Sair */}
          <button
            onClick={() => onNavigate('screen-game-dashboard')}
            className="flex size-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
            title="Sair da lição"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          {/* Barra de Progresso Linear */}
          <div className="flex-1 max-w-xs mx-auto space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>Questão {currentNum} de {totalQuestions}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sacred-brand dark:bg-sacred-neon rounded-full transition-all duration-300"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Controles de Som & Vidas */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tempo adaptado ao exercício e à dificuldade */}
            <div
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black tabular-nums transition-colors ${
                timeLeft <= 5
                  ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
              role="timer"
              aria-label={`${timeLeft} segundos restantes`}
            >
              <span className="material-symbols-outlined text-[15px]">timer</span>
              <span>{formatGameTime(timeLeft)}</span>
            </div>
            {/* TTS Áudio */}
            <button
              onClick={handleReadAloud}
              disabled={isReadingAudio}
              className={`flex size-8 items-center justify-center rounded-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-500 hover:text-sacred-brand transition-colors ${
                isReadingAudio ? 'animate-pulse text-sacred-brand' : ''
              }`}
              title="Ouvir questão"
            >
              <span className="material-symbols-outlined text-[17px]">
                {isReadingAudio ? 'volume_up' : 'volume_down'}
              </span>
            </button>

            {/* Mute SFX */}
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
                {isSfxMuted ? 'volume_off' : 'music_note'}
              </span>
            </button>

            {/* Corações / Vidas */}
            <div className="flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 shadow-sm dark:border-rose-900/50 dark:bg-surface-dark">
              <span
                className="material-symbols-outlined text-[16px] text-rose-500"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                {state.lives}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Exercise Area ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col justify-start max-w-lg mx-auto w-full pb-36">
        {/* Renderizador Dinâmico baseado no tipo de exercício da questão */}
        {question.kind === 'multiple-choice' && (
          <MultipleChoiceExercise
            question={question}
            isAnswered={isAnswered}
            selectedOption={selectedAnswer}
            onSelectOption={(option, isCorrect) => handleAnswerSelected(option, isCorrect)}
          />
        )}

        {question.kind === 'true-false' && (
          <TrueFalseExercise
            question={question}
            isAnswered={isAnswered}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={(value, isCorrect) => handleAnswerSelected(value, isCorrect)}
          />
        )}

        {question.kind === 'fill-blanks' && (
          <FillBlanksExercise
            question={question}
            isAnswered={isAnswered}
            onVerify={(answers, isCorrect) => handleAnswerSelected(answers, isCorrect)}
          />
        )}

        {/* Botão de Dica (quando ainda não respondeu e tem dica disponível) */}
        {!isAnswered && !hintText && (
          <div className="pt-3 text-center">
            <button
              onClick={handleUseHint}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <span className="material-symbols-outlined text-sm">lightbulb</span>
              <span>Precisa de uma dica?</span>
            </button>
          </div>
        )}

        {/* Exibição da Dica */}
        {hintText && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-amber-500 shrink-0 mt-0.5">
              lightbulb
            </span>
            <p className="font-medium">{hintText}</p>
          </div>
        )}
      </main>

      {/* ── Bottom Feedback Drawer ─────────────────────────────────────────── */}
      {isAnswered && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 p-5 shadow-2xl transition-all duration-300 border-t ${
            state.wasCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="max-w-lg mx-auto space-y-3">
            {/* Mensagem e Ícone */}
            <div className="flex items-start gap-3">
              <span
                className={`material-symbols-outlined text-2xl p-1 rounded-full text-white shrink-0 ${
                  state.wasCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              >
                {state.wasCorrect ? 'check' : 'close'}
              </span>

              <div className="flex-1">
                <h4
                  className={`text-sm font-black ${
                    state.wasCorrect
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-rose-900 dark:text-rose-100'
                  }`}
                >
                  {state.wasCorrect
                    ? 'Excelente! Resposta correta'
                    : didTimeOut
                    ? 'O tempo terminou — vamos aprender'
                    : 'Quase lá! Vamos aprender'}
                </h4>
                <p
                  className={`text-xs mt-0.5 leading-relaxed ${
                    state.wasCorrect
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : 'text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {question.explanation}
                </p>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                  Referência: {question.reference}
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2 pt-1">
              {!state.wasCorrect && (
                <button
                  onClick={handleReadToRecover}
                  className="flex-1 py-3 px-3 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-surface-dark text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">menu_book</span>
                  <span>Ler na Bíblia (+1 ❤️)</span>
                </button>
              )}

              <button
                onClick={handleContinue}
                className={`py-3 px-5 rounded-xl font-black text-xs text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  state.wasCorrect
                    ? 'w-full bg-emerald-600 hover:bg-emerald-500'
                    : 'flex-1 bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <span>Continuar</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
