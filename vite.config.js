import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'node:module': 'module'
    }
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})
