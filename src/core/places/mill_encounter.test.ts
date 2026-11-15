import { describe, expect, it } from 'vitest';
import { TUNING } from '../../config/tuning';
import { MILL_BELL, MILL_REINFORCEMENTS } from '../../data/mill_alarm';
import { GEESE_PEN } from '../../data/wildlife';
import { PATROL_HUT_FIGHT } from '../../data/patrol_hut_fight';
import { createBattle, getHero, step } from '../battle';
import { blocksHero, walkSurfaceAt } from '../world/valley';
import { valleyBattleGround } from '../world/valley_battle';
import type { PlaceState, BattleInput } from '../types';
import { MillEncounter, millSight } from './mill_encounter';

const place = (): PlaceState => ({ id: 'mill', status: 'held', timesFreed: 0, bellSilenced: false, morale: 0.5 });
function setup() {
  const b = createBattle(PATROL_HUT_FIGHT, valleyBattleGround()), p = place(), c = new MillEncounter(b, 12);
  const hero = getHero(b); hero.x = 0; hero.z = 200; hero.y = walkSurfaceAt(hero.x, hero.z);
  return { b, p, c, hero };
}
function alert(c: MillEncounter) {
  for (const m of c.members.values()) { m.sense = { awareness: 'alert', notice: 3 }; m.fighter.awareness = 'alert'; }
}
function advance(s: ReturnType<typeof setup>, seconds: number, movement: 'still' | 'sprinting' = 'still') {
  for (let t = 0; t < seconds; t += TUNING.fixedDt) s.c.advance(s.b, 12, s.p, movement, TUNING.fixedDt);
}
const idle: BattleInput = { moveX: 0, moveZ: 0, camYaw: 0, aimPitch: 0, sprint: false, weapon: 'sword',
  attackPressed: false, attackHeld: false, attackReleased: false, dodgePressed: false };
describe('Mill place integration', () => {
  it('keeps the exact seven named defenders, unaware on the ground from creation', () => {
    const { c, b } = setup();
    expect(c.members.size).toBe(7);
    for (const m of c.members.values()) {
      expect(m.fighter.awareness).toBe('unaware'); expect(m.fighter.y).toBe(walkSurfaceAt(m.fighter.x, m.fighter.z));
      expect(b.fighters).toContain(m.fighter);
    }
  });
  it('does not let the combat AI alert or move a routine defender merely by proximity', () => {
    const s = setup(), m = s.c.members.get('pim')!;
    s.hero.x = m.fighter.x; s.hero.z = m.fighter.z + 10;
    const before = { x: m.fighter.x, z: m.fighter.z };
    step(s.b, idle);
    expect(m.fighter.awareness).toBe('unaware');
    expect({ x: m.fighter.x, z: m.fighter.z }).toEqual(before);
  });
  it('builds notice through suspicious to alert, using actual sight and heading', () => {
    const s = setup(), m = s.c.members.get('nessa_roke')!;
    // Choose a walkable visible point straight ahead of the authored routine.
    const f = m.fighter;
    let target: { x: number; z: number } | undefined;
    for (let d = 2; d <= 8; d += 1) {
      const p = { x: f.x + Math.sin(f.yaw) * d, z: f.z + Math.cos(f.yaw) * d };
      if (!blocksHero(p.x, p.z) && millSight(f, p)) { target = p; break; }
    }
    expect(target).toBeDefined(); Object.assign(s.hero, target);
    advance(s, 2.5);
    expect(m.fighter.awareness).toBe('suspicious');
    advance(s, 7);
    expect(m.fighter.awareness).toBe('alert');
  });
  it('geese alert the Mill when sprinted past, but not when still', () => {
    const s = setup(); Object.assign(s.hero, GEESE_PEN);
    s.c.advance(s.b, 12, s.p, 'crouchedStill', 1/60);
    expect([...s.c.members.values()].every(m => m.fighter.awareness === 'unaware')).toBe(true);
    s.c.advance(s.b, 12, s.p, 'sprinting', 1/60);
    expect([...s.c.members.values()].every(m => m.fighter.awareness === 'alert')).toBe(true);
  });
  it('a hit alerts a previously unaware defender', () => {
    const s = setup(), m = s.c.members.get('pim')!;
    s.hero.x = m.fighter.x + 1; s.hero.z = m.fighter.z;
    m.fighter.hp--;
    advance(s, 1/60);
    expect(m.fighter.awareness).toBe('alert');
  });
  it('the bell and outside entry points are walkable', () => {
    for (const p of [MILL_BELL, ...MILL_REINFORCEMENTS]) expect(blocksHero(p.x, p.z)).toBe(false);
  });
  it('Pim walks a navigable route and rings only after reaching the actual bell', () => {
    const s = setup(); alert(s.c);
    const runner = s.c.members.get('pim')!.fighter, start = { x: runner.x, z: runner.z };
    advance(s, 1/60);
    expect(s.c.alarm.bell.runnerId).toBe('pim'); expect(s.c.bellRings).toBe(0);
    for (let i = 0; i < 1200 && !s.c.bellRings; i++) {
      advance(s, 1/60); expect(blocksHero(runner.x, runner.z)).toBe(false);
    }
    expect(Math.hypot(runner.x - start.x, runner.z - start.z)).toBeGreaterThan(1);
    expect(s.c.bellRings).toBe(1);
    expect(Math.hypot(runner.x - MILL_BELL.x, runner.z - MILL_BELL.z)).toBeLessThanOrEqual(TUNING.mill.bellReach);
    expect(s.c.reinforcements).toBe(0); expect(s.c.issues.size).toBe(0);
    advance(s, TUNING.mill.reinforcementTravel + 1);
    expect(s.c.reinforcements).toBe(MILL_REINFORCEMENTS.length);
    expect(s.p.morale).toBeCloseTo(0.65);
    advance(s, 30); expect(s.c.bellRings).toBe(1); expect(s.c.reinforcements).toBe(2);
  });
  it('the actual combat step does not move a bell runner twice or overwrite sensing', () => {
    const s = setup(); alert(s.c);
    s.hero.x = -170; s.hero.z = 82;
    const runner = s.c.members.get('pim')!.fighter;
    const start = { x: runner.x, z: runner.z };
    s.c.advance(s.b, 12, s.p, 'still', TUNING.fixedDt);
    const prepared = { x: runner.x, z: runner.z };
    step(s.b, idle);
    expect({ x: runner.x, z: runner.z }).toEqual(prepared);
    expect(Math.hypot(runner.x - start.x, runner.z - start.z)).toBeLessThanOrEqual(TUNING.mill.runnerSpeed * TUNING.fixedDt + 1e-9);
    for (let i = 0; i < 1800 && !s.c.reinforcements; i++) {
      s.c.advance(s.b, 12, s.p, 'still', TUNING.fixedDt); step(s.b, idle);
    }
    expect(s.c.bellRings).toBe(1); expect(s.c.reinforcements).toBe(2);
    expect(s.c.issues.size).toBe(0);
  });
  it('a stopped runner is replaced and a dead runner never rings', () => {
    const s = setup(); alert(s.c); advance(s, 1/60);
    const pim = s.c.members.get('pim')!.fighter; pim.alive = false; pim.hp = 0;
    advance(s, 1/60); expect(s.c.alarm.bell.runnerId).toBe(null);
    advance(s, 1/60); expect(s.c.alarm.bell.runnerId).not.toBe('pim');
    expect(s.c.alarm.bell.runnerId).not.toBe(null);
  });
  it('a silenced bell never calls anyone and freeing cancels an incoming party', () => {
    const s = setup(); alert(s.c); s.p.bellSilenced = true; advance(s, 25);
    expect(s.c.bellRings).toBe(0); expect(s.c.reinforcements).toBe(0);
    s.p.bellSilenced = false;
    for (let i = 0; i < 1800 && !s.c.bellRings; i++) advance(s, 1/60);
    expect(s.c.bellRings).toBe(1);
    s.p.status = 'freed'; advance(s, 30);
    expect(s.c.reinforcements).toBe(0);
    expect([...s.c.members.values()].some(m => s.b.fighters.includes(m.fighter))).toBe(false);
  });
  it('zero simulation time advances neither awareness nor the reinforcement clock', () => {
    const s = setup(), before = JSON.stringify(s.c.snapshot());
    s.c.advance(s.b, 12, s.p, 'sprinting', 0); expect(JSON.stringify(s.c.snapshot())).toBe(before);
  });
  it('building footprints block sight', () => {
    expect(millSight({ x: -198, z: 57 }, { x: -180, z: 57 })).toBe(false);
  });
});
