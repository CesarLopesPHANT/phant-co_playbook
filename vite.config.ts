
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Força o Vite a sempre preferir a versão de navegador das bibliotecas.
    // Isso evita que o Supabase ou dependências tentem carregar o "node:module".
    mainFields: ['browser', 'module', 'main'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
        },
      },
    },
  },
  define: {
    // Algumas libs esperam que essas variáveis globais de Node existam,
    // nós as mapeamos para objetos vazios no browser.
    'process.env': {},
    'global': 'globalThis',
  }
});
