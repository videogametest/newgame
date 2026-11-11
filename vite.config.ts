import { defineConfig } from 'vite';

// GitHub Pages serves the project at https://<user>.github.io/newgame/, so every asset URL needs that prefix.
export default defineConfig({
  base: '/newgame/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
