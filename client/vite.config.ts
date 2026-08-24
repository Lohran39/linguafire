import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/auth': 'http://127.0.0.1:3000',
      '/profile': 'http://127.0.0.1:3000',
      '/lyrics': 'http://127.0.0.1:3000',
      '/natives': 'http://127.0.0.1:3000',
      '/conversation': 'http://127.0.0.1:3000',
      '/grammar': 'http://127.0.0.1:3000',
      '/shop': 'http://127.0.0.1:3000',
      '/streak': 'http://127.0.0.1:3000',
      '/subscription': 'http://127.0.0.1:3000',
      '/push': 'http://127.0.0.1:3000'
    }
  }
});
