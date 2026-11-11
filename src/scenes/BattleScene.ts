import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { arcPoint, aimVelocity, bowShot, drawRatio } from '../core/combat';
import { createBattle, FIXED_DT, heroBowMuzzle, hero, stepBattle } from '../core/battle';
import { createGameState, type GameState } from '../core/state';
import { clamp } from '../core/math';
import type { BattleInput, Fighter, WeaponId } from '../core/types';

const COLORS = {
  playerBody: 0x3a86ff,
  heroTrim: 0xffd166,
  enemyBody: 0xe63946,
  archerBody: 0xf4a261,
  skin: 0xf1d3b3,
  arrowPlayer: 0xfff3b0,
  arrowEnemy: 0xffb4a2,
  bar: 0x6fcf6f,
  barBack: 0x2b2b2b,
};

export class BattleScene extends Phaser.Scene {
  /** The one save-shaped state object. Scenes read and write it; they own none of it. */
  gameState!: GameState;

  private weapon: WeaponId = 'sword';
  private accumulator = 0;
  private pressedEdge = false;
  private releasedEdge = false;
  private gfx!: Phaser.GameObjects.Graphics;
  private damageTexts = new Map<number, Phaser.GameObjects.Text>();
  private keys!: Record<'a' | 'd' | 'one' | 'two' | 'r', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.gameState = createGameState();
    this.cameras.main.setBounds(0, 0, TUNING.world.width, TUNING.display.height);
    this.drawBackdrop();
    this.gfx = this.add.graphics().setDepth(10);

    const kb = this.input.keyboard;
    if (!kb) throw new Error('keyboard input is required');
    this.keys = kb.addKeys({ a: 'A', d: 'D', one: 'ONE', two: 'TWO', r: 'R' }) as typeof this.keys;

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.leftButtonDown() && this.gameState.battle.status === 'fighting') this.pressedEdge = true;
    });
    this.input.on('pointerup', () => {
      this.releasedEdge = true;
    });
  }

  /** Starts a new battle with the same weapon selection. Called by the UI restart button and R. */
  restart(): void {
    this.gameState.battle = createBattle();
    this.pressedEdge = false;
    this.releasedEdge = false;
    this.accumulator = 0;
    for (const t of this.damageTexts.values()) t.destroy();
    this.damageTexts.clear();
  }

  update(_time: number, delta: number): void {
    const battle = this.gameState.battle;
    if (battle.status !== 'fighting' && Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.restart();
    }

    this.accumulator += Math.min(delta, 100) / 1000;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < 6) {
      const input = this.readInput(steps === 0);
      stepBattle(this.gameState.battle, input, FIXED_DT);
      if (steps === 0) {
        this.pressedEdge = false;
        this.releasedEdge = false;
      }
      this.accumulator -= FIXED_DT;
      steps++;
    }

    this.followHero(delta);
    this.render();
  }

  private readInput(firstStep: boolean): BattleInput {
    const { a, d, one, two } = this.keys;
    if (one.isDown) this.weapon = 'sword';
    if (two.isDown) this.weapon = 'bow';
    const pointer = this.input.activePointer;
    const moveDir = d.isDown === a.isDown ? 0 : d.isDown ? 1 : -1;
    return {
      moveDir,
      weapon: this.weapon,
      attackPressed: firstStep && this.pressedEdge,
      attackHeld: pointer.leftButtonDown(),
      attackReleased: firstStep && this.releasedEdge,
      aimX: pointer.worldX,
      aimY: pointer.worldY,
    };
  }

  private followHero(delta: number): void {
    const cam = this.cameras.main;
    const h = hero(this.gameState.battle);
    const target = clamp(h.x - TUNING.display.width / 2, 0, TUNING.world.width - TUNING.display.width);
    const t = Math.min(1, (delta / 1000) * 6);
    cam.scrollX += (target - cam.scrollX) * t;
  }

  private drawBackdrop(): void {
    const g = this.add.graphics().setDepth(0);
    const { groundY, width } = TUNING.world;
    const H = TUNING.display.height;
    g.fillStyle(0x1d2b4f, 1).fillRect(0, 0, width, groundY);
    g.fillStyle(0x2c3e66, 1);
    for (let x = -200; x < width; x += 400) {
      g.fillTriangle(x, groundY - 40, x + 220, groundY - 230, x + 440, groundY - 40);
    }
    g.fillStyle(0x3d6b35, 1).fillRect(0, groundY, width, H - groundY);
    g.fillStyle(0x4f8a45, 1).fillRect(0, groundY, width, 4);
    g.fillStyle(0x2a4d26, 1);
    for (let x = 120; x < width; x += 260) {
      g.fillTriangle(x - 26, groundY, x, groundY - 90, x + 26, groundY);
    }
  }

  private render(): void {
    const g = this.gfx;
    const s = this.gameState.battle;
    g.clear();

    for (const p of s.projectiles) {
      g.lineStyle(3, p.team === 'player' ? COLORS.arrowPlayer : COLORS.arrowEnemy, 1);
      g.beginPath();
      g.moveTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      g.lineTo(p.x, p.y);
      g.strokePath();
    }

    for (const f of s.fighters) {
      if (f.alive) this.drawFighter(f);
    }

    const h = hero(s);
    if (h.alive && h.weapon === 'bow' && h.drawTime > 0) this.drawAimPreview(h.x, h.y, h.facing, h.drawTime);

    this.syncDamageNumbers();
  }

  private drawFighter(f: Fighter): void {
    const g = this.gfx;
    const { x, y, width: w, height: h } = f;
    const flash = f.flashTimer > 0;
    const body = flash ? 0xffffff : bodyColor(f);

    g.fillStyle(shade(body, -0.35), 1);
    g.fillRect(x - w / 2 + 4, y - 22, 10, 22);
    g.fillRect(x + w / 2 - 14, y - 22, 10, 22);

    g.fillStyle(body, 1);
    g.fillRoundedRect(x - w / 2, y - h + 22, w, h - 44, 6);
    g.fillStyle(COLORS.skin, 1);
    g.fillCircle(x, y - h + 12, 12);

    if (f.kind === 'hero') {
      g.lineStyle(3, COLORS.heroTrim, 1);
      g.strokeRoundedRect(x - w / 2, y - h + 22, w, h - 44, 6);
      this.drawHeroWeapon(f);
    } else if (f.kind === 'archer') {
      this.drawBow(x + f.facing * 14, y - 50, f.facing, 0);
    } else {
      this.drawSoldierSword(f);
    }

    if (f.hp < f.maxHp) {
      const frac = f.hp / f.maxHp;
      g.fillStyle(COLORS.barBack, 1).fillRect(x - 25, y - h - 12, 50, 6);
      g.fillStyle(COLORS.bar, 1).fillRect(x - 25, y - h - 12, 50 * frac, 6);
    }
  }

  private drawSoldierSword(f: Fighter): void {
    const hx = f.x + f.facing * 14;
    const hy = f.y - 50;
    this.gfx.lineStyle(4, 0xdddddd, 1);
    this.gfx.beginPath();
    this.gfx.moveTo(hx, hy);
    this.gfx.lineTo(hx + f.facing * 14, hy - 26);
    this.gfx.strokePath();
  }

  private drawHeroWeapon(f: Fighter): void {
    const g = this.gfx;
    const hx = f.x + f.facing * 14;
    const hy = f.y - 50;
    if (f.weapon === 'sword') {
      g.lineStyle(4, 0xffffff, 1);
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(hx + f.facing * 16, hy - 30);
      g.strokePath();
      if (f.swingTimer > 0) {
        const mid = f.facing > 0 ? 0 : Math.PI;
        g.lineStyle(6, 0xffffff, 0.8);
        g.beginPath();
        g.arc(f.x, f.y - 50, TUNING.weapons.sword.range, mid - Math.PI / 3, mid + Math.PI / 3, f.facing < 0);
        g.strokePath();
      }
    } else {
      const pull = drawRatio(f.drawTime, TUNING.weapons.bow.fullDrawTime) * 14;
      this.drawBow(hx, hy, f.facing, pull);
    }
  }

  /** A simple bow: an arc with a string pulled back by `pull` pixels. */
  private drawBow(cx: number, cy: number, facing: 1 | -1, pull: number): void {
    const g = this.gfx;
    const mid = facing > 0 ? 0 : Math.PI;
    g.lineStyle(3, 0x8d5524, 1);
    g.beginPath();
    g.arc(cx, cy, 18, mid - 1.1, mid + 1.1, facing < 0);
    g.strokePath();
    g.lineStyle(1, 0xf0f0f0, 0.9);
    const ax = cx + Math.cos(mid - 1.1) * 18;
    const ay = cy + Math.sin(mid - 1.1) * 18;
    const bx = cx + Math.cos(mid + 1.1) * 18;
    const by = cy + Math.sin(mid + 1.1) * 18;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(cx - facing * pull, cy);
    g.lineTo(bx, by);
    g.strokePath();
  }

  private drawAimPreview(x: number, y: number, facing: 1 | -1, drawTime: number): void {
    const bow = TUNING.weapons.bow;
    const shot = bowShot(drawRatio(drawTime, bow.fullDrawTime), bow);
    const m = heroBowMuzzle({ x, y, facing });
    const v = aimVelocity(m.x, m.y, this.input.activePointer.worldX, this.input.activePointer.worldY, shot.speed);
    this.gfx.fillStyle(0xffffff, 0.6);
    for (let i = 1; i <= 14; i++) {
      const p = arcPoint(m.x, m.y, v.vx, v.vy, TUNING.physics.arrowGravity, i * 0.06);
      if (p.y >= TUNING.world.groundY) break;
      this.gfx.fillCircle(p.x, p.y, 2.5);
    }
  }

  private syncDamageNumbers(): void {
    const live = new Set<number>();
    for (const d of this.gameState.battle.damageNumbers) {
      live.add(d.id);
      let t = this.damageTexts.get(d.id);
      if (!t) {
        t = this.add
          .text(d.x, d.y, String(d.amount), {
            fontFamily: 'monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: d.onPlayer ? '#ff6b6b' : '#ffd166',
            stroke: '#000000',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(20);
        this.damageTexts.set(d.id, t);
      }
      t.setPosition(d.x, d.y);
      t.setAlpha(clamp(d.life / TUNING.feedback.damageNumberLife, 0, 1));
    }
    for (const [id, t] of this.damageTexts) {
      if (!live.has(id)) {
        t.destroy();
        this.damageTexts.delete(id);
      }
    }
  }
}

function bodyColor(f: Fighter): number {
  if (f.team === 'player') return COLORS.playerBody;
  return f.kind === 'archer' ? COLORS.archerBody : COLORS.enemyBody;
}

function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const f = (c: number) => clamp(Math.round(c + (amount < 0 ? c * amount : (255 - c) * amount)), 0, 255);
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
