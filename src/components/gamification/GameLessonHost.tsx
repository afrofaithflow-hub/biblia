/**
 * BiblIA — Orquestrador Dinâmico de Lições Híbridas (GameLessonHost)
 *
 * Executa lições completas intercalando Múltipla Escolha, Verdadeiro ou Falso e Completar Versículo.
 * Inclui cabeçalho com contador centralizado, pausa justa de TTS, pausa de 0 vidas e
 * fluxo Ler -> Compreender -> Recuperar (repescagem pós-leitura).
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
  const [recoverySelectedAnswer, setRecoverySelectedAnswer] = useState<string | null>(null);
  const [isReadingAudio, setIsReadingAudio] = useState(false);
  const [ttsPauseActive, setTtsPauseActive] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [isSfxMuted, setIsSfxMuted] = useState(gameSfx.getMuted());
  const [timeLeft, setTimeLeft] = useState(0);
  const [didTimeOut, setDidTimeOut] = useState(false);

  const pausedAtRef = useRef<number | null>(null);
  const deadlineRef = useRef<number>(0);
  const ttsPausedAtRef = useRef<number | null>(null);
  const ttsPauseUsedQuestionIdsRef = useRef<Set<string>>(new Set());
  const submitTimeoutRef = useRef<() => void>(() => undefined);
  const recoveryTimeoutRef = useRef<() => void>(() => undefined);

  const {
    mode,
    questions,
    question,
    state,
    recovery,
    recoveryAttemptsUsed,
    recoveryLimit,
    canRecoverCurrentQuestion,
    eligibleRecoveryQuestions,
    isZeroLivesPaused,
    submit,
    submitTimeout,
    advance,
    useHint,
    beginReadingRecovery,
    completeRecoveryAnswer,
    dismissRecoveryFeedback,
    forfeitLessonNow,
    exitLessonCleanly,
  } = useGameSession(defaultMode);

  const isRecoveryActive = Boolean(
    recovery &&
      ['reading_validated', 'recovery_question', 'recovered', 'failed'].includes(
        recovery.status
      )
  );
  const activeQuestion = isRecoveryActive ? recovery?.recoveryQuestion || question : question;

  const totalQuestions = Math.max(1, questions.length);
  const currentNum = Math.min(state.questionIndex + 1, totalQuestions);
  const progressPercent = Math.round(((currentNum - 1) / totalQuestions) * 100);
  const isAnswered = state.status === 'answered';
  const isRecoveryQuestionPlaying = recovery?.status === 'recovery_question';
  const isTimerRunning =
    Boolean(activeQuestion) &&
    !isZeroLivesPaused &&
    ((!isRecoveryActive && state.status === 'playing') || isRecoveryQuestionPlaying);

  const activeTimeLimit = activeQuestion ? getQuestionTimeLimit(activeQuestion) : 20;
  const activeTimerQuestionKey = isRecoveryActive
    ? recovery?.recoveryQuestion?.id || 'rec'
    : question?.id || 'main';

  useEffect(() => {
    submitTimeoutRef.current = submitTimeout;
  }, [submitTimeout]);

  useEffect(() => {
    recoveryTimeoutRef.current = () => {
      completeRecoveryAnswer(false);
    };
  }, [completeRecoveryAnswer]);

  // Cancela leitura de áudio ao trocar de questão ou sair
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, [activeTimerQuestionKey]);

  // Relógio único e justo, com pausa automática em segundo plano (visibilitychange).
  useEffect(() => {
    if (!isTimerRunning || !activeQuestion) return;
    deadlineRef.current = Date.now() + activeTimeLimit * 1000;
    let expired = false;

    const tick = () => {
      // Se pausado por visibilidade ou pela leitura acessível TTS (1x), não avança contagem
      if (pausedAtRef.current !== null || ttsPausedAtRef.current !== null) return;

      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !expired) {
        expired = true;
        setDidTimeOut(true);
        gameSfx.play('wrong');
        if (isRecoveryQuestionPlaying) {
          recoveryTimeoutRef.current();
        } else {
          submitTimeoutRef.current();
        }
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (pausedAtRef.current === null) pausedAtRef.current = Date.now();
        return;
      }
      if (pausedAtRef.current !== null) {
        deadlineRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      tick();
    };

    setDidTimeOut(false);
    setTimeLeft(activeTimeLimit);
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      pausedAtRef.current = null;
      ttsPausedAtRef.current = null;
      setTtsPauseActive(false);
    };
  }, [activeTimerQuestionKey, activeTimeLimit, isTimerRunning, isRecoveryQuestionPlaying]);

  if (!question && !isRecoveryActive && !isZeroLivesPaused) return null;

  // Leitura acessível por voz com pausa justa limitada a 1 vez por questão (sem exploit)
  const handleReadAloud = async () => {
    if (!activeQuestion) return;

    if (isReadingAudio) {
      audioEngine.stop();
      setIsReadingAudio(false);
      if (ttsPausedAtRef.current !== null) {
        deadlineRef.current += Date.now() - ttsPausedAtRef.current;
        ttsPausedAtRef.current = null;
        setTtsPauseActive(false);
      }
      return;
    }

    const canPauseThisQuestion =
      isTimerRunning && !ttsPauseUsedQuestionIdsRef.current.has(activeQuestion.id);

    if (canPauseThisQuestion) {
      ttsPauseUsedQuestionIdsRef.current.add(activeQuestion.id);
      ttsPausedAtRef.current = Date.now();
      setTtsPauseActive(true);
    }

    try {
      setIsReadingAudio(true);
      await audioEngine.speakText(
        `${activeQuestion.prompt}. Referência: ${activeQuestion.reference}.`
      );
    } catch (err) {
      console.warn('TTS error:', err);
    } finally {
      setIsReadingAudio(false);
      if (ttsPausedAtRef.current !== null) {
        deadlineRef.current += Date.now() - ttsPausedAtRef.current;
        ttsPausedAtRef.current = null;
        setTtsPauseActive(false);
      }
    }
  };

  // Usar Dica Contextual (+50/50 em múltipla escolha)
  const handleUseHint = () => {
    const text = useHint();
    if (text) {
      setHintText(text);
      showToast('Dica bíblica ativada.', 'lightbulb');
    }
  };

  // Submissão de resposta na lição principal
  const handleAnswerSelected = (answer: string | string[], isCorrect: boolean) => {
    audioEngine.stop();
    setSelectedAnswer(Array.isArray(answer) ? answer.join(' ') : answer);
    if (isCorrect) {
      gameSfx.play('correct');
    } else {
      gameSfx.play('wrong');
    }
    submit(answer);
  };

  // Submissão de resposta na repescagem pós-leitura (atómico, sem alterar a questão original)
  const handleRecoveryAnswerSelected = (answer: string | string[], isCorrect: boolean) => {
    audioEngine.stop();
    setRecoverySelectedAnswer(Array.isArray(answer) ? answer.join(' ') : answer);
    if (isCorrect) {
      gameSfx.play('heart_recovered');
    } else {
      gameSfx.play('wrong');
    }
    completeRecoveryAnswer(isCorrect);
  };

  // Avançar para a próxima questão ou pausa/finalização
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

  // Iniciar fluxo Ler -> Compreender -> Recuperar para a questão indicada
  const handleStartReadingRecovery = (targetQuestion = question) => {
    if (!targetQuestion) return;
    audioEngine.stop();
    const ok = beginReadingRecovery(targetQuestion);
    if (!ok) {
      showToast('Não foi possível abrir a passagem para esta questão.', 'info');
      return;
    }
    onNavigate('screen-biblia');
    showToast('Leia a passagem destacada para liberar a repescagem!', 'menu_book');
  };

  // Continuar após ver feedback da repescagem
  const handleContinueAfterRecovery = () => {
    setSelectedAnswer(null);
    setRecoverySelectedAnswer(null);
    setHintText(null);
    setDidTimeOut(false);
    const next = dismissRecoveryFeedback();
    if (next === 'completed') {
      onNavigate('screen-recompensa');
    } else if (next === 'failed') {
      onNavigate('screen-resumo-licao');
    }
  };

  const remainingRecoveries = Math.max(0, recoveryLimit - recoveryAttemptsUsed);

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-bg-canvas font-display text-slate-800 transition-colors dark:bg-dark-canvas dark:text-slate-100">
      {/* ── Top Header (Contador Centralizado + Progresso Equilibrado) ──────── */}
      <header className="relative z-10 shrink-0 px-4 sm:px-5 pt-3.5 pb-2.5 border-b border-slate-200/60 dark:border-white/5 bg-white/75 dark:bg-dark-canvas/85 backdrop-blur-md">
        <div className="max-w-xl mx-auto w-full space-y-2">
          {/* Linha 1: Grid de 3 colunas com timer centralizado */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Esquerda: Botão Sair */}
            <div className="flex items-center justify-start">
              <button
                onClick={() => {
                  audioEngine.stop();
                  exitLessonCleanly();
                  onNavigate('screen-game-dashboard');
                }}
                className="flex size-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark border border-slate-200/70 dark:border-white/10 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                title="Sair da lição"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Centro: Contador de Tempo Centralizado */}
            <div className="flex flex-col items-center justify-center">
              {isTimerRunning || isAnswered || isRecoveryActive ? (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-black tabular-nums shadow-xs transition-all ${
                    ttsPauseActive
                      ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                      : timeLeft <= 5 && isTimerRunning
                      ? 'border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-950/70 dark:text-rose-300 animate-pulse'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                  role="timer"
                  aria-label={`${timeLeft} segundos restantes`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {ttsPauseActive ? 'pause_circle' : 'timer'}
                  </span>
                  <span>{formatGameTime(timeLeft)}</span>
                  {ttsPauseActive && (
                    <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
                      Áudio
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500">
                  Pausa na Lição
                </span>
              )}
            </div>

            {/* Direita: Áudio, SFX e Corações */}
            <div className="flex items-center justify-end gap-1.5">
              {/* TTS Áudio */}
              <button
                onClick={handleReadAloud}
                className={`flex size-8 items-center justify-center rounded-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 text-slate-500 hover:text-sacred-brand transition-colors ${
                  isReadingAudio ? 'animate-pulse text-sacred-brand border-sacred-brand/40' : ''
                }`}
                title={isReadingAudio ? 'Parar leitura' : 'Ouvir questão'}
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

          {/* Linha 2: Barra de Progresso Linear */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>
                {mode === 'review' ? 'Revisão' : 'Questão'} {currentNum} de {totalQuestions}
                {isRecoveryActive && (
                  <span className="ml-2 text-sacred-brand dark:text-sacred-neon font-extrabold">
                    • Repescagem
                  </span>
                )}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sacred-brand dark:bg-sacred-neon rounded-full transition-all duration-300"
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col justify-start max-w-lg mx-auto w-full pb-44">
        {/* 1. Estado de Pausa a 0 Vidas ("Última Chance pela Palavra") */}
        {isZeroLivesPaused && !isRecoveryActive && (
          <div className="w-full space-y-4 animate-fade-in">
            <div className="rounded-3xl bg-white dark:bg-surface-dark p-6 border-2 border-rose-300/70 dark:border-rose-800/70 shadow-xl text-center space-y-2.5">
              <div className="size-14 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite_border
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Suas vidas acabaram — Última Chance pela Palavra
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Leia uma passagem onde teve dúvida e responda à repescagem para conquistar{' '}
                <strong className="text-rose-500">+1 ❤️</strong> e continuar a lição sem perder seus acertos!{' '}
                <span className="text-slate-400">
                  (Recuperações restantes: {remainingRecoveries}/{recoveryLimit})
                </span>
              </p>
            </div>

            <div className="space-y-2.5">
              {eligibleRecoveryQuestions.map((errQ) => (
                <button
                  key={errQ.id}
                  onClick={() => handleStartReadingRecovery(errQ)}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:border-sacred-brand text-left flex items-center justify-between gap-3 shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-sacred-brand dark:text-sacred-neon">
                      {errQ.reference}
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2">
                      {errQ.prompt}
                    </p>
                  </div>
                  <span className="shrink-0 px-3 py-2 rounded-xl bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 text-[11px] font-extrabold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">menu_book</span>
                    <span>Ler (+1 ❤️)</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                forfeitLessonNow();
                onNavigate('screen-resumo-licao');
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Encerrar tentativa agora (manter acertos e histórico)
            </button>
          </div>
        )}

        {/* 2. Modo de Repescagem Pós-Leitura */}
        {isRecoveryActive && activeQuestion && (
          <div className="w-full space-y-3 animate-fade-in">
            <div className="rounded-2xl bg-sacred-brand/10 dark:bg-sacred-neon/10 border border-sacred-brand/30 dark:border-sacred-neon/30 px-4 py-2.5 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-sacred-brand dark:text-sacred-neon text-lg">
                auto_stories
              </span>
              <div className="text-xs">
                <p className="font-extrabold text-sacred-brand dark:text-sacred-neon">
                  Repescagem Pós-Leitura ({recovery?.sourceReference})
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Responda corretamente com base na leitura para recuperar +1 ❤️.
                </p>
              </div>
            </div>

            {activeQuestion.kind === 'multiple-choice' && (
              <MultipleChoiceExercise
                question={activeQuestion}
                isAnswered={recovery?.status !== 'recovery_question'}
                selectedOption={recoverySelectedAnswer}
                onSelectOption={handleRecoveryAnswerSelected}
              />
            )}

            {activeQuestion.kind === 'true-false' && (
              <TrueFalseExercise
                question={activeQuestion}
                isAnswered={recovery?.status !== 'recovery_question'}
                selectedAnswer={recoverySelectedAnswer}
                onSelectAnswer={handleRecoveryAnswerSelected}
              />
            )}

            {activeQuestion.kind === 'fill-blanks' && (
              <FillBlanksExercise
                question={activeQuestion}
                isAnswered={recovery?.status !== 'recovery_question'}
                onVerify={handleRecoveryAnswerSelected}
              />
            )}
          </div>
        )}

        {/* 3. Fluxo Normal da Lição */}
        {!isZeroLivesPaused && !isRecoveryActive && question && (
          <>
            {question.kind === 'multiple-choice' && (
              <MultipleChoiceExercise
                question={question}
                isAnswered={isAnswered}
                selectedOption={selectedAnswer}
                hintActive={Boolean(hintText)}
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

            {/* Botão de Dica */}
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
          </>
        )}
      </main>

      {/* ── Bottom Feedback Drawer: Repescagem ─────────────────────────────── */}
      {isRecoveryActive && (recovery?.status === 'recovered' || recovery?.status === 'failed') && activeQuestion && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 p-5 shadow-2xl transition-all duration-300 border-t ${
            recovery.status === 'recovered'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="max-w-lg mx-auto space-y-3">
            <div className="flex items-start gap-3">
              <span
                className={`material-symbols-outlined text-2xl p-1 rounded-full text-white shrink-0 ${
                  recovery.status === 'recovered' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              >
                {recovery.status === 'recovered' ? 'favorite' : 'close'}
              </span>
              <div className="flex-1">
                <h4
                  className={`text-sm font-black ${
                    recovery.status === 'recovered'
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-rose-900 dark:text-rose-100'
                  }`}
                >
                  {recovery.status === 'recovered'
                    ? 'Compreensão confirmada! +1 ❤️ recuperado'
                    : didTimeOut
                    ? 'Tempo esgotado na repescagem'
                    : 'A passagem ainda pede atenção — sem recuperação nesta questão'}
                </h4>
                <p
                  className={`text-xs mt-0.5 leading-relaxed ${
                    recovery.status === 'recovered'
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : 'text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {activeQuestion.explanation}
                </p>
              </div>
            </div>

            <button
              onClick={handleContinueAfterRecovery}
              className={`w-full py-3 px-5 rounded-xl font-black text-xs text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                recovery.status === 'recovered'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <span>Continuar lição</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Feedback Drawer: Questão Normal ─────────────────────────── */}
      {!isZeroLivesPaused && !isRecoveryActive && isAnswered && question && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 p-5 shadow-2xl transition-all duration-300 border-t ${
            state.wasCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="max-w-lg mx-auto space-y-3">
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

            <div className="flex items-center gap-2 pt-1">
              {!state.wasCorrect && canRecoverCurrentQuestion && (
                <button
                  onClick={() => handleStartReadingRecovery(question)}
                  className="flex-1 py-3 px-3 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-surface-dark text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">menu_book</span>
                  <span>Ler na Bíblia (+1 ❤️ · {remainingRecoveries}/{recoveryLimit})</span>
                </button>
              )}

              <button
                onClick={handleContinue}
                className={`py-3 px-5 rounded-xl font-black text-xs text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  state.wasCorrect || !canRecoverCurrentQuestion
                    ? 'w-full'
                    : 'flex-1'
                } ${
                  state.wasCorrect
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <span>
                  {!state.wasCorrect && state.lives === 0 && remainingRecoveries > 0 && eligibleRecoveryQuestions.length > 0
                    ? 'Recuperar Vida'
                    : 'Continuar'}
                </span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
