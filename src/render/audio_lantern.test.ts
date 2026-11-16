import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { play, volume, bytes } = vi.hoisted(() => ({ play: vi.fn(), volume: vi.fn(), bytes: vi.fn() }));
vi.mock('../audio/music/player', () => ({ MusicPlayer: class { setVolume = volume; play = play; } }));
vi.mock('./load_retry', () => ({ fetchBytesWithRetry: bytes }));
import { AudioBank } from './audio';
class Context {
  currentTime = 0; state = 'running'; destination = {};
  createGain() { return { connect: vi.fn(), gain: { setTargetAtTime: vi.fn() } }; }
  decodeAudioData = vi.fn(async () => ({}));
  resume = vi.fn(async () => {});
}
beforeEach(() => {
  vi.clearAllMocks(); bytes.mockResolvedValue(new ArrayBuffer(4)); play.mockResolvedValue(0);
  vi.stubGlobal('window', { AudioContext: Context });
});
afterEach(() => vi.unstubAllGlobals());
it('returns a caption fallback without a gesture-unlocked context', async () => { expect(await new AudioBank(null).playLantern()).toBe(false); expect(play).not.toHaveBeenCalled(); });
it('preloads the CC0 harp and schedules the complete written first layer once', async () => {
  const bank = new AudioBank(null); bank.unlock(); expect(await bank.playLantern()).toBe(true);
  const piece = play.mock.calls[0][0]; expect(piece.events.length).toBe(18); expect(piece.events.every((e: { instrument: string }) => e.instrument === 'harp')).toBe(true);
  expect(bytes.mock.calls.some(([file]) => String(file).includes('harp_'))).toBe(true); expect(volume).toHaveBeenCalledWith(0.5);
});
it.each(['music', 'master', 'muted'] as const)('uses the caption when %s is silent', async key => {
  const storage = { getItem: () => JSON.stringify({ [key]: key === 'muted' ? true : 0 }) } as unknown as Storage;
  const bank = new AudioBank(storage); bank.unlock(); expect(await bank.playLantern()).toBe(false); expect(play).not.toHaveBeenCalled();
});
it('uses a caption on a failed sample with no partial performance', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const bank = new AudioBank(null); bank.unlock();
  bytes.mockImplementation(async (file: string) => { if (file.includes('harp_')) throw new Error('test sample unavailable'); return new ArrayBuffer(4); });
  expect(await bank.playLantern()).toBe(false); expect(play).not.toHaveBeenCalled(); expect(warn).toHaveBeenCalled(); warn.mockRestore();
});
