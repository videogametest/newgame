// The valley: open-world slice, step 1. Terrain, sky, water, one hero walking under the day-night clock.
// The walking rules and camera geometry are pure (src/core/world); this file only draws them.

import {
  Color3, Color4, DirectionalLight, DynamicTexture, Engine, FreeCamera, FresnelParameters, GlowLayer, HemisphericLight,
  ImageProcessingConfiguration, Matrix, MeshBuilder, Scene, ShadowGenerator, StandardMaterial, Vector3,
} from '@babylonjs/core';
import { createBattle, getHero } from '../core/battle';
import type { Fighter } from '../core/types';
import { forwardOf, rightOf } from '../core/vec';
import { newGameState } from '../core/state';
import type { GameState } from '../core/types';
import { advanceClock } from '../core/world/clock';
import { blocksHero, insideValley, valleyHeightAt, walkSurfaceAt, VALLEY_PLACES, VALLEY_SEED, WATER_LEVEL, VALLEY_HALF_EXTENT } from '../core/world/valley';
import { aimAngles, valleyCameraPose, type ValleyCameraRig } from '../core/world/valley_camera';
import { VALLEY_CLOCK, parseTod } from '../core/world/valley_time';
import { walkStep, type WalkRules } from '../core/world/walk';
import { TRAINING_FIELD } from '../data/arena';
import { loadAssets, type LoadedAssets } from './assets';
import { CharacterView } from './characters';
import { buildFarLand } from './valley_far';
import { installErrorCapture, logEvent } from './debug_log';
import { Hud } from './hud';
import { PlayerInput } from './input';
import { lightingAt, mix, PALETTE, type Lighting } from './lighting';
import { ValleySky } from './valley_sky';
import { ValleyTerrain } from './valley_terrain';
import { buildWick, type Wick } from '../village/build';
import { wickHouses } from '../village/plan';
import { TUNING as T } from '../config/tuning';

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
/** How much of the sky colour the lake emits. The lake is a mirror of the sky, not a dark pool (review 018). */
const WATER_SKY_SHARE = 0.9;

/**
 * A tileable height map for the lake's ripples: a few integer-frequency waves, so the texture repeats seamlessly.
 * Fixed phases, so every visit looks the same.
 */
function makeRippleTexture(scene: Scene): DynamicTexture {
  const size = 256;
  const tex = new DynamicTexture('valley_ripples', { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  const img = ctx.getImageData(0, 0, size, size);
  const waves: ReadonlyArray<readonly [number, number, number, number]> = [
    [1, 0, 0.9, 0.3], [0, 2, 0.6, 1.1], [3, 1, 0.4, 2.0], [2, 3, 0.35, 0.7], [5, 2, 0.2, 2.6], [4, 5, 0.18, 0.2],
  ];
  const norm = waves.reduce((sum, w) => sum + w[2], 0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      for (const [fx, fy, a, phase] of waves) {
        h += a * Math.cos((2 * Math.PI * (fx * x + fy * y)) / size + phase);
      }
      const v = Math.round(128 + (127 * h) / norm);
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.update();
  return tex;
}

/** Test and capture hooks, read by the screenshot scripts. Not part of play. */
export interface ValleyHooks {
  setTod(hours: number): void;
  freeze(on: boolean): void;
  aimAt(body: 'sun' | 'moon'): void;
  placeAt(x: number, z: number): void;
  lookAt(x: number, z: number): void;
  project(name: string): { x: number; y: number; w: number; h: number } | null;
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
  private readonly terrain: ValleyTerrain;
  private readonly sky: ValleySky;
  /** Render proxy for the hero's character model. The authoritative position lives in game.hero. */
  private readonly hero: Fighter;
  private readonly heroView: CharacterView;
  private readonly hint: HTMLElement;
  private readonly clockText: HTMLElement;
  private readonly figuresText: HTMLElement;
  /** ?debug=1 shows the clock, frame figures and control hint. The default route shows only the world. */
  private readonly debug = new URLSearchParams(window.location.search).get('debug') === '1';
  private groundY: number;
  private wick?: Wick;
  private glow?: GlowLayer;
  private accumulator = 0;
  private frozen = false;
  private fps = 0;
  private lastFrameDrawCalls = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  /** The lake's material and ripple texture; updateWater takes the light and drifts the ripples. */
  private waterMat?: StandardMaterial;
  private waterRipples?: DynamicTexture;
  private waterClock = 0;

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
    buildFarLand(scene); // the whole valley, coarse, so nothing past the stream radius is a hole (review 023)
    this.sky = new ValleySky(scene);
    this.buildWater(scene);

    this.hero = getHero(createBattle(TRAINING_FIELD));
    this.placeHeroAtStart();
    this.heroView = new CharacterView(scene, assets, this.hero, this.shadow, 'hero');
    this.groundY = walkSurfaceAt(this.hero.x, this.hero.z);

    this.camera = new FreeCamera('valley_cam', new Vector3(0, 10, 0), scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1200;
    scene.activeCamera = this.camera;

    this.input = new PlayerInput(canvas, () => undefined);
    this.input.camYaw = this.hero.yaw;

    this.hint = document.createElement('div');
    this.clockText = document.createElement('div');
    this.figuresText = document.createElement('div');
    this.installHud(uiRoot);
    canvas.addEventListener('pointerdown', () => {
      if (!this.input.isLocked) this.input.requestLock();
    });
    this.installHooks();
  }

  /** Wick, the village (docs/tasks/003-wick.md). Built once; its light follows the clock every frame. */
  async loadWick(): Promise<void> {
    this.wick = await buildWick(this.scene, { heightAt: valleyHeightAt, seed: VALLEY_SEED, shadow: this.shadow });
    this.glow = new GlowLayer('glow', this.scene);
    this.glow.intensity = 0.3;
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
    mat.specularColor = new Color3(0.9, 0.9, 0.9);
    mat.specularPower = 96;
    mat.alpha = 0.85;
    // Fresnel: the far shore, seen at a grazing angle, takes the lighter sky colour (updateWater sets the colours).
    const fresnel = new FresnelParameters();
    fresnel.bias = 0.2;
    fresnel.power = 2;
    fresnel.isEnabled = true;
    mat.emissiveFresnelParameters = fresnel;
    // Slow ripples: a height map that drifts across the lake each frame (updateWater).
    const ripples = makeRippleTexture(scene);
    ripples.uScale = 8;
    ripples.vScale = 8;
    ripples.level = 0.6;
    mat.bumpTexture = ripples;
    water.material = mat;
    water.receiveShadows = true;
    water.isPickable = false;
    this.waterMat = mat;
    this.waterRipples = ripples;
  }

  /** The lake takes the light of the sky above it, and its ripples drift slowly. Pure drawing; no game state. */
  private updateWater(L: Lighting, dt: number): void {
    const mat = this.waterMat;
    const ripples = this.waterRipples;
    if (!mat || !ripples) return;
    this.waterClock += dt;
    if (mat.emissiveFresnelParameters) {
      mat.emissiveFresnelParameters.leftColor = L.sky;
      mat.emissiveFresnelParameters.rightColor = L.zenith;
    }
    mat.emissiveColor = mix(L.zenith, L.sky, 0.5).scale(WATER_SKY_SHARE);
    ripples.uOffset = this.waterClock * 0.012;
    ripples.vOffset = this.waterClock * 0.007;
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
      this.groundY = walkSurfaceAt(from.x, from.z);
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
    this.updateWater(L, dt);
    this.wick?.light(L, this.game.timeOfDay);
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
    box.append(this.clockText, this.figuresText, this.hint);
    box.hidden = !this.debug;
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
    this.figuresText.textContent = `${this.fps} fps · ${this.lastFrameDrawCalls} draw calls`;
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
      // Capture only: stands the hero at a point on the ground, and turns the camera to face a point.
      placeAt: (x, z) => {
        this.game.hero.position = { x, z };
        this.hero.x = x;
        this.hero.z = z;
        this.groundY = walkSurfaceAt(x, z);
      },
      lookAt: (x, z) => {
        const hp = this.game.hero.position;
        const a = aimAngles({ x: x - hp.x, y: 0, z: z - hp.z });
        this.input.camYaw = a.yaw;
        this.input.aimPitch = 0;
      },
      project: (name) => {
        const m = this.scene.getMeshByName(name);
        if (!m) return null;
        const e = this.engine;
        const v = Vector3.Project(m.getAbsolutePosition(), Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight()));
        return { x: v.x, y: v.y, w: e.getRenderWidth(), h: e.getRenderHeight() };
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
