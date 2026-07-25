import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_URL || env.REACT_APP_API_URL || 'http://localhost:3001';
  const proxyHeaders = env.VITE_PROXY_ORIGIN ? { Origin: env.VITE_PROXY_ORIGIN } : undefined;

  return {
  plugins: [react()],
  
  // Servidor de desenvolvimento
  server: {
    port: 3000,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
        headers: proxyHeaders,
      },
      '/uploads': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
        headers: proxyHeaders,
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
  };
});

