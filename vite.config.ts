
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prioriza explicitamente as versões de navegador das bibliotecas
    mainFields: ['browser', 'module', 'main'],
    alias: {
      'node:module': 'identity-obj-proxy',
      'node:util': 'identity-obj-proxy',
      'node:path': 'identity-obj-proxy',
    }
  },
  build: {
    rollupOptions: {
      // Garante que esses módulos não vazem como requisições externas no browser
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
  }
});
