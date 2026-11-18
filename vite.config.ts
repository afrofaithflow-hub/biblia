import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
        },
      },
    },
  },
});
