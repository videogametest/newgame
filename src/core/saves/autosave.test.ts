import { describe, expect, it, vi } from 'vitest';
import { Autosave } from './autosave';
import { newGameState } from '../state';
import { TUNING } from '../../config/tuning';
describe('autosave triggers', () => {
  it('saves after three active minutes, not paused/invalid time', () => {
    const g = newGameState(1), write = vi.fn(() => true), result = vi.fn(), a = new Autosave(g, write, result);
    a.advance(g, 0); a.advance(g, NaN); a.advance(g, -1); expect(write).not.toHaveBeenCalled();
    a.advance(g, TUNING.saves.intervalSeconds - 1); expect(write).not.toHaveBeenCalled();
    a.advance(g, 1); expect(result).toHaveBeenLastCalledWith(true, 'interval');
    a.advance(g, 1); expect(write).toHaveBeenCalledTimes(1);
  });
  it('captures save immediately after freeing and after relighting, not merely clearing', () => {
    const g = newGameState(1), write = vi.fn(() => true), result = vi.fn(), a = new Autosave(g, write, result);
    g.places[0].status = 'cleared'; a.advance(g, 0); expect(write).not.toHaveBeenCalled();
    g.places[0].status = 'freed'; g.places[0].timesFreed++; a.advance(g, 0); expect(result).toHaveBeenLastCalledWith(true, 'capture');
    a.advance(g, 0); expect(write).toHaveBeenCalledTimes(1);
    g.places[0].timesFreed++; a.advance(g, 0); expect(write).toHaveBeenCalledTimes(2);
  });
  it('failed capture saves retry next step and are not acknowledged as saved', () => {
    const g = newGameState(1), write = vi.fn().mockReturnValueOnce(false).mockReturnValue(true), result = vi.fn(), a = new Autosave(g, write, result);
    g.places[0].status = 'freed'; a.advance(g, 1); expect(result).toHaveBeenLastCalledWith(false, 'capture');
    a.advance(g, 1); expect(result).toHaveBeenLastCalledWith(true, 'capture');
  });
  it('completed rest and town entry save once per action/entry, not every frame', () => {
    const g = newGameState(1), write = vi.fn(() => true), result = vi.fn(), a = new Autosave(g, write, result);
    a.save('rest'); expect(result).toHaveBeenLastCalledWith(true, 'rest');
    a.advance(g, 0, true); expect(result).toHaveBeenLastCalledWith(true, 'town');
    a.advance(g, 0, true); expect(write).toHaveBeenCalledTimes(2);
    a.advance(g, 0, false); a.advance(g, 0, true); expect(write).toHaveBeenCalledTimes(3);
    a.save('leave'); expect(result).toHaveBeenLastCalledWith(true, 'leave');
  });
});

it('does not call unrelated clearing or retaking a new capture', () => {
  const g = newGameState(1); g.places[0].status = 'freed';
  const write = vi.fn(() => true), a = new Autosave(g, write, vi.fn());
  g.places[1].status = 'cleared'; a.advance(g, 0); expect(write).not.toHaveBeenCalled();
  g.places[0].status = 'held'; a.advance(g, 0); expect(write).not.toHaveBeenCalled();
});
