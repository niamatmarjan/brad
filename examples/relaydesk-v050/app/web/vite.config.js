import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:4173',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:4173',
        changeOrigin: true
      }
    }
  }
});
