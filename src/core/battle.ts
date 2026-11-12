// The battle simulation. Fixed step, deterministic, no Babylon imports.
// Rules: only opposing fighters collide with each other (teammates may overlap);
// every fighter collides with obstacles and the arena boundary.

import { TUNING } from '../config/tuning';
import { decideAI } from './ai';
import { aimedVelocity, applyHit, bowDamage, bowSpeed, inSwingArc, launchVelocity, unitDir } from './combat';
import type {
  Action, ArenaDef, BattleEvent, BattleInput, BattleState, DamageSource, Fighter, FighterKind, Projectile, Spawn,
} from './types';
import { forwardOf, rightOf } from './vec';

const DT = TUNING.fixedDt;

function idleAction(): Action {
  return { phase: 'idle', t: 0, struck: false, zoneX: 0, zoneZ: 0 };
}

function statsFor(kind: FighterKind) {
  if (kind === 'hero') return TUNING.hero;
  if (kind === 'soldier') return TUNING.soldier;
  return TUNING.archer;
}

function makeFighter(state: BattleState, s: Spawn): Fighter {
  const st = statsFor(s.kind);
  return {
    id: state.nextId++,
    unitId: s.unitId,
    kind: s.kind,
    team: s.team,
    x: s.x,
    z: s.z,
    yaw: s.yaw,
    radius: st.radius,
    height: st.height,
    maxHp: st.maxHp,
    hp: st.maxHp,
    alive: true,
    vx: 0,
    vz: 0,
    knockX: 0,
    knockZ: 0,
    cooldown: 0,
    hitTimer: 0,
    flashTimer: 0,
    action: idleAction(),
    weapon: 'sword',
    drawTime: 0,
    dodgeTime: 0,
    dodgeCooldown: 0,
    dodgeX: 0,
    dodgeZ: 0,
  };
}

/** Builds a battle from an arena. The arena must contain exactly one hero spawn. */
export function createBattle(arena: ArenaDef): BattleState {
  const state: BattleState = {
    time: 0,
    status: 'fighting',
    arena,
    nextId: 1,
    heroId: -1,
    fighters: [],
    projectiles: [],
    wave: 0,
    waveTimer: 0,
  };
  for (const s of arena.spawns) {
    if (waveOf(s) !== 0) continue;
    const f = makeFighter(state, s);
    state.fighters.push(f);
    if (s.kind === 'hero') {
      if (state.heroId >= 0) throw new Error(`arena ${arena.id} has more than one hero spawn`);
      state.heroId = f.id;
    }
  }
  if (state.heroId < 0) throw new Error(`arena ${arena.id} has no hero spawn`);
  return state;
}

function waveOf(s: Spawn): number {
  return s.wave ?? 0;
}

/** The last wave in an arena. Victory needs this wave cleared. */
export function lastWave(arena: ArenaDef): number {
  return arena.spawns.reduce((m, s) => Math.max(m, waveOf(s)), 0);
}

/** Brings the next enemy wave in once the current one has been cleared for waveGap seconds. */
function updateWaves(state: BattleState): void {
  if (state.wave >= lastWave(state.arena)) return;
  if (state.fighters.some((f) => f.alive && f.team === 'enemy')) {
    state.waveTimer = 0;
    return;
  }
  state.waveTimer += DT;
  if (state.waveTimer < state.arena.waveGap) return;
  state.waveTimer = 0;
  state.wave += 1;
  for (const s of state.arena.spawns) {
    if (waveOf(s) === state.wave) state.fighters.push(makeFighter(state, s));
  }
}

export function getFighter(state: BattleState, id: number): Fighter | undefined {
  return state.fighters.find((f) => f.id === id);
}

export function getHero(state: BattleState): Fighter {
  const hero = getFighter(state, state.heroId);
  if (!hero) throw new Error('hero missing from battle');
  return hero;
}

/** True while the hero's dodge roll is in its invulnerable opening frames. */
export function isDodgeInvulnerable(f: Fighter): boolean {
  if (f.kind !== 'hero' || f.dodgeTime <= 0) return false;
  return TUNING.hero.dodgeTime - f.dodgeTime < TUNING.hero.dodgeIFrames;
}

/** Advances the simulation by one fixed step. Mutates state; returns what happened. */
export function step(state: BattleState, input: BattleInput): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (state.status !== 'fighting') return events;
  state.time += DT;

  for (const f of state.fighters) if (f.alive) tickTimers(f);
  updateWaves(state);

  updateHero(state, input, events);

  for (const f of state.fighters) {
    if (!f.alive || f.kind === 'hero') continue;
    updateNonHero(state, f, events);
  }

  for (const f of state.fighters) if (f.alive) advanceAction(state, f, events);

  integrate(state);
  resolveCollisions(state);
  updateProjectiles(state, events);
  checkOutcome(state, events);
  return events;
}

function tickTimers(f: Fighter): void {
  f.cooldown = Math.max(0, f.cooldown - DT);
  f.hitTimer = Math.max(0, f.hitTimer - DT);
  f.flashTimer = Math.max(0, f.flashTimer - DT);
  f.dodgeCooldown = Math.max(0, f.dodgeCooldown - DT);
}

// ---------- hero ----------

function updateHero(state: BattleState, input: BattleInput, events: BattleEvent[]): void {
  const hero = getHero(state);
  if (!hero.alive) return;
  const H = TUNING.hero;
  hero.yaw = input.camYaw;
  hero.dodgeTime = Math.max(0, hero.dodgeTime - DT);

  const fwd = forwardOf(input.camYaw);
  const right = rightOf(input.camYaw);
  let dx = right.x * input.moveX + fwd.x * input.moveZ;
  let dz = right.z * input.moveX + fwd.z * input.moveZ;
  const len = Math.hypot(dx, dz);
  if (len > 1) {
    dx /= len;
    dz /= len;
  }

  // Dodge roll. Starting one cancels any action; holding the hero still rolls backward.
  if (hero.dodgeTime <= 0 && input.dodgePressed && hero.dodgeCooldown <= 0) {
    const rx = len > 0 ? dx : -fwd.x;
    const rz = len > 0 ? dz : -fwd.z;
    hero.dodgeTime = H.dodgeTime;
    hero.dodgeCooldown = H.dodgeCooldown;
    hero.dodgeX = rx;
    hero.dodgeZ = rz;
    hero.action = idleAction();
    hero.drawTime = 0;
    events.push({ type: 'dodge', fighterId: hero.id, x: hero.x, z: hero.z });
  }

  if (hero.dodgeTime > 0) {
    hero.vx = hero.dodgeX * H.dodgeSpeed;
    hero.vz = hero.dodgeZ * H.dodgeSpeed;
    return;
  }

  // Weapon swap is only allowed between actions.
  if (hero.action.phase === 'idle' && input.weapon !== hero.weapon) hero.weapon = input.weapon;

  if (hero.weapon === 'sword') {
    if (input.attackPressed && hero.action.phase === 'idle' && hero.cooldown <= 0) {
      hero.action = { phase: 'swing', t: 0, struck: false, zoneX: 0, zoneZ: 0 };
      events.push({ type: 'swing', fighterId: hero.id });
    }
  } else {
    if (input.attackPressed && hero.action.phase === 'idle' && hero.cooldown <= 0) {
      hero.action = { phase: 'draw', t: 0, struck: false, zoneX: 0, zoneZ: 0 };
      hero.drawTime = 0;
      events.push({ type: 'draw', fighterId: hero.id });
    }
    if (hero.action.phase === 'draw') {
      if (input.attackHeld) hero.drawTime += DT;
      if (input.attackReleased) {
        fireHeroArrow(state, hero, input, events);
        hero.action = { phase: 'release', t: 0, struck: false, zoneX: 0, zoneZ: 0 };
        hero.drawTime = 0;
      }
    }
  }

  let speed = input.sprint ? H.sprintSpeed : H.walkSpeed;
  if (hero.action.phase === 'draw') speed *= H.drawMoveFactor;
  if (hero.action.phase === 'swing') speed *= H.swingMoveFactor;
  hero.vx = dx * speed;
  hero.vz = dz * speed;
  hero.yaw = input.camYaw;
}

function fireHeroArrow(state: BattleState, hero: Fighter, input: BattleInput, events: BattleEvent[]): void {
  const fwd = forwardOf(input.camYaw);
  const v = aimedVelocity(input.camYaw, input.aimPitch, bowSpeed(hero.drawTime));
  spawnProjectile(state, events, {
    team: hero.team,
    ownerId: hero.id,
    x: hero.x + fwd.x * TUNING.bow.muzzleForward,
    y: TUNING.bow.muzzleHeight,
    z: hero.z + fwd.z * TUNING.bow.muzzleForward,
    vx: v.vx,
    vy: v.vy,
    vz: v.vz,
    damage: bowDamage(hero.drawTime),
    knockback: TUNING.bow.knockback,
  });
  hero.cooldown = TUNING.bow.cooldown;
}

// ---------- soldiers and archers ----------

function updateNonHero(state: BattleState, f: Fighter, events: BattleEvent[]): void {
  if (f.hitTimer > 0) {
    // Staggered by a hit: no movement of its own and no new action.
    f.vx = 0;
    f.vz = 0;
    return;
  }
  const intent = decideAI(state, f);
  f.vx = intent.vx;
  f.vz = intent.vz;
  if (intent.yaw !== null) f.yaw = intent.yaw;
  if (intent.startAction && f.action.phase === 'idle' && f.cooldown <= 0) {
    startAction(f, events);
  }
}

function startAction(f: Fighter, events: BattleEvent[]): void {
  if (f.kind === 'soldier') {
    const fwd = forwardOf(f.yaw);
    f.action = {
      phase: 'windup',
      t: 0,
      struck: false,
      zoneX: f.x + fwd.x * TUNING.soldier.strikeOffset,
      zoneZ: f.z + fwd.z * TUNING.soldier.strikeOffset,
    };
  } else if (f.kind === 'archer') {
    f.action = { phase: 'draw', t: 0, struck: false, zoneX: 0, zoneZ: 0 };
    events.push({ type: 'draw', fighterId: f.id });
  }
}

/** Moves every living fighter's action forward one step and resolves its timed effects. */
function advanceAction(state: BattleState, f: Fighter, events: BattleEvent[]): void {
  const a = f.action;
  if (a.phase === 'idle') return;
  a.t += DT;

  if (f.kind === 'soldier') {
    if (a.phase === 'windup' && a.t >= TUNING.soldier.windupTime) {
      a.phase = 'swing';
      a.t = 0;
      a.struck = true;
      events.push({ type: 'swing', fighterId: f.id });
      strikeZone(state, f, events);
    } else if (a.phase === 'swing' && a.t >= TUNING.soldier.swingTime) {
      endAction(f, TUNING.soldier.cooldown);
    }
    return;
  }

  if (f.kind === 'archer') {
    if (a.phase === 'draw' && a.t >= TUNING.archer.drawTime) {
      a.phase = 'release';
      a.t = 0;
      fireArcherArrow(state, f, events);
    } else if (a.phase === 'release' && a.t >= TUNING.archer.releaseTime) {
      endAction(f, TUNING.archer.cooldown);
    }
    return;
  }

  // Hero. The bow draw is driven by input in updateHero, not by time.
  if (f.weapon === 'sword' && a.phase === 'swing') {
    if (!a.struck && a.t >= TUNING.sword.hitTime) {
      a.struck = true;
      heroSwordStrike(state, f, events);
    }
    if (a.t >= TUNING.sword.duration) endAction(f, TUNING.sword.cooldown);
  } else if (f.weapon === 'bow' && a.phase === 'release' && a.t >= TUNING.bow.releaseTime) {
    endAction(f, TUNING.bow.cooldown);
  }
}

function endAction(f: Fighter, cooldown: number): void {
  f.action = idleAction();
  f.cooldown = cooldown;
}

function cancelAction(f: Fighter): void {
  f.action = idleAction();
  f.drawTime = 0;
}

/** Soldier strike: every opposing fighter inside the telegraphed zone takes the hit. */
function strikeZone(state: BattleState, f: Fighter, events: BattleEvent[]): void {
  const S = TUNING.soldier;
  for (const o of state.fighters) {
    if (!o.alive || o.team === f.team) continue;
    const d = Math.hypot(o.x - f.action.zoneX, o.z - f.action.zoneZ);
    if (d > S.strikeRadius + o.radius) continue;
    const dir = unitDir(f.x, f.z, o.x, o.z);
    damageFighter(o, S.damage, dir.x, dir.z, S.knockback, 'strike', events);
  }
  events.push({ type: 'strike', fighterId: f.id });
}

/** Hero sword: every opposing fighter inside the swing arc takes the hit. */
function heroSwordStrike(state: BattleState, hero: Fighter, events: BattleEvent[]): void {
  const W = TUNING.sword;
  for (const o of state.fighters) {
    if (!o.alive || o.team === hero.team) continue;
    if (!inSwingArc(hero.x, hero.z, hero.yaw, o.x, o.z, o.radius, W.range, W.arcHalfAngle)) continue;
    const dir = unitDir(hero.x, hero.z, o.x, o.z);
    damageFighter(o, W.damage, dir.x, dir.z, W.knockback, 'sword', events);
  }
  events.push({ type: 'strike', fighterId: hero.id });
}

/** Archer shot: a low-arc launch at the nearest enemy, fired from the archer's body. */
function fireArcherArrow(state: BattleState, f: Fighter, events: BattleEvent[]): void {
  const target = nearestOpposing(state, f);
  if (!target) return;
  const A = TUNING.archer;
  const v = launchVelocity(
    f.x, TUNING.bow.muzzleHeight, f.z,
    target.x, A.aimHeight, target.z,
    A.arrowSpeed, TUNING.gravity,
  );
  if (!v) return;
  spawnProjectile(state, events, {
    team: f.team,
    ownerId: f.id,
    x: f.x,
    y: TUNING.bow.muzzleHeight,
    z: f.z,
    vx: v.vx,
    vy: v.vy,
    vz: v.vz,
    damage: A.arrowDamage,
    knockback: A.arrowKnockback,
  });
}

function nearestOpposing(state: BattleState, f: Fighter): Fighter | undefined {
  let best: Fighter | undefined;
  let bestD = Infinity;
  for (const o of state.fighters) {
    if (!o.alive || o.team === f.team) continue;
    const d = Math.hypot(o.x - f.x, o.z - f.z);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

// ---------- damage ----------

function damageFighter(
  target: Fighter,
  amount: number,
  dirX: number,
  dirZ: number,
  knockback: number,
  source: DamageSource,
  events: BattleEvent[],
): void {
  if (!target.alive || isDodgeInvulnerable(target)) return;
  events.push({ type: 'damage', fighterId: target.id, amount, x: target.x, z: target.z, source });
  const died = applyHit(target, amount, dirX, dirZ, knockback);
  if (target.action.phase === 'windup' || target.action.phase === 'draw') cancelAction(target);
  if (died) events.push({ type: 'death', fighterId: target.id });
}

// ---------- projectiles ----------

type NewProjectile = Omit<Projectile, 'id' | 'age' | 'alive'>;

function spawnProjectile(state: BattleState, events: BattleEvent[], p: NewProjectile): void {
  const id = state.nextId++;
  state.projectiles.push({ ...p, id, age: 0, alive: true });
  events.push({ type: 'fire', fighterId: p.ownerId, projectileId: id });
}

function updateProjectiles(state: BattleState, events: BattleEvent[]): void {
  const A = TUNING.arrow;
  const { halfWidth, halfDepth, obstacles } = state.arena;
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    p.age += DT;
    p.vy -= TUNING.gravity * DT;
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    p.z += p.vz * DT;

    if (p.age > A.maxLife || p.y <= 0 || Math.abs(p.x) > halfWidth + 3 || Math.abs(p.z) > halfDepth + 3) {
      stopArrow(p, events);
      continue;
    }

    let stopped = false;
    for (const o of obstacles) {
      if (Math.hypot(p.x - o.x, p.z - o.z) < o.radius + A.radius && p.y < o.height) {
        stopped = true;
        break;
      }
    }
    if (stopped) {
      stopArrow(p, events);
      continue;
    }

    for (const f of state.fighters) {
      if (!f.alive || f.team === p.team) continue;
      if (Math.hypot(p.x - f.x, p.z - f.z) < f.radius + A.radius && p.y <= f.height) {
        const dir = unitDir(0, 0, p.vx, p.vz);
        damageFighter(f, p.damage, dir.x, dir.z, p.knockback, 'arrow', events);
        stopped = true;
        break;
      }
    }
    if (stopped) stopArrow(p, events);
  }
  state.projectiles = state.projectiles.filter((p) => p.alive);
}

function stopArrow(p: Projectile, events: BattleEvent[]): void {
  p.alive = false;
  events.push({ type: 'impact', x: p.x, y: Math.max(0, p.y), z: p.z });
}

// ---------- movement and collisions ----------

function integrate(state: BattleState): void {
  const decay = Math.exp(-TUNING.combat.knockbackFriction * DT);
  for (const f of state.fighters) {
    if (!f.alive) continue;
    f.x += (f.vx + f.knockX) * DT;
    f.z += (f.vz + f.knockZ) * DT;
    f.knockX *= decay;
    f.knockZ *= decay;
  }
}

/** Pushes opposing fighters apart, pushes everyone out of obstacles, and keeps them in the arena. */
function resolveCollisions(state: BattleState): void {
  const { halfWidth, halfDepth, obstacles } = state.arena;
  const alive = state.fighters.filter((f) => f.alive);
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (a.team === b.team) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const minD = a.radius + b.radius;
        if (d >= minD) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        const push = (minD - d) / 2;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
      }
    }
    for (const f of alive) {
      for (const o of obstacles) {
        const dx = f.x - o.x;
        const dz = f.z - o.z;
        const d = Math.hypot(dx, dz);
        const minD = f.radius + o.radius;
        if (d >= minD) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        f.x = o.x + nx * minD;
        f.z = o.z + nz * minD;
      }
      f.x = Math.max(-halfWidth + f.radius, Math.min(halfWidth - f.radius, f.x));
      f.z = Math.max(-halfDepth + f.radius, Math.min(halfDepth - f.radius, f.z));
    }
  }
}

// ---------- outcome ----------

function checkOutcome(state: BattleState, events: BattleEvent[]): void {
  const hero = getHero(state);
  let status: BattleState['status'] | null = null;
  if (!hero.alive) status = 'defeat';
  else if (state.wave >= lastWave(state.arena) && !state.fighters.some((f) => f.alive && f.team === 'enemy')) {
    status = 'victory';
  }
  if (status) {
    state.status = status;
    events.push({ type: 'outcome', status });
  }
}
