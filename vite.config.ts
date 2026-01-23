
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Isso impede que o Rollup tente resolver módulos nativos do Node.js
      // que são importados por bibliotecas como o Supabase para uso em SSR.
      external: [
        'node:module',
        'node:util',
        'node:path',
        'path',
        'fs',
        'crypto'
      ]
    }
  },
  resolve: {
    alias: {
      // Redireciona tentativas de importação de módulos de node para um stub vazio no browser
      'node:module': 'identity-obj-proxy', 
    }
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js']
  }
});
