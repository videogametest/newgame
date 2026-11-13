// Wires the simulation to Babylon: fixed-step sim, visual sync, camera, HUD and restart.
// The sim (src/core) knows nothing of this file. Everything here reads sim state and draws it.

import { AbstractMesh, Engine, Matrix, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import { TUNING } from '../config/tuning';
import { createBattle, getHero, step } from '../core/battle';
import type { BattleEvent, BattleState } from '../core/types';
import { advanceFootsteps, soundsForEvent } from '../core/sound_map';
import { FOOTSTEP_STRIDE } from '../data/sounds';
import { TRAINING_FIELD } from '../data/arena';
import { buildArena } from './arena';
import { loadAssets, type LoadedAssets } from './assets';
import { CharacterView } from './characters';
import { BattleCamera } from './camera';
import { insideBounds, type ArenaBounds } from './camera_limits';
import { blocksView } from './occlusion';
import { ArrowViews, ImpactBursts } from './effects';
import { PlayerInput } from './input';
import { simRunning } from './input_rules';
import { installErrorCapture, logEvent } from './debug_log';
import { Hud, type Projector } from './hud';
import { TuningPanel } from './tuning_panel';
import { AudioBank } from './audio';

/** Entry point: builds the scene, loads every asset, then starts the battle. Errors go to the HUD. */
export async function startGame(canvas: HTMLCanvasElement, uiRoot: HTMLElement): Promise<void> {
  // First, so an error during boot is captured too.
  installErrorCapture();
  logEvent('boot', 'start');
  const hud = new Hud(uiRoot);
  const audio = new AudioBank();
  // Browsers only allow audio after a user gesture, so the first click or key press starts it.
  const unlockAudio = (): void => audio.unlock();
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  // Backtick debug panel. Opening it releases the pointer, which pauses the sim until the player clicks back in.
  new TuningPanel(uiRoot, (open) => {
    if (open && document.pointerLockElement === canvas) document.exitPointerLock();
  }, audio);
  try {
    const engine = new Engine(canvas, true, { stencil: true }, true);
    const scene = new Scene(engine);
    const { shadow, walls } = buildArena(scene, TRAINING_FIELD);
    const assets = await loadAssets(scene, (done, total, label) => {
      hud.setBoot(label, total > 0 ? done / total : 0);
    });
    const game = new Game(engine, scene, canvas, hud, assets, shadow, walls, TRAINING_FIELD, audio);
    game.start();
    hud.hideBoot();
    logEvent('boot', 'ready');
  } catch (err) {
    logEvent('boot', 'failed');
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
  /** Metres the hero has walked since its last footstep. */
  private stepDistance = 0;
  private readonly projector: Projector;
  /** Last pause state logged, so the event log records transitions only. */
  private wasPaused = false;

  constructor(
    private readonly engine: Engine,
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly hud: Hud,
    private readonly assets: LoadedAssets,
    private readonly shadow: ShadowGenerator,
    private readonly walls: AbstractMesh[],
    private readonly arena: ArenaBounds,
    private readonly audio: AudioBank,
  ) {
    this.state = createBattle(TRAINING_FIELD);
    this.arrows = new ArrowViews(scene, assets.arrow, shadow);
    this.bursts = new ImpactBursts(scene);
    this.input = new PlayerInput(canvas, (locked) => {
      // The sim reads input.isLocked each frame; this callback only records the change.
      logEvent('pointer_lock', locked ? 'locked' : 'released');
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
    // Paused when the pointer is released or the window is in the background.
    const paused = !simRunning(this.input.isLocked, this.input.isWindowFocused);
    if (paused !== this.wasPaused) {
      this.wasPaused = paused;
      logEvent('sim', paused ? 'paused' : 'running');
    }
    if (paused || this.state.status !== 'fighting') {
      this.accumulator = 0;
      this.input.consumeEdges();
      return;
    }
    this.accumulator += dt;
    while (this.accumulator >= TUNING.fixedDt && this.state.status === 'fighting') {
      this.accumulator -= TUNING.fixedDt;
      const events = step(this.state, this.input.takeInput());
      this.handleEvents(events);
      this.tickFootsteps();
    }
  }

  /** Plays a footstep each stride the hero walks. Standing still resets the count. */
  private tickFootsteps(): void {
    const hero = getHero(this.state);
    const speed = Math.hypot(hero.vx, hero.vz);
    const r = advanceFootsteps(this.stepDistance, speed, TUNING.fixedDt, FOOTSTEP_STRIDE);
    this.stepDistance = r.distance;
    if (r.due) this.audio.play('footstep');
  }

  private handleEvents(events: BattleEvent[]): void {
    const heroId = getHero(this.state).id;
    for (const e of events) {
      for (const id of soundsForEvent(e, heroId)) this.audio.play(id);
      if (e.type === 'damage') {
        this.hud.addDamage(e.x, e.z, e.amount);
      } else if (e.type === 'impact') {
        this.bursts.spawn(e.x, e.y, e.z);
      } else if (e.type === 'outcome') {
        logEvent('outcome', e.status);
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
    // The boundary wall is a translucent barrier. It is hidden while the camera is outside the arena,
    // so it never tints the view. Inside, it stays visible behind the camera.
    const camInside = insideBounds(camPos.x, camPos.z, this.arena);
    for (const w of this.walls) w.isVisible = camInside;
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
    logEvent('restart');
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.arrows.dispose();
    this.arrows = new ArrowViews(this.scene, this.assets.arrow, this.shadow);
    this.bursts.dispose();
    this.state = createBattle(TRAINING_FIELD);
    this.input.reset();
    this.accumulator = 0;
    this.stepDistance = 0;
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
