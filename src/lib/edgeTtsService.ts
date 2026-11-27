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

export function buildEdgeTtsStreamUrl(text: string, voiceId: string): string {
  let targetVoice = voiceId || 'pt-PT-DuarteNeural';
  if (
    targetVoice === 'edge_paulo' ||
    targetVoice === 'edge_davi' ||
    targetVoice === 'eleven_davi' ||
    targetVoice === 'eleven_paulo'
  ) {
    targetVoice = 'pt-PT-DuarteNeural';
  } else if (targetVoice === 'edge_ester' || targetVoice === 'eleven_ester') {
    targetVoice = 'pt-BR-FranciscaNeural';
  } else if (targetVoice === 'edge_timoteo' || targetVoice === 'eleven_timoteo') {
    targetVoice = 'pt-PT-RaquelNeural';
  }
  return `/api/tts?text=${encodeURIComponent(text.trim())}&voiceId=${encodeURIComponent(targetVoice)}`;
}

export async function fetchEdgeNeuralAudio(
  text: string,
  verseContext: {
    translation: string;
    book: string;
    chapter: number;
    verse: number;
    voiceId: string;
  }
): Promise<{ url: string; source: 'cache' | 'stream' }> {
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

  // 1. Nível 1: Cache Local (IndexedDB) — 0ms, 0 consumo de rede
  try {
    const cachedBlob = await getCachedVerseAudio(cacheKey);
    if (cachedBlob && cachedBlob.size > 500) {
      return {
        url: URL.createObjectURL(cachedBlob),
        source: 'cache',
      };
    }
  } catch {
    // segue para streaming
  }

  // 2. Nível 2: URL de Streaming Direto Imediato (sem bloquear em downloads ou checagens lentas de nuvem)
  // O elemento de áudio inicia a reprodução do MP3 logo nos primeiros pacotes de áudio.
  const streamUrl = buildEdgeTtsStreamUrl(text, voiceId);

  // Armazena no IndexedDB em segundo plano para futuras execuções 100% offline
  void (async () => {
    try {
      const response = await fetch(streamUrl);
      if (response.ok) {
        const audioBlob = await response.blob();
        if (audioBlob && audioBlob.size > 500) {
          await saveCachedVerseAudio(cacheKey, audioBlob);
        }
      }
    } catch {
      // Falha não-fatal de cache em background
    }
  })();

  return {
    url: streamUrl,
    source: 'stream',
  };
}
