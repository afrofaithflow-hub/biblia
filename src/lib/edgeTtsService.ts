/**
 * BiblIA — Serviço de Narração Edge Neural de Alta Fidelidade
 * Conecta ao endpoint Edge TTS (/api/tts), gerencia cache no IndexedDB e Supabase CDN,
 * garantindo reprodução instantânea de áudio MP3 de estúdio (Duarte, Francisca, etc.).
 */

import {
  buildAudioVerseKey,
  buildCloudStoragePath,
  getCachedVerseAudio,
  saveCachedVerseAudio,
  fetchFromCloudStorage,
  uploadToCloudStorage,
} from './audioCacheService';

export interface EdgeVoiceConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  modelId: string;
  gender: 'male' | 'female';
  isDefault?: boolean;
}

export const EDGE_VOICES: EdgeVoiceConfig[] = [
  {
    id: 'pt-PT-DuarteNeural',
    name: 'Duarte',
    role: 'Voz Oficial Canônica (Portugal)',
    description: 'Leitura solene, firme e reverente. Modelo neural de alta fidelidade para narração bíblica.',
    modelId: 'pt-PT-DuarteNeural',
    gender: 'male',
    isDefault: true,
  },
  {
    id: 'pt-BR-AntonioNeural',
    name: 'Antônio',
    role: 'Narrador Solene (Brasil)',
    description: 'Timbre masculino nobre, grave e compassado para passagens das Escrituras.',
    modelId: 'pt-BR-AntonioNeural',
    gender: 'male',
  },
  {
    id: 'pt-BR-FranciscaNeural',
    name: 'Francisca',
    role: 'Devocional Serena (Brasil)',
    description: 'Voz feminina suave, clara e acolhedora para oração e Salmos.',
    modelId: 'pt-BR-FranciscaNeural',
    gender: 'female',
  },
  {
    id: 'pt-PT-RaquelNeural',
    name: 'Raquel',
    role: 'Contemplativa (Portugal)',
    description: 'Dicção límpida, cadência pausada e expressiva para meditação diária.',
    modelId: 'pt-PT-RaquelNeural',
    gender: 'female',
  },
];

export async function fetchEdgeNeuralAudio(
  text: string,
  verseContext: {
    translation: string;
    book: string;
    chapter: number;
    verse: number;
    voiceId: string;
  }
): Promise<{ url: string; source: 'cache' | 'network' }> {
  // Normaliza identificadores antigos para modelos reais
  let voiceId = verseContext.voiceId || 'pt-PT-DuarteNeural';
  if (voiceId === 'edge_paulo' || voiceId === 'edge_davi' || voiceId === 'eleven_davi' || voiceId === 'eleven_paulo') {
    voiceId = 'pt-PT-DuarteNeural';
  } else if (voiceId === 'edge_ester' || voiceId === 'eleven_ester') {
    voiceId = 'pt-BR-FranciscaNeural';
  } else if (voiceId === 'edge_timoteo' || voiceId === 'eleven_timoteo') {
    voiceId = 'pt-PT-RaquelNeural';
  }

  const cacheKey = buildAudioVerseKey(
    verseContext.translation,
    verseContext.book,
    verseContext.chapter,
    verseContext.verse,
    voiceId
  );
  const cloudPath = buildCloudStoragePath(
    verseContext.translation,
    verseContext.book,
    verseContext.chapter,
    verseContext.verse,
    voiceId
  );

  // 1. Nível 1: Cache Local (IndexedDB) — 0ms, 0 consumo de rede
  const cachedBlob = await getCachedVerseAudio(cacheKey);
  if (cachedBlob) {
    return {
      url: URL.createObjectURL(cachedBlob),
      source: 'cache',
    };
  }

  // 2. Nível 2: Cache na Nuvem Global (Supabase Storage CDN)
  const cloudBlob = await fetchFromCloudStorage(cloudPath, cacheKey);
  if (cloudBlob) {
    return {
      url: URL.createObjectURL(cloudBlob),
      source: 'cache',
    };
  }

  // 3. Nível 3: Síntese Real via Serviço Edge TTS (MP3 de Estúdio)
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Falha ao sintetizar áudio com Edge Neural (HTTP ${response.status}).`
    );
  }

  const audioBlob = await response.blob();

  // Salva no IndexedDB local para repetições instantâneas offline
  void saveCachedVerseAudio(cacheKey, audioBlob);

  // Salva na nuvem Supabase CDN para a comunidade
  void uploadToCloudStorage(cloudPath, audioBlob);

  return {
    url: URL.createObjectURL(audioBlob),
    source: 'network',
  };
}
