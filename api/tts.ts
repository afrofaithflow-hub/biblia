import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, voiceId = 'pt-PT-DuarteNeural' } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Campo text é obrigatório.' });
    }

    let targetVoice = voiceId;
    if (targetVoice === 'edge_paulo' || targetVoice === 'edge_davi' || targetVoice === 'eleven_davi' || targetVoice === 'eleven_paulo') {
      targetVoice = 'pt-PT-DuarteNeural';
    } else if (targetVoice === 'edge_ester' || targetVoice === 'eleven_ester') {
      targetVoice = 'pt-BR-FranciscaNeural';
    } else if (targetVoice === 'edge_timoteo' || targetVoice === 'eleven_timoteo') {
      targetVoice = 'pt-PT-RaquelNeural';
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text.slice(0, 3000));

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    audioStream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Falha ao sintetizar áudio com Edge Neural.' });
  }
}
