// The first evening, step 5: the post (task 010; queue item 27). Pure: no engine, DOM or storage.
// "For when it goes wrong": the blade against the practice post, then dodging her thrown turnips, then lock on.
// Blade strikes are the battle's own swing arc (inSwingArc) against the post; a turnip that arrives where the hero
// still is, and he has not rolled while it flew, is a hit that hurts nothing and earns a line.
import { inSwingArc } from '../combat';
import type { Vec2 } from '../types';

export type PostPhase = 'intro' | 'blade' | 'dodge' | 'lock' | 'done';
export interface PostState {
  phase: PostPhase;
  /** Blade strikes that landed on the post. */
  strikes: number;
  /** Turnips dodged (rolled clear of while in the air). */
  dodged: number;
  /** Turnips that struck the hero; picks her next line in turn. Nothing is hurt. */
  hits: number;
}
export interface PostRules {
  strikes: number;
  dodges: number;
  /** A turnip lands this far from the hero or nearer and he is not rolling: struck. Metres. */
  turnipRadius: number;
  /** Seconds a turnip is in the air, and between throws. */
  turnipFlight: number;
  throwEvery: number;
  /** Lock on takes the post within this range, metres. */
  lockRange: number;
}
/** A turnip in the air: thrown from her hand at where the hero stood when it left it. Not saved. */
export interface Turnip { from: Vec2; to: Vec2; t: number; rolled: boolean }

export type PostEvent =
  | { type: 'postOpened' }
  /** The battle's hero sword strike landed this step, from where and facing which way. */
  | { type: 'bladeStrike'; hero: Vec2; yaw: number; post: Vec2 & { radius: number }; range: number; arc: number; locked: boolean }
  | { type: 'turnipLanded'; hero: Vec2; rolling: boolean; turnip: Turnip };

export function newPost(): PostState { return { phase: 'intro', strikes: 0, dodged: 0, hits: 0 }; }

export function advancePost(s: PostState, e: PostEvent, r: PostRules): PostState {
  switch (e.type) {
    case 'postOpened': return s.phase === 'intro' ? { ...s, phase: 'blade' } : s;
    case 'bladeStrike': {
      if (s.phase !== 'blade' && s.phase !== 'lock') return s;
      if (!inSwingArc(e.hero.x, e.hero.z, e.yaw, e.post.x, e.post.z, e.post.radius, e.range, e.arc)) return s;
      if (s.phase === 'lock') return e.locked ? { ...s, phase: 'done' } : s;
      const strikes = s.strikes + 1;
      return { ...s, strikes, phase: strikes >= r.strikes ? 'dodge' : 'blade' };
    }
    case 'turnipLanded': {
      if (s.phase !== 'dodge') return s;
      // A roll while it is in the air is a dodge (the roll is the battle's dodge, untouchable while it lasts).
      const rolled = e.turnip.rolled || e.rolling;
      const near = Math.hypot(e.hero.x - e.turnip.to.x, e.hero.z - e.turnip.to.z) <= r.turnipRadius;
      if (near && !rolled) return { ...s, hits: s.hits + 1 };
      // Only a roll teaches the roll: walking out of the way is neither a hit nor a dodge.
      if (!rolled) return s;
      const dodged = s.dodged + 1;
      return { ...s, dodged, phase: dodged >= r.dodges ? 'lock' : 'dodge' };
    }
  }
}

/** One step of a turnip's flight; returns it landed once its time is up. */
export function stepTurnip(t: Turnip, dt: number, rolling: boolean, r: PostRules): { turnip: Turnip; landed: boolean } {
  const next = { ...t, t: t.t + dt, rolled: t.rolled || rolling };
  return { turnip: next, landed: next.t >= r.turnipFlight };
}
/** Where a turnip is, with a throw's arc: up to `peak` metres over the straight line at its middle. */
export function turnipAt(t: Turnip, r: PostRules, peak = 1.6): { x: number; z: number; lift: number } {
  const k = Math.min(1, Math.max(0, t.t / r.turnipFlight));
  return { x: t.from.x + (t.to.x - t.from.x) * k, z: t.from.z + (t.to.z - t.from.z) * k, lift: 4 * peak * k * (1 - k) };
}
/** She throws while the dodge is asked for and nothing is in the air, once every `throwEvery` seconds. */
export function shouldThrow(s: PostState, inAir: boolean, sinceLast: number, r: PostRules): boolean {
  return s.phase === 'dodge' && !inAir && sinceLast >= r.throwEvery;
}

export function postSays(before: PostState, after: PostState, hitLines: number): { group: string; index: number }[] {
  if (after.hits > before.hits) return [{ group: 'evening.post.hit', index: (after.hits - 1) % Math.max(1, hitLines) }];
  if (before.phase === after.phase) return [];
  if (after.phase === 'blade') return [{ group: 'evening.post', index: 0 }];
  if (after.phase === 'dodge') return [{ group: 'evening.post.dodge', index: 0 }];
  if (after.phase === 'lock') return [{ group: 'evening.post.lock', index: 0 }];
  if (after.phase === 'done') return [{ group: 'evening.post.done', index: 0 }];
  return [];
}

/** Which prompt shows: the blade's key until it is out, the dodge while she throws, lock on until it is held. */
export function postPrompt(s: PostState, bladeOut: boolean, locked: boolean): 'blade' | 'dodge' | 'lock' | null {
  if (s.phase === 'blade') return bladeOut ? null : 'blade';
  if (s.phase === 'dodge') return 'dodge';
  if (s.phase === 'lock') return locked ? (bladeOut ? null : 'blade') : 'lock';
  return null;
}
/** The lock holds the post while it is in range; out of range it lets go. */
export function canLock(hero: Vec2, post: Vec2, r: PostRules): boolean {
  return Math.hypot(hero.x - post.x, hero.z - post.z) <= r.lockRange;
}
