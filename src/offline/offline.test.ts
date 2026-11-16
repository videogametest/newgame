import { describe, expect, it } from 'vitest';
import { cacheKey, cacheName, cachesToDelete, isKeepable, mayActivate, pageFilesToKeep, planInstall, shellFromHtml,
  shouldHandle, versionOf, MANIFEST_KEY } from './rules';
import { createWorker, type CacheLike, type WorkerEnv } from './worker_core';

const O = 'https://everylitwindow.com';
const req = (url: string, extra: { method?: string; mode?: string; range?: boolean } = {}) =>
  ({ method: extra.method ?? 'GET', url, mode: extra.mode, headers: { has: (n: string) => n === 'range' && !!extra.range } });

describe('offline rules', () => {
  it('handles only same-origin whole GETs, never the worker itself', () => {
    expect(shouldHandle({ method: 'GET', url: `${O}/assets/a.glb` }, O)).toBe(true);
    expect(shouldHandle({ method: 'POST', url: `${O}/x` }, O)).toBe(false);
    expect(shouldHandle({ method: 'GET', url: 'https://cdn.example/x.js' }, O)).toBe(false);
    expect(shouldHandle({ method: 'GET', url: `${O}/sw.js` }, O)).toBe(false);
    expect(shouldHandle({ method: 'GET', url: `${O}/a.ogg`, range: true }, O)).toBe(false);
  });
  it('maps every navigation to the page and files to their path', () => {
    expect(cacheKey({ method: 'GET', url: `${O}/?tour=1`, mode: 'navigate' })).toBe('/index.html');
    expect(cacheKey({ method: 'GET', url: `${O}/` })).toBe('/index.html');
    expect(cacheKey({ method: 'GET', url: `${O}/assets/audio/a.ogg?v=2` })).toBe('/assets/audio/a.ogg');
  });
  it('keeps only complete same-origin answers', () => {
    expect(isKeepable({ status: 200, type: 'basic' })).toBe(true);
    expect(isKeepable({ status: 206, type: 'basic' })).toBe(false);
    expect(isKeepable({ status: 404, type: 'basic' })).toBe(false);
    expect(isKeepable({ status: 0, type: 'opaque' })).toBe(false);
  });
  it('deletes only this game\'s older caches', () => {
    expect(cachesToDelete(['everylitwindow-a', 'everylitwindow-b', 'other-app', 'workbox-x'], 'b')).toEqual(['everylitwindow-a']);
  });
  it('plans an update: shell fresh, unchanged kept files copied, changed refetched, removed dropped', () => {
    const prev = { '/index.html': '1', '/m.glb': 'x', '/s.ogg': 'y', '/old.js': 'z' };
    const next = { '/index.html': '2', '/m.glb': 'x', '/s.ogg': 'Y', '/new.js': 'n' };
    const plan = planInstall(['/index.html', '/new.js'], ['/index.html', '/m.glb', '/s.ogg', '/old.js', MANIFEST_KEY], prev, next);
    expect(plan).toEqual({ fetch: ['/index.html', '/new.js', '/s.ogg'], copy: ['/m.glb'] });
  });
  it('first install fetches only the shell', () => {
    expect(planInstall(['/index.html'], [], null, { '/index.html': '1', '/m.glb': 'x' })).toEqual({ fetch: ['/index.html'], copy: [] });
  });
  it('keeps the first visit\'s already fetched files that belong to the build', () => {
    expect(pageFilesToKeep([`${O}/?x`, `${O}/assets/a.glb`, 'https://other/x', `${O}/missing`, `${O}/sw.js`], O,
      { '/index.html': '1', '/assets/a.glb': '2', '/sw.js': '3' })).toEqual(['/assets/a.glb', '/index.html']);
  });
  it('activates a waiting version only for the sole window', () => {
    expect(mayActivate(['a'], 'a')).toBe(true);
    expect(mayActivate(['a', 'b'], 'a')).toBe(false);
    expect(mayActivate(['b'], 'a')).toBe(false);
    expect(mayActivate([], 'a')).toBe(false);
  });
  it('versions change with any file', () => {
    const h = (t: string) => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).padStart(12, '0');
    expect(versionOf({ '/a': '1', '/b': '2' }, h)).toBe(versionOf({ '/b': '2', '/a': '1' }, h));
    expect(versionOf({ '/a': '1' }, h)).not.toBe(versionOf({ '/a': '2' }, h));
  });
  it('finds the shell in the built page', () => {
    const html = '<link rel="manifest" href="/manifest.webmanifest"><script type="module" src="/assets/index-abc.js"></script><link href="https://x/y.css">';
    expect(shellFromHtml(html, { '/index.html': '1', '/assets/index-abc.js': '2', '/manifest.webmanifest': '3', '/icons/icon-192.png': '4', '/assets/audio/m.ogg': '5', '/assets/lazy-x.js': '6' }))
      .toEqual(['/assets/index-abc.js', '/assets/lazy-x.js', '/icons/icon-192.png', '/index.html', '/manifest.webmanifest']);
  });
  it('names caches by version', () => { expect(cacheName('v1')).toBe('everylitwindow-v1'); });
});

/** In-memory caches and network: a server whose files can change and which can be cut. */
function world() {
  const store = new Map<string, Map<string, string>>();
  const server = { files: new Map<string, string>(), online: true, hits: [] as string[] };
  const caches = {
    async open(name: string): Promise<CacheLike> {
      if (!store.has(name)) store.set(name, new Map());
      const c = store.get(name)!;
      return {
        match: async k => c.has(k) ? new Response(c.get(k)) : undefined,
        put: async (k, r) => { c.set(k, await r.text()); },
        keys: async () => [...c.keys()],
      };
    },
    keys: async () => [...store.keys()], delete: async (n: string) => store.delete(n),
  };
  const fetch = async (url: string) => {
    if (!server.online) throw new TypeError('Failed to fetch');
    const path = new URL(url).pathname; server.hits.push(path);
    const body = server.files.get(path);
    return body === undefined ? new Response('no', { status: 404 }) : new Response(body, { status: 200 });
  };
  const env = (version: string, manifest: Record<string, string>, windows: string[] = []): WorkerEnv & { skipped: number } => {
    const e = { version, manifest, shell: ['/index.html', '/app.js'], origin: O, caches, fetch, skipped: 0,
      windowIds: async () => windows, skipWaiting: async () => { e.skipped++; }, claim: async () => {} };
    return e;
  };
  return { store, server, caches, env };
}

describe('offline worker', () => {
  it('first visit: shell kept, then every fetched file; offline play serves them, an unvisited file fails', async () => {
    const w = world();
    w.server.files = new Map([['/index.html', 'page A'], ['/app.js', 'app A'], ['/m.glb', 'model'], ['/s.ogg', 'sound'], ['/far.glb', 'far']]);
    const a = createWorker(w.env('A', { '/index.html': '1', '/app.js': '1', '/m.glb': 'm', '/s.ogg': 's', '/far.glb': 'f' }));
    await a.install(); await a.activate();
    expect(await (await a.respond(req(`${O}/m.glb`)))!.text()).toBe('model');
    expect(await a.message({ type: 'keep', urls: [`${O}/s.ogg`, `${O}/m.glb`] }, 'w1', true)).toEqual({ kept: 1 });
    w.server.online = false; w.server.hits = [];
    expect(await (await a.respond(req(`${O}/?continue`, { mode: 'navigate' })))!.text()).toBe('page A');
    expect(await (await a.respond(req(`${O}/app.js`)))!.text()).toBe('app A');
    expect(await (await a.respond(req(`${O}/m.glb`)))!.text()).toBe('model');
    expect(await (await a.respond(req(`${O}/s.ogg`)))!.text()).toBe('sound');
    await expect(a.respond(req(`${O}/far.glb`))).rejects.toThrow();
    expect(w.server.hits).toEqual([]);
  });

  it('update: old session keeps old files; new version waits, carries kept files, drops only old game cache', async () => {
    const w = world();
    w.server.files = new Map([['/index.html', 'page A'], ['/app.js', 'app A'], ['/m.glb', 'model'], ['/s.ogg', 'sound A']]);
    const a = createWorker(w.env('A', { '/index.html': '1', '/app.js': '1', '/m.glb': 'm', '/s.ogg': 's' }));
    await a.install(); await a.activate();
    await a.respond(req(`${O}/m.glb`)); await a.respond(req(`${O}/s.ogg`));
    await w.caches.open('other-app');
    // Deploy B: page, script and one sound change; the model does not.
    w.server.files = new Map([['/index.html', 'page B'], ['/app.js', 'app B'], ['/m.glb', 'model'], ['/s.ogg', 'sound B']]);
    const benv = w.env('B', { '/index.html': '2', '/app.js': '2', '/m.glb': 'm', '/s.ogg': 's2' }, ['playing', 'new']);
    const b = createWorker(benv);
    w.server.hits = [];
    expect(await b.install()).toEqual({ fetched: 3, copied: 1 });
    expect(w.server.hits.sort()).toEqual(['/app.js', '/index.html', '/s.ogg']);
    // The playing session still gets A for everything, never B.
    expect(await (await a.respond(req(`${O}/app.js`)))!.text()).toBe('app A');
    expect(await (await a.respond(req(`${O}/s.ogg`)))!.text()).toBe('sound A');
    // Another window is open: no takeover.
    expect(await b.message({ type: 'activate' }, 'new', false)).toMatchObject({ activating: false, windows: 2 });
    expect(benv.skipped).toBe(0);
    // Old window closed, the sole new window asks at its start.
    benv.windowIds = async () => ['new'];
    expect(await b.message({ type: 'activate' }, 'new', false)).toMatchObject({ activating: true, windows: 1 });
    expect(benv.skipped).toBe(1);
    expect(await b.activate()).toEqual(['everylitwindow-A']);
    expect([...w.store.keys()].sort()).toEqual(['everylitwindow-B', 'other-app']);
    w.server.online = false;
    expect(await (await b.respond(req(`${O}/`, { mode: 'navigate' })))!.text()).toBe('page B');
    expect(await (await b.respond(req(`${O}/m.glb`)))!.text()).toBe('model');
    expect(await (await b.respond(req(`${O}/s.ogg`)))!.text()).toBe('sound B');
    expect(await b.message({ type: 'version' }, 'new', true)).toEqual({ version: 'B' });
  });

  it('a failed shell fetch fails the install so the old version stays', async () => {
    const w = world();
    w.server.files = new Map([['/index.html', 'page']]);
    const b = createWorker(w.env('B', { '/index.html': '1', '/app.js': '1' }));
    await expect(b.install()).rejects.toThrow('/app.js');
  });

  it('does not keep failed or partial answers, and leaves other requests to the browser', async () => {
    const w = world();
    w.server.files = new Map([['/index.html', 'p'], ['/app.js', 'a']]);
    const a = createWorker(w.env('A', { '/index.html': '1', '/app.js': '1' }));
    await a.install(); await a.activate();
    expect((await a.respond(req(`${O}/nope.glb`)))!.status).toBe(404);
    w.server.files.set('/nope.glb', 'now');
    expect(await (await a.respond(req(`${O}/nope.glb`)))!.text()).toBe('now');
    expect(await a.respond(req(`${O}/x`, { method: 'POST' }))).toBeNull();
    expect(await a.respond(req(`${O}/s.ogg`, { range: true }))).toBeNull();
    expect(await a.respond(req('https://cdn.example/x.js'))).toBeNull();
  });
});
