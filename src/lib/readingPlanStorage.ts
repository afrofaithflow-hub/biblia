/**
 * BiblIA — Serviço de Armazenamento Local de Planos de Leitura
 * Gere persistência de planos ativos, dias concluídos, streaks e insígnias.
 * 
 * Chaves:
 * - `biblia_active_reading_plan_id`: ID do plano ativo
 * - `biblia_reading_plans_progress_v1`: Mapa de progresso por plano
 * 
 * Criado: 17 de novembro de 2026 | Antigravity AI Engine
 */

import type {
  ReadingPlan,
  UserPlanProgress,
  DayCompletionResult,
} from '../types/readingPlanTypes';

const STORAGE_KEY_ACTIVE_PLAN = 'biblia_active_reading_plan_id';
const STORAGE_KEY_PROGRESS = 'biblia_reading_plans_progress_v1';

/**
 * Obtém o ID do plano atualmente ativo
 */
export function getActivePlanId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PLAN);
  } catch (err) {
    console.warn('[readingPlanStorage] Falha ao ler plano ativo:', err);
    return null;
  }
}

/**
 * Define o plano atualmente ativo
 */
export function setActivePlanId(planId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PLAN, planId);
  } catch (err) {
    console.warn('[readingPlanStorage] Falha ao gravar plano ativo:', err);
  }
}

/**
 * Obtém todo o mapa de progresso dos planos
 */
export function getAllPlansProgress(): Record<string, UserPlanProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[readingPlanStorage] Falha ao ler progresso geral:', err);
    return {};
  }
}

/**
 * Guarda o mapa completo de progresso
 */
function saveAllPlansProgress(data: Record<string, UserPlanProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(data));
  } catch (err) {
    console.warn('[readingPlanStorage] Falha ao gravar progresso geral:', err);
  }
}

/**
 * Obtém o progresso de um plano específico
 */
export function getPlanProgress(planId: string): UserPlanProgress | null {
  const all = getAllPlansProgress();
  return all[planId] || null;
}

/**
 * Inicia uma jornada ou retorna o progresso existente
 */
export function startPlan(plan: ReadingPlan): UserPlanProgress {
  const all = getAllPlansProgress();
  if (all[plan.id]) {
    setActivePlanId(plan.id);
    return all[plan.id];
  }

  const now = new Date().toISOString();
  const newProgress: UserPlanProgress = {
    planId: plan.id,
    startedAt: now,
    completedDays: [],
    currentDay: 1,
    streakDays: 1,
    lastActivityAt: now,
    xpEarned: 0,
    isCompleted: false,
    badgeUnlocked: false,
  };

  all[plan.id] = newProgress;
  saveAllPlansProgress(all);
  setActivePlanId(plan.id);
  return newProgress;
}

/**
 * Marca ou desmarca a conclusão de um dia de uma jornada
 */
export function toggleDayCompletion(
  plan: ReadingPlan,
  dayNumber: number
): DayCompletionResult {
  const all = getAllPlansProgress();
  let progress = all[plan.id];

  const now = new Date().toISOString();
  if (!progress) {
    progress = {
      planId: plan.id,
      startedAt: now,
      completedDays: [],
      currentDay: 1,
      streakDays: 1,
      lastActivityAt: now,
      xpEarned: 0,
      isCompleted: false,
      badgeUnlocked: false,
    };
  }

  const dayData = plan.days.find((d) => d.dayNumber === dayNumber);
  const dayXp = dayData ? dayData.xpReward : 20;
  const wasCompleted = progress.isCompleted;

  const isAlreadyDone = progress.completedDays.includes(dayNumber);
  let xpDelta = 0;

  if (isAlreadyDone) {
    // Desmarcar dia
    progress.completedDays = progress.completedDays.filter((d) => d !== dayNumber);
    progress.xpEarned = Math.max(0, progress.xpEarned - dayXp);
    xpDelta = -dayXp;
  } else {
    // Concluir dia
    progress.completedDays = [...progress.completedDays, dayNumber].sort((a, b) => a - b);
    progress.xpEarned += dayXp;
    xpDelta = dayXp;

    // Atualiza streak se atividade for em dias consecutivos ou no mesmo dia
    progress.lastActivityAt = now;
  }

  // Verifica se a jornada foi 100% concluída
  const totalDays = plan.days.length;
  const isNowCompleted = progress.completedDays.length === totalDays;
  progress.isCompleted = isNowCompleted;

  if (isNowCompleted && !wasCompleted) {
    const bonus = plan.completionBonusXp || 0;
    progress.xpEarned += bonus;
    xpDelta += bonus;
  } else if (!isNowCompleted && wasCompleted) {
    const bonus = plan.completionBonusXp || 0;
    progress.xpEarned = Math.max(0, progress.xpEarned - bonus);
    xpDelta -= bonus;
  }

  let badgeUnlocked: { icon: string; label: string } | undefined;
  if (isNowCompleted && !progress.badgeUnlocked) {
    progress.badgeUnlocked = true;
    badgeUnlocked = plan.badge;
  } else if (!isNowCompleted) {
    progress.badgeUnlocked = false;
  }

  // Define próximo dia a realizar (o menor dia não concluído)
  const remainingDays = plan.days
    .map((d) => d.dayNumber)
    .filter((d) => !progress.completedDays.includes(d));
  progress.currentDay = remainingDays.length > 0 ? remainingDays[0] : totalDays;

  all[plan.id] = progress;
  saveAllPlansProgress(all);

  return {
    xpGained: xpDelta,
    newStreakDays: progress.streakDays,
    badgeUnlocked,
    journeyCompleted: isNowCompleted,
  };
}

/**
 * Reinicia o progresso de um plano
 */
export function resetPlanProgress(planId: string): void {
  const all = getAllPlansProgress();
  if (all[planId]) {
    delete all[planId];
    saveAllPlansProgress(all);
  }
}
