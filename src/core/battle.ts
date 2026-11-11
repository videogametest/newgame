// Battle simulation. Fixed-step, deterministic, no Phaser.
import { ARENA } from '../data/arena';
import { UNIT_DEFS } from '../data/units';
import { TUNING } from '../config/tuning';
import { planUnit } from './ai';
import {
  aimVelocity,
  bowShot,
  drawRatio,
  inSwordArc,
  knockbackVx,
} from './combat';
import { clamp } from './math';
import type { BattleInput, BattleState, Fighter, Team } from './types';

export const FIXED_DT = 1 / 60;

export function createBattle(): BattleState {
  const s: BattleState = {
    time: 0,
    status: 'fighting',
    worldWidth: TUNING.world.width,
    groundY: TUNING.world.groundY,
    nextId: 1,
    heroId: 0,
    fighters: [],
    projectiles: [],
    damageNumbers: [],
  };
  s.heroId = spawn(s, ARENA.hero.unitId, 'player', ARENA.hero.x).id;
  for (const a of ARENA.allies) spawn(s, a.unitId, 'player', a.x);
  for (const e of ARENA.enemies) spawn(s, e.unitId, 'enemy', e.x);
  return s;
}

function spawn(s: BattleState, unitId: string, team: Team, x: number): Fighter {
  const def = UNIT_DEFS[unitId];
  const f: Fighter = {
    id: s.nextId++,
    unitId,
    kind: def.kind,
    team,
    x,
    y: s.groundY,
    facing: team === 'player' ? 1 : -1,
    width: def.stats.width,
    height: def.stats.height,
    maxHp: def.stats.maxHp,
    hp: def.stats.maxHp,
    alive: true,
    moveVx: 0,
    knockVx: 0,
    cooldown: 0,
    swingTimer: 0,
    flashTimer: 0,
    weapon: 'sword',
    drawTime: 0,
  };
  s.fighters.push(f);
  return f;
}

export function hero(s: BattleState): Fighter {
  const h = s.fighters.find((f) => f.id === s.heroId);
  if (!h) throw new Error('battle has no hero');
  return h;
}

export function stepBattle(s: BattleState, input: BattleInput, dt: number): void {
  s.time += dt;
  tickTimers(s, dt);
  if (s.status === 'fighting') {
    stepHero(s, input, dt);
    stepUnits(s);
  }
  integrateMovement(s, dt);
  if (s.status === 'fighting') {
    stepProjectiles(s, dt);
    checkOutcome(s);
  }
  s.damageNumbers = s.damageNumbers.filter((d) => d.life > 0);
  s.projectiles = s.projectiles.filter((p) => p.alive);
}

function tickTimers(s: BattleState, dt: number): void {
  for (const f of s.fighters) {
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.swingTimer = Math.max(0, f.swingTimer - dt);
    f.flashTimer = Math.max(0, f.flashTimer - dt);
  }
  for (const d of s.damageNumbers) {
    d.life -= dt;
    d.y -= TUNING.feedback.damageNumberRise * dt;
  }
}

function stepHero(s: BattleState, input: BattleInput, dt: number): void {
  const h = hero(s);
  if (!h.alive) return;

  if (input.weapon !== h.weapon) {
    h.weapon = input.weapon;
    h.drawTime = 0;
  }
  h.moveVx = input.moveDir * UNIT_DEFS.hero.stats.moveSpeed;
  h.facing = input.aimX >= h.x ? 1 : -1;

  if (h.weapon === 'sword') {
    if (input.attackPressed && h.cooldown <= 0) swordSwing(s, h);
    return;
  }

  // Bow: hold to draw, release to fire toward the cursor.
  const bow = TUNING.weapons.bow;
  if ((input.attackHeld || input.attackPressed) && h.cooldown <= 0) {
    h.drawTime = Math.min(bow.fullDrawTime, h.drawTime + dt);
  }
  if (input.attackReleased) {
    if (h.drawTime > 0 && h.cooldown <= 0) fireHeroArrow(s, h, input);
    h.drawTime = 0;
  }
}

/** Where a hero arrow leaves the bow. Used by the sim and the aim preview. */
export function heroBowMuzzle(h: Pick<Fighter, 'x' | 'y' | 'facing'>): { x: number; y: number } {
  return { x: h.x + h.facing * 14, y: h.y - 55 };
}

function swordSwing(s: BattleState, h: Fighter): void {
  const sword = TUNING.weapons.sword;
  h.cooldown = sword.cooldown;
  h.swingTimer = TUNING.feedback.swingTime;
  for (const f of s.fighters) {
    if (!f.alive || f.team === h.team) continue;
    if (inSwordArc(h, f, sword.range)) {
      damageFighter(s, f, sword.damage, knockbackVx(h.x, f.x, sword.knockback));
    }
  }
}

function fireHeroArrow(s: BattleState, h: Fighter, input: BattleInput): void {
  const bow = TUNING.weapons.bow;
  const ratio = drawRatio(h.drawTime, bow.fullDrawTime);
  const shot = bowShot(ratio, bow);
  const m = heroBowMuzzle(h);
  const v = aimVelocity(m.x, m.y, input.aimX, input.aimY, shot.speed);
  h.cooldown = bow.cooldown;
  s.projectiles.push({
    id: s.nextId++,
    team: 'player',
    x: m.x,
    y: m.y,
    vx: v.vx,
    vy: v.vy,
    damage: shot.damage,
    knockback: bow.arrowKnockback,
    alive: true,
  });
}

function stepUnits(s: BattleState): void {
  for (const f of s.fighters) {
    if (!f.alive || f.kind === 'hero') continue;
    const plan = planUnit(f, s);
    f.facing = plan.facing;
    f.moveVx = plan.moveVx;
    if (f.cooldown > 0) continue;

    if (plan.strike) {
      const def = UNIT_DEFS[f.unitId];
      if (def.kind !== 'melee') continue;
      f.cooldown = def.stats.attackCooldown;
      damageFighter(s, plan.strike, def.stats.damage, knockbackVx(f.x, plan.strike.x, def.stats.knockback));
    } else if (plan.shot) {
      const def = UNIT_DEFS[f.unitId];
      if (def.kind !== 'archer') continue;
      f.cooldown = def.stats.fireCooldown;
      s.projectiles.push({
        id: s.nextId++,
        team: f.team,
        x: plan.shot.x,
        y: plan.shot.y,
        vx: plan.shot.vx,
        vy: plan.shot.vy,
        damage: plan.shot.damage,
        knockback: plan.shot.knockback,
        alive: true,
      });
    }
  }
}

function damageFighter(s: BattleState, target: Fighter, amount: number, knockVx: number): void {
  if (!target.alive) return;
  target.hp = Math.max(0, target.hp - amount);
  target.flashTimer = TUNING.feedback.hitFlashTime;
  target.knockVx = clamp(knockVx, -600, 600);
  s.damageNumbers.push({
    id: s.nextId++,
    x: target.x,
    y: target.y - target.height,
    amount,
    onPlayer: target.team === 'player',
    life: TUNING.feedback.damageNumberLife,
  });
  if (target.hp <= 0) {
    target.alive = false;
    target.moveVx = 0;
    target.knockVx = 0;
  }
}

function integrateMovement(s: BattleState, dt: number): void {
  const friction = TUNING.world.friction * dt;
  for (const f of s.fighters) {
    if (!f.alive) continue;
    f.x += (f.moveVx + f.knockVx) * dt;
    const decay = Math.min(Math.abs(f.knockVx), friction);
    f.knockVx -= Math.sign(f.knockVx) * decay;
    f.x = clamp(f.x, f.width / 2, s.worldWidth - f.width / 2);
  }
  separateBodies(s);
}

/** Pushes overlapping living fighters of opposing teams apart. Teammates may overlap and pass each other. */
function separateBodies(s: BattleState): void {
  const living = s.fighters.filter((f) => f.alive);
  for (let i = 0; i < living.length; i++) {
    for (let j = i + 1; j < living.length; j++) {
      const a = living[i];
      const b = living[j];
      if (a.team === b.team) continue;
      const overlap = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
      if (overlap <= 0) continue;
      const dir = a.x <= b.x ? -1 : 1;
      a.x = clamp(a.x + (dir * overlap) / 2, a.width / 2, s.worldWidth - a.width / 2);
      b.x = clamp(b.x - (dir * overlap) / 2, b.width / 2, s.worldWidth - b.width / 2);
    }
  }
}

function stepProjectiles(s: BattleState, dt: number): void {
  const r = TUNING.feedback.arrowRadius;
  for (const p of s.projectiles) {
    if (!p.alive) continue;
    p.vy += TUNING.physics.arrowGravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < 0 || p.x > s.worldWidth || p.y >= s.groundY) {
      p.alive = false;
      continue;
    }
    for (const f of s.fighters) {
      if (!f.alive || f.team === p.team) continue;
      const inX = Math.abs(p.x - f.x) <= f.width / 2 + r;
      const inY = p.y <= f.y && p.y >= f.y - f.height;
      if (inX && inY) {
        damageFighter(s, f, p.damage, knockbackVx(0, p.vx, p.knockback));
        p.alive = false;
        break;
      }
    }
  }
}

function checkOutcome(s: BattleState): void {
  if (!hero(s).alive) {
    s.status = 'defeat';
    return;
  }
  const enemiesLeft = s.fighters.some((f) => f.alive && f.team === 'enemy');
  if (!enemiesLeft) s.status = 'victory';
}
