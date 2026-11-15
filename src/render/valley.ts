import type { Awareness } from '../core/stealth';
// The valley: open-world slice, step 1. Terrain, sky, water, one hero walking under the day-night clock.
// The walking rules and camera geometry are pure (src/core/world); this file only draws them.

import {
  Color3, Color4, DirectionalLight, Engine, FreeCamera, GlowLayer, HemisphericLight, ImageProcessingConfiguration,
  Matrix, Scene, ShadowGenerator, Vector3,
} from '@babylonjs/core';
import { createBattle, makeFighter } from '../core/battle';
import type { BattleInput, Fighter, FighterKind, Team } from '../core/types';
import { newGameState } from '../core/state';
import type { GameState } from '../core/types';
import { blocksHero, insideValley, valleyHeightAt, walkSurfaceAt, VALLEY_PLACES, VALLEY_SEED } from '../core/world/valley';
import { aimAngles, valleyCameraPose, type ValleyCameraRig } from '../core/world/valley_camera';
import { VALLEY_CLOCK, parseTod } from '../core/world/valley_time';
import type { WalkRules } from '../core/world/walk';
import { TOUR_VIEWS, nextTourIndex, tourIndexOf, tourYaw } from '../core/world/tour';
import { PATROL_HUT_FIGHT, PATROL_HUT_HERO_SPAWN } from '../data/patrol_hut_fight';
import { ValleyFight } from './valley_fight';
import { BRAM_FOLLOW_LINES, BRAM_HOLD_LINES, followSpot, nextOrder, stepCompanion } from '../core/world/companion';
import type { SquadOrder } from '../core/company/conduct';
import { blocksView } from './occlusion';
import { loadAssets, type LoadedAssets } from './assets';
import { CharacterView } from './characters';
import { buildFarLand } from './valley_far';
import { buildRoads } from './valley_roads';
import { buildLandmarks, type Landmarks } from '../landmarks/build';
import { PROPORTIONS } from './proportions';
import { buildValleyWater, type ValleyWater } from './valley_water';
import { buildGate } from './valley_gate';
import { buildCrossings } from './valley_crossings';
import { buildScenery } from './valley_scenery';
import { ValleyWildlife, type WildlifeFrame } from './valley_wildlife';
import { ValleyDefenders } from './valley_defenders';
import { installErrorCapture, logEvent } from './debug_log';
import { Hud } from './hud';
import { PlayerInput } from './input';
import { fillPrompt } from '../core/settings/labels';
import { currentSettings, saveSettings } from './settings_store';
import { showBrightnessCard } from './display_settings';
import { brightnessCurve } from '../core/settings/settings';
import { qualityProfile } from './quality';
import { lightingAt } from './lighting';
import { ValleySky } from './valley_sky';
import { ValleyTerrain } from './valley_terrain';
import { buildWick, type Wick } from '../village/build';
import { wickHouses } from '../village/plan';
import { TUNING as T } from '../config/tuning';
import { PauseMenu } from './menu';
import { AudioBank } from './audio';
import { clockAfterFrame, clockRuns, pausedAfter } from './pause';

const CAMERA_RIG: ValleyCameraRig = {
  distance: T.camera.distance,
  shoulder: T.camera.shoulder,
  lookHeight: T.camera.lookHeight,
  clearance: 0.6,
};
const WALK_RULES: WalkRules = {
  heightAt: walkSurfaceAt,
  blocked: blocksHero,
  inside: insideValley,
};
const FOG_START = 240;
const FOG_END = 1100; // the far rim and the castle are meant to be seen across the whole valley
const SUN_RANGE = 90;

/** Test and capture hooks, read by the screenshot scripts. Not part of play. */
export interface ValleyHooks {
  setTod(hours: number): void;
  freeze(on: boolean): void;
  aimAt(body: 'sun' | 'moon'): void;
  /** Puts the camera back to the pose it had before the last aimAt. Call after each aimed shot. */
  aimReset(): void;
  placeAt(x: number, z: number): void;
  lookAt(x: number, z: number): void;
  project(name: string): { x: number; y: number; w: number; h: number } | null;
  state(): ValleyState;
  /** Capture only: runs the real wildlife rules with a specified hero movement and elapsed time. */
  wildlifeStep(movement: WildlifeFrame['movement'], dt: number): void;
  millState(): ReturnType<ValleyFight['mill']['snapshot']>;
  millStep(movement: WildlifeFrame['movement'], seconds: number): void;
  wildlifeState(): ReturnType<ValleyWildlife['snapshot']> | null;
  /** For budgets: how many meshes are being drawn this frame, by the start of their name. */
  meshCounts(): Record<string, number>;
  /** Tour mode (?tour=1): moves the hero and camera to a named view, or to the view at an index. */
  tourTo(nameOrIndex: string | number): boolean;
  tourNames(): string[];
  /** Share of sampled screen points whose first hit is ground (not the sky dome, stars, sun or moon), 0 to 1. */
  groundShare(cols?: number, rows?: number): number;
  /** Row-major sampled screen points: 1 where the first hit is ground, 0 where it is sky. */
  groundMask(cols?: number, rows?: number): number[];
  /** Capture only: hides the clock, figures, hint and tour label. */
  hideChrome(): void;
  /** Capture only: hides Bram, to check what else is in a frame. */
  hideBram(on: boolean): void;
  /** Capture only: sets Bram's order (follow or hold) without the Q key. */
  setBramOrder(order: SquadOrder): void;
  /** Capture only: holds the fight simulation (hero and Bram steps) so frames stay still. */
  holdFight(on: boolean): void;
  /** Capture only: the image exposure and the grey ambient lift now in use (brightness, task 009 step 2c). */
  exposure(): { exposure: number; ambient: number };
}
/** Meshes that make up the sky. A pick that passes through these is sky. */
const SKY_MESHES = new Set(['valley_sky', 'valley_stars', 'valley_sun', 'valley_moon']);
/** One fighter as the fight's sim holds it. Positions are metres; y is height above the ground. */
export interface FighterState {
  id: number;
  kind: FighterKind;
  team: Team;
  x: number;
  z: number;
  groundY: number;
  bodyHeight: number;
  alive: boolean;
  hp: number;
  /** Actual core activation state. The hero has no awareness marker. */
  awareness: Awareness | null;
}
export interface ValleyState {
  x: number;
  z: number;
  groundY: number;
  yaw: number;
  tod: number;
  day: number;
  locked: boolean;
  paused: boolean;
  /** Frame counter, and the frame on which the pause last took effect (null before the first pause). */
  frame: number;
  pausedFrame: number | null;
  chunks: number;
  chunkBuilds: number;
  fps: number;
  drawCalls: number | null;
  activeMeshes: number;
  bram: { x: number; z: number; order: SquadOrder; crouched: boolean };
  /** Every fighter in the patrol-hut fight, the hero included (task 004 item 8). */
  fighters: FighterState[];
}

declare global {
  interface Window {
    __valley?: ValleyHooks;
  }
}

/** Entry point: builds the valley, loads assets, then runs the walk loop. Errors go to the HUD. */
export async function startValley(canvas: HTMLCanvasElement, uiRoot: HTMLElement, search: string): Promise<void> {
  installErrorCapture();
  logEvent('valley', 'boot');
  const hud = new Hud(uiRoot);
  hud.hideFightChrome();
  const params = new URLSearchParams(search);
  try {
    // preserveDrawingBuffer lets captures read the canvas (toDataURL) after a frame; see docs/tasks/day-2026-11-14.md 7b.
    const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);
    const scene = new Scene(engine);
    const assets = await loadAssets(scene, (done, total, label) => {
      hud.setBoot(label, total > 0 ? done / total : 0);
    });
    const game = newGameState(VALLEY_SEED);
    const rawTod = params.get('tod');
    if (rawTod !== null) game.timeOfDay = parseTod(rawTod);
    const valley = new Valley(engine, scene, uiRoot, assets, game, hud);
    await valley.loadWick();
    valley.start();
    hud.hideBoot();
    logEvent('valley', 'ready');
  } catch (err) {
    logEvent('valley', 'failed');
    hud.showError(err);
    throw err;
  }
}

class Valley {
  private readonly input: PlayerInput;
  private readonly camera: FreeCamera;
  private readonly hemi: HemisphericLight;
  private readonly sun: DirectionalLight;
  private readonly shadow: ShadowGenerator;
  /** The camera pose from before the last aimAt, restored by aimReset. */
  private savedAim: { yaw: number; pitch: number } | null = null;
  private readonly terrain: ValleyTerrain;
  private readonly sky: ValleySky;
  /** The patrol-hut fight (task 004 item 8). It owns the hero: his position, his hits and his HP. */
  private readonly fight: ValleyFight;
  private get hero(): Fighter {
    return this.fight.hero;
  }
  private heroView: CharacterView;
  private readonly hint: HTMLElement;
  private readonly clockText: HTMLElement;
  private readonly figuresText: HTMLElement;
  private readonly tourText: HTMLElement;
  /** The clock, figures, hint and tour label box. Capture hides it. */
  private chromeBox?: HTMLElement;
  /** ?tour=1 turns on tour mode: [ and ] step between named views (src/core/world/tour.ts). */
  private readonly tour = new URLSearchParams(window.location.search).get('tour') === '1';
  private tourIndex = 0;
  /** ?debug=1 shows the clock, frame figures and control hint. The default route shows only the world. */
  private readonly debug = new URLSearchParams(window.location.search).get('debug') === '1';
  private groundY: number;
  private wick?: Wick;
  private landmarks?: Landmarks;
  private glow?: GlowLayer;
  private accumulator = 0;
  private frozen = false;
  private fightHeld = false;
  private readonly uiRoot: HTMLElement;
  /** Pause menu open: the clock, the walk and the fixed steps stop. The scene still draws. */
  private paused = false;
  private frame = 0;
  private pausedFrame: number | null = null;
  private readonly pauseMenu: PauseMenu;
  private fps = 0;
  private lastFrameDrawCalls = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  /** Bram (task 004 item 7): outside the battle until item 8. Follows the hero unless ordered to hold. */
  private readonly bram: Fighter;
  private readonly bramView: CharacterView;
  private bramOrder: SquadOrder = 'follow';
  /** Bram keeps his spot 2.5 m beside the hero and 1 m behind, crouched or not; crouch changes only the hero's own movement. */
  private crouched = false;
  /** The hero's movement as the stealth and wildlife rules read it this frame. */
  private heroMovement: 'still' | 'walking' | 'sprinting' | 'crouched' | 'crouchedStill' = 'still';
  private wildlife?: ValleyWildlife;
  private defenders?: ValleyDefenders;
  private bramGroundY = 0;
  /** How many times each order's line has played, so the lines rotate and never repeat back to back. */
  private readonly bramSaid: Record<SquadOrder, number> = { follow: 0, hold: 0 };
  private readonly captionEl: HTMLElement;
  private captionTime = 0;
  private chromeHidden = false;

  constructor(
    private readonly engine: Engine,
    private readonly scene: Scene,
    uiRoot: HTMLElement,
    private readonly assets: LoadedAssets,
    private readonly game: GameState,
    hud: Hud,
    audio: AudioBank = new AudioBank(), // the Sound page's volumes; the same saved values the battle uses
  ) {
    const canvas = engine.getRenderingCanvas() as HTMLCanvasElement;
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogStart = FOG_START;
    scene.fogEnd = FOG_END;
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.contrast = 1.1;

    this.hemi = new HemisphericLight('valley_hemi', new Vector3(0, 1, 0), scene);
    this.sun = new DirectionalLight('valley_sun', new Vector3(0, -1, 0), scene);
    this.sun.autoUpdateExtends = false;
    this.sun.orthoLeft = -SUN_RANGE;
    this.sun.orthoRight = SUN_RANGE;
    this.sun.orthoBottom = -SUN_RANGE;
    this.sun.orthoTop = SUN_RANGE;
    this.sun.shadowMinZ = 1;
    this.sun.shadowMaxZ = 400;
    const display = currentSettings().display;
    const quality = qualityProfile(display.quality); // read at start: shadow size and stream radius change on the next start
    this.applyBrightness(display.brightness);
    this.shadow = new ShadowGenerator(quality.shadowMapSize, this.sun);
    this.shadow.usePercentageCloserFiltering = true;
    this.shadow.darkness = 0.1; // the sky's light already fills shade; the sun's share is nearly all removed

    this.terrain = new ValleyTerrain(scene, quality.streamRadius);
    buildFarLand(scene); // the whole valley, coarse, so nothing past the stream radius is a hole (review 023)
    buildRoads(scene); // every road and path outside Wick, as worn earth (review 027)
    this.sky = new ValleySky(scene);
    this.buildWater(scene);

    this.camera = new FreeCamera('valley_cam', new Vector3(0, 10, 0), scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1800; // the castle beyond the rim, seen from the far corner
    scene.activeCamera = this.camera;

    this.fight = new ValleyFight(scene, assets, this.shadow, audio, hud, this.camera, canvas, (line) => this.showLine(line, 4));
    this.placeHeroAtStart();
    this.heroView = new CharacterView(scene, assets, this.hero, this.shadow, 'hero');
    this.heroView.asDesigned(scene, PROPORTIONS); // overnight item 3
    this.groundY = walkSurfaceAt(this.hero.x, this.hero.z);
    // Bram stays outside the fight (queue decision d): a render-side figure with his own sim record.
    const bramBattle = createBattle(PATROL_HUT_FIGHT);
    this.bram = makeFighter(bramBattle, { unitId: 'ally_bram', kind: 'soldier', team: 'player', x: 0, z: 0, yaw: 0 });
    this.bramView = new CharacterView(scene, assets, this.bram, this.shadow, 'bram');
    this.bramView.asDesigned(scene, PROPORTIONS);
    this.snapBram();
    hud.onRestart = () => this.restartFight();

    this.uiRoot = uiRoot;
    this.pauseMenu = new PauseMenu(uiRoot, () => this.resume(), (b) => {
      saveSettings({ ...currentSettings(), bindings: b });
      this.input.setBindings(b); // the input is created just below; the callback only runs from the menu, after that
    }, (b) => this.applyBrightness(b), () => this.setBrightnessAgain(), audio);
    // Once the fight is over the outcome card needs the cursor, so losing the lock then does not open the pause menu.
    this.input = new PlayerInput(canvas, (locked) => {
      if (!locked && this.fight.status !== 'fighting') return;
      this.setPaused(pausedAfter(locked ? 'lockGained' : 'lockLost'));
    });
    this.input.camYaw = this.hero.yaw;

    this.hint = document.createElement('div');
    this.clockText = document.createElement('div');
    this.figuresText = document.createElement('div');
    this.tourText = document.createElement('div');
    this.captionEl = document.createElement('div');
    this.captionEl.hidden = true;
    this.captionEl.style.cssText = 'position:absolute;left:50%;bottom:16%;transform:translateX(-50%);font:600 18px/1.3 system-ui,sans-serif;color:#f4ead2;text-shadow:0 1px 3px #000;pointer-events:none;';
    uiRoot.appendChild(this.captionEl);
    this.installHud(uiRoot);
    canvas.addEventListener('pointerdown', () => {
      if (!this.input.isLocked && this.fight.status === 'fighting') this.input.requestLock();
    });
    if (this.tour) {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'BracketRight') this.tourTo(nextTourIndex(this.tourIndex, 1));
        if (e.code === 'BracketLeft') this.tourTo(nextTourIndex(this.tourIndex, -1));
      });
      this.tourTo(0);
    }
    this.installHooks();
  }

  /** Wick, the village (docs/tasks/003-wick.md). Built once; its light follows the clock every frame. */
  async loadWick(): Promise<void> {
    this.wick = await buildWick(this.scene, { heightAt: valleyHeightAt, seed: VALLEY_SEED, shadow: this.shadow });
    buildGate(this.scene, { heightAt: valleyHeightAt, shadow: this.shadow });
    buildCrossings(this.scene, { shadow: this.shadow }); // the ford, the mill bridge, the stepping stones (review 025 item 2)
    await buildScenery(this.scene);
    this.wildlife = new ValleyWildlife(this.scene); // the crows, flocks, geese and fox (GAME_DESIGN section 4)
    this.defenders = new ValleyDefenders(this.scene); // the mill's first garrison, by the place schedule (item 15)
    this.landmarks = await buildLandmarks(this.scene, { heightAt: valleyHeightAt, shadow: this.shadow }); // the Mill, the Forge, the Watch-house, the castle and the rest
    this.glow = new GlowLayer('glow', this.scene);
    this.glow.intensity = 0.3;
  }

  start(): void {
    // The first-start brightness check waits for the village, so the picture has its figure (review 031).
    if (!this.tour && !currentSettings().display.brightnessSet) this.startBrightnessCheck(() => {}); // tour mode has its own views
    this.engine.runRenderLoop(() => this.tick());
  }

  /** The brightness picture (review 031): the state it saved, restored when the card closes. */
  private picture: {
    timeOfDay: number;
    hero: { x: number; z: number };
    yaw: number;
    camYaw: number;
    aimPitch: number;
    frozen: boolean;
    /** The camera's yaw while the picture is open: the look at the figure, fixed against the mouse. */
    lookYaw: number;
    onClose: () => void;
  } | null = null;

  /** Opens the brightness picture: midnight at the hesper_door view, clock frozen, hero hidden, camera fixed. */
  private openBrightnessPicture(onClose: () => void): void {
    if (this.picture) return;
    const view = TOUR_VIEWS.find((v) => v.name === 'hesper_door');
    if (!view) throw new Error('The hesper_door view is missing from the tour');
    const saved = {
      timeOfDay: this.game.timeOfDay,
      hero: { ...this.game.hero.position },
      yaw: this.hero.yaw,
      camYaw: this.input.camYaw,
      aimPitch: this.input.aimPitch,
      frozen: this.frozen,
    };
    this.frozen = true;
    this.game.timeOfDay = 0;
    this.placeAt(view.hero.x, view.hero.z);
    this.lookAt(view.look.x, view.look.z);
    this.hero.yaw = tourYaw(view);
    this.heroView.setShown(false);
    this.bramView.setShown(false);
    this.picture = { ...saved, lookYaw: this.input.camYaw, onClose };
  }

  /** Closes the picture and puts the clock, hero and camera back as they were. */
  private closeBrightnessPicture(): void {
    const p = this.picture;
    if (!p) return;
    this.picture = null;
    this.frozen = p.frozen;
    this.game.timeOfDay = p.timeOfDay;
    this.placeAt(p.hero.x, p.hero.z);
    this.hero.yaw = p.yaw;
    this.snapBram();
    this.input.camYaw = p.camYaw;
    this.input.aimPitch = p.aimPitch;
    this.heroView.setShown(true);
    this.bramView.setShown(true);
    p.onClose();
  }

  /** The first-start check, and "Set brightness again" from Display (onDone then runs after the picture closes). */
  private startBrightnessCheck(onDone: () => void): void {
    this.openBrightnessPicture(onDone);
    showBrightnessCard(this.uiRoot, {
      onBrightness: (b) => this.applyBrightness(b),
      onDone: () => this.closeBrightnessPicture(),
    });
  }

  /** From Display: the pause menu steps aside while the picture is up, then comes back on Settings. */
  private setBrightnessAgain(): void {
    if (this.picture) return;
    this.pauseMenu.hide();
    this.startBrightnessCheck(() => {
      this.pauseMenu.show();
      this.pauseMenu.showSettings();
    });
  }

  private water: ValleyWater | null = null;
  private waterSeconds = 0;

  /**
   * Brightness (task 009 step 2c): exposure on the finished picture, and a grey ambient lift for the darkest tones.
   * At 1 both are as authored, so the default look is unchanged. The interface is never touched.
   */
  applyBrightness(brightness: number): void {
    const { exposure, shadowLift } = brightnessCurve(brightness);
    const config = this.scene.imageProcessingConfiguration;
    config.exposure = exposure;
    this.scene.ambientColor = new Color3(shadowLift, shadowLift, shadowLift);
  }

  private buildWater(scene: Scene): void {
    this.water = buildValleyWater(scene); // the lake and rivers take the sky (overnight item 5)
  }

  /** The hero starts at the valley's edge, facing Wick. The start is set here, not in newGameState. */
  private placeHeroAtStart(): void {
    const s = VALLEY_PLACES.start;
    // The hero faces Hesper's house (docs/tasks/overnight-2026-11-12.md, item 4), so her window is centred at 18:00.
    const hesper = wickHouses(VALLEY_SEED).find((h) => h.id === 'hesper');
    if (!hesper) throw new Error("Hesper's cottage is missing from the Wick plan");
    this.game.hero.position = { x: s.x, z: s.z };
    this.fight.placeHero(s.x, s.z);
    this.hero.yaw = Math.atan2(hesper.x - s.x, hesper.z - s.z);
  }

  /** The outcome card's restart: a fresh fight with the hero back at its spawn, and the lock taken again. */
  private restartFight(): void {
    this.fight.restart();
    this.game.hero.position = { x: PATROL_HUT_HERO_SPAWN.x, z: PATROL_HUT_HERO_SPAWN.z };
    this.groundY = this.hero.y;
    this.heroView.dispose();
    this.heroView = new CharacterView(this.scene, this.assets, this.hero, this.shadow, 'hero');
    this.heroView.asDesigned(this.scene, PROPORTIONS);
    this.snapBram();
    this.input.requestLock();
  }

  private tick(): void {
    this.frame += 1;
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    if (this.input.takePause()) this.onPauseKey();
    const next = clockAfterFrame(this.game, dt, VALLEY_CLOCK, clockRuns(this.paused, this.frozen, this.input.isWindowFocused));
    this.game.day = next.day;
    this.game.timeOfDay = next.timeOfDay;
    if (this.paused) {
      // Presses made while paused are dropped, so a stale attack or dodge does not fire on resume.
      this.accumulator = 0;
      this.input.consumeEdges();
    } else if (this.fightHeld) {
      this.accumulator = 0;
    } else {
      this.accumulator += dt;
    }
    while (this.accumulator >= T.fixedDt) {
      this.accumulator -= T.fixedDt;
      this.stepHero();
      this.stepBram(T.fixedDt);
    }
    this.updateView(dt);
    // The engine's draw-call counter is cumulative, so the frame's own count is the difference across the render.
    const before = this.drawCallCount();
    this.scene.render();
    this.lastFrameDrawCalls = this.drawCallCount() - before;
  }

  private drawCallCount(): number {
    const counters = this.engine as unknown as { _drawCalls?: { current?: number } };
    return typeof counters._drawCalls?.current === 'number' ? counters._drawCalls.current : 0;
  }

  /** Pause key: opens the pause menu, backs out of Settings or Controls, or resumes from the menu page (Esc works both ways). */
  private onPauseKey(): void {
    if (!this.paused && this.fight.status !== 'fighting') return; // the outcome card is up
    if (!this.paused) {
      this.setPaused(true);
    } else if (this.pauseMenu.onSubPage) {
      this.pauseMenu.showMenu();
    } else {
      this.resume();
    }
  }

  private resume(): void {
    this.setPaused(false);
    this.input.requestLock();
  }

  private setPaused(on: boolean): void {
    this.paused = on;
    if (on) {
      this.pausedFrame = this.frame;
      this.input.releaseLock();
      this.pauseMenu.show();
    } else {
      this.pauseMenu.hide();
    }
  }

  /**
   * One fixed step of the hero. The battle (src/core) moves him from the input, so walking and fighting share one
   * rule set. Movement only while the mouse is captured, so Esc pauses the hero.
   */
  private stepHero(): void {
    // Q and crouch are read before takeInput, which clears the edge flags.
    const squadPressed = this.input.takeActionPressed('squadOrder');
    const crouchPressed = this.input.takeActionPressed('crouch');
    const raw = this.input.takeInput();
    if (this.picture) return; // the figure stays where the picture put it
    if (squadPressed) this.onSquadOrderKey();
    if (currentSettings().play.crouchToggle) {
      if (crouchPressed) this.crouched = !this.crouched;
    } else {
      this.crouched = this.input.isDown('crouch');
    }
    const live = this.input.isLocked && this.input.isWindowFocused;
    const intent: BattleInput = live
      ? raw
      : { ...raw, moveX: 0, moveZ: 0, sprint: false, attackPressed: false, attackHeld: false, attackReleased: false, dodgePressed: false };
    const moving = live && Math.hypot(intent.moveX, intent.moveZ) > 0.01;
    this.heroMovement = this.crouched
      ? (moving ? 'crouched' : 'crouchedStill')
      : moving ? (intent.sprint ? 'sprinting' : 'walking') : 'still';
    const mill = this.game.places.find(p => p.id === 'mill');
    if (this.fight.status === 'fighting') this.fight.advance(intent, mill
      ? { hour: this.game.timeOfDay, place: mill, movement: this.heroMovement } : undefined);
    this.game.hero.position = { x: this.hero.x, z: this.hero.z };
    this.groundY = this.hero.y;
  }

  /** Bram's step: walks to his spot beside the hero on follow, and stands still on hold. */
  private stepBram(dt: number): void {
    if (this.picture) return;
    const from = { x: this.bram.x, z: this.bram.z };
    const hp = this.game.hero.position;
    const next = stepCompanion(from, { x: hp.x, z: hp.z, yaw: this.hero.yaw }, this.bramOrder, T.hero.sprintSpeed, dt, WALK_RULES);
    this.bram.vx = (next.x - from.x) / dt;
    this.bram.vz = (next.z - from.z) / dt;
    this.bram.x = next.x;
    this.bram.z = next.z;
    this.bramGroundY = next.y;
    // Faces the way he walks; when he stands, faces the same way as the hero.
    this.bram.yaw = next.moving ? Math.atan2(next.x - from.x, next.z - from.z) : this.hero.yaw;
  }

  /** Puts Bram on his spot beside the hero, facing the hero's way (used after any teleport or camera reset). */
  private snapBram(): void {
    const p = followSpot({ x: this.game.hero.position.x, z: this.game.hero.position.z, yaw: this.hero.yaw }, WALK_RULES);
    this.bram.x = p.x;
    this.bram.z = p.z;
    this.bram.yaw = this.hero.yaw;
    this.bram.vx = 0;
    this.bram.vz = 0;
    this.bramGroundY = walkSurfaceAt(p.x, p.z);
  }

  /** Q: flips Bram between follow and hold, and shows the next line for that order for three seconds. */
  private onSquadOrderKey(): void {
    this.bramOrder = nextOrder(this.bramOrder);
    const lines = this.bramOrder === 'follow' ? BRAM_FOLLOW_LINES : BRAM_HOLD_LINES;
    const line = lines[this.bramSaid[this.bramOrder] % lines.length];
    this.bramSaid[this.bramOrder] += 1;
    this.showLine(`Bram: "${line}"`, 3);
  }

  /** Shows a line in the caption for the given seconds. The valley's one text line: Bram's words, fight status. */
  private showLine(text: string, seconds: number): void {
    this.captionEl.textContent = text;
    this.captionTime = seconds;
  }

  private updateView(dt: number): void {
    const L = lightingAt(this.game.timeOfDay);
    this.hemi.diffuse = L.hemiColor;
    this.hemi.intensity = L.hemiIntensity;
    this.sun.direction = L.sunDir;
    this.sun.diffuse = L.sunColor;
    this.sun.intensity = L.sunIntensity;
    this.sun.position = new Vector3(this.hero.x, 0, this.hero.z).subtract(L.sunDir.scale(200));
    this.scene.fogColor = L.sky;
    this.scene.clearColor = new Color4(L.sky.r, L.sky.g, L.sky.b, 1);

    this.terrain.update(this.hero);
    this.sky.update(L, this.hero.x, this.hero.z);
    this.waterSeconds += dt;
    if (this.scene.activeCamera) this.water?.update(L, this.waterSeconds, this.scene.activeCamera.globalPosition, FOG_START, FOG_END);
    this.wick?.light(L, this.game.timeOfDay);
    this.landmarks?.update(dt, L);
    this.wildlife?.update({
      dt: this.paused ? 0 : dt,
      hero: { x: this.hero.x, z: this.hero.z },
      movement: this.paused ? 'still' : this.heroMovement,
      heldPlaces: this.game.places.filter(p => p.status === 'held').map(p => p.id),
    });
    this.defenders?.update(this.fight.mill.snapshot(), this.fight.battle.fighters);
    if (this.glow) this.glow.intensity = 0.3 + 0.9 * L.nightness;
    this.heroView.update(this.hero, this.groundY);
    this.bramView.update(this.bram, this.bramGroundY);

    if (this.picture) {
      this.input.camYaw = this.picture.lookYaw;
      this.input.aimPitch = 0;
    }
    const pose = valleyCameraPose(
      { x: this.hero.x, y: this.groundY, z: this.hero.z },
      this.input.camYaw,
      this.input.aimPitch,
      CAMERA_RIG,
      valleyHeightAt,
    );
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.camera.setTarget(new Vector3(pose.target.x, pose.target.y, pose.target.z));
    this.camera.fov = T.camera.fov;
    this.fight.sync(dt, { locked: this.input.isLocked, zooming: this.input.isZooming });
    // The fade rule for fighters between the lens and the hero, or too near the lens.
    this.bramView.fade(blocksView(pose.position, this.hero, this.bram), dt);
    this.captionTime = this.paused ? this.captionTime : Math.max(0, this.captionTime - dt);
    this.captionEl.hidden = !(this.captionTime > 0 && !this.picture && !this.paused && !this.chromeHidden);

    this.updateHud(dt);
  }

  private installHud(uiRoot: HTMLElement): void {
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:16px;top:14px;font:600 14px/1.4 system-ui,sans-serif;color:#f4ead2;text-shadow:0 1px 3px #000;pointer-events:none;';
    this.clockText.style.cssText = 'font-size:16px;';
    this.hint.style.cssText = 'margin-top:4px;opacity:0.85;font-weight:400;';
    this.tourText.style.cssText = 'margin-top:4px;color:#ffd98a;';
    box.append(this.clockText, this.figuresText, this.hint, this.tourText);
    box.hidden = !(this.debug || this.tour);
    this.chromeBox = box;
    uiRoot.appendChild(box);
  }

  /** Tour mode: stands the hero at a view, turns the camera to its look point, and sets its clock hour. */
  tourTo(nameOrIndex: string | number): boolean {
    const i = typeof nameOrIndex === 'number' ? nameOrIndex : tourIndexOf(nameOrIndex);
    const view = TOUR_VIEWS[i];
    if (!view) return false;
    this.tourIndex = i;
    this.game.timeOfDay = parseTod(String(view.tod));
    this.placeAt(view.hero.x, view.hero.z);
    this.lookAt(view.look.x, view.look.z);
    // The model must face the look point too; lookAt alone turns only the camera, so the model faced the lens.
    this.hero.yaw = tourYaw(view);
    this.snapBram();
    this.tourText.textContent = `Tour ${i + 1}/${TOUR_VIEWS.length}: ${view.name} · ${view.note} · [ ] step`;
    return true;
  }

  /** Sampled screen points, row by row: 1 where the first hit is not sky. Water, terrain, houses and trees all count as ground. */
  groundMask(cols = 40, rows = 23): number[] {
    const w = this.engine.getRenderWidth();
    const h = this.engine.getRenderHeight();
    const mask: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = Math.round(((c + 0.5) / cols) * w);
        const y = Math.round(((r + 0.5) / rows) * h);
        const hit = this.scene.pick(x, y, (m) => !SKY_MESHES.has(m.name) && m.isEnabled());
        mask.push(hit?.hit ? 1 : 0);
      }
    }
    return mask;
  }

  /** Share of sampled screen points that are ground. Kept for the old figure; the brightness figure is ground_vs_sky.py. */
  groundShare(cols = 40, rows = 23): number {
    const mask = this.groundMask(cols, rows);
    return mask.length === 0 ? 0 : mask.reduce((a, b) => a + b, 0) / mask.length;
  }

  private placeAt(x: number, z: number): void {
    this.fight.placeHero(x, z);
    this.game.hero.position = { x, z };
    this.groundY = this.hero.y;
    this.snapBram();
  }

  private lookAt(x: number, z: number): void {
    const hp = this.game.hero.position;
    const a = aimAngles({ x: x - hp.x, y: 0, z: z - hp.z });
    this.input.camYaw = a.yaw;
    this.input.aimPitch = 0;
    // The hero turns with the camera. The battle sets his yaw from camYaw only on a step, and the capture holds
    // the fight before any step runs, so without this he keeps his old heading (task 004 item 8, review 036 point 3).
    this.hero.yaw = a.yaw;
  }

  private updateHud(dt: number): void {
    this.fpsTime += dt;
    this.fpsFrames++;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
    const h = Math.floor(this.game.timeOfDay);
    const m = Math.floor((this.game.timeOfDay - h) * 60);
    this.clockText.textContent = `Day ${this.game.day}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.figuresText.textContent = `${this.fps} fps · ${this.lastFrameDrawCalls} draw calls`;
    this.hint.textContent = this.input.isLocked
      ? fillPrompt('{moveForward}{moveLeft}{moveBack}{moveRight} walk · {sprint} sprint · {pause} releases the mouse', currentSettings().bindings, 'keyboard')
      : fillPrompt('Click the view to look around, then {moveForward}{moveLeft}{moveBack}{moveRight} to walk', currentSettings().bindings, 'keyboard');
  }

  private installHooks(): void {
    window.__valley = {
      setTod: (hours) => {
        this.game.timeOfDay = parseTod(String(hours));
      },
      freeze: (on) => {
        this.frozen = on;
      },
      aimReset: () => {
        if (!this.savedAim) return;
        this.input.camYaw = this.savedAim.yaw;
        this.input.aimPitch = this.savedAim.pitch;
        this.savedAim = null;
      },
      // Capture only: turns the camera to the sun or the moon at the current time. It skips the pitch limit
      // on purpose, because the noon sun sits above the player's look range.
      aimAt: (body) => {
        // Keep the first pose only: a second aimAt before a reset must not save the sun view as "before".
        this.savedAim ??= { yaw: this.input.camYaw, pitch: this.input.aimPitch };
        const L = lightingAt(this.game.timeOfDay);
        const a = aimAngles(body === 'sun' ? L.sunSky : L.moonSky);
        this.input.camYaw = a.yaw;
        this.input.aimPitch = a.pitch;
      },
      // Capture only: stands the hero at a point on the ground, and turns the camera to face a point.
      placeAt: (x, z) => this.placeAt(x, z),
      lookAt: (x, z) => this.lookAt(x, z),
      tourTo: (nameOrIndex) => this.tourTo(nameOrIndex),
      tourNames: () => TOUR_VIEWS.map((v) => v.name),
      groundShare: (cols, rows) => this.groundShare(cols, rows),
      groundMask: (cols, rows) => this.groundMask(cols, rows),
      hideChrome: () => {
        if (this.chromeBox) this.chromeBox.hidden = true;
        this.chromeHidden = true;
      },
      hideBram: (on) => {
        this.bramView.setShown(!on);
      },
      setBramOrder: (order) => {
        this.bramOrder = order;
      },
      holdFight: (on) => {
        this.fightHeld = on;
      },
      exposure: () => ({ exposure: this.scene.imageProcessingConfiguration.exposure, ambient: this.scene.ambientColor.r }),
      project: (name) => {
        const m = this.scene.getMeshByName(name);
        if (!m) return null;
        const e = this.engine;
        const v = Vector3.Project(m.getAbsolutePosition(), Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight()));
        return { x: v.x, y: v.y, w: e.getRenderWidth(), h: e.getRenderHeight() };
      },
      state: () => this.snapshot(),
      millState: () => this.fight.mill.snapshot(),
      millStep: (movement, seconds) => {
        const place = this.game.places.find(p => p.id === 'mill');
        if (!place) return;
        for (let elapsed = 0; elapsed < seconds; elapsed += T.fixedDt)
          this.fight.mill.advance(this.fight.battle, this.game.timeOfDay, place, movement, Math.min(T.fixedDt, seconds - elapsed));
      },
      wildlifeState: () => this.wildlife?.snapshot() ?? null,
      wildlifeStep: (movement, dt) => this.wildlife?.update({ dt, movement,
        hero: { x: this.hero.x, z: this.hero.z },
        heldPlaces: this.game.places.filter(p => p.status === 'held').map(p => p.id),
      }),
      meshCounts: () => {
        const out: Record<string, number> = {};
        for (const m of this.scene.getActiveMeshes().data.slice(0, this.scene.getActiveMeshes().length)) { const k = m.name.replace(/[-_]?\d.*$/, '').slice(0, 28); out[k] = (out[k] ?? 0) + 1; }
        return out;
      },
    };
  }

  private snapshot(): ValleyState {
    return {
      x: this.game.hero.position.x,
      z: this.game.hero.position.z,
      groundY: this.groundY,
      yaw: this.hero.yaw,
      tod: this.game.timeOfDay,
      day: this.game.day,
      locked: this.input.isLocked,
      paused: this.paused,
      frame: this.frame,
      pausedFrame: this.pausedFrame,
      chunks: this.terrain.chunkCount,
      chunkBuilds: this.terrain.buildCount,
      fps: this.fps,
      drawCalls: this.lastFrameDrawCalls,
      activeMeshes: this.scene.getActiveMeshes().length,
      bram: { x: this.bram.x, z: this.bram.z, order: this.bramOrder, crouched: this.crouched },
      fighters: this.fight.battle.fighters.map((f) => ({
        id: f.id,
        kind: f.kind,
        team: f.team,
        x: f.x,
        z: f.z,
        groundY: f.y,
        bodyHeight: f.height,
        alive: f.alive,
        hp: f.hp,
        awareness: f.awareness ?? null,
      })),
    };
  }
}
