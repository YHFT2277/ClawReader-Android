import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: path.join(__dirname, 'renderer'),
  base: './',
  build: {
    outDir: path.join(__dirname, 'dist-renderer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: { '@': path.join(__dirname, 'renderer/src') },
  },
  server: {
    port: 5174,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['electron']
  }
});