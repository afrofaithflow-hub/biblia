/**
 * BiblIA — Serviço de Cache de Áudio Híbrido (IndexedDB Local + Supabase Storage CDN)
 * Armazena e recupera ficheiros de áudio sintetizados (MP3 Blobs)
 * para garantir custo zero em repetições e reprodução instantânea para toda a comunidade.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'biblia_audio_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'verse_audio_blobs';
export const AUDIO_STORAGE_BUCKET = 'biblia-audio';

interface CachedAudioRecord {
  key: string;
  blob: Blob;
  size: number;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Gera a chave única de identificação do versículo para o IndexedDB.
 */
export function buildAudioVerseKey(
  translation: string,
  book: string,
  chapter: number,
  verse: number,
  voiceId: string
): string {
  const cleanBook = book.toLowerCase().replace(/\s+/g, '-');
  return `verse_${translation.toLowerCase()}_${cleanBook}_${chapter}_${verse}_${voiceId}`;
}

/**
 * Gera o caminho estruturado do ficheiro no Supabase Storage.
 * Exemplo: blivre/eleven_davi/salmos/23_1.mp3
 */
export function buildCloudStoragePath(
  translation: string,
  book: string,
  chapter: number,
  verse: number,
  voiceId: string
): string {
  const cleanBook = book.toLowerCase().replace(/\s+/g, '-');
  return `${translation.toLowerCase()}/${voiceId}/${cleanBook}/${chapter}_${verse}.mp3`;
}

/**
 * Obtém o áudio do versículo a partir do IndexedDB local.
 */
export async function getCachedVerseAudio(key: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result as CachedAudioRecord | undefined;
        if (record && record.blob) {
          resolve(record.blob);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Grava o ficheiro de áudio (Blob MP3) no IndexedDB local.
 */
export async function saveCachedVerseAudio(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record: CachedAudioRecord = {
        key,
        blob,
        size: blob.size,
        timestamp: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[audioCacheService] Erro ao gravar no IndexedDB:', err);
  }
}

/**
 * Verifica se o áudio já existe no Supabase Storage CDN.
 * Se existir, descarrega o Blob, guarda no IndexedDB local e devolve a URL.
 */
export async function fetchFromCloudStorage(
  storagePath: string,
  localCacheKey: string
): Promise<Blob | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: publicUrlData } = supabase.storage
      .from(AUDIO_STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    if (!publicUrlData?.publicUrl) return null;

    // Faz um HEAD/GET rápido para verificar existência
    const response = await fetch(publicUrlData.publicUrl, { method: 'GET' });
    if (response.ok && response.status === 200) {
      const blob = await response.blob();
      if (blob && blob.size > 500) {
        // Grava no IndexedDB local para acessos futuros instantâneos
        void saveCachedVerseAudio(localCacheKey, blob);
        return blob;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Envia o ficheiro MP3 gerado para o Supabase Storage.
 * Garante que qualquer outro utilizador no mundo usará este ficheiro com custo zero de ElevenLabs.
 */
export async function uploadToCloudStorage(
  storagePath: string,
  blob: Blob
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase.storage
      .from(AUDIO_STORAGE_BUCKET)
      .upload(storagePath, blob, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000', // Cache por 1 ano na CDN
        upsert: true,
      });

    if (error) {
      console.warn('[audioCacheService] Aviso ao subir para Cloud Storage:', error.message);
    }
  } catch (err) {
    console.warn('[audioCacheService] Erro de rede ao sincronizar com Cloud Storage:', err);
  }
}

/**
 * Limpa todo o cache de áudio local do utilizador.
 */
export async function clearAudioCache(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[audioCacheService] Erro ao limpar cache de áudio:', err);
  }
}
