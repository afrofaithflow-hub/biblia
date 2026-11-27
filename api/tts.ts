import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Cache warm instances per voice model to eliminate repeated WebSocket handshakes
const ttsInstances = new Map<string, MsEdgeTTS>();

async function getOrCreateTts(voice: string): Promise<MsEdgeTTS> {
  let instance = ttsInstances.get(voice);
  if (!instance) {
    instance = new MsEdgeTTS();
    await instance.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    ttsInstances.set(voice, instance);
  }
  return instance;
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let text = '';
    let voiceId = 'pt-PT-DuarteNeural';

    if (req.method === 'GET') {
      text = (req.query?.text as string) || '';
      voiceId = (req.query?.voiceId as string) || 'pt-PT-DuarteNeural';
    } else {
      text = req.body?.text || '';
      voiceId = req.body?.voiceId || 'pt-PT-DuarteNeural';
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Campo text é obrigatório.' });
    }

    let targetVoice = voiceId;
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

    let tts: MsEdgeTTS;
    let streamData: any;

    try {
      tts = await getOrCreateTts(targetVoice);
      streamData = tts.toStream(text.slice(0, 3000));
    } catch {
      // Reconnect fresh instance if socket dropped
      tts = new MsEdgeTTS();
      await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      ttsInstances.set(targetVoice, tts);
      streamData = tts.toStream(text.slice(0, 3000));
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    streamData.audioStream.pipe(res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Falha ao sintetizar áudio com Edge Neural.' });
    }
  }
}
