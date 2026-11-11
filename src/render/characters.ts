// One character on screen. Reads a simulation fighter each frame and draws it; owns no game state.

import {
  AbstractMesh, Color3, Material, Mesh, MeshBuilder, PBRMaterial, Scene, ShadowGenerator,
  StandardMaterial, TransformNode,
} from '@babylonjs/core';
import { TUNING } from '../config/tuning';
import type { Fighter, WeaponId } from '../core/types';
import { forwardOf, rightOf } from '../core/vec';
import { UNITS, WEAPON_MODELS, type UnitDef } from '../data/units';
import { bindClips, nodeMap, type LoadedAssets } from './assets';
import { ClipPlayer, hold, loop, once, scrub, type Pose } from './clips';

/** Rotation that turns the model's authored forward into the sim's yaw 0 (+z). Checked on screen. */
const MODEL_YAW_OFFSET = 0;
const MOVING_EPS = 0.05;

// ---------- pose selection (pure: fighter state in, clip choice out) ----------

export function poseFor(f: Fighter, unit: UnitDef): Pose {
  const c = unit.clips;
  if (!f.alive) return hold(c.death);
  if (f.hitTimer > 0) return once(c.hit);
  return f.kind === 'hero' ? heroPose(f, unit) : npcPose(f, unit);
}

function npcPose(f: Fighter, unit: UnitDef): Pose {
  const c = unit.clips;
  const a = f.action;
  if (f.kind === 'soldier') {
    if (a.phase === 'windup' && c.windup) return scrub(c.windup, a.t / TUNING.soldier.windupTime);
    if (a.phase === 'swing') return scrub(c.attack, a.t / TUNING.soldier.swingTime);
  } else {
    if (a.phase === 'draw' && c.draw) return scrub(c.draw, a.t / TUNING.archer.drawTime);
    if (a.phase === 'release' && c.release) return scrub(c.release, a.t / TUNING.archer.releaseTime);
  }
  const speed = Math.hypot(f.vx, f.vz);
  if (speed > MOVING_EPS) {
    const nominal = f.kind === 'archer' ? TUNING.archer.moveSpeed : TUNING.soldier.moveSpeed;
    return loop(c.run, clamp(speed / nominal, 0.5, 1.6));
  }
  return loop(c.idle);
}

function heroPose(f: Fighter, unit: UnitDef): Pose {
  const c = unit.clips;
  const H = TUNING.hero;
  if (f.dodgeTime > 0 && c.dodge) {
    return scrub(dodgeClip(f, c.dodge), (H.dodgeTime - f.dodgeTime) / H.dodgeTime);
  }
  const a = f.action;
  if (a.phase === 'swing' && c.attack) return scrub(c.attack, a.t / TUNING.sword.duration);
  if (a.phase === 'draw' && c.draw) return scrub(c.draw, f.drawTime / TUNING.bow.fullDrawTime);
  if (a.phase === 'release' && c.release) return scrub(c.release, a.t / TUNING.bow.releaseTime);
  const speed = Math.hypot(f.vx, f.vz);
  if (speed > MOVING_EPS) {
    const midpoint = (H.walkSpeed + H.sprintSpeed) / 2;
    if (c.walk && speed < midpoint) return loop(c.walk, clamp(speed / H.walkSpeed, 0.5, 1.6));
    return loop(c.run, clamp(speed / H.sprintSpeed, 0.5, 1.6));
  }
  if (f.weapon === 'bow' && c.aim) return loop(c.aim);
  return loop(c.idle);
}

/** Picks the dodge clip by direction relative to the hero's facing. */
function dodgeClip(f: Fighter, d: NonNullable<UnitDef['clips']['dodge']>): string {
  const fwd = forwardOf(f.yaw);
  const side = rightOf(f.yaw);
  const along = f.dodgeX * fwd.x + f.dodgeZ * fwd.z;
  const across = f.dodgeX * side.x + f.dodgeZ * side.z;
  if (Math.abs(along) >= Math.abs(across)) return along >= 0 ? d.forward : d.backward;
  return across >= 0 ? d.right : d.left;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ---------- the view ----------

function clipNamesOf(unit: UnitDef): string[] {
  const names: string[] = [];
  for (const v of Object.values(unit.clips)) {
    if (typeof v === 'string') names.push(v);
    else if (v) names.push(...Object.values(v));
  }
  return [...new Set(names)];
}

function tintMaterial(m: Material, rgb: [number, number, number]): void {
  const c = new Color3(rgb[0], rgb[1], rgb[2]);
  if (m instanceof PBRMaterial) m.albedoColor = c;
  else if (m instanceof StandardMaterial) m.diffuseColor = c;
}

function setEmissive(m: Material, c: Color3): void {
  if (m instanceof PBRMaterial || m instanceof StandardMaterial) m.emissiveColor = c;
}

export class CharacterView {
  readonly fighterId: number;
  private readonly root: TransformNode;
  private readonly unit: UnitDef;
  private readonly player: ClipPlayer;
  private readonly materials: Material[] = [];
  private readonly casters: AbstractMesh[] = [];
  private readonly weapons = new Map<WeaponId, TransformNode>();
  private disc: Mesh | null = null;
  private discMaterial: StandardMaterial | null = null;

  constructor(
    scene: Scene,
    assets: LoadedAssets,
    fighter: Fighter,
    private readonly shadow: ShadowGenerator,
    tag: string,
  ) {
    this.fighterId = fighter.id;
    this.unit = UNITS[fighter.unitId];
    const container = assets.characters.get(this.unit.model);
    if (!container) throw new Error(`Model not loaded: ${this.unit.model}`);

    // Bone names must stay as authored: clips and the weapon mount look bones up by name.
    const entries = container.instantiateModelsToScene((n) => n, true);
    this.root = new TransformNode(`${tag}_root`, scene);
    for (const n of entries.rootNodes) n.parent = this.root;

    const boneNodes = nodeMap(entries.rootNodes);
    const clips = bindClips(entries.rootNodes, assets.clips, clipNamesOf(this.unit), tag);
    this.player = new ClipPlayer(clips);

    for (const m of this.root.getChildMeshes(false)) {
      if (m.material && !this.materials.includes(m.material)) {
        this.materials.push(m.material);
        tintMaterial(m.material, this.unit.tint);
      }
      this.casters.push(m);
    }

    for (const w of this.unit.weapons) {
      const wc = w === 'sword' ? assets.sword : assets.bow;
      const we = wc.instantiateModelsToScene((n) => `${tag}_${w}_${n}`, true);
      const holder = new TransformNode(`${tag}_${w}`, scene);
      for (const n of we.rootNodes) n.parent = holder;
      const bone = boneNodes.get(WEAPON_MODELS[w].bone);
      if (!bone) throw new Error(`Bone ${WEAPON_MODELS[w].bone} missing on ${this.unit.model}`);
      holder.parent = bone;
      this.weapons.set(w, holder);
      this.casters.push(...holder.getChildMeshes(false));
    }

    for (const m of this.casters) this.shadow.addShadowCaster(m);

    if (fighter.kind === 'soldier') {
      const mat = new StandardMaterial(`${tag}_telegraph_mat`, scene);
      mat.disableLighting = true;
      mat.emissiveColor = new Color3(1, 0.25, 0.12);
      mat.diffuseColor = Color3.Black();
      mat.specularColor = Color3.Black();
      mat.alpha = 0.3;
      mat.backFaceCulling = false;
      this.discMaterial = mat;
      const disc = MeshBuilder.CreateDisc(`${tag}_telegraph`, { radius: TUNING.soldier.strikeRadius, tessellation: 40 }, scene);
      disc.rotation.x = Math.PI / 2;
      disc.material = mat;
      disc.isPickable = false;
      disc.setEnabled(false);
      this.disc = disc;
    }
  }

  update(f: Fighter): void {
    this.root.position.set(f.x, 0, f.z);
    this.root.rotation.y = f.yaw + MODEL_YAW_OFFSET;

    const flash = TUNING.combat.hitFlashTime > 0 ? f.flashTimer / TUNING.combat.hitFlashTime : 0;
    const glow = new Color3(0.95, 0.12, 0.06).scale(clamp(flash, 0, 1) * 0.8);
    for (const m of this.materials) setEmissive(m, glow);

    this.player.apply(poseFor(f, this.unit));

    for (const [w, node] of this.weapons) {
      node.setEnabled(f.kind === 'hero' ? f.weapon === w : true);
    }

    if (this.disc && this.discMaterial) {
      const windingUp = f.alive && f.action.phase === 'windup';
      this.disc.setEnabled(windingUp);
      if (windingUp) {
        const p = clamp(f.action.t / TUNING.soldier.windupTime, 0, 1);
        this.disc.position.set(f.action.zoneX, 0.03, f.action.zoneZ);
        this.disc.scaling.setAll(0.4 + 0.6 * p);
        this.discMaterial.alpha = 0.25 + 0.5 * p;
      }
    }
  }

  dispose(): void {
    for (const m of this.casters) this.shadow.removeShadowCaster(m);
    this.player.dispose();
    this.discMaterial?.dispose();
    this.disc?.dispose();
    this.root.dispose(false, true);
  }
}
