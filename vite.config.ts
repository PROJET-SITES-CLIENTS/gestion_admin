import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3005,
      proxy: {
        '/api': 'http://localhost:8000',
        '/uploads': 'http://localhost:8000',
      },
      // HMR désactivable via DISABLE_HMR=1 (agents/éditeurs automatiques).
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/db.json', '**/*.log', '**/backend/**'],
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
