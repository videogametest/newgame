import { defineConfig } from 'vite';

// The game is served from the root of its custom domain (https://everylitwindow.com/), so assets use base '/'.
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
