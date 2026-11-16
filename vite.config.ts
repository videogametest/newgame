import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { build as esbuild } from 'esbuild';
import { defineConfig, type Plugin } from 'vite';
import { shellFromHtml, versionOf, WORKER_PATH, type BuildManifest } from './src/offline/rules';

/** Short commit id for the debug report: CI sets GITHUB_SHA; locally it comes from git, else 'dev'. */
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
}

const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/**
 * Queue item 29: after the build, hash every file in dist and bundle src/offline/sw.ts into dist/sw.js with that
 * list, the page's shell and a version made from the list. Any changed file gives a new version.
 */
function offlineWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'everylitwindow-offline-worker',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    async closeBundle() {
      const manifest: BuildManifest = {};
      for (const file of walk(outDir)) {
        const path = `/${relative(outDir, file).split(sep).join('/')}`;
        if (path !== WORKER_PATH) manifest[path] = sha(readFileSync(file)).slice(0, 16);
      }
      const version = versionOf(manifest, sha);
      const shell = shellFromHtml(readFileSync(join(outDir, 'index.html'), 'utf8'), manifest);
      await esbuild({
        entryPoints: ['src/offline/sw.ts'], bundle: true, format: 'iife', target: 'es2022', minify: true,
        outfile: join(outDir, 'sw.js'), logLevel: 'warning',
        define: {
          __OFFLINE_VERSION__: JSON.stringify(version),
          __OFFLINE_MANIFEST__: JSON.stringify(manifest),
          __OFFLINE_SHELL__: JSON.stringify(shell),
        },
      });
      console.log(`offline worker: version ${version}, ${Object.keys(manifest).length} files, shell ${shell.length}`);
    },
  };
}

// The game is served from the root of its custom domain (https://everylitwindow.com/), so assets use base '/'.
export default defineConfig({
  base: '/',
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  plugins: [offlineWorker()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
