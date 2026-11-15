// Showcase mode (?showcase=<clip>&t=<0..1>): one character on a fixed camera, posed by normalized time.
// No simulation runs and no wall clock plays. window.__showcaseSeek(t) draws exactly one frame, so
// contact sheets are repeatable. Used for the PR visual checks and for Greg's review.

import { Engine, FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { createBattle, makeFighter } from '../core/battle';
import type { ArenaDef } from '../core/types';
import { UNITS } from '../data/units';
import { loadAssets } from './assets';
import { CharacterView } from './characters';
import { SHOWCASE_CLIPS, resolveShowcaseClip } from './showcase_clips';
import { buildShowcaseStage } from './showcase_stage';

/** The showcase's own stage data: one hero, one soldier, one archer, all present from the start. Not a game arena. */
const SHOWCASE_STAGE: ArenaDef = {
  id: 'showcase',
  name: 'Showcase',
  halfWidth: 6,
  halfDepth: 6,
  waveGap: 0,
  obstacles: [],
  spawns: [
    { unitId: 'hero', kind: 'hero', team: 'player', x: 0, z: 0, yaw: 0 },
    { unitId: 'enemy_soldier', kind: 'soldier', team: 'enemy', x: -3, z: -3, yaw: 0 },
    { unitId: 'enemy_archer', kind: 'archer', team: 'enemy', x: 3, z: -3, yaw: 0 },
  ],
};

/** Hooks the screenshot script calls. Set once the character is ready. */
export interface ShowcaseWindow {
  __showcaseReady?: boolean;
  __showcaseSeek?: (t: number) => void;
}

export async function startShowcase(canvas: HTMLCanvasElement, clipName: string, t0: number): Promise<void> {
  const spec = SHOWCASE_CLIPS[resolveShowcaseClip(clipName)];
  const unit = UNITS[spec.unitId];

  const engine = new Engine(canvas, true, { stencil: true }, true);
  const scene = new Scene(engine);
  const { shadow } = buildShowcaseStage(scene);
  const assets = await loadAssets(scene, () => undefined);

  // The fighter comes from the showcase stage setup, then is moved to the origin facing +z (sim yaw 0).
  const state = createBattle(SHOWCASE_STAGE);
  const spawn = SHOWCASE_STAGE.spawns.find((s) => s.unitId === spec.unitId);
  if (!spawn) throw new Error(`Showcase: no ${spec.unitId} on the showcase stage`);
  const fighter = state.fighters.find((f) => f.unitId === spec.unitId) ?? makeFighter(state, spawn);
  if (!state.fighters.includes(fighter)) state.fighters.push(fighter);
  fighter.x = 0;
  fighter.z = 0;
  fighter.yaw = 0;
  fighter.vx = 0;
  fighter.vz = 0;
  fighter.weapon = spec.weapon;

  // Fixed camera in front of the character, so the face and the weapon hand are visible.
  // Side clips look at the hero from +x, so motion along the facing axis (+z) reads across the frame.
  const eye = spec.camera === 'side' ? new Vector3(3.6, 1.5, 0.4) : new Vector3(1.1, 1.5, 3.6);
  const camera = new FreeCamera('showcase_cam', eye, scene);
  camera.setTarget(new Vector3(0, 1.0, 0));
  camera.minZ = 0.1;
  camera.fov = 0.6;
  scene.activeCamera = camera;

  const view = new CharacterView(scene, assets, fighter, shadow, 'showcase');

  const seek = (t: number): void => {
    const clamped = Math.min(1, Math.max(0, t));
    view.setPoseOverride(spec.pose(unit.clips, clamped));
    view.update(fighter);
    scene.render();
  };

  window.addEventListener('resize', () => engine.resize());
  const w = window as unknown as ShowcaseWindow;
  w.__showcaseSeek = seek;
  seek(t0);
  w.__showcaseReady = true;
}
