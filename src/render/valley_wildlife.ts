// The valley's wildlife, drawn (GAME_DESIGN.md section 4). The rules are pure and live in src/core/wildlife: this file
// feeds them the hero and the Mill's state, and draws what they say. Simple shapes only (queue item 14b).
// Crows circle the Mill while it is held; a songbird flock lifts when the hero sprints through it; the Mill's geese
// honk when he runs near their pen; the fox leads a quiet hero toward the Fairlow stones and is gone if he sprints.

import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { Vec2 } from '../core/types';
import type { Observation } from '../core/stealth';
import { advanceFox, type FoxState } from '../core/wildlife/fox';
import { startleFlock, type Flock } from '../core/wildlife/flocks';
import { geeseHonk } from '../core/wildlife/geese';
import { crowsCircling } from '../core/wildlife/crows';
import { FLOCKS, FOX_SECRET, FOX_START, GEESE_COUNT, GEESE_PEN, MILL_CENTRE } from '../data/wildlife';
import { walkSurfaceAt } from '../core/world/valley';

export interface WildlifeFrame {
  dt: number;
  hero: Vec2;
  movement: Observation['movement'];
  /** Whether the Mill is still held (the crows circle only while it is). */
  millHeld: boolean;
}

const CROW_COUNT = 4;
const CROW_ALTITUDE = 24;
const CROW_RADIUS = 9;
const FLOCK_BIRDS = 5;
/** A flock that has lifted is reset once the hero is this far away, so the birds come back for the next visit. */
const FLOCK_RESET_DISTANCE = 150;
const FLOCK_LIFT_HEIGHT = 14;
const FLOCK_LIFT_SECONDS = 3;
const FLOCK_FLY_SECONDS = 9;
const FLOCK_FLY_SPEED = 6;
const HONK_SECONDS = 2.5;

interface FlockView {
  state: Flock;
  centre: Vec2;
  birds: TransformNode[];
  offsets: Vec2[];
  /** Seconds since it lifted, or null while it sits on the grass. */
  lifted: number | null;
  /** The direction the flock flies in, away from the hero who startled it. */
  away: Vec2;
}

export class ValleyWildlife {
  private readonly root: TransformNode;
  private readonly crows: TransformNode[] = [];
  private readonly flocks: FlockView[] = [];
  private readonly geese: TransformNode[] = [];
  private geeseState = { position: { ...GEESE_PEN } };
  private honkLeft = 0;
  private fox: { state: FoxState; node: TransformNode };
  private time = 0;

  constructor(scene: Scene) {
    this.root = new TransformNode('wildlife', scene);
    const crowMat = mat(scene, '#1d1b1a');
    const birdMat = mat(scene, '#7a6650');
    const gooseMat = mat(scene, '#ece8de');
    const foxMat = mat(scene, '#c4612b');

    for (let i = 0; i < CROW_COUNT; i++) this.crows.push(this.made(crowShape(scene, crowMat)));

    for (const f of FLOCKS) {
      const offsets = Array.from({ length: FLOCK_BIRDS }, (_, i) => ({ x: (i % 3) * 1.6 - 1.6, z: Math.floor(i / 3) * 1.8 - 0.9 }));
      const birds = offsets.map(() => this.made(birdShape(scene, birdMat)));
      this.flocks.push({ state: { id: f.id, position: { ...f.position }, startled: false }, centre: f.position, birds, offsets, lifted: null, away: { x: 0, z: 0 } });
    }

    for (let i = 0; i < GEESE_COUNT; i++) this.geese.push(this.made(gooseShape(scene, gooseMat)));

    const foxNode = this.made(foxShape(scene, foxMat));
    this.fox = { state: { mode: 'idle', position: { ...FOX_START } }, node: foxNode };
    this.placeGeese(0);
  }

  update(f: WildlifeFrame): void {
    const dt = Math.max(0, f.dt);
    this.time += dt;
    const hero = { position: f.hero, movement: f.movement };
    this.updateCrows(f.millHeld);
    this.updateFlocks(dt, hero);
    this.updateGeese(dt, hero);
    this.updateFox(dt, hero);
  }

  private made<T extends TransformNode>(m: T): T {
    m.parent = this.root;
    return m;
  }

  private updateCrows(millHeld: boolean): void {
    const ground = walkSurfaceAt(MILL_CENTRE.x, MILL_CENTRE.z);
    this.crows.forEach((c, i) => {
      c.setEnabled(crowsCircling({ status: millHeld ? 'held' : 'freed' }));
      const a = this.time * 0.35 + (i * Math.PI) / 2;
      const x = MILL_CENTRE.x + CROW_RADIUS * Math.cos(a);
      const z = MILL_CENTRE.z + CROW_RADIUS * Math.sin(a);
      c.position.set(x, ground + CROW_ALTITUDE + Math.sin(this.time * 0.7 + i) * 1.5, z);
      // Flying anticlockwise round the Mill: the nose points along the tangent.
      c.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
    });
  }

  private updateFlocks(dt: number, hero: { position: Vec2; movement: Observation['movement'] }): void {
    for (const v of this.flocks) {
      const dist = Math.hypot(hero.position.x - v.centre.x, hero.position.z - v.centre.z);
      if (v.lifted !== null && dist > FLOCK_RESET_DISTANCE) {
        // The hero has gone far off: the flock settles back on the grass for his next visit.
        v.state = { id: v.state.id, position: { ...v.centre }, startled: false };
        v.lifted = null;
      }
      if (v.lifted === null) {
        const r = startleFlock(v.state, hero);
        v.state = r.flock;
        if (r.flock.startled) {
          v.lifted = 0;
          const dx = v.centre.x - hero.position.x, dz = v.centre.z - hero.position.z;
          const d = Math.hypot(dx, dz) || 1;
          v.away = { x: dx / d, z: dz / d };
        }
      } else {
        v.lifted += dt;
      }
      v.birds.forEach((b, i) => {
        const o = v.offsets[i];
        if (v.lifted === null) {
          b.setEnabled(true);
          b.position.set(v.centre.x + o.x, walkSurfaceAt(v.centre.x, v.centre.z) + 0.25, v.centre.z + o.z);
          b.rotation.y = 0;
          return;
        }
        const t = v.lifted;
        b.setEnabled(t < FLOCK_FLY_SECONDS);
        const rise = Math.min(t / FLOCK_LIFT_SECONDS, 1) * FLOCK_LIFT_HEIGHT;
        const drift = Math.max(0, t - 0.5) * FLOCK_FLY_SPEED;
        const x = v.centre.x + o.x + v.away.x * drift;
        const z = v.centre.z + o.z + v.away.z * drift;
        b.position.set(x, walkSurfaceAt(v.centre.x, v.centre.z) + 0.25 + rise + Math.sin(this.time * 14 + i) * 0.3, z);
        b.rotation.y = Math.atan2(v.away.x, v.away.z);
      });
    }
  }

  private updateGeese(dt: number, hero: { position: Vec2; movement: Observation['movement'] }): void {
    if (geeseHonk(this.geeseState, hero)) this.honkLeft = HONK_SECONDS;
    this.honkLeft = Math.max(0, this.honkLeft - dt);
    this.placeGeese(this.honkLeft > 0 ? 1 : 0);
  }

  private placeGeese(honk: number): void {
    this.geese.forEach((g, i) => {
      const a = (i / GEESE_COUNT) * Math.PI * 2 + 0.6;
      const x = GEESE_PEN.x + Math.cos(a) * 2;
      const z = GEESE_PEN.z + Math.sin(a) * 1.8;
      g.position.set(x, walkSurfaceAt(GEESE_PEN.x, GEESE_PEN.z) + 0.1, z);
      g.rotation.y = a + Math.PI / 2;
      // Honking: the neck goes up and the whole bird bobs.
      g.scaling.y = 1 + honk * 0.15 + Math.sin(this.time * 18 + i) * 0.03 * honk;
    });
  }

  private updateFox(dt: number, hero: { position: Vec2; movement: Observation['movement'] }): void {
    const before = this.fox.state.position;
    this.fox.state = advanceFox(this.fox.state, { hero, secret: FOX_SECRET }, dt);
    const p = this.fox.state.position;
    const moved = Math.hypot(p.x - before.x, p.z - before.z);
    if (moved > 1e-6) this.fox.node.rotation.y = Math.atan2(p.x - before.x, p.z - before.z);
    // 'gone' is final for this visit: the fox has run off, so it is no longer drawn.
    this.fox.node.setEnabled(this.fox.state.mode !== 'gone');
    this.fox.node.position.set(p.x, walkSurfaceAt(p.x, p.z), p.z);
  }
}

function mat(scene: Scene, hex: string): StandardMaterial {
  const m = new StandardMaterial(`wildlife_${hex}`, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0, 0, 0);
  return m;
}

/** A crow: a dark body with two flat wings, nose along +z. One merged mesh, so one draw call. */
function crowShape(scene: Scene, m: StandardMaterial): Mesh {
  const body = MeshBuilder.CreateBox('crow_body', { width: 0.12, height: 0.12, depth: 0.5 }, scene);
  const wings = MeshBuilder.CreateBox('crow_wings', { width: 1.2, height: 0.03, depth: 0.22 }, scene);
  wings.position.z = 0.05;
  const merged = Mesh.MergeMeshes([body, wings], true, true)!;
  merged.material = m;
  merged.scaling.setAll(1.6);
  merged.name = 'crow';
  return merged;
}

/** A songbird: a small flattened ellipsoid. */
function birdShape(scene: Scene, m: StandardMaterial): Mesh {
  const b = MeshBuilder.CreateSphere('bird', { diameterX: 0.35, diameterY: 0.22, diameterZ: 0.55, segments: 6 }, scene);
  b.material = m;
  b.name = 'bird';
  return b;
}

/** A goose: a white body, a raised neck and a beak. One merged mesh, so one draw call. */
function gooseShape(scene: Scene, m: StandardMaterial): Mesh {
  const b = MeshBuilder.CreateSphere('goose_body', { diameterX: 0.6, diameterY: 0.5, diameterZ: 0.9, segments: 6 }, scene);
  const n = MeshBuilder.CreateCylinder('goose_neck', { diameter: 0.14, height: 0.6, tessellation: 5 }, scene);
  n.position.set(0, 0.45, 0.35);
  n.rotation.x = -0.5;
  const k = MeshBuilder.CreateBox('goose_beak', { width: 0.12, height: 0.08, depth: 0.22 }, scene);
  k.position.set(0, 0.75, 0.55);
  const merged = Mesh.MergeMeshes([b, n, k], true, true)!;
  merged.material = m;
  merged.name = 'goose';
  return merged;
}

/** The fox: an orange body, a head, and a white-tipped tail. Simple shapes (queue item 14b). */
function foxShape(scene: Scene, m: StandardMaterial): Mesh {
  const b = MeshBuilder.CreateBox('fox_body', { width: 0.4, height: 0.4, depth: 0.9 }, scene);
  b.position.y = 0.5;
  const h = MeshBuilder.CreateBox('fox_head', { width: 0.28, height: 0.28, depth: 0.3 }, scene);
  h.position.set(0, 0.7, 0.55);
  const t = MeshBuilder.CreateBox('fox_tail', { width: 0.18, height: 0.18, depth: 0.6 }, scene);
  t.position.set(0, 0.5, -0.7);
  const merged = Mesh.MergeMeshes([b, h, t], true, true)!;
  merged.material = m;
  merged.name = 'fox';
  return merged;
}
