// Page side of the installable game (queue item 29): registers the worker, carries a waiting update over at the
// start (never mid-session) and tells the title screen when one is ready. Saves and settings are not touched.
import { logEvent } from './debug_log';
import type { WorkerMessage, WorkerReply } from '../offline/worker_core';

export interface OfflineState {
  supported: boolean; registered: boolean; controlled: boolean; updateReady: boolean;
  /** What happened at the start: 'none', 'adopted' (reloaded into the new version), 'kept-old' (another window open). */
  start: 'none' | 'adopted' | 'kept-old'; kept: number; error: string | null;
  /** The waiting version's last answer at the start (for the capture's report). */
  lastAsk: WorkerReply | null;
}
const state: OfflineState = { supported: false, registered: false, controlled: false, updateReady: false, start: 'none', kept: 0, error: null, lastAsk: null };
const listeners = new Set<() => void>();

/** Runs fn now if an update is ready, else when one becomes ready. */
export function onUpdateReady(fn: () => void): void {
  if (state.updateReady) fn(); else listeners.add(fn);
}
function markReady(): void {
  if (state.updateReady) return;
  state.updateReady = true; logEvent('offline', 'update ready for next start');
  for (const fn of listeners) fn();
  listeners.clear();
}

function ask(worker: ServiceWorker | null | undefined, msg: WorkerMessage, ms = 3000): Promise<WorkerReply | null> {
  if (!worker) return Promise.resolve(null);
  return new Promise(resolve => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => resolve(null), ms);
    ch.port1.onmessage = e => { clearTimeout(timer); resolve(e.data as WorkerReply); };
    worker.postMessage(msg, [ch.port2]);
  });
}

/** Asks the controlling worker to keep what this page fetched before it was controlled (the first visit). */
export async function keepFetched(): Promise<number> {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker?.controller : null;
  if (!sw) return 0;
  const urls = [location.href, ...performance.getEntriesByType('resource').map(e => e.name)];
  const reply = await ask(sw, { type: 'keep', urls }, 120000);
  const kept = reply && 'kept' in reply ? reply.kept : 0;
  state.kept += kept;
  return kept;
}

/**
 * Called before the game starts. Returns true when the page is reloading into a waiting new version (the caller
 * then starts nothing). Any failure leaves the game running online as before and is logged, never shown.
 */
export async function prepareOffline(): Promise<boolean> {
  const w = window as unknown as { __offline?: unknown };
  w.__offline = {
    state: () => ({ ...state, controlled: !!navigator.serviceWorker?.controller }),
    version: async () => { const r = await ask(navigator.serviceWorker?.controller, { type: 'version' }); return r && 'version' in r ? r.version : null; },
    keep: keepFetched,
  };
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return false;
  state.supported = true;
  try { performance.setResourceTimingBufferSize(4000); } catch { /* older browsers: fewer first-visit files kept */ }
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    state.registered = true;
  } catch (e) {
    state.error = String(e); logEvent('offline', `register failed: ${String(e)}`);
    return false;
  }
  const sw = navigator.serviceWorker;
  if (reg.waiting && sw.controller) {
    // Listen before asking: the controller may change before the worker's answer arrives.
    const before = sw.controller;
    let changed = false;
    const controllerChanged = new Promise<boolean>(resolve => {
      sw.addEventListener('controllerchange', () => { changed = true; resolve(true); }, { once: true });
    });
    // A window just closed can linger for a moment in the worker's list: ask a few times before giving up.
    let reply: WorkerReply | null = null;
    for (let i = 0; i < 4; i++) {
      reply = await ask(reg.waiting, { type: 'activate' }); state.lastAsk = reply;
      if (!reply || !('activating' in reply) || reply.activating) break;
      logEvent('offline', `update waits: ${reply.windows ?? '?'} windows open`);
      await new Promise(r => setTimeout(r, 500));
    }
    if (reply && 'activating' in reply && reply.activating) {
      const took = changed || sw.controller !== before
        || await Promise.race([controllerChanged, new Promise<boolean>(r => setTimeout(() => r(false), 8000))]);
      if (took) {
        state.start = 'adopted'; logEvent('offline', 'new version adopted at start; reloading');
        sessionStorage.setItem('everylitwindow.offline.adopted', '1');
        location.reload(); return true;
      }
      logEvent('offline', 'waiting version did not take over; starting the old one');
    }
    state.start = 'kept-old'; markReady();
  }
  if (sessionStorage.getItem('everylitwindow.offline.adopted')) {
    state.start = 'adopted'; sessionStorage.removeItem('everylitwindow.offline.adopted');
  }
  // A new version found now or later in this session is only announced; it is used from the next start.
  const track = (next: ServiceWorker | null) => {
    if (!next) return;
    if (next.state === 'installed' && sw.controller) { markReady(); return; }
    next.addEventListener('statechange', () => { if (next.state === 'installed' && sw.controller) markReady(); });
  };
  reg.addEventListener('updatefound', () => track(reg.installing));
  // Look for a new version now (an installed window may stay open for days); offline this just fails quietly.
  reg.update().catch((e: unknown) => logEvent('offline', `update check failed: ${String(e)}`));
  track(reg.installing);
  if (reg.waiting && sw.controller) markReady();
  if (!sw.controller) {
    // First visit: the worker claims this page once active, then keeps what the page already fetched.
    sw.addEventListener('controllerchange', () => { void keepFetched(); }, { once: true });
  }
  return false;
}
