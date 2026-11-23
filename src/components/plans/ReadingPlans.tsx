/**
 * BiblIA — Tela Principal de Jornadas de Leitura (Secção 3)
 * Baseada estritamente em: CONCLUSAO_PLANOS_LEITURA_BIBLIA.md
 * 
 * Apresenta:
 * - Catálogo curado de 5 Jornadas (2 Free + 3 Premium)
 * - Abas funcionais: "Descobrir" e "Meus Planos"
 * - Estado de progresso real via readingPlanStorage
 * - Modal detalhado com passagens bíblicas, contexto literário, reflexão e mini-desafio
 * - Integração direta com BibleReader via navegação canônica
 * 
 * Data: 17 de novembro de 2026 | Antigravity AI Engine
 */

import React, { useState, useEffect } from 'react';
import type { ReadingPlan } from '../../types/readingPlanTypes';
import { READING_PLANS, PLANS_BY_ID } from '../../data/plansData';
import {
  getActivePlanId,
  getAllPlansProgress,
  startPlan,
} from '../../lib/readingPlanStorage';
import { saveLastRead } from '../../lib/bibleStorage';
import { findBibleBookByName, queueBibleReference } from '../../lib/scriptureReference';
import { getUserProgressTracks } from '../../lib/gameSession';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { PlanDetailModal } from './PlanDetailModal';

interface ReadingPlansProps {
  onNavigate: (screen: string) => void;
  showToast: (msg: string, icon?: string) => void;
}

export const ReadingPlans: React.FC<ReadingPlansProps> = ({ onNavigate, showToast }) => {
  const [tab, setTab] = useState<'descobrir' | 'meus'>('descobrir');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [plansProgress, setPlansProgress] = useState(getAllPlansProgress());
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<ReadingPlan | null>(null);

  const { user } = useAuth();
  const { currentPlan, openPricingModal } = useSubscription();
  const tracks = getUserProgressTracks();
  const userInitial = String(
    user?.user_metadata?.display_name || user?.email || 'B'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  // Carrega estado de progresso e plano ativo
  const refreshState = () => {
    const currentActiveId = getActivePlanId();
    setActivePlanId(currentActiveId);
    setPlansProgress(getAllPlansProgress());
  };

  useEffect(() => {
    refreshState();
  }, []);

  const activePlan = activePlanId ? PLANS_BY_ID[activePlanId] : null;
  const activeProgress = activePlanId ? plansProgress[activePlanId] : null;

  // Separa planos por acesso (Free vs Premium)
  const freePlans = READING_PLANS.filter((p) => p.tier === 'free');
  const plusPlans = READING_PLANS.filter((p) => p.tier === 'plus');

  // Abre modal de detalhes de um plano
  const handleOpenPlan = (plan: ReadingPlan) => {
    setSelectedPlanForModal(plan);
  };

  // Navega para o leitor bíblico abrindo exatamente no livro/capítulo indicado
  const handleNavigateToBible = (bookId: string, chapter: number, verseStart?: number) => {
    const resolvedBook = findBibleBookByName(bookId)?.name || bookId;
    const verse = verseStart || 1;
    saveLastRead(resolvedBook, chapter, verse, 'blivre');
    queueBibleReference(`${resolvedBook} ${chapter}:${verse}`);
    onNavigate('screen-biblia');
  };

  // Calcula streak total somando atividade
  const totalCompletedDays = Object.values(plansProgress).reduce(
    (acc, p) => acc + (p.completedDays?.length || 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-bg-canvas dark:bg-dark-canvas font-display text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-28">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-bg-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-md px-5 pt-5 pb-3 border-b border-slate-200/80 dark:border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                onClick={() => onNavigate('screen-perfil')}
                className="rounded-full size-10 border-2 border-white dark:border-sacred-neon bg-sacred-brand/15 dark:bg-sacred-neon/15 text-sacred-brand dark:text-sacred-neon flex items-center justify-center font-black text-sm shadow-sm cursor-pointer"
                title="Ver Perfil"
              >
                {user ? userInitial : <span className="material-symbols-outlined text-lg">person</span>}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-sacred-brand text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white dark:border-slate-900">
                Nv {tracks.walkLevel}
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-lg font-extrabold tracking-tight leading-none text-slate-900 dark:text-white">
                Jornadas Bíblicas
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Percursos guiados e contextualizados
              </p>
            </div>
          </div>

          <div className="badge-streak dark:badge-streak-dark shadow-sm">
            <span
              className="material-symbols-outlined text-[16px] animate-flame-pulse"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span className="text-xs font-bold">{totalCompletedDays > 0 ? `${totalCompletedDays} Leituras` : '0 Dias'}</span>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="bg-slate-200/80 dark:bg-dark-card-base p-1 rounded-2xl flex relative w-full border border-slate-200 dark:border-dark-border">
          <button
            onClick={() => setTab('descobrir')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center ${
              tab === 'descobrir'
                ? 'bg-white dark:bg-slate-800 text-sacred-brand dark:text-sacred-neon shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Descobrir
          </button>
          <button
            onClick={() => setTab('meus')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center ${
              tab === 'meus'
                ? 'bg-white dark:bg-slate-800 text-sacred-brand dark:text-sacred-neon shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Minhas Jornadas {activePlanId ? '•' : ''}
          </button>
        </div>
      </header>

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <main className="px-5 py-4 text-left space-y-6">
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: DESCOBRIR                                                      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {tab === 'descobrir' && (
          <>
            {/* Active Plan Quick Card (se existir) */}
            {activePlan && activeProgress && (
              <div
                onClick={() => handleOpenPlan(activePlan)}
                className="rounded-2xl p-4 bg-gradient-to-r from-sacred-brand/10 via-sacred-brand/5 to-transparent border border-sacred-brand/30 cursor-pointer shadow-soft hover:border-sacred-brand transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: activePlan.accentColor }}
                  >
                    <span className="material-symbols-outlined text-xl">{activePlan.icon}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-sacred-brand dark:text-sacred-neon tracking-wider block">
                      Jornada em Andamento
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                      {activePlan.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Dia {activeProgress.currentDay} de {activePlan.days.length} •{' '}
                      {activeProgress.completedDays.length} concluídos
                    </p>
                  </div>
                </div>
                <button className="bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 shadow-sm">
                  Continuar
                </button>
              </div>
            )}

            {/* SEÇÃO 1: JORNADAS GRATUITAS */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-xs uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-emerald-500">
                      check_circle
                    </span>
                    <span>Jornadas para toda a família (Free)</span>
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {freePlans.length} percursos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {freePlans.map((plan) => {
                  const progress = plansProgress[plan.id];
                  const isDone = progress?.isCompleted;
                  const completedCount = progress?.completedDays?.length || 0;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleOpenPlan(plan)}
                      className="group rounded-2xl bg-white dark:bg-dark-card-base p-4 border border-slate-200/80 dark:border-dark-border shadow-soft hover:border-sacred-brand dark:hover:border-sacred-neon transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <span
                            className="size-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: plan.accentColor }}
                          >
                            <span className="material-symbols-outlined text-lg">{plan.icon}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50">
                              Gratuito
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              {plan.sprintDays} Dias
                            </span>
                          </div>
                        </div>

                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-sacred-brand dark:group-hover:text-sacred-neon transition-colors leading-tight">
                          {plan.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-snug line-clamp-2">
                          {plan.subtitle}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <span>{plan.badge.icon}</span>
                          <span className="truncate max-w-[120px]">{plan.badge.label}</span>
                        </div>

                        {isDone ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            <span>Concluído</span>
                          </span>
                        ) : completedCount > 0 ? (
                          <span className="text-[11px] font-bold text-sacred-brand dark:text-sacred-neon">
                            {completedCount}/{plan.days.length} dias
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-sacred-brand dark:text-sacred-neon flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Ver Jornada</span>
                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 2: JORNADAS HISTÓRICAS E TEOLÓGICAS (PREMIUM) */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-xs uppercase tracking-wider font-extrabold text-gold-talent dark:text-gold-radiant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-amber-500">
                      auto_awesome
                    </span>
                    <span>Jornadas Premium</span>
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {plusPlans.length} percursos de imersão
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {plusPlans.map((plan) => {
                  const progress = plansProgress[plan.id];
                  const isDone = progress?.isCompleted;
                  const hasPremiumAccess = currentPlan === 'PREMIUM' || currentPlan === 'MASTER';

                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleOpenPlan(plan)}
                      className="group rounded-2xl bg-white dark:bg-dark-card-base p-4 border border-slate-200/80 dark:border-dark-border shadow-soft hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <span
                            className="size-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: plan.accentColor }}
                          >
                            <span className="material-symbols-outlined text-lg">{plan.icon}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300/40 flex items-center gap-0.5">
                              {!hasPremiumAccess && (
                                <span className="material-symbols-outlined text-[11px]">lock</span>
                              )}
                              <span>Premium</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              {plan.sprintDays} Dias
                            </span>
                          </div>
                        </div>

                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">
                          {plan.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-snug line-clamp-2">
                          {plan.subtitle}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          <span>{plan.badge.icon}</span>
                          <span className="truncate max-w-[110px]">{plan.badge.label}</span>
                        </div>

                        {isDone ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            <span>Concluído</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Explorar</span>
                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO 3: BANNER APOIADOR MISSIONÁRIO */}
            <div className="rounded-3xl bg-[#fdf6f2] dark:bg-[#2c201c] p-5 border border-terracotta/25 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-terracotta text-xl">
                  volunteer_activism
                </span>
                <h4 className="font-extrabold text-terracotta dark:text-amber-200 text-sm">
                  Apoie a Expansão Missionária
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed font-medium">
                O Premium desbloqueia percursos históricos, comentários contextuais e mapas bíblicos interativos.
              </p>
              <button
                onClick={openPricingModal}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 text-white font-bold text-xs py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Conhecer o Premium</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: MEUS PLANOS / MINHAS JORNADAS                                  */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {tab === 'meus' && (
          <div className="space-y-6">
            {/* Jornada Ativa Atual */}
            {activePlan && activeProgress ? (
              <div className="rounded-2xl bg-white dark:bg-dark-card-base p-5 border border-slate-200/80 dark:border-dark-border shadow-soft space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: activePlan.accentColor }}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {activePlan.icon}
                      </span>
                    </span>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-sacred-brand dark:text-sacred-neon tracking-wider block">
                        Jornada Ativa
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                        {activePlan.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {activePlan.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="text-2xl">{activePlan.badge.icon}</span>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>Progresso da Leitura</span>
                    <span>
                      {activeProgress.completedDays.length} de {activePlan.days.length} Dias (
                      {Math.round(
                        (activeProgress.completedDays.length / activePlan.days.length) * 100
                      )}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round(
                          (activeProgress.completedDays.length / activePlan.days.length) * 100
                        )}%`,
                        backgroundColor: activePlan.accentColor,
                      }}
                    />
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => handleOpenPlan(activePlan)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    <span>Continuar Dia {activeProgress.currentDay}</span>
                  </button>
                  <button
                    onClick={() => handleOpenPlan(activePlan)}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Ver Todos os Dias
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-dark-card-base p-6 border border-slate-200/80 dark:border-dark-border shadow-soft text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
                  menu_book
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                    Nenhuma jornada ativa no momento
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Escolha uma das 5 jornadas na aba "Descobrir" para iniciar seu percurso de leitura diária.
                  </p>
                </div>
                <button
                  onClick={() => setTab('descobrir')}
                  className="px-4 py-2 bg-sacred-brand dark:bg-sacred-neon text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-sm hover:brightness-110"
                >
                  Explorar Jornadas
                </button>
              </div>
            )}

            {/* Galeria de Insígnias Conquistadas */}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-3 px-1">
                Insígnias de Leitura
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {READING_PLANS.map((plan) => {
                  const progress = plansProgress[plan.id];
                  const unlocked = progress?.badgeUnlocked;

                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-3.5 border flex flex-col items-center text-center transition-all ${
                        unlocked
                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50 shadow-soft'
                          : 'bg-white dark:bg-dark-card-base border-slate-200/60 dark:border-dark-border opacity-50 grayscale'
                      }`}
                    >
                      <span className="text-2xl mb-1.5">{plan.badge.icon}</span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                        {plan.badge.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {unlocked ? 'Conquistada' : plan.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Modal de Detalhes da Jornada ────────────────────────────────────── */}
      {selectedPlanForModal && (
        <PlanDetailModal
          plan={selectedPlanForModal}
          progress={plansProgress[selectedPlanForModal.id] || null}
          isActive={activePlanId === selectedPlanForModal.id}
          onClose={() => setSelectedPlanForModal(null)}
          onPlanUpdated={refreshState}
          onNavigateToBible={handleNavigateToBible}
          showToast={showToast}
        />
      )}
    </div>
  );
};
