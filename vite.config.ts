
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
      // Resolve problemas com módulos que esperam APIs do Node como o 'path' usado no mammoth
      'path': 'path-browserify',
    },
  },
  build: {
    commonjsOptions: {
      // Garante que módulos CommonJS mistos sejam transformados corretamente
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Previne que o erro de "createRequire" do node:module quebre o build
      external: ['node:module'],
    },
  },
});
