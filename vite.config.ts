import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { IncomingMessage, ServerResponse } from 'http';

// Cache warm instances per voice model to eliminate repeated WebSocket handshakes in dev server
const devTtsInstances = new Map<string, MsEdgeTTS>();

async function getOrCreateDevTts(voice: string): Promise<MsEdgeTTS> {
  let instance = devTtsInstances.get(voice);
  if (!instance) {
    instance = new MsEdgeTTS();
    await instance.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    devTtsInstances.set(voice, instance);
  }
  return instance;
}

function neuralTtsPlugin(elevenLabsKey?: string) {
  return {
    name: 'neural-tts-server',
    configureServer(server: any) {
      server.middlewares.use('/api/tts', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
          res.end();
          return;
        }

        if (req.method !== 'GET' && req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        const handleSynthesis = async (text: string, voiceId: string, modelId: string = 'eleven_multilingual_v2') => {
          try {
            if (!text || typeof text !== 'string') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Campo text é obrigatório.' }));
              return;
            }

            // Normalização de voz para modelo Edge Neural
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

            // Síntese prioritária via Microsoft Edge Neural (100% gratuito e alta fidelidade)
            if (targetVoice.startsWith('pt-') || !elevenLabsKey) {
              let tts: MsEdgeTTS;
              let streamData: any;
              try {
                tts = await getOrCreateDevTts(targetVoice);
                streamData = tts.toStream(text.slice(0, 3000));
              } catch {
                tts = new MsEdgeTTS();
                await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
                devTtsInstances.set(targetVoice, tts);
                streamData = tts.toStream(text.slice(0, 3000));
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
              streamData.audioStream.pipe(res);
              return;
            }

            // Fallback ElevenLabs se chave estiver explicitamente configurada
            const client = new ElevenLabsClient({ apiKey: elevenLabsKey });
            const audioStream = await client.textToSpeech.convert(voiceId, {
              text: text.slice(0, 2000),
              modelId,
              outputFormat: 'mp3_44100_128',
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

            const reader = audioStream.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                res.write(Buffer.from(value));
              }
            }
            res.end();
          } catch (err: any) {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Falha ao sintetizar áudio neural.' }));
            }
          }
        };

        if (req.method === 'GET') {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const text = urlObj.searchParams.get('text') || '';
          const voiceId = urlObj.searchParams.get('voiceId') || 'pt-PT-DuarteNeural';
          await handleSynthesis(text, voiceId);
        } else {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              await handleSynthesis(data.text, data.voiceId, data.modelId);
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'JSON inválido' }));
            }
          });
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const elevenLabsApiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (elevenLabsApiKey && !process.env.ELEVENLABS_API_KEY) {
    process.env.ELEVENLABS_API_KEY = elevenLabsApiKey;
  }

  return {
    plugins: [
      react(),
      neuralTtsPlugin(elevenLabsApiKey),
      VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      filename: 'sw.js',
      manifest: false, // Usamos public/manifest.json dedicado e validado
      workbox: {
        // App Shell leve (~10 ficheiros): pré-cache rápido para atualização instantânea no mobile
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Os 66 livros bíblicos ficam em runtime CacheFirst conforme lidos (sem travar atualizações)
        globIgnores: ['**/bible-*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // ── Estratégias de runtime caching para offline-first ──
        runtimeCaching: [
          // Chunks dos 66 livros bíblicos (hash imutável Vite) → CacheFirst sob demanda
          {
            urlPattern: /\/assets\/bible-.*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'biblia-books-v1',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
            },
          },
          // Supabase API → Network First (com timeout curto para respostas instantâneas)
          {
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'biblia-supabase-v1',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 10, // 10 minutos
              },
            },
          },
          // Google Fonts (Folhas de Estilo e Woff2) → Cache First
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'biblia-fonts-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
            },
          },
          // CDNs de ícones e CSS externos → Cache First
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'biblia-cdn-v1',
              expiration: {
                maxEntries: 15,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 dias
              },
            },
          },
          // Áudio e arquivos multimídia → StaleWhileRevalidate
          {
            urlPattern: /\.(mp3|ogg|wav)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'biblia-audio-v1',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
            },
          },
        ],
        // Fallback de navegação SPA para suporte offline total
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/_/, /\/[^/?]+\.[^/]+$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const bibleBook = id.match(/\/src\/data\/bible\/blivre\/([^/]+)\.json$/);
          if (bibleBook && bibleBook[1] !== 'book-index' && bibleBook[1] !== 'manifest') {
            return `bible-${bibleBook[1]}`;
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/workbox-')) return 'vendor-workbox';
        },
      },
    },
  },
  };
});
