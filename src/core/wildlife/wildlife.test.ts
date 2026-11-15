import { describe, expect, it } from 'vitest';
import { advanceFox, type FoxState } from './fox';
import { startleFlock, type Flock } from './flocks';
import { geeseHonk } from './geese';
import { crowsCircling } from './crows';
import { reaches } from '../stealth';
import { WILDLIFE_TUNING as t } from './tuning';
import type { PlaceState } from '../types';

const flock: Flock = { id: 'songbirds-1', position: { x: 0, z: 0 }, startled: false };
const at = (x: number, z: number, movement: 'sprinting' | 'walking' | 'crouched' | 'still' | 'crouchedStill' = 'walking') =>
  ({ position: { x, z }, movement });

describe('flocks', () => {
  it('a sprinting hero near the flock startles it and emits a noise that reaches nearby enemies', () => {
    const r = startleFlock(flock, at(5, 0, 'sprinting'));
    expect(r.flock.startled).toBe(true);
    expect(r.stimulus?.kind).toBe('noise');
    expect(reaches(r.stimulus!, { x: 0, z: 10 })).toBe(true);
    expect(reaches(r.stimulus!, { x: 0, z: 60 })).toBe(false);
  });
  it('crouching or walking past does not startle', () => {
    expect(startleFlock(flock, at(3, 0, 'crouched')).flock.startled).toBe(false);
    expect(startleFlock(flock, at(3, 0, 'walking')).flock.startled).toBe(false);
    expect(startleFlock(flock, at(3, 0, 'crouched')).stimulus).toBeNull();
  });
  it('a sprint far from the flock does not startle it', () => {
    expect(startleFlock(flock, at(t.flockStartleRadius + 5, 0, 'sprinting')).flock.startled).toBe(false);
  });
  it('a flock startles once and does not re-emit', () => {
    const first = startleFlock(flock, at(3, 0, 'sprinting'));
    expect(startleFlock(first.flock, at(3, 0, 'sprinting')).stimulus).toBeNull();
  });
});

describe('crows', () => {
  const place = (status: PlaceState['status']) => ({ status }) as Pick<PlaceState, 'status'>;
  it('circle an enemy-held place and leave when it is freed', () => {
    expect(crowsCircling(place('held'))).toBe(true);
    expect(crowsCircling(place('freed'))).toBe(false);
  });
});

describe('the Mill geese', () => {
  const geese = { position: { x: 0, z: 0 } };
  it('running near them sets them honking, as a geese stimulus at their position', () => {
    const s = geeseHonk(geese, at(4, 0, 'sprinting'));
    expect(s).toEqual({ kind: 'geese', position: { x: 0, z: 0 } });
  });
  it('creeping past does not honk, even very close', () => {
    expect(geeseHonk(geese, at(1, 0, 'crouched'))).toBeNull();
    expect(geeseHonk(geese, at(1, 0, 'walking'))).toBeNull();
  });
  it('running far from them does not honk', () => {
    expect(geeseHonk(geese, at(t.geeseHonkRadius + 3, 0, 'sprinting'))).toBeNull();
  });
});

describe('the fox', () => {
  const secret = { x: 40, z: 0 };
  const idle: FoxState = { mode: 'idle', position: { x: 36, z: 0 } };
  it('a quiet hero close to the fox starts it leading toward the secret', () => {
    const next = advanceFox(idle, { hero: at(34, 0, 'walking'), secret }, 1);
    expect(next.mode).toBe('leading');
    expect(next.position.x).toBeGreaterThan(idle.position.x);
    expect(next.position.x).toBeLessThanOrEqual(secret.x);
  });
  it('the fox never moves faster than its lead speed', () => {
    const next = advanceFox({ ...idle, mode: 'leading' }, { hero: at(34, 0, 'crouched'), secret }, 0.5);
    expect(next.position.x - idle.position.x).toBeLessThanOrEqual(t.foxLeadSpeed * 0.5 + 1e-9);
  });
  it('a sprinting hero near the fox sends it away for good', () => {
    const gone = advanceFox({ ...idle, mode: 'leading' }, { hero: at(32, 0, 'sprinting'), secret }, 0.1);
    expect(gone.mode).toBe('gone');
    // Still gone on the next frame even if the hero is quiet again.
    expect(advanceFox(gone, { hero: at(34, 0, 'walking'), secret }, 1).mode).toBe('gone');
  });
  it('a gone fox returns only after the hero leaves the secret area', () => {
    const gone: FoxState = { mode: 'gone', position: { x: 36, z: 0 } };
    const far = t.foxAppearRadius * 2 + 5;
    expect(advanceFox(gone, { hero: at(40 - far, 0, 'walking'), secret }, 1).mode).toBe('idle');
  });
  it('a hero who stops following closely leaves the fox idle, not leading', () => {
    const next = advanceFox({ ...idle, mode: 'leading' }, { hero: at(10, 0, 'walking'), secret }, 1);
    expect(next.mode).toBe('idle');
  });
});
