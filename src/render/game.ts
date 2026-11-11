// Wires the simulation to Babylon: fixed-step sim, visual sync, camera, HUD and restart.
// The sim (src/core) knows nothing of this file. Everything here reads sim state and draws it.

import { Engine, Matrix, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import { TUNING } from '../config/tuning';
import { createBattle, getHero, step } from '../core/battle';
import type { BattleEvent, BattleState } from '../core/types';
import { TRAINING_FIELD } from '../data/arena';
import { buildArena } from './arena';
import { loadAssets, type LoadedAssets } from './assets';
import { CharacterView } from './characters';
import { BattleCamera } from './camera';
import { blocksView } from './occlusion';
import { ArrowViews, ImpactBursts } from './effects';
import { PlayerInput } from './input';
import { Hud, type Projector } from './hud';
import { TuningPanel } from './tuning_panel';

/** Entry point: builds the scene, loads every asset, then starts the battle. Errors go to the HUD. */
export async function startGame(canvas: HTMLCanvasElement, uiRoot: HTMLElement): Promise<void> {
  const hud = new Hud(uiRoot);
  // Backtick debug panel. Opening it releases the pointer, which pauses the sim until the player clicks back in.
  new TuningPanel(uiRoot, (open) => {
    if (open && document.pointerLockElement === canvas) document.exitPointerLock();
  });
  try {
    const engine = new Engine(canvas, true, { stencil: true }, true);
    const scene = new Scene(engine);
    const { shadow } = buildArena(scene, TRAINING_FIELD);
    const assets = await loadAssets(scene, (done, total, label) => {
      hud.setBoot(label, total > 0 ? done / total : 0);
    });
    const game = new Game(engine, scene, canvas, hud, assets, shadow);
    game.start();
    hud.hideBoot();
  } catch (err) {
    hud.showError(err);
    throw err;
  }
}

class Game {
  private state: BattleState;
  private readonly views = new Map<number, CharacterView>();
  private arrows: ArrowViews;
  private readonly bursts: ImpactBursts;
  private readonly input: PlayerInput;
  private readonly camera: BattleCamera;
  private accumulator = 0;
  private readonly projector: Projector;

  constructor(
    private readonly engine: Engine,
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly hud: Hud,
    private readonly assets: LoadedAssets,
    private readonly shadow: ShadowGenerator,
  ) {
    this.state = createBattle(TRAINING_FIELD);
    this.arrows = new ArrowViews(scene, assets.arrow, shadow);
    this.bursts = new ImpactBursts(scene);
    this.input = new PlayerInput(canvas, () => {
      // Pointer lock changes are read from input.isLocked each frame; nothing to do here.
    });
    this.camera = new BattleCamera(scene);
    this.projector = (x, y, z) => this.project(x, y, z);
    this.spawnViews();
    hud.onRestart = () => this.restart();
  }

  start(): void {
    this.engine.runRenderLoop(() => this.tick());
  }

  private tick(): void {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    this.runSim(dt);
    this.syncVisuals(dt);
    this.scene.render();
  }

  /** Runs whole fixed steps while the pointer is locked and the battle is live. */
  private runSim(dt: number): void {
    if (!this.input.isLocked || this.state.status !== 'fighting') {
      this.accumulator = 0;
      this.input.consumeEdges();
      return;
    }
    this.accumulator += dt;
    while (this.accumulator >= TUNING.fixedDt && this.state.status === 'fighting') {
      this.accumulator -= TUNING.fixedDt;
      const sprint = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
      const events = step(this.state, this.input.takeInput(sprint));
      this.handleEvents(events);
    }
  }

  private handleEvents(events: BattleEvent[]): void {
    for (const e of events) {
      if (e.type === 'damage') {
        this.hud.addDamage(e.x, e.z, e.amount);
      } else if (e.type === 'impact') {
        this.bursts.spawn(e.x, e.y, e.z);
      } else if (e.type === 'outcome') {
        this.input.releaseLock();
        this.hud.showOutcome(e.status);
      }
    }
  }

  /** Draws the current state. Visual only: no sim state is written here. */
  private syncVisuals(dt: number): void {
    const { state } = this;
    const hero = getHero(state);
    // The camera moves first so the occlusion test below uses this frame's camera position.
    this.camera.update(hero, this.input.camYaw, this.input.aimPitch, this.input.isZooming, dt);
    const camPos = this.camera.camera.position;
    for (const f of state.fighters) {
      let view = this.views.get(f.id);
      if (!view) {
        view = this.makeView(f.id);
        this.views.set(f.id, view);
      }
      view.update(f);
      // Non-hero fighters that block the view fade out. The hero is never faded.
      if (f.id !== hero.id) view.fade(blocksView(camPos, hero, f), dt);
    }
    this.arrows.sync(state);
    this.bursts.update(dt);

    this.hud.frame({
      state,
      hero,
      locked: this.input.isLocked,
      weapon: this.input.weapon,
      zooming: this.input.isZooming,
      drawFraction: hero.weapon === 'bow' ? Math.min(1, hero.drawTime / TUNING.bow.fullDrawTime) : 0,
      project: this.projector,
      dt,
    });
  }

  private spawnViews(): void {
    for (const f of this.state.fighters) this.views.set(f.id, this.makeView(f.id));
  }

  private makeView(id: number): CharacterView {
    const fighter = this.state.fighters.find((f) => f.id === id);
    if (!fighter) throw new Error(`No fighter with id ${id}`);
    return new CharacterView(this.scene, this.assets, fighter, this.shadow, `${fighter.kind}${id}`);
  }

  private restart(): void {
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.arrows.dispose();
    this.arrows = new ArrowViews(this.scene, this.assets.arrow, this.shadow);
    this.bursts.dispose();
    this.state = createBattle(TRAINING_FIELD);
    this.input.reset();
    this.accumulator = 0;
    this.spawnViews();
    this.hud.hideOutcome();
    this.input.requestLock();
  }

  /** World point to CSS pixels on the canvas. visible is false when the point is behind the camera or off-depth. */
  private project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const vp = this.camera.camera.viewport.toGlobal(w, h);
    const p = Vector3.Project(new Vector3(x, y, z), Matrix.Identity(), this.scene.getTransformMatrix(), vp);
    return { x: p.x, y: p.y, visible: p.z > 0 && p.z < 1 };
  }
}
