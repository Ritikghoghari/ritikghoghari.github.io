import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        city: resolve(import.meta.dirname, 'city/index.html'),
      },
    },
  },
});
