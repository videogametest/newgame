// The valley: open-world slice, step 1. Terrain, sky, water, one hero walking under the day-night clock.
// The walking rules and camera geometry are pure (src/core/world); this file only draws them.

import {
  Color3, Color4, DirectionalLight, Engine, FreeCamera, GlowLayer, HemisphericLight, ImageProcessingConfiguration,
  Matrix, Scene, ShadowGenerator, Vector3,
} from '@babylonjs/core';
import { createBattle, getHero } from '../core/battle';
import type { Fighter } from '../core/types';
import { forwardOf, rightOf } from '../core/vec';
import { newGameState } from '../core/state';
import type { GameState } from '../core/types';
import { blocksHero, insideValley, valleyHeightAt, walkSurfaceAt, VALLEY_PLACES, VALLEY_SEED } from '../core/world/valley';
import { aimAngles, valleyCameraPose, type ValleyCameraRig } from '../core/world/valley_camera';
import { VALLEY_CLOCK, parseTod } from '../core/world/valley_time';
import { walkStep, type WalkRules } from '../core/world/walk';
import { TOUR_VIEWS, nextTourIndex, tourIndexOf, tourYaw } from '../core/world/tour';
import { TRAINING_FIELD } from '../data/arena';
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
import { installErrorCapture, logEvent } from './debug_log';
import { Hud } from './hud';
import { PlayerInput } from './input';
import { fillPrompt } from '../core/settings/labels';
import { currentSettings, saveSettings } from './settings_store';
import { showBrightnessAgain, showBrightnessPrompt, type BrightnessPicture } from './display_settings';
import { PICTURE_HOUR, PICTURE_VIEW } from './brightness_picture';
import { SCARECROW } from '../village/plan';
import { brightnessCurve } from '../core/settings/settings';
import { qualityProfile } from './quality';
import { lightingAt } from './lighting';
import { ValleySky } from './valley_sky';
import { ValleyTerrain } from './valley_terrain';
import { buildWick, type Wick } from '../village/build';
import { wickHouses } from '../village/plan';
import { TUNING as T } from '../config/tuning';
import { PauseMenu } from './menu';
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
  openPicture(): void;
  closePicture(): void;
  /** Capture only: the image exposure and the grey ambient lift now in use (brightness, task 009 step 2c). */
  exposure(): { exposure: number; ambient: number };
}
/** Meshes that make up the sky. A pick that passes through these is sky. */
const SKY_MESHES = new Set(['valley_sky', 'valley_stars', 'valley_sun', 'valley_moon']);
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
    const engine = new Engine(canvas, true, { stencil: true }, true);
    const scene = new Scene(engine);
    const assets = await loadAssets(scene, (done, total, label) => {
      hud.setBoot(label, total > 0 ? done / total : 0);
    });
    const game = newGameState(VALLEY_SEED);
    const rawTod = params.get('tod');
    if (rawTod !== null) game.timeOfDay = parseTod(rawTod);
    const valley = new Valley(engine, scene, uiRoot, assets, game);
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
  /** Render proxy for the hero's character model. The authoritative position lives in game.hero. */
  private readonly hero: Fighter;
  private readonly heroView: CharacterView;
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
  /** The brightness picture is open: the saved time, hero and camera to restore on close (task 009 step 2c). */
  private picture: PictureSave | null = null;
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

  constructor(
    private readonly engine: Engine,
    private readonly scene: Scene,
    uiRoot: HTMLElement,
    assets: LoadedAssets,
    private readonly game: GameState,
  ) {
    this.uiRoot = uiRoot;
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

    this.hero = getHero(createBattle(TRAINING_FIELD));
    this.placeHeroAtStart();
    this.heroView = new CharacterView(scene, assets, this.hero, this.shadow, 'hero');
    this.heroView.asDesigned(scene, PROPORTIONS); // overnight item 3
    this.groundY = walkSurfaceAt(this.hero.x, this.hero.z);

    this.camera = new FreeCamera('valley_cam', new Vector3(0, 10, 0), scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1800; // the castle beyond the rim, seen from the far corner
    scene.activeCamera = this.camera;

    this.pauseMenu = new PauseMenu(uiRoot, () => this.resume(), (b) => {
      saveSettings({ ...currentSettings(), bindings: b });
      this.input.setBindings(b); // the input is created just below; the callback only runs from the menu, after that
    }, (b) => this.applyBrightness(b), () => this.setBrightnessAgain());
    this.input = new PlayerInput(canvas, (locked) => this.setPaused(pausedAfter(locked ? 'lockGained' : 'lockLost')));
    this.input.camYaw = this.hero.yaw;

    this.hint = document.createElement('div');
    this.clockText = document.createElement('div');
    this.figuresText = document.createElement('div');
    this.tourText = document.createElement('div');
    this.installHud(uiRoot);
    canvas.addEventListener('pointerdown', () => {
      if (!this.input.isLocked) this.input.requestLock();
    });
    if (this.tour) {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'BracketRight') this.tourTo(nextTourIndex(this.tourIndex, 1));
        if (e.code === 'BracketLeft') this.tourTo(nextTourIndex(this.tourIndex, -1));
      });
      this.tourTo(0);
    }
    this.installHooks();
    showBrightnessPrompt(uiRoot, this.picturePort()); // once, until the player sets brightness (task 009 step 2c)
  }

  /** Wick, the village (docs/tasks/003-wick.md). Built once; its light follows the clock every frame. */
  async loadWick(): Promise<void> {
    this.wick = await buildWick(this.scene, { heightAt: valleyHeightAt, seed: VALLEY_SEED, shadow: this.shadow });
    buildGate(this.scene, { heightAt: valleyHeightAt, shadow: this.shadow });
    buildCrossings(this.scene, { shadow: this.shadow }); // the ford, the mill bridge, the stepping stones (review 025 item 2)
    await buildScenery(this.scene);
    this.landmarks = await buildLandmarks(this.scene, { heightAt: valleyHeightAt, shadow: this.shadow }); // the Mill, the Forge, the Watch-house, the castle and the rest
    this.glow = new GlowLayer('glow', this.scene);
    this.glow.intensity = 0.3;
  }

  start(): void {
    this.engine.runRenderLoop(() => this.tick());
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
    this.hero.yaw = Math.atan2(hesper.x - s.x, hesper.z - s.z);
    this.syncHeroProxy();
  }

  private syncHeroProxy(): void {
    this.hero.x = this.game.hero.position.x;
    this.hero.z = this.game.hero.position.z;
  }

  private tick(): void {
    this.frame += 1;
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    if (this.input.takePause() && !this.picture) this.onPauseKey(); // the picture is open: no pause menu over it
    const next = clockAfterFrame(this.game, dt, VALLEY_CLOCK, clockRuns(this.paused, this.frozen, this.input.isWindowFocused));
    this.game.day = next.day;
    this.game.timeOfDay = next.timeOfDay;
    if (this.paused) {
      // Presses made while paused are dropped, so a stale attack or dodge does not fire on resume.
      this.accumulator = 0;
      this.input.consumeEdges();
    } else {
      this.accumulator += dt;
    }
    while (this.accumulator >= T.fixedDt) {
      this.accumulator -= T.fixedDt;
      this.stepHero(T.fixedDt);
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

  /** One fixed step of walking. Movement only while the mouse is captured, so Esc pauses the hero. */
  private stepHero(dt: number): void {
    if (this.picture) {
      this.hero.vx = 0;
      this.hero.vz = 0;
      return; // the brightness picture holds the hero still
    }
    const intent = this.input.takeInput();
    const from = { ...this.game.hero.position };
    let dirX = 0;
    let dirZ = 0;
    if (this.input.isLocked && this.input.isWindowFocused) {
      const fwd = forwardOf(intent.camYaw);
      const right = rightOf(intent.camYaw);
      dirX = right.x * intent.moveX + fwd.x * intent.moveZ;
      dirZ = right.z * intent.moveX + fwd.z * intent.moveZ;
    }
    if (dirX === 0 && dirZ === 0) {
      this.hero.vx = 0;
      this.hero.vz = 0;
      this.groundY = walkSurfaceAt(from.x, from.z);
      return;
    }
    const speed = intent.sprint ? T.hero.sprintSpeed : T.hero.walkSpeed;
    const next = walkStep(from, dirX, dirZ, speed, dt, WALK_RULES);
    this.game.hero.position = { x: next.x, z: next.z };
    this.syncHeroProxy();
    this.groundY = next.y;
    this.hero.vx = (next.x - from.x) / dt;
    this.hero.vz = (next.z - from.z) / dt;
    this.hero.yaw = Math.atan2(dirX, dirZ);
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

    this.syncHeroProxy();
    this.terrain.update(this.hero);
    this.sky.update(L, this.hero.x, this.hero.z);
    this.waterSeconds += dt;
    if (this.scene.activeCamera) this.water?.update(L, this.waterSeconds, this.scene.activeCamera.globalPosition, FOG_START, FOG_END);
    this.wick?.light(L, this.game.timeOfDay);
    this.landmarks?.update(dt, L);
    if (this.glow) this.glow.intensity = 0.3 + 0.9 * L.nightness;
    this.heroView.update(this.hero, this.groundY);

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

  private picturePort(): BrightnessPicture {
    return {
      begin: () => this.beginPicture(),
      end: () => this.endPicture(),
      apply: (b) => this.applyBrightness(b),
    };
  }

  /** From Display: the menu steps aside while the picture is open, and comes back on the same page. */
  private setBrightnessAgain(): void {
    this.pauseMenu.suspend();
    showBrightnessAgain(this.uiRoot, this.picturePort(), () => this.pauseMenu.unsuspend());
  }

  /** The picture: Hesper's yard at midnight, the clock stopped, the hero hidden. Whatever the game's time is. */
  private beginPicture(): void {
    if (this.picture) return;
    this.picture = {
      hero: { ...this.game.hero.position },
      groundY: this.groundY,
      yaw: this.hero.yaw,
      camYaw: this.input.camYaw,
      aimPitch: this.input.aimPitch,
      timeOfDay: this.game.timeOfDay,
      frozen: this.frozen,
      tourIndex: this.tourIndex,
      tourText: this.tourText.textContent ?? '',
    };
    this.frozen = true;
    this.tourTo(PICTURE_VIEW);
    this.lookAt(SCARECROW.x, SCARECROW.z); // the picture is the figure: turn the camera onto it
    this.game.timeOfDay = PICTURE_HOUR;
    this.heroView.setShown(false);
  }

  /** Puts back the time, the hero, the camera and the tour label the picture found. */
  private endPicture(): void {
    const s = this.picture;
    if (!s) return;
    this.picture = null;
    this.game.hero.position = s.hero;
    this.syncHeroProxy();
    this.groundY = s.groundY;
    this.hero.yaw = s.yaw;
    this.input.camYaw = s.camYaw;
    this.input.aimPitch = s.aimPitch;
    this.game.timeOfDay = s.timeOfDay;
    this.frozen = s.frozen;
    this.tourIndex = s.tourIndex;
    this.tourText.textContent = s.tourText;
    this.heroView.setShown(true);
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
    this.game.hero.position = { x, z };
    this.hero.x = x;
    this.hero.z = z;
    this.groundY = walkSurfaceAt(x, z);
  }

  private lookAt(x: number, z: number): void {
    const hp = this.game.hero.position;
    const a = aimAngles({ x: x - hp.x, y: 0, z: z - hp.z });
    this.input.camYaw = a.yaw;
    this.input.aimPitch = 0;
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
      },
      // Capture only: opens the brightness picture (hero hidden, clock stopped) and closes it again.
      openPicture: () => this.beginPicture(),
      closePicture: () => this.endPicture(),
      exposure: () => ({ exposure: this.scene.imageProcessingConfiguration.exposure, ambient: this.scene.ambientColor.r }),
      project: (name) => {
        const m = this.scene.getMeshByName(name);
        if (!m) return null;
        const e = this.engine;
        const v = Vector3.Project(m.getAbsolutePosition(), Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight()));
        return { x: v.x, y: v.y, w: e.getRenderWidth(), h: e.getRenderHeight() };
      },
      state: () => this.snapshot(),
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
    };
  }
}

/** What the brightness picture found when it opened (see Valley.beginPicture). */
interface PictureSave {
  hero: { x: number; z: number };
  groundY: number;
  yaw: number;
  camYaw: number;
  aimPitch: number;
  timeOfDay: number;
  frozen: boolean;
  tourIndex: number;
  tourText: string;
}
