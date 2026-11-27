import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { IncomingMessage, ServerResponse } from 'http';

function elevenLabsTtsPlugin(apiKey?: string) {
  return {
    name: 'elevenlabs-tts-server',
    configureServer(server: any) {
      server.middlewares.use('/api/tts', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const {
              text,
              voiceId = 'JBFqnCBsd6RMkjVDRZzb',
              modelId = 'eleven_multilingual_v2',
            } = JSON.parse(body || '{}');

            if (!text || typeof text !== 'string') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Campo text é obrigatório.' }));
              return;
            }

            const activeKey = apiKey || process.env.ELEVENLABS_API_KEY;
            if (!activeKey) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY não configurada no servidor.' }));
              return;
            }

            const client = new ElevenLabsClient({ apiKey: activeKey });
            const audioStream = await client.textToSpeech.convert(voiceId, {
              text: text.slice(0, 2000), // Proteção de cota por requisição
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
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Falha ao sintetizar áudio neural.' }));
          }
        });
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
      elevenLabsTtsPlugin(elevenLabsApiKey),
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
