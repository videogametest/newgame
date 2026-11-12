import { describe, expect, it } from 'vitest';
import { LOG_CAPACITY, logEvent, recentLog } from './debug_log';

describe('debug event log', () => {
  it('keeps only the newest LOG_CAPACITY events, oldest dropped first', () => {
    const total = LOG_CAPACITY + 25;
    for (let i = 0; i < total; i++) logEvent('tick', String(i));
    const log = recentLog();
    expect(log.length).toBe(LOG_CAPACITY);
    expect(log[log.length - 1].detail).toBe(String(total - 1));
    expect(log[0].detail).toBe(String(total - LOG_CAPACITY));
  });

  it('records the kind, detail and an ISO timestamp', () => {
    logEvent('boot', 'ready');
    const last = recentLog()[recentLog().length - 1];
    expect(last.kind).toBe('boot');
    expect(last.detail).toBe('ready');
    expect(new Date(last.at).toISOString()).toBe(last.at);
  });
});
