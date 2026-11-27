/**
 * BiblIA — Serviço Cliente de Narração Neural ElevenLabs
 * Conecta ao endpoint proxy do servidor (/api/tts), gerencia cache no IndexedDB
 * e mapeia vozes neurais de alta fidelidade para narração da Escritura.
 */

import {
  buildAudioVerseKey,
  buildCloudStoragePath,
  getCachedVerseAudio,
  saveCachedVerseAudio,
  fetchFromCloudStorage,
  uploadToCloudStorage,
} from './audioCacheService';

export interface ElevenLabsVoiceConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  elevenVoiceId: string;
  modelId: string;
  gender: 'male' | 'female';
}

export const ELEVENLABS_VOICES: ElevenLabsVoiceConfig[] = [
  {
    id: 'eleven_davi',
    name: 'Davi (Voz Solene)',
    role: 'Narrativa Clássica & Histórica',
    description: 'Timbre masculino nobre, grave e pausado para passagens solenes da Escritura.',
    elevenVoiceId: 'JBFqnCBsd6RMkjVDRZzb', // George
    modelId: 'eleven_multilingual_v2',
    gender: 'male',
  },
  {
    id: 'eleven_ester',
    name: 'Ester (Voz Serena)',
    role: 'Devocional & Oração',
    description: 'Timbre feminino suave, contemplativo e acolhedor para Salmos e meditações.',
    elevenVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    modelId: 'eleven_multilingual_v2',
    gender: 'female',
  },
  {
    id: 'eleven_paulo',
    name: 'Paulo (Voz Apostólica)',
    role: 'Ensino & Epístolas',
    description: 'Timbre masculino articulado, enérgico e firme para doutrina e exortação.',
    elevenVoiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    modelId: 'eleven_multilingual_v2',
    gender: 'male',
  },
  {
    id: 'eleven_timoteo',
    name: 'Timóteo (Voz Ponderada)',
    role: 'Estudo Bíblico Lento',
    description: 'Cadência ponderada com dicção clara para estudo guiado da Palavra.',
    elevenVoiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
    modelId: 'eleven_multilingual_v2',
    gender: 'male',
  },
];

export async function fetchVerseNeuralAudio(
  text: string,
  verseContext: {
    translation: string;
    book: string;
    chapter: number;
    verse: number;
    voiceId: string;
  }
): Promise<{ url: string; source: 'cache' | 'network' }> {
  const cacheKey = buildAudioVerseKey(
    verseContext.translation,
    verseContext.book,
    verseContext.chapter,
    verseContext.verse,
    verseContext.voiceId
  );
  const cloudPath = buildCloudStoragePath(
    verseContext.translation,
    verseContext.book,
    verseContext.chapter,
    verseContext.verse,
    verseContext.voiceId
  );

  // 1. Nível 1: Verificar Cache Local (IndexedDB) — 0ms, 0 consumo de rede
  const cachedBlob = await getCachedVerseAudio(cacheKey);
  if (cachedBlob) {
    return {
      url: URL.createObjectURL(cachedBlob),
      source: 'cache',
    };
  }

  // 2. Nível 2: Verificar Nuvem Global (Supabase Storage CDN) — 0 créditos ElevenLabs gastos!
  const cloudBlob = await fetchFromCloudStorage(cloudPath, cacheKey);
  if (cloudBlob) {
    return {
      url: URL.createObjectURL(cloudBlob),
      source: 'cache',
    };
  }

  // 3. Nível 3: Síntese Inédita via ElevenLabs
  const voiceConfig =
    ELEVENLABS_VOICES.find((v) => v.id === verseContext.voiceId) ||
    ELEVENLABS_VOICES[0];

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId: voiceConfig.elevenVoiceId,
      modelId: voiceConfig.modelId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Falha ao gerar áudio com ElevenLabs (HTTP ${response.status}).`
    );
  }

  const audioBlob = await response.blob();

  // Salva no IndexedDB local para uso offline
  void saveCachedVerseAudio(cacheKey, audioBlob);

  // Envia para o Supabase Storage CDN para que todos os outros utilizadores aproveitem
  void uploadToCloudStorage(cloudPath, audioBlob);

  return {
    url: URL.createObjectURL(audioBlob),
    source: 'network',
  };
}
