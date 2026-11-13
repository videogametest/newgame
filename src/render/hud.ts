// DOM overlay: boot progress, fighter HP bars, damage numbers, hero HP, weapon, prompt and outcome cards.
// Reads simulation state and draws it. Owns no game state.

import type { BattleState, BattleStatus, Fighter, WeaponId } from '../core/types';
import { TUNING } from '../config/tuning';

export type Projector = (x: number, y: number, z: number) => { x: number; y: number; visible: boolean };

export interface HudFrame {
  state: BattleState;
  hero: Fighter;
  locked: boolean;
  weapon: WeaponId;
  zooming: boolean;
  /** 0..1 bow draw progress. */
  drawFraction: number;
  project: Projector;
  dt: number;
}

const MARKUP = `
  <div class="boot" hidden>
    <div class="boot-text">Loading</div>
    <div class="boot-bar"><div class="boot-fill"></div></div>
  </div>
  <div class="bars"></div>
  <div class="numbers"></div>
  <div class="crosshair" hidden></div>
  <div class="draw" hidden><div class="draw-fill"></div></div>
  <div class="hero">
    <div class="hero-label">Hero</div>
    <div class="hp"><div class="hp-fill"></div><div class="hp-text"></div></div>
  </div>
  <div class="weapon">
    <span data-weapon="sword">1 Sword</span>
    <span data-weapon="bow">2 Bow</span>
  </div>
  <div class="panel prompt" hidden>
    <div class="card">
      <h1>Click to take control</h1>
      <p>Hold the line. Defeat every enemy to win.</p>
      <div class="keys">
        <div><b>W A S D</b> move</div>
        <div><b>Mouse</b> look and aim</div>
        <div><b>Shift</b> sprint</div>
        <div><b>Space</b> dodge roll</div>
        <div><b>1 / 2</b> sword / bow</div>
        <div><b>Left mouse</b> attack (hold to draw the bow)</div>
        <div><b>Right mouse</b> zoom (bow)</div>
        <div><b>Esc</b> pause</div>
      </div>
    </div>
  </div>
  <div class="panel outcome" hidden>
    <div class="card">
      <h1></h1>
      <p class="outcome-text"></p>
      <button type="button">Restart battle</button>
    </div>
  </div>
  <div class="error" hidden></div>
`;

const DAMAGE_LIFE = TUNING.combat.damageNumberLife;

interface Bar {
  root: HTMLDivElement;
  fill: HTMLDivElement;
  team: string;
}

interface Popup {
  el: HTMLDivElement;
  x: number;
  z: number;
  age: number;
}

export class Hud {
  private readonly boot: HTMLElement;
  private readonly bootFill: HTMLElement;
  private readonly bars: HTMLElement;
  private readonly numbers: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly draw: HTMLElement;
  private readonly drawFill: HTMLElement;
  private readonly heroPanel: HTMLElement;
  private readonly weaponPanel: HTMLElement;
  private readonly heroFill: HTMLElement;
  private readonly heroText: HTMLElement;
  private readonly weaponSpans: Record<WeaponId, HTMLElement>;
  private readonly prompt: HTMLElement;
  private readonly outcome: HTMLElement;
  private readonly outcomeCard: HTMLElement;
  private readonly outcomeTitle: HTMLElement;
  private readonly outcomeText: HTMLElement;
  private readonly error: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly barById = new Map<number, Bar>();
  private readonly popups: Popup[] = [];
  private outcomeStatus: BattleStatus | null = null;
  private restartHandler: (() => void) | null = null;

  constructor(root: HTMLElement) {
    root.innerHTML = MARKUP;
    const q = <T extends HTMLElement>(sel: string): T => {
      const el = root.querySelector<T>(sel);
      if (!el) throw new Error(`HUD markup is missing ${sel}`);
      return el;
    };
    this.boot = q('.boot');
    this.bootFill = q('.boot-fill');
    this.bars = q('.bars');
    this.numbers = q('.numbers');
    this.crosshair = q('.crosshair');
    this.draw = q('.draw');
    this.drawFill = q('.draw-fill');
    this.heroPanel = q('.hero');
    this.weaponPanel = q('.weapon');
    this.heroFill = q('.hp-fill');
    this.heroText = q('.hp-text');
    this.weaponSpans = {
      sword: q('[data-weapon="sword"]'),
      bow: q('[data-weapon="bow"]'),
    };
    this.prompt = q('.prompt');
    this.outcome = q('.outcome');
    this.outcomeCard = q('.outcome .card');
    this.outcomeTitle = q('.outcome h1');
    this.outcomeText = q('.outcome-text');
    this.error = q('.error');
    this.restartButton = q<HTMLButtonElement>('.outcome button');
    this.restartButton.addEventListener('click', () => this.restartHandler?.());
  }

  set onRestart(fn: () => void) {
    this.restartHandler = fn;
  }

  /** The valley has no fights yet: hide the hero health bar and the weapon tiles (they return with task 004). */
  hideFightChrome(): void {
    this.heroPanel.style.display = 'none';
    this.weaponPanel.style.display = 'none';
  }

  setBoot(label: string, fraction: number): void {
    this.boot.hidden = false;
    const text = this.boot.querySelector<HTMLElement>('.boot-text');
    if (text) text.textContent = `Loading ${label}`;
    this.bootFill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
  }

  hideBoot(): void {
    this.boot.hidden = true;
  }

  showError(err: unknown): void {
    this.boot.hidden = true;
    this.error.hidden = false;
    this.error.textContent = `Could not start the game.\n\n${err instanceof Error ? err.message : String(err)}`;
  }

  showOutcome(status: BattleStatus): void {
    if (status === 'fighting') return;
    this.outcomeStatus = status;
    this.outcome.hidden = false;
    this.outcomeCard.className = `card ${status}`;
    this.outcomeTitle.textContent = status === 'victory' ? 'Victory' : 'Defeat';
    this.outcomeText.textContent = status === 'victory'
      ? 'Every enemy is down.'
      : 'Your hero has fallen.';
  }

  hideOutcome(): void {
    this.outcomeStatus = null;
    this.outcome.hidden = true;
  }

  addDamage(x: number, z: number, amount: number): void {
    const el = document.createElement('div');
    el.className = 'num';
    el.textContent = String(Math.round(amount));
    this.numbers.appendChild(el);
    this.popups.push({ el, x, z, age: 0 });
  }

  frame(f: HudFrame): void {
    const playing = f.locked && this.outcomeStatus === null;
    this.prompt.hidden = f.locked || this.outcomeStatus !== null;
    this.crosshair.hidden = !playing;
    this.draw.hidden = !(playing && f.weapon === 'bow' && f.drawFraction > 0);
    this.drawFill.style.width = `${Math.round(f.drawFraction * 100)}%`;

    this.heroFill.style.width = `${Math.round((f.hero.hp / f.hero.maxHp) * 100)}%`;
    this.heroText.textContent = `${Math.ceil(f.hero.hp)} / ${f.hero.maxHp}`;
    for (const w of ['sword', 'bow'] as const) {
      this.weaponSpans[w].classList.toggle('active', f.weapon === w);
    }

    this.updateBars(f);
    this.updatePopups(f);
  }

  private updateBars(f: HudFrame): void {
    const seen = new Set<number>();
    for (const fighter of f.state.fighters) {
      if (fighter.kind === 'hero' || !fighter.alive) continue;
      seen.add(fighter.id);
      let bar = this.barById.get(fighter.id);
      if (!bar) {
        bar = this.makeBar(fighter);
        this.barById.set(fighter.id, bar);
      }
      const p = f.project(fighter.x, fighter.height + 0.35, fighter.z);
      bar.root.hidden = !p.visible;
      bar.root.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      bar.fill.style.width = `${Math.max(0, (fighter.hp / fighter.maxHp) * 100).toFixed(1)}%`;
    }
    for (const [id, bar] of this.barById) {
      if (!seen.has(id)) {
        bar.root.remove();
        this.barById.delete(id);
      }
    }
  }

  private makeBar(fighter: Fighter): Bar {
    const root = document.createElement('div');
    root.className = `bar team-${fighter.team}`;
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    root.appendChild(fill);
    this.bars.appendChild(root);
    return { root, fill, team: fighter.team };
  }

  private updatePopups(f: HudFrame): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.age += f.dt;
      if (p.age >= DAMAGE_LIFE) {
        p.el.remove();
        this.popups.splice(i, 1);
        continue;
      }
      const k = p.age / DAMAGE_LIFE;
      const proj = f.project(p.x, 1.9 + k * 0.6, p.z);
      p.el.hidden = !proj.visible;
      p.el.style.transform = `translate(${proj.x.toFixed(1)}px, ${proj.y.toFixed(1)}px) translate(-50%, -50%)`;
      p.el.style.opacity = String(Math.max(0, 1 - k));
    }
  }
}
