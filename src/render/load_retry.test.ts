import { describe, expect, it, vi } from 'vitest';
import { LoadFailedError, RETRY_WAITS_MS, fetchBytesWithRetry, onLoadWaiting, withRetry } from './load_retry';

const instantSleep = () => Promise.resolve();

describe('download retries (task 019)', () => {
  it('waits 0.5, 1, 2 and 4 seconds: one try plus four retries', () => {
    expect([...RETRY_WAITS_MS]).toEqual([500, 1000, 2000, 4000]);
  });

  it('a fetch that fails twice then succeeds returns the value and says "waiting" only while a retry waits', async () => {
    let calls = 0;
    const states: boolean[] = [];
    const unsubscribe = onLoadWaiting((w) => states.push(w));
    const sleeps: number[] = [];
    const op = vi.fn(async () => {
      calls++;
      if (calls <= 2) throw new Error('HTTP 503');
      return 'ok';
    });
    const value = await withRetry('assets/house.gltf', op, {
      sleep: async (ms) => { sleeps.push(ms); },
    });
    unsubscribe();
    expect(value).toBe('ok');
    expect(calls).toBe(3);
    expect(sleeps).toEqual([500, 1000]);
    expect(states).toEqual([true, false, true, false]);
  });

  it('gives up after four retries with a LoadFailedError that names the file', async () => {
    const op = vi.fn(async () => { throw new Error('HTTP 503'); });
    const err = await withRetry('assets/bad.gltf', op, { sleep: instantSleep }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LoadFailedError);
    expect((err as LoadFailedError).file).toBe('assets/bad.gltf');
    expect(op).toHaveBeenCalledTimes(5);
  });

  it('fetchBytesWithRetry retries non-OK responses and returns the bytes', async () => {
    const realFetch = globalThis.fetch;
    let n = 0;
    globalThis.fetch = vi.fn(async () => {
      n++;
      if (n === 1) return new Response('', { status: 503 });
      return new Response(new Uint8Array([1, 2, 3]));
    }) as typeof fetch;
    try {
      const bytes = await fetchBytesWithRetry('assets/sound.ogg', { sleep: instantSleep });
      expect(new Uint8Array(bytes)).toEqual(new Uint8Array([1, 2, 3]));
      expect(n).toBe(2);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
