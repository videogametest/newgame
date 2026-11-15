// Item 16. Pure place controller. Shares the actual battle fighters: arrows can stop the runner.
import { TUNING } from '../../config/tuning';
import { garrisonOf } from '../../data/bandits';
import { MILL_BELL, MILL_REINFORCEMENTS } from '../../data/mill_alarm';
import { GEESE_PEN, MILL_CENTRE } from '../../data/wildlife';
import { getHero, makeFighter } from '../battle';
import { advanceAwareness, type AwarenessState, type Observation, type Stimulus } from '../stealth';
import { geeseHonk } from '../wildlife/geese';
import type { BattleState, Fighter, PlaceState, Vec2 } from '../types';
import { blocksHero, valleyHeightAt, valleySolids, walkSurfaceAt } from '../world/valley';
import { solidAt } from '../world/solids';
import { buildWalkableCells, findPathCells, type WalkableCells } from '../world/pathfinding';
import { MILL_GRID, defendersAt, type Defender } from './defenders';
import { advanceAlarm, newAlarm, type AlarmState } from './reinforcements';
import { MillOverhearing, type OverheardWords, type OverhearMember, type OverhearMemory } from './mill_overhear';

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
let grid: WalkableCells | undefined;
function navigation(): WalkableCells {
  return grid ??= buildWalkableCells({ width: MILL_GRID.width, depth: MILL_GRID.depth,
    isBlocked: (x, z) => blocksHero(MILL_GRID.originX + x, MILL_GRID.originZ + z) });
}
/** Terrain and building footprints occlude sight. Walls block sight, never hearing. */
export function millSight(a: Vec2, b: Vec2): boolean {
  const steps = Math.ceil(distance(a, b) / TUNING.mill.sightStep);
  const ay = walkSurfaceAt(a.x, a.z) + 1.5, by = walkSurfaceAt(b.x, b.z) + 1;
  for (let i = 1; i < steps; i++) {
    const t = i / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    if (solidAt(valleySolids(), x, z) || valleyHeightAt(x, z) > ay + (by - ay) * t) return false;
  }
  return true;
}
interface Member { fighter: Fighter; sense: AwarenessState; hp: number; routine: Defender }
interface Route { goal: string; points: Vec2[]; next: number }
export class MillEncounter {
  alarm: AlarmState = newAlarm();
  readonly members = new Map<string, Member>();
  readonly routes = new Map<number, Route>();
  readonly issues = new Set<string>();
  private readonly outsideIds = new Set<number>();
  bellRings = 0;
  reinforcements = 0;
  /** Item 17: what the Mill men say to someone close and unnoticed. The words come in from the render layer. */
  readonly overhear: MillOverhearing;
  constructor(battle: BattleState, hour = 12, words: OverheardWords = () => [], onHeard?: (id: string) => void, memory?: OverhearMemory) {
    this.overhear = new MillOverhearing(words, onHeard, undefined, undefined, memory);
    const roster = garrisonOf('mill', false);
    for (const d of defendersAt('mill', hour)) {
      const f = makeFighter(battle, { unitId: d.kind === 'archer' ? 'enemy_archer' : 'enemy_soldier',
        kind: d.kind === 'archer' ? 'archer' : 'soldier', team: 'enemy', x: d.x, z: d.z, yaw: d.yaw });
      f.worldDriven = true;
      const member = { fighter: f, sense: { awareness: 'unaware' as const, notice: 0 }, hp: f.hp, routine: d };
      this.members.set(roster.find(b => b.id === d.id)!.id, member);
      if (d.present) battle.fighters.push(f);
    }
  }
  /** Called once per fixed simulation step, never from rendering. */
  advance(battle: BattleState, hour: number, place: PlaceState, movement: Observation['movement'], dt: number): void {
    if (dt <= 0) return;
    const hero = getHero(battle), t = TUNING.mill;
    const plan = { travelSeconds: t.reinforcementTravel, moraleGain: t.reinforcementMorale, spawns: MILL_REINFORCEMENTS };
    if (place.status !== 'held') {
      const ids = new Set([...this.members.values()].map(m => m.fighter.id).concat([...this.outsideIds]));
      battle.fighters = battle.fighters.filter(f => !ids.has(f.id));
      this.alarm = advanceAlarm(this.alarm, place, { volunteer: null, runnerCanAct: false, runnerAtBell: false }, dt, plan).state;
      this.overhear.stop();
      return;
    }
    const routines = defendersAt('mill', hour);
    const goose = geeseHonk({ position: GEESE_PEN }, { position: hero, movement });
    const awake = [...this.members.values()].filter(m => m.fighter.alive && m.sense.awareness === 'alert');
    for (const [id, m] of this.members) {
      const f = m.fighter, d = routines.find(d => d.id === id) ?? m.routine;
      m.routine = d;
      const present = d.present || m.sense.awareness !== 'unaware';
      const included = battle.fighters.includes(f);
      if (present && !included) battle.fighters.push(f);
      if (!present && included) battle.fighters = battle.fighters.filter(other => other !== f);
      if (!f.alive || !present) continue;
      if (!f.worldDriven || m.sense.awareness === 'unaware') this.routes.delete(f.id);
      if (m.sense.awareness === 'unaware') {
        f.x = d.x; f.z = d.z; f.yaw = d.yaw; f.y = walkSurfaceAt(f.x, f.z);
      }
      if (distance(f, hero) > t.activationRadius) continue;
      const stimuli: Stimulus[] = [];
      if (goose) stimuli.push(goose);
      if (f.hp < m.hp) stimuli.push({ kind: 'nearby_alert', position: hero });
      if (awake.some(other => other !== m && distance(other.fighter, f) <= t.alertRadius))
        stimuli.push({ kind: 'nearby_alert', position: hero });
      m.hp = f.hp;
      const illuminated = [...this.members.values()].some(other => other.routine.torch && distance(other.fighter, hero) < t.torchReach);
      m.sense = advanceAwareness(m.sense, { observer: f, yaw: f.yaw, target: hero,
        lineOfSight: hero.alive && d.activity !== 'sleep' && millSight(f, hero), movement,
        tallGrass: false, night: hour < 6 || hour >= 18, illuminated }, dt, stimuli);
      f.awareness = m.sense.awareness;
      f.worldDriven = f.awareness !== 'alert';
      if (f.worldDriven) {
        f.action = { phase: 'idle', t: 0, struck: false, zoneX: 0, zoneZ: 0 };
        f.vx = f.vz = 0;
        if (f.awareness === 'suspicious' && m.sense.lastKnownPosition)
          this.walk(f, m.sense.lastKnownPosition, t.investigationSpeed, dt);
        else if (d.moving) { f.vx = Math.sin(d.yaw) * TUNING.soldier.moveSpeed; f.vz = Math.cos(d.yaw) * TUNING.soldier.moveSpeed; }
      }
    }
    this.overhear.advance({ hour, retaken: place.timesFreed > 1, hero: { x: hero.x, z: hero.z }, dt,
      inVisit: distance(hero, MILL_CENTRE) <= t.activationRadius, members: this.overhearMembers(hour) });
    const canRun = (m: Member) => m.fighter.alive && m.fighter.hitTimer <= 0 && battle.fighters.includes(m.fighter);
    const current = this.alarm.bell.runnerId ? this.members.get(this.alarm.bell.runnerId) : undefined;
    // Prefer the authored runner, then an alert survivor. A stopped runner is replaced on the next step.
    const candidates = [...this.members.entries()].filter(([, m]) => canRun(m) && m.sense.awareness === 'alert');
    candidates.sort((a, b) => Number(b[1].routine.kind === 'runner') - Number(a[1].routine.kind === 'runner'));
    const selected = current ? [this.alarm.bell.runnerId!, current] as const : candidates[0];
    const runner = selected?.[1];
    if (runner && canRun(runner) && !this.alarm.bell.rung && !place.bellSilenced) {
      runner.fighter.worldDriven = true;
      runner.fighter.action = { phase: 'idle', t: 0, struck: false, zoneX: 0, zoneZ: 0 };
      this.walk(runner.fighter, MILL_BELL, t.runnerSpeed, dt);
    }
    const result = advanceAlarm(this.alarm, place, {
      volunteer: selected ? { id: selected[0], awareness: selected[1].sense.awareness } : null,
      runnerCanAct: !!runner && canRun(runner),
      runnerAtBell: !!runner && distance(runner.fighter, MILL_BELL) <= t.bellReach,
    }, dt, plan);
    this.alarm = result.state;
    if (result.bellRang) this.bellRings++;
    for (const spawn of result.spawns) {
      const f = makeFighter(battle, spawn); f.awareness = 'alert'; battle.fighters.push(f); this.outsideIds.add(f.id);
      this.reinforcements++;
    }
    place.morale = Math.min(1, place.morale + result.moraleDelta);
  }
  private overhearMembers(hour: number): OverhearMember[] {
    const routines = defendersAt('mill', hour);
    return [...this.members].map(([id, m]) => {
      const d = routines.find(r => r.id === id) ?? m.routine;
      return { id, x: m.fighter.x, z: m.fighter.z, alive: m.fighter.alive, present: d.present,
        sleeping: d.activity === 'sleep', unaware: m.sense.awareness === 'unaware' };
    });
  }
  private walk(f: Fighter, goal: Vec2, speed: number, dt: number): void {
    const toCell = (p: Vec2) => ({ x: Math.round(p.x - MILL_GRID.originX), z: Math.round(p.z - MILL_GRID.originZ) });
    const end = toCell(goal), key = `${end.x},${end.z}`;
    let route = this.routes.get(f.id);
    if (!route || route.goal !== key) {
      const cells = findPathCells(navigation(), toCell(f), end);
      if (!cells) { this.issues.add(`No Mill route for fighter ${f.id} to ${key}`); f.vx = f.vz = 0; return; }
      route = { goal: key, points: [...cells.slice(1).map(p => ({ x: p.x + MILL_GRID.originX, z: p.z + MILL_GRID.originZ })), goal], next: 0 };
      this.routes.set(f.id, route);
    }
    const before = { x: f.x, z: f.z };
    let budget = speed * dt;
    while (budget > 0 && route.next < route.points.length) {
      const target = route.points[route.next], d = distance(f, target);
      const step = Math.min(d, budget);
      if (d > 0) { f.yaw = Math.atan2(target.x - f.x, target.z - f.z); f.x += (target.x - f.x) * step / d; f.z += (target.z - f.z) * step / d; }
      budget -= step;
      if (d <= step) route.next++; else break;
    }
    f.vx = (f.x - before.x) / dt; f.vz = (f.z - before.z) / dt;
    f.y = walkSurfaceAt(f.x, f.z);
  }
  snapshot() {
    const overheard = this.overhear.snapshot();
    const speaker = overheard.caption && this.members.get(overheard.caption.speakerId);
    const caption = overheard.caption && speaker
      ? { ...overheard.caption, x: speaker.fighter.x, y: speaker.fighter.y, z: speaker.fighter.z, height: speaker.fighter.height }
      : null;
    return { alarm: this.alarm, bell: MILL_BELL, bellRings: this.bellRings, reinforcements: this.reinforcements,
      issues: [...this.issues], overheard: { saidThisVisit: overheard.saidThisVisit, caption },
      defenders: [...this.members].map(([id, m]) => ({ id, fighterId: m.fighter.id,
        x: m.fighter.x, y: m.fighter.y, z: m.fighter.z, yaw: m.fighter.yaw, alive: m.fighter.alive, hp: m.fighter.hp,
        awareness: m.fighter.awareness, notice: m.sense.notice, activity: m.routine.activity, torch: m.routine.torch,
        present: m.routine.present, height: m.fighter.height })) };
  }
}
