/**
 * BiblIA — Serviço Canónico de Visitante Local e Migração de Progresso (Fase D2)
 * Garante installation_id estável, gestão de dados offline e migração
 * idempotente pós-autenticação.
 * Assinatura: Antigravity AI Engine | Africa/Maputo
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { flushOfflineAttemptsQueue } from './gameSyncService';

const INSTALLATION_ID_KEY = 'biblia_installation_id_v1';
const GUEST_MIGRATED_KEY = 'biblia_guest_migrated_for_user_';

/** Retorna ou gera um installation_id estável e anónimo para este dispositivo */
export function getInstallationId(): string {
  try {
    let id = localStorage.getItem(INSTALLATION_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'inst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(INSTALLATION_ID_KEY, id);
    }
    return id;
  } catch {
    return 'inst_fallback_' + Date.now();
  }
}

/** Resumo dos dados locais que um visitante acumulou no dispositivo */
export interface LocalUserDataSummary {
  bookmarksCount: number;
  notesCount: number;
  highlightsCount: number;
  hasReadingProgress: boolean;
  offlineAttemptsCount: number;
}

export function getLocalUserDataSummary(): LocalUserDataSummary {
  let bookmarksCount = 0;
  let notesCount = 0;
  let highlightsCount = 0;
  let hasReadingProgress = false;
  let offlineAttemptsCount = 0;

  try {
    const rawBm = localStorage.getItem('biblia_verse_favorites');
    if (rawBm) bookmarksCount = Object.keys(JSON.parse(rawBm)).length || 0;

    const rawNt = localStorage.getItem('biblia_verse_notes');
    if (rawNt) notesCount = Object.keys(JSON.parse(rawNt)).length || 0;

    const rawHl = localStorage.getItem('biblia_verse_highlights');
    if (rawHl) highlightsCount = Object.keys(JSON.parse(rawHl)).length || 0;

    const rawRead = localStorage.getItem('biblia_last_read');
    if (rawRead) hasReadingProgress = true;

    const rawQueue = localStorage.getItem('biblia:offline-game-attempts');
    if (rawQueue) offlineAttemptsCount = JSON.parse(rawQueue).length || 0;
  } catch {
    // Silencioso
  }

  return {
    bookmarksCount,
    notesCount,
    highlightsCount,
    hasReadingProgress,
    offlineAttemptsCount,
  };
}

/**
 * Executa a migração atómica dos dados locais do visitante para a conta Supabase autenticada.
 * A RPC migrate_guest_data no servidor assegura idempotência por installation_id + user_id.
 */
export async function performGuestMigration(userId: string): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !userId) {
    return { success: false, message: 'Supabase não configurado ou utilizador ausente.' };
  }

  const installationId = getInstallationId();
  const migratedFlagKey = `${GUEST_MIGRATED_KEY}${userId}_${installationId}`;

  // Se já foi migrado nesta sessão/dispositivo, evita chamada desnecessária
  if (localStorage.getItem(migratedFlagKey) === 'true') {
    return { success: true, message: 'Dados deste dispositivo já sincronizados.' };
  }

  try {
    // 1. Extrair dados locais do visitante
    let readingPayload: Record<string, unknown> | null = null;
    let bookmarksPayload: unknown[] = [];
    let notesPayload: unknown[] = [];
    let highlightsPayload: unknown[] = [];

    const rawRead = localStorage.getItem('biblia_last_read');
    if (rawRead) {
      try {
        const parsed = JSON.parse(rawRead);
        readingPayload = {
          last_book: parsed.book || 'Gênesis',
          last_chapter: parsed.chapter || 1,
          last_verse: parsed.verse || 1,
          translation_id: parsed.translationId || 'blivre',
        };
      } catch {}
    }

    const rawBm = localStorage.getItem('biblia_verse_favorites');
    if (rawBm) {
      try {
        const parsed = JSON.parse(rawBm);
        bookmarksPayload = Object.values(parsed).map((b: any) => ({
          book: b.book,
          chapter: b.chapter,
          verse: b.verse,
          verse_text: b.text || '',
          translation_id: b.translation || 'blivre',
        }));
      } catch {}
    }

    const rawNt = localStorage.getItem('biblia_verse_notes');
    if (rawNt) {
      try {
        const parsed = JSON.parse(rawNt);
        notesPayload = Object.values(parsed).map((n: any) => ({
          book: n.book,
          chapter: n.chapter,
          verse: n.verse,
          content: n.noteText || '',
        }));
      } catch {}
    }

    const rawHl = localStorage.getItem('biblia_verse_highlights');
    if (rawHl) {
      try {
        const parsed = JSON.parse(rawHl);
        highlightsPayload = Object.entries(parsed).map(([key, color]) => {
          const [book, ch, v] = key.split('_');
          return {
            book,
            chapter: parseInt(ch, 10) || 1,
            verse: parseInt(v, 10) || 1,
            color: color || 'teal',
          };
        });
      } catch {}
    }

    // 2. Chamar RPC transacional no Supabase
    const { data, error } = await supabase.rpc('migrate_guest_data', {
      p_installation_id: installationId,
      p_reading: readingPayload,
      p_bookmarks: bookmarksPayload,
      p_notes: notesPayload,
      p_highlights: highlightsPayload,
    });

    if (error) {
      console.warn('[guestMigrationService] Erro na RPC migrate_guest_data:', error.message);
      return { success: false, message: error.message };
    }

    // 3. Esvaziar fila offline de tentativas de jogo
    await flushOfflineAttemptsQueue();

    // 4. Marcar confirmação no cliente
    localStorage.setItem(migratedFlagKey, 'true');

    return {
      success: true,
      message: data?.duplicate
        ? 'Progresso verificado e atualizado.'
        : 'Progresso do dispositivo guardado na sua conta com sucesso!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao migrar dados.';
    console.error('[guestMigrationService] Exceção:', err);
    return { success: false, message: msg };
  }
}
