import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/** Short commit id for the debug report: CI sets GITHUB_SHA; locally it comes from git, else 'dev'. */
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
}

// The game is served from the root of its custom domain (https://everylitwindow.com/), so assets use base '/'.
export default defineConfig({
  base: '/',
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
