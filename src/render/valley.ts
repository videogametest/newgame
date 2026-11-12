// The valley: open-world slice, step 1. Terrain, sky, water, one hero walking under the day-night clock.
// The walking rules and camera geometry are pure (src/core/world); this file only draws them.

import {
  Color3, Color4, DirectionalLight, Engine, FreeCamera, HemisphericLight, ImageProcessingConfiguration,
  MeshBuilder, Scene, ShadowGenerator, StandardMaterial, Vector3,
} from '@babylonjs/core';
import { createBattle, getHero } from '../core/battle';
import type { Fighter } from '../core/types';
import { forwardOf, rightOf } from '../core/vec';
import { newGameState } from '../core/state';
import type { GameState } from '../core/types';
import { advanceClock } from '../core/world/clock';
import { isWater, insideValley, valleyHeightAt, VALLEY_PLACES, VALLEY_SEED, WATER_LEVEL, VALLEY_HALF_EXTENT } from '../core/world/valley';
import { aimAngles, valleyCameraPose, type ValleyCameraRig } from '../core/world/valley_camera';
import { VALLEY_CLOCK, parseTod } from '../core/world/valley_time';
import { walkStep, type WalkRules } from '../core/world/walk';
import { TRAINING_FIELD } from '../data/arena';
import { loadAssets, type LoadedAssets } from './assets';
import { CharacterView } from './characters';
import { installErrorCapture, logEvent } from './debug_log';
import { Hud } from './hud';
import { PlayerInput } from './input';
import { lightingAt, PALETTE } from './lighting';
import { ValleySky } from './valley_sky';
import { ValleyTerrain } from './valley_terrain';
import { TUNING as T } from '../config/tuning';

const CAMERA_RIG: ValleyCameraRig = {
  distance: T.camera.distance,
  shoulder: T.camera.shoulder,
  lookHeight: T.camera.lookHeight,
  clearance: 0.6,
};
const WALK_RULES: WalkRules = {
  heightAt: valleyHeightAt,
  blocked: isWater,
  inside: insideValley,
};
const FOG_START = 160;
const FOG_END = 360;
const SUN_RANGE = 90;

/** Test and capture hooks, read by the screenshot scripts. Not part of play. */
export interface ValleyHooks {
  setTod(hours: number): void;
  freeze(on: boolean): void;
  aimAt(body: 'sun' | 'moon'): void;
  state(): ValleyState;
}
export interface ValleyState {
  x: number;
  z: number;
  groundY: number;
  yaw: number;
  tod: number;
  day: number;
  locked: boolean;
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
  private readonly terrain: ValleyTerrain;
  private readonly sky: ValleySky;
  /** Render proxy for the hero's character model. The authoritative position lives in game.hero. */
  private readonly hero: Fighter;
  private readonly heroView: CharacterView;
  private readonly hint: HTMLElement;
  private readonly clockText: HTMLElement;
  private groundY: number;
  private accumulator = 0;
  private frozen = false;
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
    this.shadow = new ShadowGenerator(2048, this.sun);
    this.shadow.usePercentageCloserFiltering = true;
    this.shadow.darkness = 0.35;

    this.terrain = new ValleyTerrain(scene);
    this.sky = new ValleySky(scene);
    this.buildWater(scene);

    this.hero = getHero(createBattle(TRAINING_FIELD));
    this.placeHeroAtStart();
    this.heroView = new CharacterView(scene, assets, this.hero, this.shadow, 'hero');
    this.groundY = valleyHeightAt(this.hero.x, this.hero.z);

    this.camera = new FreeCamera('valley_cam', new Vector3(0, 10, 0), scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1200;
    scene.activeCamera = this.camera;

    this.input = new PlayerInput(canvas, () => undefined);
    this.input.camYaw = this.hero.yaw;

    this.hint = document.createElement('div');
    this.clockText = document.createElement('div');
    this.installHud(uiRoot);
    canvas.addEventListener('pointerdown', () => {
      if (!this.input.isLocked) this.input.requestLock();
    });
    this.installHooks();
  }

  start(): void {
    this.engine.runRenderLoop(() => this.tick());
  }

  private buildWater(scene: Scene): void {
    const size = VALLEY_HALF_EXTENT * 2 + 400;
    const water = MeshBuilder.CreateGround('valley_water', { width: size, height: size, subdivisions: 1 }, scene);
    water.position.y = WATER_LEVEL;
    const mat = new StandardMaterial('valley_water_mat', scene);
    mat.diffuseColor = PALETTE.water;
    mat.specularColor = new Color3(0.5, 0.5, 0.5);
    mat.alpha = 0.85;
    water.material = mat;
    water.receiveShadows = true;
    water.isPickable = false;
  }

  /** The hero starts at the valley's edge, facing Wick. The start is set here, not in newGameState. */
  private placeHeroAtStart(): void {
    const s = VALLEY_PLACES.start;
    const w = VALLEY_PLACES.wick;
    this.game.hero.position = { x: s.x, z: s.z };
    this.hero.yaw = Math.atan2(w.x - s.x, w.z - s.z);
    this.syncHeroProxy();
  }

  private syncHeroProxy(): void {
    this.hero.x = this.game.hero.position.x;
    this.hero.z = this.game.hero.position.z;
  }

  private tick(): void {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    if (!this.frozen && this.input.isWindowFocused) {
      const next = advanceClock(this.game, dt, VALLEY_CLOCK);
      this.game.day = next.day;
      this.game.timeOfDay = next.timeOfDay;
    }
    this.accumulator += dt;
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

  /** One fixed step of walking. Movement only while the mouse is captured, so Esc pauses the hero. */
  private stepHero(dt: number): void {
    const sprint = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
    const intent = this.input.takeInput(sprint);
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
      this.groundY = valleyHeightAt(from.x, from.z);
      return;
    }
    const speed = sprint ? T.hero.sprintSpeed : T.hero.walkSpeed;
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
    box.append(this.clockText, this.hint);
    uiRoot.appendChild(box);
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
    this.hint.textContent = this.input.isLocked
      ? 'WASD walk · Shift sprint · Esc releases the mouse'
      : 'Click the view to look around, then WASD to walk';
  }

  private installHooks(): void {
    window.__valley = {
      setTod: (hours) => {
        this.game.timeOfDay = parseTod(String(hours));
      },
      freeze: (on) => {
        this.frozen = on;
      },
      // Capture only: turns the camera to the sun or the moon at the current time. It skips the pitch limit
      // on purpose, because the noon sun sits above the player's look range.
      aimAt: (body) => {
        const L = lightingAt(this.game.timeOfDay);
        const a = aimAngles(body === 'sun' ? L.sunSky : L.moonSky);
        this.input.camYaw = a.yaw;
        this.input.aimPitch = a.pitch;
      },
      state: () => this.snapshot(),
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
      chunks: this.terrain.chunkCount,
      chunkBuilds: this.terrain.buildCount,
      fps: this.fps,
      drawCalls: this.lastFrameDrawCalls,
      activeMeshes: this.scene.getActiveMeshes().length,
    };
  }
}
