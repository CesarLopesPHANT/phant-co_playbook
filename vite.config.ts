
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Injeta as variáveis de ambiente necessárias conforme as instruções
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
    // Polyfill básico para 'global'
    'global': 'window',
  },
  resolve: {
    alias: {
      // FIX: Força o uso da versão de navegador do mammoth para evitar erro de 'path-browserify'
      'mammoth': 'mammoth/mammoth.browser.js',
    },
  },
  build: {
    rollupOptions: {
      // Previne que imports nativos do Node quebrem o bundle
      external: ['node:module', 'path', 'fs', 'util'],
    },
  },
});
