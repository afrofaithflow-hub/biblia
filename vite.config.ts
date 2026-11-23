import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
});
