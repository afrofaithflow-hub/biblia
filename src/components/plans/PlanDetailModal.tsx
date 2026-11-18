/**
 * BiblIA — Modal de Detalhes e Execução da Jornada de Leitura
 * Permite explorar os dias, ler contexto histórico, responder ao mini-desafio e concluir dias.
 * 
 * Data: 17 de novembro de 2026 | Antigravity AI Engine
 */

import React, { useState } from 'react';
import type { ReadingPlan, PlanDay, UserPlanProgress } from '../../types/readingPlanTypes';
import { useSubscription } from '../../context/SubscriptionContext';
import { toggleDayCompletion, startPlan } from '../../lib/readingPlanStorage';

interface PlanDetailModalProps {
  plan: ReadingPlan;
  progress: UserPlanProgress | null;
  isActive: boolean;
  onClose: () => void;
  onPlanUpdated: () => void;
  onNavigateToBible: (bookId: string, chapter: number, verseStart?: number) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  progress,
  isActive,
  onClose,
  onPlanUpdated,
  onNavigateToBible,
  showToast,
}) => {
  const { currentPlan, openPricingModal } = useSubscription();

  // Premium e Master incluem acesso às jornadas Premium.
  const isLocked = plan.tier === 'plus' && currentPlan === 'FREE';

  // Dia atualmente selecionado no modal (padrão: o dia atual do progresso ou dia 1)
  const initialDayNumber = progress?.currentDay || 1;
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(initialDayNumber);

  // Respostas locais do mini-desafio para feedback visual interativo
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  const selectedDay: PlanDay | undefined =
    plan.days.find((d) => d.dayNumber === selectedDayNumber) || plan.days[0];

  const completedDays = progress?.completedDays || [];
  const isSelectedDayCompleted = selectedDay ? completedDays.includes(selectedDay.dayNumber) : false;
  const progressPercent = Math.round((completedDays.length / plan.days.length) * 100);

  const handleToggleCurrentDay = () => {
    if (!selectedDay) return;
    if (isLocked) {
      openPricingModal();
      return;
    }

    const res = toggleDayCompletion(plan, selectedDay.dayNumber);
    onPlanUpdated();

    if (res.xpGained > 0) {
      showToast(`Dia ${selectedDay.dayNumber} concluído! +${res.xpGained} XP`, 'check_circle');
    } else {
      showToast(`Dia ${selectedDay.dayNumber} desmarcado`, 'undo');
    }

    if (res.badgeUnlocked) {
      showToast(`🎉 Parabéns! Desbloqueou a insígnia: ${res.badgeUnlocked.label}`, 'workspace_premium');
    }
  };

  const handleMakeActivePlan = () => {
    if (isLocked) {
      openPricingModal();
      return;
    }
    startPlan(plan);
    onPlanUpdated();
    showToast(`"${plan.title}" definido como a sua jornada ativa!`, 'flag');
  };

  const handleAnswerQuiz = (questionId: string, optionIndex: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-bg-canvas dark:bg-dark-canvas w-full max-w-2xl h-[92vh] sm:h-[88vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200/80 dark:border-dark-border overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-dark-border flex items-center justify-between bg-white/70 dark:bg-dark-card-base/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-2xl p-2 rounded-xl text-white"
              style={{ backgroundColor: plan.accentColor }}
            >
              {plan.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {plan.title}
                </h3>
                {plan.tier === 'plus' ? (
                  <span className="text-[10px] uppercase tracking-wide font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/40">
                    Premium
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    Gratuito
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {plan.subtitle} • {plan.sprintDays} Dias
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
          {/* Locked Banner if Premium and User Free */}
          {isLocked && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500 text-2xl">lock</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Jornada Exclusiva Premium
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Desbloqueie todas as jornadas históricas, mapas e áudios com o plano Premium ou Master.
                  </p>
                </div>
              </div>
              <button
                onClick={openPricingModal}
                className="px-3.5 py-2 bg-sacred-brand text-white dark:bg-sacred-neon dark:text-slate-950 rounded-xl text-xs font-extrabold shadow-sm hover:brightness-110 shrink-0"
              >
                Conhecer Premium
              </button>
            </div>
          )}

          {/* Progress Card */}
          <div className="rounded-2xl bg-white dark:bg-dark-card-base p-4 border border-slate-200/80 dark:border-dark-border shadow-soft flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{plan.badge.icon}</span>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Insígnia da Jornada
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {plan.badge.label}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-extrabold text-sacred-brand dark:text-sacred-neon">
                  {completedDays.length}/{plan.days.length} Dias
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {progressPercent}% Concluído
                </span>
                {(plan.completionBonusXp || 0) > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold mt-0.5">
                    +{plan.completionBonusXp} XP ao concluir
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: plan.accentColor,
                }}
              />
            </div>

            {/* Make Active Button */}
            {!isActive && !isLocked && (
              <button
                onClick={handleMakeActivePlan}
                className="mt-1 w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">flag</span>
                <span>Definir como Minha Jornada Ativa</span>
              </button>
            )}
            {isActive && (
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold pt-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>Esta é a sua jornada ativa no momento</span>
              </div>
            )}
          </div>

          {/* Day Selector Pills */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">
              Selecione o Dia
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {plan.days.map((d) => {
                const isDone = completedDays.includes(d.dayNumber);
                const isCurrent = d.dayNumber === selectedDayNumber;

                return (
                  <button
                    key={d.dayNumber}
                    onClick={() => setSelectedDayNumber(d.dayNumber)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                      isCurrent
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-sm'
                        : isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                        : 'bg-white dark:bg-dark-card-base text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-border hover:border-slate-300'
                    }`}
                  >
                    {isDone && (
                      <span className="material-symbols-outlined text-sm text-emerald-600 dark:text-emerald-400">
                        check
                      </span>
                    )}
                    <span>Dia {d.dayNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Content Card */}
          {selectedDay && (
            <div className="rounded-2xl bg-white dark:bg-dark-card-base p-5 border border-slate-200/80 dark:border-dark-border shadow-soft space-y-4">
              {/* Day Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-sacred-brand dark:text-sacred-neon uppercase tracking-wider">
                    Dia {selectedDay.dayNumber} de {plan.days.length}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {selectedDay.title}
                  </h4>
                </div>
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-xl text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">stars</span>
                  <span>+{selectedDay.xpReward} XP</span>
                </div>
              </div>

              {/* Passages Section */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200/60 dark:border-dark-border">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">
                  Leitura Bíblica de Hoje
                </span>
                <div className="space-y-2">
                  {selectedDay.passages.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white dark:bg-dark-card-base p-2.5 rounded-lg border border-slate-200/60 dark:border-dark-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-terracotta text-lg">
                          menu_book
                        </span>
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {p.label}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToBible(p.bookId, p.chapter, p.verseStart);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-sacred-brand dark:text-sacred-neon hover:underline"
                      >
                        <span>Abrir na Bíblia</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devotional Context Pill */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-sm text-sacred-brand dark:text-sacred-neon">
                    lightbulb
                  </span>
                  <span>Contexto Histórico e Literário</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {selectedDay.devotionalSnippet}
                </p>
                {selectedDay.devotionalSource && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic pl-1">
                    Fonte: {selectedDay.devotionalSource}
                  </p>
                )}
              </div>

              {/* Reflection Prompt */}
              {selectedDay.reflectionPrompt && (
                <div className="p-3.5 rounded-xl bg-sacred-brand/5 dark:bg-sacred-neon/5 border border-sacred-brand/20 dark:border-sacred-neon/20">
                  <span className="text-[11px] font-bold text-sacred-brand dark:text-sacred-neon flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm">psychology_alt</span>
                    <span>Para Refletir Hoje</span>
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                    {selectedDay.reflectionPrompt}
                  </p>
                </div>
              )}

              {/* Optional Mini-Quiz */}
              {selectedDay.quizQuestions && selectedDay.quizQuestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-500">
                        quiz
                      </span>
                      <span>Desafio Rápido de Fixação</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Opcional</span>
                  </div>

                  <div className="space-y-3">
                    {selectedDay.quizQuestions.map((q, qIdx) => {
                      const answered = quizAnswers[q.id] !== undefined;
                      const selectedOpt = quizAnswers[q.id];

                      return (
                        <div
                          key={q.id}
                          className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-dark-border space-y-2"
                        >
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {qIdx + 1}. {q.question}
                          </p>

                          <div className="grid grid-cols-1 gap-1.5">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = selectedOpt === optIdx;
                              const isCorrect = optIdx === q.correctIndex;

                              let btnClasses =
                                'w-full text-left p-2.5 rounded-lg text-xs font-medium border transition-all ';

                              if (!answered) {
                                btnClasses +=
                                  'bg-white dark:bg-dark-card-base border-slate-200 dark:border-dark-border hover:border-sacred-brand text-slate-700 dark:text-slate-200';
                              } else if (isCorrect) {
                                btnClasses +=
                                  'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-bold';
                              } else if (isSelected && !isCorrect) {
                                btnClasses +=
                                  'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-800 dark:text-rose-200';
                              } else {
                                btnClasses +=
                                  'bg-white/50 dark:bg-dark-card-base/50 border-slate-200 dark:border-dark-border text-slate-400 opacity-60';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleAnswerQuiz(q.id, optIdx)}
                                  className={btnClasses}
                                  disabled={answered}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Button: Conclude Day */}
              <div className="pt-2">
                <button
                  onClick={handleToggleCurrentDay}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                    isSelectedDayCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 hover:brightness-110'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isSelectedDayCompleted ? 'check_circle' : 'task_alt'}
                  </span>
                  <span>
                    {isSelectedDayCompleted
                      ? 'Dia Concluído (Clique para Desmarcar)'
                      : `Concluir Dia ${selectedDay.dayNumber} (+${selectedDay.xpReward} XP)`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
