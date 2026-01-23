
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Em vez de externalizar (que faz o browser tentar baixar), 
      // nós redirecionamos para módulos vazios.
      'node:module': 'identity-obj-proxy',
      'node:util': 'identity-obj-proxy',
      'node:path': 'identity-obj-proxy',
    }
  },
  build: {
    rollupOptions: {
      // Removemos o 'node:module' daqui para que o Rollup não o trate como dependência externa via URL
    }
  },
  // Define variáveis de ambiente para bibliotecas que esperam Node
  define: {
    'process.env': {},
    'global': 'globalThis',
  }
});
