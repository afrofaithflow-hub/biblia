import { getMaputoDateKey } from './gameSession';

/**
 * BiblIA — Serviço Canónico de Quotas Diárias do Assistente Teológico
 * Limites por plano:
 * - FREE: 5 consultas/dia
 * - PRO: 25 consultas/dia
 * - MASTER: 60 consultas/dia
 * Renovação automática à meia-noite (Horário de Maputo / CAT).
 */

export function getPlanDailyLimit(planTier: number = 0): number {
  if (planTier >= 2) return 60;
  if (planTier === 1) return 25;
  return 5;
}

interface StoredUsageRecord {
  dateKey: string;
  count: number;
}

function getStorageKey(userId?: string | null): string {
  const cleanId = (userId || 'guest').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateKey = getMaputoDateKey();
  return `biblia_ai_quota_${cleanId}_${dateKey}`;
}

/**
 * Retorna o estado atual de consumo do utilizador no dia corrente.
 */
export function getDailyQuotaStatus(userId?: string | null, planTier: number = 0): {
  usedToday: number;
  remainingToday: number;
  limit: number;
  dateKey: string;
} {
  const limit = getPlanDailyLimit(planTier);
  const dateKey = getMaputoDateKey();

  if (typeof window === 'undefined') {
    return { usedToday: 0, remainingToday: limit, limit, dateKey };
  }

  const key = getStorageKey(userId);
  let usedToday = 0;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredUsageRecord;
      if (parsed.dateKey === dateKey && typeof parsed.count === 'number') {
        usedToday = Math.max(0, parsed.count);
      }
    }
  } catch {
    usedToday = 0;
  }

  const remainingToday = Math.max(0, limit - usedToday);
  return { usedToday, remainingToday, limit, dateKey };
}

/**
 * Registra o consumo de uma consulta com sucesso e retorna a contagem atualizada.
 */
export function recordSuccessfulConsultation(userId?: string | null, planTier: number = 0): {
  usedToday: number;
  remainingToday: number;
  limit: number;
} {
  const limit = getPlanDailyLimit(planTier);
  const dateKey = getMaputoDateKey();
  const key = getStorageKey(userId);

  const current = getDailyQuotaStatus(userId, planTier);
  const nextUsed = current.usedToday + 1;

  try {
    const payload: StoredUsageRecord = {
      dateKey,
      count: nextUsed,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Silencioso em caso de quota do browser
  }

  const remainingToday = Math.max(0, limit - nextUsed);
  return {
    usedToday: nextUsed,
    remainingToday,
    limit,
  };
}

/**
 * Verifica se o utilizador ainda tem consultas disponíveis hoje.
 */
export function hasRemainingQuota(userId?: string | null, planTier: number = 0): boolean {
  const { remainingToday } = getDailyQuotaStatus(userId, planTier);
  return remainingToday > 0;
}
