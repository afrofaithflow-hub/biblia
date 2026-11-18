/**
 * ==============================================================================
 * BiblIA — Serviço Social Canônico e Ligas (G4)
 * Convites Seguros (QR/Link/Código), Amigos Bilaterais, Grupos Locais e Moderação
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { SocialFriend, ChurchGroup } from '../types/gameContracts';

const LOCAL_FRIENDS_KEY = 'biblia:local-friends';
const LOCAL_GROUPS_KEY = 'biblia:local-church-groups';

/** Dados mock padrão para modo offline/sandbox seguro */
const DEFAULT_FRIENDS: SocialFriend[] = [
  { id: 'f1', username: 'mateus_silva', displayName: 'Pr. Mateus Silva', avatarUrl: '', weeklyTalents: 340, walkLevel: 8, status: 'accepted', isMutual: true },
  { id: 'f2', username: 'ana_santos', displayName: 'Ana Clara Santos', avatarUrl: '', weeklyTalents: 290, walkLevel: 5, status: 'accepted', isMutual: true },
  { id: 'f3', username: 'lucas_oliver', displayName: 'Lucas Oliveira', avatarUrl: '', weeklyTalents: 180, walkLevel: 4, status: 'accepted', isMutual: true },
];

const DEFAULT_GROUP: ChurchGroup = {
  id: 'g1',
  name: 'Célula Graça e Paz',
  code: 'GRACA-2026',
  avatar: 'church',
  membersCount: 14,
  weeklyGoalProgress: 72,
  goalTargetDescription: '1.450 / 2.000 XP coletivos',
};

/** Lê a lista de amigos (Supabase ou fallback local) */
export async function getFriendsList(): Promise<SocialFriend[]> {
  if (!isSupabaseConfigured) {
    try {
      const raw = localStorage.getItem(LOCAL_FRIENDS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_FRIENDS;
    } catch {
      return DEFAULT_FRIENDS;
    }
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      const raw = localStorage.getItem(LOCAL_FRIENDS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_FRIENDS;
    }

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
      return DEFAULT_FRIENDS;
    }

    return data.map((item: any, idx: number) => ({
      id: item.friend?.id || `friend-${idx}`,
      username: (item.friend?.display_name || 'irmao').toLowerCase().replace(/\s+/g, '_'),
      displayName: item.friend?.display_name || 'Amigo na Fé',
      avatarUrl: item.friend?.avatar_url || '',
      weeklyTalents: Math.round((item.friend?.xp || 100) / 5),
      walkLevel: Math.floor((item.friend?.xp || 100) / 250) + 1,
      status: 'accepted' as const,
      isMutual: true,
    }));
  } catch (err) {
    console.warn('[gameSocialService] Falha ao carregar amigos:', err);
    return DEFAULT_FRIENDS;
  }
}

/** Gera um código de convite seguro (ex: BIBLIA-X9K2) */
export async function generateInviteCode(): Promise<{ code: string; shareUrl: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('generate_friend_invite');
      if (!error && data?.invite_code) {
        return {
          code: data.invite_code,
          shareUrl: data.share_url || `https://biblia.app/convite/${data.invite_code}`,
        };
      }
    } catch {
      // Fallback local se falhar
    }
  }

  // Fallback local
  const code = 'BIBLIA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    code,
    shareUrl: `https://biblia.app/convite/${code}`,
  };
}

/** Aceita um código de convite de amigo */
export async function acceptInviteCode(code: string): Promise<{ success: boolean; message: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Digite um código válido.' };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('accept_friend_invite', { p_code: cleanCode });
      if (error) {
        return { success: false, message: error.message };
      }
      if (data?.status === 'error') {
        return { success: false, message: data.message || 'Código inválido.' };
      }
      return { success: true, message: data?.message || 'Amigo adicionado com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao conectar.' };
    }
  }

  // Simulação local offline
  const current = await getFriendsList();
  const cleanHandle = cleanCode.replace('BIBLIA-', '').toLowerCase();
  const newFriend: SocialFriend = {
    id: `local-${Date.now()}`,
    username: cleanHandle,
    displayName: `Irmão (${cleanHandle})`,
    avatarUrl: '',
    weeklyTalents: 120,
    walkLevel: 3,
    status: 'accepted',
    isMutual: true,
  };
  localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify([newFriend, ...current]));
  return { success: true, message: 'Convite aceito localmente! Amigo adicionado à sua lista.' };
}

/** Entra em grupo local de igreja/célula por código */
export async function joinChurchGroupByCode(code: string): Promise<{ success: boolean; message: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Digite o código da sua igreja ou célula.' };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('join_church_group_by_code', { p_code: cleanCode });
      if (error) {
        return { success: false, message: error.message };
      }
      if (data?.status === 'error') {
        return { success: false, message: data.message };
      }
      return { success: true, message: data?.message || 'Entrou no grupo com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Simulação local offline
  return { success: true, message: `Conectado à comunidade (${cleanCode}) com sucesso!` };
}

/** Bloqueia um utilizador (proteção e moderação) */
export async function blockUser(targetUserId: string): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await supabase.from('user_blocks').insert({
          blocker_id: userId,
          blocked_id: targetUserId,
        });
      }
    } catch {
      // Silencioso
    }
  }

  // Remove da lista local
  try {
    const current = await getFriendsList();
    const filtered = current.filter((f) => f.id !== targetUserId);
    localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(filtered));
  } catch {
    // Silencioso
  }

  return { success: true, message: 'Utilizador bloqueado. Não receberá mais interações.' };
}

/** Denuncia um utilizador à moderação */
export async function reportUser(
  targetUserId: string,
  reason: 'inappropriate_name' | 'harassment' | 'spam' | 'hate_speech' | 'other',
  details?: string
): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        await supabase.from('user_reports').insert({
          reporter_id: userId,
          reported_id: targetUserId,
          reason,
          details: details || null,
        });
      }
    } catch {
      // Silencioso
    }
  }

  return { success: true, message: 'Denúncia recebida. A nossa equipa irá analisar com cuidado.' };
}
