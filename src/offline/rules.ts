// Pure rules for the installable game's service worker (queue item 29). No browser or engine imports.
// The worker keeps every same-origin file the game fetches in one cache per build version. A new build is
// installed beside the old one and only takes over at the next start, so one session never mixes versions.

/** Every cache this game owns starts with this; caches with other names are never touched. */
export const CACHE_PREFIX = 'everylitwindow-';
/** Inside each version cache, the build's file list is kept under this key so the next build can compare. */
export const MANIFEST_KEY = '/__offline-manifest.json';
/** Navigations (any query: ?tour, ?showcase=...) are answered with the one page. */
export const PAGE_KEY = '/index.html';
/** The worker script itself is never cached by the worker (the browser checks it for updates). */
export const WORKER_PATH = '/sw.js';

/** Path -> content hash for every file in one build's dist folder. */
export type BuildManifest = Record<string, string>;

export function cacheName(version: string): string { return `${CACHE_PREFIX}${version}`; }
export function isOwnCache(name: string): boolean { return name.startsWith(CACHE_PREFIX); }

/** Old caches of this game, once the given version is active. Unrelated caches are kept. */
export function cachesToDelete(names: readonly string[], currentVersion: string): string[] {
  const keep = cacheName(currentVersion);
  return names.filter(n => isOwnCache(n) && n !== keep);
}

export interface RequestFacts { method: string; url: string; mode?: string; range?: boolean }

/** Whether the worker answers this request itself; anything else goes straight to the network. */
export function shouldHandle(req: RequestFacts, origin: string): boolean {
  if (req.method !== 'GET' || req.range) return false;
  let url: URL;
  try { url = new URL(req.url); } catch { return false; }
  if (url.origin !== origin) return false;
  return url.pathname !== WORKER_PATH && url.pathname !== MANIFEST_KEY;
}

/** The cache key for a handled request: navigations map to the page, files to their path (query dropped). */
export function cacheKey(req: RequestFacts): string {
  const url = new URL(req.url);
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === PAGE_KEY) return PAGE_KEY;
  return url.pathname;
}

/** Only complete, same-origin, successful answers are kept. */
export function isKeepable(res: { status: number; type: string }): boolean {
  return res.status === 200 && (res.type === 'basic' || res.type === 'default');
}

export interface InstallPlan {
  /** Fetched fresh from the network into the new cache (the shell, and kept files that changed). */
  fetch: string[];
  /** Copied from the previous version's cache: kept files whose content is the same in the new build. */
  copy: string[];
}

/**
 * What a new version does at install. `kept` are the paths the previous version's cache holds, `previous` its
 * build manifest (null on first install). The shell is always fetched fresh so the page and its scripts are
 * this build's. A kept file the new build no longer has is dropped; one that changed is fetched again, so a
 * player who had a file offline still has it after the update.
 */
export function planInstall(shell: readonly string[], kept: readonly string[], previous: BuildManifest | null,
  next: BuildManifest): InstallPlan {
  const fetch = new Set<string>(shell);
  const copy: string[] = [];
  for (const path of kept) {
    if (path === MANIFEST_KEY || fetch.has(path)) continue;
    const hash = next[path];
    if (hash === undefined) continue;
    if (previous && previous[path] === hash) copy.push(path); else fetch.add(path);
  }
  return { fetch: [...fetch].sort(), copy: copy.sort() };
}

/** Paths a page reports it already fetched (before the worker controlled it), filtered to this build's files. */
export function pageFilesToKeep(urls: readonly string[], origin: string, next: BuildManifest): string[] {
  const out = new Set<string>();
  for (const u of urls) {
    let url: URL;
    try { url = new URL(u, origin); } catch { continue; }
    if (url.origin !== origin) continue;
    const path = url.pathname === '/' ? PAGE_KEY : url.pathname;
    if (path in next && path !== WORKER_PATH) out.add(path);
  }
  return [...out].sort();
}

/**
 * A waiting version may take over only when the page asking is the only window of the game: then it is at its
 * start (before the title) and will reload once. Any other open window, playing or not, keeps the old version
 * until every window is closed.
 */
export function mayActivate(windowIds: readonly string[], askingId: string): boolean {
  return windowIds.length === 1 && windowIds[0] === askingId;
}

/** Version of a build: a short hash over its sorted manifest, so any changed file makes a new version. */
export function versionOf(manifest: BuildManifest, hash: (text: string) => string): string {
  const text = Object.keys(manifest).sort().map(k => `${k}:${manifest[k]}`).join('\n');
  return hash(text).slice(0, 12);
}

/**
 * Files kept at install: the page, what it links, the manifest and icons, and every built code chunk (hashed
 * files directly in /assets/). Code is kept whole so a session never asks the network for a chunk an update
 * has removed. Models, textures and sounds are kept as they are fetched.
 */
export function shellFromHtml(html: string, manifest: BuildManifest): string[] {
  const out = new Set<string>([PAGE_KEY]);
  for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^[a-z]+:/i.test(ref) || ref.startsWith('//')) continue;
    const path = ref.startsWith('/') ? ref.split(/[?#]/)[0] : `/${ref.split(/[?#]/)[0]}`;
    if (path in manifest) out.add(path);
  }
  for (const path of Object.keys(manifest)) {
    if (path.startsWith('/icons/') || path === '/manifest.webmanifest' || /^\/assets\/[^/]+\.(?:js|css|wasm)$/.test(path)) out.add(path);
  }
  return [...out].sort();
}
