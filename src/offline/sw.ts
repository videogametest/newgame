// Service worker entry, bundled by vite.config.ts into dist/sw.js with this build's file list and version.
// No skipWaiting on install: a new version waits until no window of the old one is open, or until the only
// window asks at its start (src/render/offline.ts). Typed locally so the page's DOM types stay as they are.
import { createWorker, type WorkerMessage } from './worker_core';
import { shouldHandle, type BuildManifest } from './rules';

declare const __OFFLINE_VERSION__: string;
declare const __OFFLINE_MANIFEST__: BuildManifest;
declare const __OFFLINE_SHELL__: string[];

interface ExtendableEvent extends Event { waitUntil(p: Promise<unknown>): void }
interface FetchEvent extends ExtendableEvent { request: Request; respondWith(r: Promise<Response>): void }
interface MessageEventLike extends ExtendableEvent { data: WorkerMessage; source: { id: string } | null; ports: MessagePort[] }
interface WorkerGlobal {
  location: Location;
  registration: { active: unknown };
  serviceWorker?: { state: string };
  clients: { matchAll(o: { type: 'window'; includeUncontrolled: boolean }): Promise<{ id: string }[]>; claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: string, fn: (e: never) => void): void;
}
const g = self as unknown as WorkerGlobal;

const worker = createWorker({
  version: __OFFLINE_VERSION__, manifest: __OFFLINE_MANIFEST__, shell: __OFFLINE_SHELL__, origin: g.location.origin,
  caches: {
    open: async name => { const c = await caches.open(name); return {
      match: k => c.match(k), put: (k, r) => c.put(k, r),
      keys: async () => (await c.keys()).map(r => new URL(r.url).pathname),
    }; },
    keys: () => caches.keys(), delete: n => caches.delete(n),
  },
  fetch: url => fetch(url, { cache: 'no-cache' }),
  windowIds: async () => (await g.clients.matchAll({ type: 'window', includeUncontrolled: true })).map(c => c.id),
  skipWaiting: () => g.skipWaiting(),
  claim: () => g.clients.claim(),
  log: text => console.warn(`[offline] ${text}`),
});

let isActive = false;
g.addEventListener('install', (e: ExtendableEvent) => e.waitUntil(worker.install()));
g.addEventListener('activate', (e: ExtendableEvent) => { isActive = true; e.waitUntil(worker.activate()); });
g.addEventListener('fetch', (e: FetchEvent) => {
  const req = e.request;
  if (!shouldHandle({ method: req.method, url: req.url, mode: req.mode, range: req.headers.has('range') }, g.location.origin)) return;
  e.respondWith(worker.respond({ method: req.method, url: req.url, mode: req.mode, headers: req.headers }).then(r => r ?? fetch(req)));
});
g.addEventListener('message', (e: MessageEventLike) => {
  const active = g.serviceWorker ? g.serviceWorker.state === 'activated' || g.serviceWorker.state === 'activating' : isActive;
  e.waitUntil(worker.message(e.data, e.source?.id ?? '', active).then(reply => e.ports[0]?.postMessage(reply)));
});
