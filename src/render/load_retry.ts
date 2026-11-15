// Retries for downloads (task 019): every model, sound and data file gets one try and up to four retries,
// waiting 0.5, 1, 2 and 4 seconds before each retry. While any retry is waiting the loading screen says
// "Still loading..."; when a file gives up, the game shows a plain message and the file name goes to the debug log.
// No Babylon imports here: the call sites wrap their own SceneLoader calls.

import { logEvent } from './debug_log';

/** The waits before each retry, in milliseconds. Length is the number of retries (four). */
export const RETRY_WAITS_MS: readonly number[] = [500, 1000, 2000, 4000];

/** Thrown when a file is still failing after every retry. The message is plain; the file name is in `file`. */
export class LoadFailedError extends Error {
  readonly file: string;
  readonly cause: unknown;
  constructor(file: string, cause: unknown) {
    super('Some of the game files would not download.');
    this.name = 'LoadFailedError';
    this.file = file;
    this.cause = cause;
  }
}

export interface RetryOptions {
  /** Waits before each retry; the default is RETRY_WAITS_MS. */
  waits?: readonly number[];
  /** Replaceable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let waitingCount = 0;
const waitingListeners = new Set<(waiting: boolean) => void>();

/** Calls fn with true while any retry is waiting, false when none is. Returns the unsubscribe function. */
export function onLoadWaiting(fn: (waiting: boolean) => void): () => void {
  waitingListeners.add(fn);
  return () => { waitingListeners.delete(fn); };
}

function setWaiting(delta: number): void {
  waitingCount = Math.max(0, waitingCount + delta);
  for (const fn of waitingListeners) fn(waitingCount > 0);
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Runs op; on failure waits and runs it again, up to waits.length times. Throws LoadFailedError at the end. */
export async function withRetry<T>(file: string, op: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const waits = opts.waits ?? RETRY_WAITS_MS;
  const sleep = opts.sleep ?? defaultSleep;
  for (let attempt = 0; ; attempt++) {
    try {
      return await op();
    } catch (err) {
      if (attempt >= waits.length) {
        logEvent('load_failed', `${file} after ${attempt + 1} tries: ${describe(err)}`);
        throw new LoadFailedError(file, err);
      }
      logEvent('load_retry', `${file} try ${attempt + 1} failed (${describe(err)}); waiting ${waits[attempt]} ms`);
      setWaiting(+1);
      try {
        await sleep(waits[attempt]);
      } finally {
        setWaiting(-1);
      }
    }
  }
}

/** Downloads a file's bytes, retrying on network errors and non-OK responses. */
export function fetchBytesWithRetry(url: string, opts: RetryOptions = {}): Promise<ArrayBuffer> {
  return withRetry(url, async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  }, opts);
}
