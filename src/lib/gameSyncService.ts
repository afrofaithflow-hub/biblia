/**
 * ==============================================================================
 * BiblIA — Serviço Canônico de Sincronização e Backend Supabase (G3)
 * Offline-First: localStorage como cache de execução instantânea e Supabase
 * como fonte canônica relacional protegida por RLS e Idempotência.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { GameResult } from './gameSession';
import {
  getUserProgressTracks,
  saveUserProgressTracks,
  getReviewQueue,
  addToReviewQueue,
  getMaputoDateKey,
} from './gameSession';
import type { ReviewQueueItem, UserProgressTracks } from '../types/gameContracts';

const OFFLINE_QUEUE_KEY = 'biblia:offline-game-attempts';

interface OfflineAttemptPayload {
  attemptId: string;
  result: GameResult;
  weekKey: string;
  queuedAt: string;
}

/** Retorna as tentativas salvas localmente aguardando sincronização com o Supabase */
export function getOfflineAttemptsQueue(): OfflineAttemptPayload[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Enfileira uma tentativa para envio posterior se estiver offline */
function enqueueOfflineAttempt(payload: OfflineAttemptPayload): void {
  try {
    const current = getOfflineAttemptsQueue();
    // Evita duplicatas na fila
    if (!current.some((item) => item.attemptId === payload.attemptId)) {
      current.push(payload);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('[gameSyncService] Falha ao enfileirar tentativa offline:', err);
  }
}

/** Remove uma tentativa da fila offline após sincronização confirmada */
function dequeueOfflineAttempt(attemptId: string): void {
  try {
    const current = getOfflineAttemptsQueue().filter((item) => item.attemptId !== attemptId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  } catch {
    // Silencioso
  }
}

/** Calcula a chave da semana canônica em Africa/Maputo (e.g. "2026-W45") */
export function getMaputoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Envia uma tentativa de jogo finalizada para o Supabase (ou enfileira offline).
 * Opera em background e com idempotência garantida pelo attemptId.
 */
export async function syncGameAttempt(
  attemptId: string,
  result: GameResult,
  answersLog?: Array<{ questionId: string; isCorrect: boolean; usedHint: boolean }>
): Promise<{ success: boolean; synced: boolean; message?: string }> {
  const weekKey = getMaputoWeekKey();

  // Se o Supabase não estiver configurado ou offline, enfileira localmente
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    enqueueOfflineAttempt({ attemptId, result, weekKey, queuedAt: new Date().toISOString() });
    return { success: true, synced: false, message: 'Gravado offline no dispositivo.' };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      // Utilizador não autenticado: mantém seguro em cache local
      enqueueOfflineAttempt({ attemptId, result, weekKey, queuedAt: new Date().toISOString() });
      return { success: true, synced: false, message: 'Pendente de autenticação.' };
    }

    // Chama a RPC canônica com idempotência no Supabase
    const { data, error } = await supabase.rpc('record_game_session', {
      p_attempt_id: attemptId,
      p_mode: result.mode,
      p_phase_id: result.phaseId || null,
      p_score: result.score,
      p_correct_count: result.correct,
      p_total_count: result.total,
      p_xp_earned: result.xpEarned,
      p_talents_earned: result.talentsEarned,
      p_stars_earned: result.starsEarned,
      p_lives_remaining: result.livesRemaining,
      p_is_completed: result.completed,
      p_week_key: weekKey,
      p_answers: answersLog || [],
    });

    if (error) {
      console.warn('[gameSyncService] Erro ao gravar tentativa no Supabase, mantendo na fila:', error);
      enqueueOfflineAttempt({ attemptId, result, weekKey, queuedAt: new Date().toISOString() });
      return { success: false, synced: false, message: error.message };
    }

    // Sucesso: remove da fila offline
    dequeueOfflineAttempt(attemptId);
    return { success: true, synced: true, message: 'Sincronizado com o servidor.' };
  } catch (err: any) {
    console.warn('[gameSyncService] Falha de rede ao sincronizar:', err);
    enqueueOfflineAttempt({ attemptId, result, weekKey, queuedAt: new Date().toISOString() });
    return { success: true, synced: false, message: 'Guardado para sincronizar quando houver rede.' };
  }
}

/**
 * Tenta esvaziar a fila de tentativas offline enviando-as ao servidor.
 */
export async function flushOfflineAttemptsQueue(): Promise<number> {
  if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 0;
  }

  const queue = getOfflineAttemptsQueue();
  if (queue.length === 0) return 0;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) return 0;

  let syncedCount = 0;

  for (const item of queue) {
    try {
      const res = await syncGameAttempt(item.attemptId, item.result);
      if (res.synced) {
        syncedCount++;
      }
    } catch {
      // Prossegue com os restantes
    }
  }

  return syncedCount;
}

/**
 * Puxa o progresso remoto do utilizador e faz merge com o cache local (estratégia de maior valor).
 */
export async function pullRemoteProgress(): Promise<UserProgressTracks | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_game_progress')
      .select('lifetime_xp, walk_level, mastery_stars, streak_days, streak_frozen')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    const localTracks = getUserProgressTracks();
    const mergedTracks: UserProgressTracks = {
      ...localTracks,
      lifetimeXp: Math.max(localTracks.lifetimeXp, data.lifetime_xp ?? 0),
      walkLevel: Math.max(localTracks.walkLevel, data.walk_level ?? 1),
      masteryStars: Math.max(localTracks.masteryStars, data.mastery_stars ?? 0),
      streakDays: Math.max(localTracks.streakDays, data.streak_days ?? 1),
    };

    saveUserProgressTracks(mergedTracks);
    return mergedTracks;
  } catch (err) {
    console.warn('[gameSyncService] Falha ao puxar progresso remoto:', err);
    return null;
  }
}

/**
 * Puxa e sincroniza a fila de repetição espaçada com o Supabase.
 */
export async function syncRemoteReviewQueue(): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    // 1. Puxa itens remotos
    const { data: remoteItems, error } = await supabase
      .from('user_review_queue')
      .select('*')
      .eq('user_id', userId);

    if (error || !remoteItems) return;

    // 2. Mescla no localStorage
    for (const item of remoteItems) {
      addToReviewQueue({
        questionId: item.question_id,
        phaseId: item.phase_id,
        prompt: item.prompt,
        reference: item.scripture_reference,
        topic: item.topic,
        failedCount: item.failed_count,
        intervalDays: item.interval_days as 1 | 3 | 7 | 14 | 30,
        nextReviewDate: item.next_review_date,
      });
    }

    // 3. Envia itens locais que ainda não estão no servidor
    const localQueue = getReviewQueue();
    const remoteQuestionIds = new Set(remoteItems.map((r) => r.question_id));
    const missingInRemote = localQueue.filter((l) => !remoteQuestionIds.has(l.questionId));

    if (missingInRemote.length > 0) {
      const inserts = missingInRemote.map((item) => ({
        user_id: userId,
        question_id: item.questionId,
        phase_id: item.phaseId || null,
        prompt: item.prompt,
        scripture_reference: item.reference,
        topic: item.topic,
        failed_count: item.failedCount,
        interval_days: item.intervalDays,
        next_review_date: item.nextReviewDate,
      }));

      await supabase.from('user_review_queue').upsert(inserts, { onConflict: 'user_id,question_id' });
    }
  } catch (err) {
    console.warn('[gameSyncService] Falha ao sincronizar fila de revisão:', err);
  }
}
