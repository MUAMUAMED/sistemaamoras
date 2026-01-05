import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Servidor de desenvolvimento
  server: {
    port: 3000,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Build
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild', // Usa esbuild (mais rápido e já incluído no Vite)
    chunkSizeWarningLimit: 1000,
  },

  // Resolver paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Variáveis de ambiente (Vite usa VITE_ por padrão, mas mantemos REACT_APP_ para compatibilidade)
  envPrefix: ['VITE_', 'REACT_APP_'],

  // CSS
  css: {
    postcss: './postcss.config.js',
  },
});

