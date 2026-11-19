/**
 * Dados sociais do BiblIA.
 * Nunca cria amigos, ranking, grupos ou convites fictícios: ausência de dados é
 * um estado válido e deve chegar à interface como tal.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { SocialFriend } from '../types/gameContracts';

export interface LeagueEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weeklyTalents: number;
}

function getMaputoWeekKey(date = new Date()): string {
  const maputo = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Maputo' }));
  const day = maputo.getDay() || 7;
  maputo.setDate(maputo.getDate() + 4 - day);
  const yearStart = new Date(maputo.getFullYear(), 0, 1);
  const week = Math.ceil((((maputo.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${maputo.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Lê apenas amizades reais já aceites para a conta autenticada. */
export async function getFriendsList(): Promise<SocialFriend[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      friend_id,
      status,
      friend:profiles!friendships_friend_id_fkey(id, display_name, avatar_url, xp)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error || !data) {
    console.warn('[gameSocialService] Falha ao carregar amizades:', error?.message);
    return [];
  }

  return data.map((item: any) => {
    const xp = Number(item.friend?.xp || 0);
    return {
      id: item.friend?.id || item.friend_id,
      username: String(item.friend?.display_name || 'amigo').toLowerCase().replace(/\s+/g, '_'),
      displayName: item.friend?.display_name || 'Utilizador BiblIA',
      avatarUrl: item.friend?.avatar_url || '',
      weeklyTalents: 0,
      walkLevel: Math.max(1, Math.floor(xp / 250) + 1),
      status: 'accepted' as const,
      isMutual: true,
    };
  });
}

/** Lê o snapshot calculado pelo servidor para a semana corrente. */
export async function getLeagueRanking(): Promise<LeagueEntry[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('league_snapshots')
    .select('user_id, display_name, avatar_url, weekly_talents, rank_position')
    .eq('week_key', getMaputoWeekKey())
    .order('rank_position', { ascending: true })
    .limit(50);

  if (error || !data) {
    console.warn('[gameSocialService] Falha ao carregar ranking:', error?.message);
    return [];
  }

  return data.map((item) => ({
    rank: item.rank_position,
    userId: item.user_id,
    displayName: item.display_name,
    avatarUrl: item.avatar_url,
    weeklyTalents: item.weekly_talents,
  }));
}

/** Cria convite real via RPC. Sem conta, não há convite fictício. */
export async function generateInviteCode(): Promise<{ code: string; shareUrl: string } | null> {
  if (!await getAuthenticatedUserId()) return null;

  const { data, error } = await supabase.rpc('generate_friend_invite');
  if (error || !data?.invite_code) {
    console.warn('[gameSocialService] Falha ao gerar convite:', error?.message);
    return null;
  }

  return {
    code: data.invite_code,
    shareUrl: data.share_url || `${window.location.origin}/convite/${data.invite_code}`,
  };
}

export async function acceptInviteCode(code: string): Promise<{ success: boolean; message: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return { success: false, message: 'Digite um código válido.' };
  if (!await getAuthenticatedUserId()) {
    return { success: false, message: 'Entre numa conta para aceitar um convite.' };
  }

  const { data, error } = await supabase.rpc('accept_friend_invite', { p_code: cleanCode });
  if (error) return { success: false, message: error.message };
  if (data?.status === 'error') return { success: false, message: data.message || 'Código inválido.' };
  return { success: true, message: data?.message || 'Amizade adicionada com sucesso.' };
}

export async function joinChurchGroupByCode(code: string): Promise<{ success: boolean; message: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return { success: false, message: 'Digite o código da sua igreja ou célula.' };
  if (!await getAuthenticatedUserId()) {
    return { success: false, message: 'Entre numa conta para participar de um grupo.' };
  }

  const { data, error } = await supabase.rpc('join_church_group_by_code', { p_code: cleanCode });
  if (error) return { success: false, message: error.message };
  if (data?.status === 'error') return { success: false, message: data.message || 'Código inválido.' };
  return { success: true, message: data?.message || 'Entrou no grupo com sucesso.' };
}

export async function blockUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, message: 'Entre numa conta para bloquear alguém.' };

  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: userId,
    blocked_id: targetUserId,
  });
  return error
    ? { success: false, message: error.message }
    : { success: true, message: 'Utilizador bloqueado. Não receberá mais interações.' };
}

export async function reportUser(
  targetUserId: string,
  reason: 'inappropriate_name' | 'harassment' | 'spam' | 'hate_speech' | 'other',
  details?: string
): Promise<{ success: boolean; message: string }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, message: 'Entre numa conta para enviar uma denúncia.' };

  const { error } = await supabase.from('user_reports').insert({
    reporter_id: userId,
    reported_id: targetUserId,
    reason,
    details: details || null,
  });
  return error
    ? { success: false, message: error.message }
    : { success: true, message: 'Denúncia recebida. A nossa equipa irá analisar com cuidado.' };
}
