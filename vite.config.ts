import { defineConfig } from 'vite';

// GitHub Pages serves this repo at https://videogametest.github.io/newgame/,
// so every built asset URL must start with /newgame/.
export default defineConfig({
  base: '/newgame/',
  build: { outDir: 'dist', sourcemap: false },
});
