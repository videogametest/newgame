import { describe, expect, it } from 'vitest';
import { advanceYard, arrowStrikes, flightStep, newYard, yardPrompt, yardSays, type YardEvent, type YardState } from './yard';
import { advance, newTutorial, STEP_NUMBER, PENDING, type TutorialState } from './lesson';

const run = (s: YardState, ...e: YardEvent[]) => e.reduce(advanceYard, s);
const hit = (target: string): YardEvent => ({ type: 'arrowHit', target });
const LINES = { targets: 3, far: 2 };
describe('the yard (item 26)', () => {
  it('opens on her yard lines, then three straw men, then the far one, then the arrow', () => {
    let s = newYard();
    expect(s.phase).toBe('intro');
    expect(advanceYard(s, hit('straw.0'))).toBe(s); // nothing counts before she has asked
    s = run(s, { type: 'yardOpened' }, hit('straw.0'), hit('straw.1'));
    expect(s).toMatchObject({ phase: 'targets', struck: ['straw.0', 'straw.1'] });
    expect(run(s, hit('straw.1'))).toBe(s); // the same one twice is not a second
    expect(run(s, hit('far'))).toBe(s);
    s = run(s, hit('straw.2'));
    expect(s.phase).toBe('far');
    s = run(s, hit('far'));
    expect(s.phase).toBe('arrows');
    s = run(s, { type: 'arrowChanged', delta: 1 });
    expect(s).toMatchObject({ phase: 'done', arrow: 'blunt' });
  });
  it('the arrow cannot be changed before she hands over the blunt heads; changing back and forth is free after', () => {
    const s = run(newYard(), { type: 'yardOpened' });
    expect(run(s, { type: 'arrowChanged', delta: 1 })).toBe(s);
    const done = run(s, hit('straw.0'), hit('straw.1'), hit('straw.2'), hit('far'), { type: 'arrowChanged', delta: -1 });
    expect(done).toMatchObject({ phase: 'done', arrow: 'blunt' });
    expect(run(done, { type: 'arrowChanged', delta: 1 })).toMatchObject({ phase: 'done', arrow: 'standard' });
  });
  it('a miss is one dry line, her written ones in turn, and another go; nothing is lost', () => {
    let s = run(newYard(), { type: 'yardOpened' }, hit('straw.0'));
    const says: string[] = [];
    for (let i = 0; i < 4; i++) {
      const next = advanceYard(s, { type: 'arrowMissed' });
      says.push(...yardSays(s, next, LINES).map(l => `${l.group}.${l.index}`));
      s = next;
    }
    expect(says).toEqual(['evening.targets.miss.0', 'evening.targets.miss.1', 'evening.targets.miss.2', 'evening.targets.miss.0']);
    expect(s.struck).toEqual(['straw.0']);
    s = run(s, hit('straw.1'), hit('straw.2'));
    const far = advanceYard(s, hit('straw.0')); // a straw man is not the far target
    expect(yardSays(s, far, LINES)).toEqual([{ group: 'evening.far.miss', index: far.misses % 2 === 1 ? 0 : 1 }]);
  });
  it('successes say the done line and ask the next thing', () => {
    const a = run(newYard(), { type: 'yardOpened' }, hit('straw.0'), hit('straw.1'));
    const b = advanceYard(a, hit('straw.2'));
    expect(yardSays(a, b, LINES).map(l => l.group)).toEqual(['evening.targets.done', 'evening.far']);
    const c = advanceYard(b, hit('far'));
    expect(yardSays(b, c, LINES).map(l => l.group)).toEqual(['evening.far.done', 'evening.arrows']);
    const d = advanceYard(c, { type: 'arrowChanged', delta: 1 });
    expect(yardSays(c, d, LINES).map(l => l.group)).toEqual(['evening.arrows.done']);
    expect(yardSays(a, a, LINES)).toEqual([]);
  });
  it('prompts: the bow first, then draw and loose, then change arrow, then none', () => {
    const s = run(newYard(), { type: 'yardOpened' });
    expect(yardPrompt(newYard(), true)).toBeNull();
    expect(yardPrompt(s, false)).toBe('bow');
    expect(yardPrompt(s, true)).toBe('draw');
    const c = run(s, hit('straw.0'), hit('straw.1'), hit('straw.2'), hit('far'));
    expect(yardPrompt(c, true)).toBe('arrow');
    expect(yardPrompt(run(c, { type: 'arrowChanged', delta: 1 }), true)).toBeNull();
  });
});

describe('the yard inside the evening', () => {
  const toYard = (): TutorialState => [{ type: 'reachedDoor' } as const, { type: 'chose', choice: 'show' } as const].reduce(advance, newTutorial());
  it('yard events count only in the yard; skipping still goes to the lantern', () => {
    const skip = [{ type: 'reachedDoor' } as const, { type: 'chose', choice: 'skip' } as const].reduce(advance, newTutorial());
    expect(skip.step).toBe('lantern');
    expect(advance(skip, { type: 'yardOpened' })).toBe(skip);
    const road = newTutorial();
    expect(advance(road, hit('straw.0'))).toBe(road);
  });
  it('finishing the yard moves the lesson to step 4, built by item 27 (fence.test.ts)', () => {
    const s = [{ type: 'yardOpened' } as const, hit('straw.0'), hit('straw.1'), hit('straw.2'), hit('far'),
      { type: 'arrowChanged', delta: 1 } as const].reduce(advance, toYard());
    expect(s.step).toBe('fence'); expect(STEP_NUMBER[s.step]).toBe(4); expect(PENDING.fence).toBeUndefined(); expect(s.fence.phase).toBe('intro');
    expect(s.yard.arrow).toBe('blunt');
  });
  it('leaving mid-lesson keeps what was done (it is all in the saved state)', () => {
    const s = [{ type: 'yardOpened' } as const, hit('straw.0'), hit('straw.2')].reduce(advance, toYard());
    const back = JSON.parse(JSON.stringify(s)) as TutorialState;
    expect(back.yard).toEqual({ phase: 'targets', struck: ['straw.0', 'straw.2'], misses: 0, arrow: 'standard' });
    expect(advance(back, hit('straw.1')).yard.phase).toBe('far');
  });
});

describe('arrow flight against targets', () => {
  const T = [{ id: 'a', x: 5, z: 0, radius: 0.3, height: 1.7, base: 0 }];
  it('a segment through the cylinder strikes it; one over it, beside it or short of it does not', () => {
    const p = (x: number, y: number, z = 0) => ({ x, y, z, vx: 0, vy: 0, vz: 0 });
    expect(arrowStrikes(p(4, 1), p(6, 1), T, 0.05)).toBe('a');
    expect(arrowStrikes(p(4, 2), p(6, 2), T, 0.05)).toBeNull();
    expect(arrowStrikes(p(4, 1, 0.5), p(6, 1, 0.5), T, 0.05)).toBeNull();
    expect(arrowStrikes(p(3, 1), p(4.5, 1), T, 0.05)).toBeNull();
    expect(arrowStrikes(p(4, 2.5), p(5.2, 1.5), T, 0.05)).toBe('a'); // dropping into the top
  });
  it('the nearer of two targets on the line is struck', () => {
    const two = [...T, { id: 'b', x: 3, z: 0, radius: 0.3, height: 1.7, base: 0 }];
    const p = (x: number) => ({ x, y: 1, z: 0, vx: 0, vy: 0, vz: 0 });
    expect(arrowStrikes(p(0), p(8), two, 0.05)).toBe('b');
  });
  it('flight steps fall under gravity like the battle', () => {
    const s = flightStep({ x: 0, y: 1, z: 0, vx: 10, vy: 0, vz: 0 }, 0.1, 9.8);
    expect(s.x).toBeCloseTo(1); expect(s.vy).toBeCloseTo(-0.98); expect(s.y).toBeCloseTo(1 - 0.098);
  });
});
