// Item 27: steps 4 to 6, walking away and back, skip, and save version 6.
import { describe, expect, it } from 'vitest';
import { advance, advanceWith, awaySays, currentAsk, newTutorial, LESSON_RULES, STEP_NUMBER, type TutorialEvent, type TutorialState } from './lesson';
import { advanceFence, type FenceState, fencePrompt, fenceSays, glancing, newFence, watchYaw, type FenceFrame, type FenceRules } from './fence';
import { advancePost, type PostState, newPost, postPrompt, postSays, shouldThrow, stepTurnip, turnipAt, type PostRules, type Turnip } from './post';
import { advanceLantern, gateLanternLit, lanternSays, newLantern } from './lantern';
import { mapEntries, nearestHeld, toMap, type MapSite } from './map';
import { newGameState } from '../state';
import { decodeSave, encodeSave } from '../saves/codec';
import { SAVE_VERSION } from '../types';

const FR: FenceRules = { startDistance: 6, reach: 1.6, hearing: 9, away: 6, glance: 1.5 };
const PR: PostRules = { strikes: 3, dodges: 3, turnipRadius: 0.8, turnipFlight: 1, throwEvery: 2, lockRange: 9 };
const R = { fence: FR, post: PR };
const HESPER = { x: 0, z: 0 }, SCARE = { x: 0, z: -6 };
const glanceYaw = Math.atan2(SCARE.x - HESPER.x, SCARE.z - HESPER.z), awayYaw = glanceYaw + Math.PI * 0.8;
const frame = (hero: { x: number; z: number }, movement: FenceFrame['movement'], dt = 0.1, aim = false): FenceFrame =>
  ({ dt, hero, movement, hesper: HESPER, awayYaw, glanceYaw, scarecrow: SCARE, aimOnScarecrow: aim });
/** Walk from `a` to `b` in steps of `speed * dt`, with a given movement; returns the fence after. */
function walk(s: ReturnType<typeof newFence>, a: { x: number; z: number }, b: { x: number; z: number }, movement: FenceFrame['movement'], speed = 1.5, dt = 0.1) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (speed * dt));
  for (let i = 1; i <= n; i++) s = advanceFence(s, { type: 'fenceStep', frame: frame({ x: a.x + (b.x - a.x) * i / n, z: a.z + (b.z - a.z) * i / n }, movement, dt) }, FR);
  return s;
}
const START = { x: 3.5, z: 2 }; // 8.7 m from the scarecrow, east of her, behind her shoulder

describe('step 4, the fence', () => {
  it('starts only when she has asked; her ask is evening.fence, both lines', () => {
    const s = newFence();
    expect(advanceFence(s, { type: 'fenceStep', frame: frame(SCARE, 'crouched') }, FR)).toBe(s);
    const c = advanceFence(s, { type: 'fenceOpened' }, FR);
    expect(fenceSays(s, c, 3)).toEqual([{ group: 'evening.fence', index: 0 }, { group: 'evening.fence', index: 1 }]);
  });
  it('crouched, the crossing reaches the scarecrow unseen through her glances; then she asks for the mark', () => {
    let s = advanceFence(newFence(), { type: 'fenceOpened' }, FR);
    s = walk(s, START, { x: SCARE.x + 1, z: SCARE.z + 0.5 }, 'crouched', 0.4); // slow: about 22 s, three of her glances
    expect(s.seen).toBe(0); expect(s.phase).toBe('mark');
    expect(fenceSays({ ...s, phase: 'cross' }, s, 3)).toEqual([{ group: 'evening.fence.mark', index: 0 }]);
  });
  it('walking upright is heard; she says a seen line, and the crossing starts again from the start distance', () => {
    let s = advanceFence(newFence(), { type: 'fenceOpened' }, FR);
    const before = s;
    s = walk(s, START, { x: 1, z: -3 }, 'walking');
    expect(s.seen).toBe(1); expect(s.restart).toBe(true); expect(s.phase).toBe('cross');
    expect(fenceSays(before, s, 3)).toEqual([{ group: 'evening.fence.seen', index: 0 }]);
    // Reaching the scarecrow now does not count until the hero has gone back.
    const at = walk(s, { x: 1, z: -3 }, { x: 0.5, z: -5.5 }, 'crouched', 0.4);
    expect(at.phase).toBe('cross'); expect(at.restart).toBe(true);
    const back = walk(at, { x: 0.5, z: -5.5 }, START, 'crouched', 0.4);
    expect(back.restart).toBe(false);
    const done = walk(back, START, { x: 0.5, z: -5 }, 'crouched', 0.4);
    expect(done.phase).toBe('mark'); expect(done.seen).toBe(1);
  });
  it('crouched but in her eye during a glance is the stealth rule, not a script: a fast upright dash in view is seen', () => {
    let s = advanceFence(newFence(), { type: 'fenceOpened' }, FR);
    s = { ...s, clock: FR.away }; // glancing now
    expect(glancing(s.clock, FR)).toBe(true); expect(watchYaw(s, frame(START, 'still'), FR)).toBe(glanceYaw);
    const seen = walk(s, { x: 0.5, z: -2 }, { x: 0.5, z: -2.6 }, 'sprinting', 6);
    expect(seen.seen).toBe(1);
    const still = advanceFence(s, { type: 'fenceStep', frame: frame({ x: 0.5, z: -3 }, 'crouchedStill', 1.4) }, FR);
    expect(still.seen).toBe(0);
  });
  it('the mark is the marking rule: aim held on the scarecrow for the hold time, then done', () => {
    let s: FenceState = { ...newFence(), phase: 'mark' };
    s = advanceFence(s, { type: 'fenceStep', frame: frame(SCARE, 'still', 0.5, true) }, FR);
    expect(s.phase).toBe('mark'); expect(s.markHeld).toBeCloseTo(0.5);
    const off = advanceFence(s, { type: 'fenceStep', frame: frame(SCARE, 'still', 0.5, false) }, FR);
    expect(off.markHeld).toBe(0); // looking away starts the hold again
    s = advanceFence(s, { type: 'fenceStep', frame: frame(SCARE, 'still', 0.6, true) }, FR);
    expect(s.phase).toBe('done');
    expect(fenceSays({ ...s, phase: 'mark' }, s, 3)).toEqual([{ group: 'evening.fence.done', index: 0 }]);
  });
  it('prompts: crouch until crouched, then at the scarecrow the bow, then look closer', () => {
    const c = advanceFence(newFence(), { type: 'fenceOpened' }, FR);
    expect(fencePrompt(c, false, false)).toBe('crouch'); expect(fencePrompt(c, false, true)).toBeNull();
    expect(fencePrompt({ ...c, phase: 'mark' }, false, true)).toBe('bow'); expect(fencePrompt({ ...c, phase: 'mark' }, true, true)).toBe('mark');
    expect(fencePrompt({ ...c, phase: 'done' }, true, true)).toBeNull();
  });
});

describe('step 5, the post', () => {
  const post = { x: 0, z: 2, radius: 0.15 };
  const strike = (yaw: number, locked = false, hero = { x: 0, z: 0 }) => ({ type: 'bladeStrike' as const, hero, yaw, post, range: 2.3, arc: 1.15, locked });
  it('the blade: three strikes that land in the swing arc; one facing away does not count', () => {
    let s = advancePost(newPost(), { type: 'postOpened' }, PR);
    expect(postSays(newPost(), s, 2)).toEqual([{ group: 'evening.post', index: 0 }]);
    expect(advancePost(s, strike(Math.PI), PR)).toBe(s);
    expect(advancePost(s, strike(0, false, { x: 0, z: -3 }), PR)).toBe(s); // out of reach
    const b = s;
    for (let i = 0; i < 3; i++) s = advancePost(s, strike(0), PR);
    expect(s.phase).toBe('dodge'); expect(postSays(b, s, 2).at(-1)).toEqual({ group: 'evening.post.dodge', index: 0 });
  });
  it('turnips: a roll in the air is a dodge; standing still is a hit and her line; walking away is neither; nothing hurts', () => {
    let s: PostState = { ...newPost(), phase: 'dodge' };
    const t: Turnip = { from: { x: 0, z: 5 }, to: { x: 0, z: 0 }, t: 0, rolled: false };
    const hit = advancePost(s, { type: 'turnipLanded', hero: { x: 0.1, z: 0 }, rolling: false, turnip: t }, PR);
    expect(hit.hits).toBe(1); expect(postSays(s, hit, 2)).toEqual([{ group: 'evening.post.hit', index: 0 }]);
    expect(advancePost(s, { type: 'turnipLanded', hero: { x: 3, z: 0 }, rolling: false, turnip: t }, PR)).toBe(s);
    for (let i = 0; i < 3; i++) s = advancePost(s, { type: 'turnipLanded', hero: { x: 2, z: 0 }, rolling: false, turnip: { ...t, rolled: true } }, PR);
    expect(s.phase).toBe('lock'); expect(s.dodged).toBe(3);
    const near = advancePost({ ...newPost(), phase: 'dodge' }, { type: 'turnipLanded', hero: { x: 0, z: 0 }, rolling: false, turnip: { ...t, rolled: true } }, PR);
    expect(near).toMatchObject({ dodged: 1, hits: 0 }); // rolled under it: the roll is untouchable while it lasts
    expect(Object.keys(s)).not.toContain('hp');
  });
  it('turnip flight: thrown only while the dodge is asked and nothing in the air; arcs; lands at its time; a roll is remembered', () => {
    const d = { ...newPost(), phase: 'dodge' as const };
    expect(shouldThrow(d, false, 2, PR)).toBe(true); expect(shouldThrow(d, true, 5, PR)).toBe(false);
    expect(shouldThrow(d, false, 1, PR)).toBe(false); expect(shouldThrow(newPost(), false, 9, PR)).toBe(false);
    let t: Turnip = { from: { x: 0, z: 4 }, to: { x: 0, z: 0 }, t: 0, rolled: false };
    let r = stepTurnip(t, 0.5, true, PR); expect(r.landed).toBe(false); expect(r.turnip.rolled).toBe(true);
    expect(turnipAt(r.turnip, PR)).toMatchObject({ x: 0, z: 2 }); expect(turnipAt(r.turnip, PR).lift).toBeGreaterThan(1);
    t = r.turnip; r = stepTurnip(t, 0.5, false, PR); expect(r.landed).toBe(true); expect(r.turnip.rolled).toBe(true);
  });
  it('lock on: only a strike made while locked finishes it; then evening.post.done', () => {
    const s = { ...newPost(), phase: 'lock' as const };
    expect(advancePost(s, strike(0, false), PR)).toBe(s);
    const done = advancePost(s, strike(0, true), PR);
    expect(done.phase).toBe('done'); expect(postSays(s, done, 2)).toEqual([{ group: 'evening.post.done', index: 0 }]);
    expect(postPrompt(s, true, false)).toBe('lock'); expect(postPrompt(s, true, true)).toBeNull(); expect(postPrompt(s, false, true)).toBe('blade');
    expect(postPrompt({ ...s, phase: 'blade' }, false, false)).toBe('blade'); expect(postPrompt({ ...s, phase: 'dodge' }, true, false)).toBe('dodge');
  });
});

describe('step 6, the lantern and the map', () => {
  it('asked, lit within reach only, then hesper.lantern.first and evening.map; done once the map is shown', () => {
    let s = advanceLantern(newLantern(), { type: 'lanternAsked' });
    expect(lanternSays(newLantern(), s, 3)).toEqual([{ group: 'evening.lantern', index: 0 }]);
    expect(advanceLantern(s, { type: 'lanternLit', hero: { x: 5, z: 0 }, lantern: { x: 0, z: 0 }, reach: 2.5 })).toBe(s);
    const lit = advanceLantern(s, { type: 'lanternLit', hero: { x: 2, z: 0 }, lantern: { x: 0, z: 0 }, reach: 2.5 });
    expect(gateLanternLit(lit)).toBe(true); expect(gateLanternLit(s)).toBe(false);
    expect(lanternSays(s, lit, 3).map(l => `${l.group}.${l.index}`)).toEqual(['hesper.lantern.first.0', 'hesper.lantern.first.1', 'hesper.lantern.first.2', 'evening.map.0']);
    s = advanceLantern(lit, { type: 'mapShown' });
    expect(s.phase).toBe('done'); expect(gateLanternLit(s)).toBe(true);
  });
  const SITES: MapSite[] = [{ id: 'wick', name: 'Wick', x: 64, z: 72, kind: 'village' }, { id: 'mill', name: 'The Mill', x: -176, z: 50, kind: 'camp' },
    { id: 'forge', name: 'The Forge', x: 38, z: -176, kind: 'camp' }, { id: 'watch_house', name: 'The Watch-house', x: -170, z: -192, kind: 'camp' }];
  it('the map shows nothing undiscovered: a new game on the road shows no site; Wick once past the road; camps only when found', () => {
    const g = newGameState(1);
    expect(mapEntries(g, SITES)).toEqual([]);
    g.tutorial = { ...g.tutorial, step: 'door' };
    expect(mapEntries(g, SITES).map(e => e.id)).toEqual(['wick']);
    g.discoveredPlaces = ['mill'];
    expect(mapEntries(g, SITES).map(e => [e.id, e.status])).toEqual([['wick', 'home'], ['mill', 'held']]);
    g.places = g.places.map(p => p.id === 'mill' ? { ...p, status: 'freed' } : p);
    expect(mapEntries(g, SITES).find(e => e.id === 'mill')?.status).toBe('freed');
  });
  it('she points to the nearest place still held: from her gate, the Mill', () => {
    const g = newGameState(1);
    expect(nearestHeld({ x: 91.6, z: 108.6 }, g, SITES)?.id).toBe('mill');
    g.places = g.places.map(p => p.id === 'mill' ? { ...p, status: 'freed' } : p);
    expect(nearestHeld({ x: 91.6, z: 108.6 }, g, SITES)?.id).toBe('forge');
    expect(toMap({ x: 0, z: 0 }, 400)).toEqual({ u: 0.5, v: 0.5 });
  });
});

describe('the whole evening, walking away, and skip', () => {
  const run = (s: TutorialState, ...e: TutorialEvent[]) => e.reduce((a, x) => advanceWith(a, x, R), s);
  const toFence = () => run(newTutorial(), { type: 'reachedDoor' }, { type: 'chose', choice: 'show' }, { type: 'yardOpened' },
    { type: 'arrowHit', target: 'straw.0' }, { type: 'arrowHit', target: 'straw.1' }, { type: 'arrowHit', target: 'straw.2' },
    { type: 'arrowHit', target: 'far' }, { type: 'arrowChanged', delta: 1 });
  const post = { x: 0, z: 2, radius: 0.15 };
  const t0: Turnip = { from: { x: 0, z: 5 }, to: { x: 0, z: 0 }, t: 1, rolled: true };
  it('steps 4, 5, 6 in order, then done', () => {
    let s = toFence(); expect(s.step).toBe('fence'); expect(STEP_NUMBER[s.step]).toBe(4);
    s = run(s, { type: 'fenceOpened' });
    s = { ...s, fence: { ...s.fence, phase: 'mark' } };
    s = run(s, { type: 'fenceStep', frame: frame(SCARE, 'still', 1.1, true) });
    expect(s.step).toBe('post'); expect(STEP_NUMBER[s.step]).toBe(5);
    expect(run(s, { type: 'lanternAsked' })).toBe(s); // nothing of step 6 counts in step 5
    s = run(s, { type: 'postOpened' }, ...Array(3).fill({ type: 'bladeStrike', hero: { x: 0, z: 0 }, yaw: 0, post, range: 2.3, arc: 1.15, locked: false }),
      ...Array(3).fill({ type: 'turnipLanded', hero: { x: 2, z: 0 }, rolling: false, turnip: t0 }),
      { type: 'bladeStrike', hero: { x: 0, z: 0 }, yaw: 0, post, range: 2.3, arc: 1.15, locked: true });
    expect(s.step).toBe('lantern'); expect(STEP_NUMBER[s.step]).toBe(6);
    s = run(s, { type: 'lanternAsked' }, { type: 'lanternLit', hero: { x: 0, z: 0 }, lantern: { x: 1, z: 0 }, reach: 2.5 }, { type: 'mapShown' });
    expect(s.step).toBe('done'); expect(currentAsk(s)).toBeNull();
  });
  it('skip goes straight to the lantern; the lantern is lit and the evening done without fence or post', () => {
    let s = run(newTutorial(), { type: 'reachedDoor' }, { type: 'chose', choice: 'skip' });
    expect(s.step).toBe('lantern');
    expect(run(s, { type: 'fenceOpened' })).toBe(s); expect(run(s, { type: 'postOpened' })).toBe(s);
    s = run(s, { type: 'lanternAsked' }, { type: 'lanternLit', hero: { x: 0, z: 0 }, lantern: { x: 1, z: 0 }, reach: 2.5 }, { type: 'mapShown' });
    expect(s).toMatchObject({ step: 'done', fence: { phase: 'intro' }, post: { phase: 'intro' } });
  });
  it('walking away mid-lesson: one call, nothing counts while away, a welcome back in turn, and the current ask again', () => {
    let s = run(toFence(), { type: 'fenceOpened' });
    const away = run(s, { type: 'leftYard' });
    expect(awaySays(s, away, 2)).toEqual([{ group: 'evening.left', index: 0 }]);
    expect(run(away, { type: 'leftYard' })).toBe(away); // she calls once
    expect(run(away, { type: 'fenceStep', frame: frame(START, 'walking') })).toBe(away);
    const back = run(away, { type: 'cameBack' });
    expect(awaySays(away, back, 2)).toEqual([{ group: 'evening.back', index: 0 }]);
    expect(currentAsk(back)).toEqual({ group: 'evening.fence', index: 0 });
    const again = run(back, { type: 'leftYard' }, { type: 'cameBack' });
    expect(awaySays(run(back, { type: 'leftYard' }), again, 2)).toEqual([{ group: 'evening.back', index: 1 }]);
    s = run(newTutorial(), { type: 'leftYard' }); expect(s.away).toBe(false); // on the road there is no lesson to leave
    const done = { ...toFence(), step: 'done' as const };
    expect(run(done, { type: 'leftYard' })).toBe(done);
  });
  it('the default rules are the tuning file', () => {
    expect(LESSON_RULES.fence.reach).toBeGreaterThan(0); expect(LESSON_RULES.post.strikes).toBeGreaterThan(0);
    const s = advance(advance(newTutorial(), { type: 'reachedDoor' }), { type: 'chose', choice: 'skip' });
    expect(s.step).toBe('lantern');
  });
});

describe('save version 6', () => {
  it('a lesson left at step 4 or 5 round-trips, and Continue resumes it there', () => {
    expect(SAVE_VERSION).toBe(6);
    const g = newGameState(3);
    g.tutorial = { ...g.tutorial, step: 'post', choice: 'show', opened: true, away: true, backs: 1,
      fence: { phase: 'done', seen: 2, restart: false, notice: 0, clock: 31.5, markHeld: 0 }, post: { phase: 'dodge', strikes: 3, dodged: 1, hits: 2 } };
    const d = decodeSave(encodeSave(g), 3);
    expect(d.status).toBe('loaded'); expect(d.state.tutorial).toEqual(g.tutorial);
    const bad: any = structuredClone(g); bad.tutorial.post.phase = 'somewhere'; expect(decodeSave(JSON.stringify(bad), 3).status).toBe('damaged');
    const bad2: any = structuredClone(g); delete bad2.tutorial.lantern; expect(decodeSave(JSON.stringify(bad2), 3).status).toBe('damaged');
  });
  it('version 5 saves keep their step and yard, and gain unstarted steps 4 to 6', () => {
    const v5: any = newGameState(3); v5.version = 5;
    v5.tutorial = { step: 'fence', opened: true, used: { move: true, look: true, sprint: true }, walked: 3, choice: 'show',
      yard: { phase: 'done', struck: ['straw.0', 'straw.1', 'straw.2'], misses: 1, arrow: 'blunt' } };
    const d = decodeSave(JSON.stringify(v5), 3);
    expect(d.status).toBe('loaded');
    expect(d.state.tutorial).toMatchObject({ step: 'fence', yard: v5.tutorial.yard, fence: { phase: 'intro', seen: 0 }, post: { phase: 'intro' },
      lantern: { phase: 'intro' }, away: false, backs: 0 });
    const skip: any = structuredClone(v5); skip.tutorial = { ...skip.tutorial, step: 'lantern', choice: 'skip' };
    expect(decodeSave(JSON.stringify(skip), 3).state.tutorial).toMatchObject({ step: 'lantern', lantern: { phase: 'intro' } });
  });
});
