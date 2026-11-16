// The service worker's behaviour behind a small environment, so it runs the same in the browser and in tests.
// sw.ts wires it to the real worker globals. Never touches localStorage: saves and settings are not its business.
import { cacheName, cachesToDelete, cacheKey, isKeepable, isOwnCache, MANIFEST_KEY, mayActivate, pageFilesToKeep, planInstall,
  shouldHandle, type BuildManifest } from './rules';

export interface CacheLike {
  match(key: string): Promise<Response | undefined>;
  put(key: string, res: Response): Promise<void>;
  keys(): Promise<readonly string[]>;
}
export interface CacheStorageLike {
  open(name: string): Promise<CacheLike>;
  keys(): Promise<readonly string[]>;
  delete(name: string): Promise<boolean>;
}
export interface WorkerEnv {
  version: string;
  manifest: BuildManifest;
  shell: readonly string[];
  origin: string;
  caches: CacheStorageLike;
  fetch(url: string): Promise<Response>;
  windowIds(): Promise<string[]>;
  skipWaiting(): Promise<void>;
  claim(): Promise<void>;
  log?(text: string): void;
}
export interface RequestLike { method: string; url: string; mode?: string; headers: { has(name: string): boolean } }
export type WorkerMessage = { type: 'version' } | { type: 'keep'; urls: string[] } | { type: 'activate' };

/** Answers in a message reply. */
export type WorkerReply = { version: string } | { kept: number } | { activating: boolean; windows?: number; asker?: string; ids?: string[] };

export function createWorker(env: WorkerEnv) {
  const mine = cacheName(env.version);
  const log = env.log ?? (() => {});

  /** The newest other version cache of this game, by its stored manifest's presence. */
  async function previousCache(): Promise<CacheLike | null> {
    const names = (await env.caches.keys()).filter(n => n !== mine && isOwnCache(n));
    for (const name of names.reverse()) {
      const c = await env.caches.open(name);
      if (await c.match(MANIFEST_KEY)) return c;
    }
    return null;
  }

  async function fetchInto(cache: CacheLike, path: string): Promise<void> {
    const res = await env.fetch(new URL(path, env.origin).href);
    if (!isKeepable(res)) throw new Error(`${path}: HTTP ${res.status}`);
    await cache.put(path, res);
  }

  return {
    /** Install: fetch this build's shell, carry over unchanged kept files, refetch changed ones. Fails on a shell error. */
    async install(): Promise<{ fetched: number; copied: number }> {
      const cache = await env.caches.open(mine);
      const prev = await previousCache();
      const prevManifest = prev ? await (await prev.match(MANIFEST_KEY))!.json() as BuildManifest : null;
      const kept = prev ? await prev.keys() : [];
      const plan = planInstall(env.shell, kept, prevManifest, env.manifest);
      const shell = new Set(env.shell);
      for (const path of plan.fetch) {
        try { await fetchInto(cache, path); } catch (e) {
          if (shell.has(path)) throw e; // a version without its page cannot start offline: stay on the old one
          log(`not carried over: ${String(e)}`);
        }
      }
      for (const path of plan.copy) {
        const res = await prev!.match(path);
        if (res) await cache.put(path, res);
      }
      await cache.put(MANIFEST_KEY, new Response(JSON.stringify(env.manifest), { headers: { 'content-type': 'application/json' } }));
      return { fetched: plan.fetch.length, copied: plan.copy.length };
    },

    /** Activate: drop this game's older version caches only, then control open pages (first visit). */
    async activate(): Promise<string[]> {
      const gone = cachesToDelete(await env.caches.keys(), env.version);
      for (const name of gone) await env.caches.delete(name);
      await env.claim();
      return gone;
    },

    /** Fetch: this version's copy first; else the network, keeping a good answer. Null = not handled. */
    async respond(req: RequestLike): Promise<Response | null> {
      const facts = { method: req.method, url: req.url, mode: req.mode, range: req.headers.has('range') };
      if (!shouldHandle(facts, env.origin)) return null;
      const key = cacheKey(facts);
      const cache = await env.caches.open(mine);
      const hit = await cache.match(key);
      if (hit) return hit;
      const res = await env.fetch(req.mode === 'navigate' ? new URL(key, env.origin).href : req.url);
      if (isKeepable(res)) await cache.put(key, res.clone()).catch(e => log(`keep failed ${key}: ${String(e)}`));
      return res;
    },

    async message(msg: WorkerMessage, fromId: string, active: boolean): Promise<WorkerReply> {
      if (msg.type === 'version') return { version: env.version };
      if (msg.type === 'keep') {
        // Files the page fetched before this worker controlled it (the first visit).
        if (!active) return { kept: 0 };
        const cache = await env.caches.open(mine);
        let kept = 0;
        for (const path of pageFilesToKeep(msg.urls, env.origin, env.manifest)) {
          if (await cache.match(path)) continue;
          try { await fetchInto(cache, path); kept++; } catch (e) { log(`keep failed ${path}: ${String(e)}`); }
        }
        return { kept };
      }
      if (active) return { activating: false };
      const windows = await env.windowIds();
      const ok = mayActivate(windows, fromId);
      if (ok) await env.skipWaiting();
      return { activating: ok, windows: windows.length, asker: fromId, ids: windows };
    },
  };
}
