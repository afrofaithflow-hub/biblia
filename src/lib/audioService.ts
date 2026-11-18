import { AudioCatalogItem, DownloadQuotaResult, PlanTier } from '../types/biblia';

// Mock storage and cache store in-memory (and synced to localStorage)
const STORAGE_PREFIX = 'biblia_audio_catalog_v2.1';
const DOWNLOADS_PREFIX = 'biblia_daily_downloads_v2.1';

// Seed catalog with initial pre-generated chapters
const INITIAL_CATALOG: AudioCatalogItem[] = [
  {
    id: 'aud-salmos-23-pt-neural1',
    cache_key: 'salmos_23_pt_local_neural_davi_ambient_strings',
    book: 'Salmos',
    chapter: 23,
    language: 'pt',
    translation: 'pt-local-legacy',
    voice_id: 'neural_davi_pt',
    ambient_id: 'soft_ambient_strings',
    storage_path: 'audio/salmos/salmos_23_neural_davi.mp3',
    duration_seconds: 130, // 2:10
    file_size_bytes: 2097152, // 2 MB
    tts_provider: 'neural_ai',
    generation_cost_usd: 0.003120, // $0.0031
    play_count: 1420,
    status: 'ready',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'aud-joao-3-pt-neural2',
    cache_key: 'joao_3_pt_local_neural_serena_ambient_harp',
    book: 'João',
    chapter: 3,
    language: 'pt',
    translation: 'pt-local-legacy',
    voice_id: 'neural_serena_pt',
    ambient_id: 'harp_and_wind',
    storage_path: 'audio/joao/joao_3_neural_serena.mp3',
    duration_seconds: 245, // 4:05
    file_size_bytes: 3942000,
    tts_provider: 'neural_ai',
    generation_cost_usd: 0.005880,
    play_count: 890,
    status: 'ready',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export class AudioService {
  private static getCatalog(): AudioCatalogItem[] {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_CATALOG;
  }

  private static saveCatalog(catalog: AudioCatalogItem[]) {
    try {
      localStorage.setItem(STORAGE_PREFIX, JSON.stringify(catalog));
    } catch {
      // ignore
    }
  }

  // Generate deterministic cache hash key
  public static generateCacheKey(
    book: string,
    chapter: number,
    language: string,
    translation: string,
    voiceId: string,
    ambientId: string
  ): string {
    const clean = `${book.toLowerCase()}_${chapter}_${language.toLowerCase()}_${translation.toLowerCase()}_${voiceId}_${ambientId}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_');
    return clean;
  }

  // 1. Check if audio exists and reuse
  public static async getOrGenerateAudio(params: {
    book: string;
    chapter: number;
    language?: string;
    translation?: string;
    voiceId: string;
    ambientId?: string;
  }): Promise<{ item: AudioCatalogItem; isReused: boolean }> {
    const language = params.language || 'pt';
    const translation = params.translation || 'pt-local-legacy';
    const ambientId = params.ambientId || 'none';
    const cacheKey = this.generateCacheKey(
      params.book,
      params.chapter,
      language,
      translation,
      params.voiceId,
      ambientId
    );

    const catalog = this.getCatalog();
    const existing = catalog.find((c) => c.cache_key === cacheKey);

    if (existing && existing.status === 'ready') {
      // Step 2: Reuse existing file! Zero additional TTS generation cost
      existing.play_count += 1;
      this.saveCatalog(catalog);
      return { item: existing, isReused: true };
    }

    // Step 3 & 4: Deduplicate lock and generate on demand
    const newItem: AudioCatalogItem = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      cache_key: cacheKey,
      book: params.book,
      chapter: params.chapter,
      language,
      translation,
      voice_id: params.voiceId,
      ambient_id: ambientId,
      storage_path: `audio/${params.book.toLowerCase()}/${cacheKey}.mp3`,
      duration_seconds: 180, // estimated 3 min
      file_size_bytes: 2800000,
      tts_provider: 'neural_ai',
      generation_cost_usd: 0.004500, // TTS synthesis cost
      play_count: 1,
      status: 'ready',
      created_at: new Date().toISOString(),
    };

    catalog.push(newItem);
    this.saveCatalog(catalog);

    return { item: newItem, isReused: false };
  }

  // Check and consume download quota (PRD Section 6)
  // - FREE: 0 downloads
  // - PREMIUM: max 5 chapters per day
  // - MASTER: unlimited
  public static checkAndRegisterDownload(
    userId: string,
    chapterRef: string,
    userTier: PlanTier,
    isSubscriptionActive: boolean
  ): DownloadQuotaResult {
    if (userTier === 0 || !isSubscriptionActive) {
      return {
        allowed: false,
        tier: 0,
        remaining_today: 0,
        reason: 'requires_premium_or_master',
      };
    }

    if (userTier === 2 && isSubscriptionActive) {
      return {
        allowed: true,
        tier: 2,
        remaining_today: 9999,
        unlimited: true,
      };
    }

    // PREMIUM (Tier 1)
    const today = new Date().toISOString().split('T')[0];
    const key = `${DOWNLOADS_PREFIX}_${userId}_${today}`;
    let downloadedToday: string[] = [];

    try {
      const stored = localStorage.getItem(key);
      if (stored) downloadedToday = JSON.parse(stored);
    } catch {
      // ignore
    }

    if (downloadedToday.includes(chapterRef)) {
      return {
        allowed: true,
        tier: 1,
        remaining_today: Math.max(0, 5 - downloadedToday.length),
        already_downloaded_today: true,
      };
    }

    if (downloadedToday.length >= 5) {
      return {
        allowed: false,
        tier: 1,
        remaining_today: 0,
        reason: 'daily_limit_reached',
      };
    }

    // Register new chapter download
    downloadedToday.push(chapterRef);
    try {
      localStorage.setItem(key, JSON.stringify(downloadedToday));
    } catch {
      // ignore
    }

    return {
      allowed: true,
      tier: 1,
      remaining_today: 5 - downloadedToday.length,
    };
  }

  public static getRemainingQuota(userId: string, userTier: PlanTier): number {
    if (userTier === 2) return 9999;
    if (userTier === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    const key = `${DOWNLOADS_PREFIX}_${userId}_${today}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const arr = JSON.parse(stored);
        return Math.max(0, 5 - arr.length);
      }
    } catch {
      // ignore
    }
    return 5;
  }
}
