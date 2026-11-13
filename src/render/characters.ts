// One character on screen. Reads a simulation fighter each frame and draws it; owns no game state.

import {
  AbstractMesh, Color3, Material, Mesh, MeshBuilder, Nullable, Node, PBRMaterial, Scene, ShadowGenerator,
  StandardMaterial, TransformNode,
} from '@babylonjs/core';
import { TUNING } from '../config/tuning';
import type { Fighter, WeaponId } from '../core/types';
import { forwardOf, rightOf } from '../core/vec';
import { UNITS, WEAPON_MODELS, type UnitDef } from '../data/units';
import { bindClips, nodeMap, type LoadedAssets } from './assets';
import { ClipPlayer, hold, loop, once, scrub, type Pose } from './clips';
import { type Proportions } from './proportions';

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
    if (a.phase === 'windup' && c.windup) return scrub(c.windup, a.t / TUNING.soldier.windupTime, c.windupRange);
    if (a.phase === 'swing') return scrub(c.attack, a.t / TUNING.soldier.swingTime, c.attackRange);
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

/** Every clip name a unit needs loaded. Skips the [start, end] ranges, which are not clip names. */
export function clipNamesOf(unit: UnitDef): string[] {
  const names: string[] = [];
  for (const v of Object.values(unit.clips)) {
    if (typeof v === 'string') names.push(v);
    else if (Array.isArray(v)) continue;
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
  /** Body materials that flash red on a hit. */
  private readonly materials: Material[] = [];
  /** Every material on the character, weapons included, for the occlusion fade. */
  private readonly fadeMaterials: Material[] = [];
  private readonly casters: AbstractMesh[] = [];
  /** Each fade material's transparency mode as the asset shipped it (glTF sets it to opaque). */
  private readonly savedModes = new Map<Material, Nullable<number>>();
  private opacity = 1;
  /** Showcase mode pins the pose here. When null, the pose comes from the simulation fighter. */
  private poseOverride: Pose | null = null;
  private readonly weapons = new Map<WeaponId, TransformNode>();
  private disc: Mesh | null = null;
  private discMaterial: StandardMaterial | null = null;
  /** Set when the character is reshaped (see Proportions). Null for the stock model. */
  private readonly reshape: (() => void) | null = null;
  private readonly afterAnimations: (() => void) | null = null;
  private readonly scene: Scene;

  constructor(
    scene: Scene,
    assets: LoadedAssets,
    fighter: Fighter,
    private readonly shadow: ShadowGenerator,
    tag: string,
    proportions?: Proportions,
  ) {
    this.scene = scene;
    this.fighterId = fighter.id;
    this.unit = UNITS[fighter.unitId];
    const container = assets.characters.get(this.unit.model);
    if (!container) throw new Error(`Model not loaded: ${this.unit.model}`);

    // Bone names must stay as authored: clips and the weapon mount look bones up by name.
    const entries = container.instantiateModelsToScene((n) => n, true);
    this.root = new TransformNode(`${tag}_root`, scene);
    // The model sits under its own node so the proportions can lift the body without touching the sim position.
    const model = new TransformNode(`${tag}_model`, scene);
    model.parent = this.root;
    for (const n of entries.rootNodes) n.parent = model;

    const boneNodes = nodeMap(entries.rootNodes);
    if (proportions) {
      const { head, chest, legs } = findProportionBones(boneNodes, this.unit.model);
      model.position.y = proportions.legLength * (proportions.leg - 1);
      this.reshape = () => {
        head.scaling.set(proportions.head / proportions.chestWidth, proportions.head, proportions.head);
        chest.scaling.set(proportions.chestWidth, 1, 1);
        for (const [upper, foot] of legs) {
          upper.scaling.set(1, proportions.leg, 1);
          foot.scaling.set(1, 1 / proportions.leg, 1);
        }
      };
      // Animation groups run during scene.render, after update(); the reshape must follow them.
      this.afterAnimations = this.reshape;
      scene.onAfterAnimationsObservable.add(this.afterAnimations);
    }
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
      if (w === 'sword' && this.unit.swordScale) holder.scaling.setAll(this.unit.swordScale);
      this.weapons.set(w, holder);
      this.casters.push(...holder.getChildMeshes(false));
    }

    for (const m of this.casters) this.shadow.addShadowCaster(m);

    for (const m of this.casters) {
      if (m.material && !this.fadeMaterials.includes(m.material)) this.fadeMaterials.push(m.material);
    }
    for (const m of this.fadeMaterials) this.savedModes.set(m, m.transparencyMode);

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

  /** Pins the pose (showcase mode). Pass null to go back to following the simulation. */
  setPoseOverride(pose: Pose | null): void {
    this.poseOverride = pose;
  }

  /** groundY: terrain height under the fighter (0 on the flat arena). */
  update(f: Fighter, groundY = 0): void {
    this.root.position.set(f.x, groundY, f.z);
    this.root.rotation.y = f.yaw + MODEL_YAW_OFFSET;

    const flash = TUNING.combat.hitFlashTime > 0 ? f.flashTimer / TUNING.combat.hitFlashTime : 0;
    const glow = new Color3(0.95, 0.12, 0.06).scale(clamp(flash, 0, 1) * 0.8);
    for (const m of this.materials) setEmissive(m, glow);

    this.player.apply(this.poseOverride ?? poseFor(f, this.unit));
    this.reshape?.();

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

  /**
   * Fades the whole character toward occludeAlpha while it blocks the view, and back to solid after.
   * Babylon ignores mesh.visibility on opaque materials, so while faded the materials switch to alpha
   * blending with a depth pre-pass (inner faces stay hidden). They are restored once solid again.
   */
  fade(blocked: boolean, dt: number): void {
    const C = TUNING.camera;
    const target = blocked ? C.occludeAlpha : 1;
    const k = 1 - Math.exp(-C.occludeFadeRate * dt);
    this.opacity += (target - this.opacity) * k;
    if (Math.abs(target - this.opacity) < 0.001) this.opacity = target;

    if (this.opacity >= 1) {
      for (const m of this.fadeMaterials) {
        m.transparencyMode = this.savedModes.get(m) ?? null;
        if (m instanceof PBRMaterial || m instanceof StandardMaterial) m.needDepthPrePass = false;
      }
      for (const c of this.casters) c.visibility = 1;
      return;
    }
    for (const m of this.fadeMaterials) {
      if (m instanceof PBRMaterial) {
        m.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
        m.needDepthPrePass = true;
      } else if (m instanceof StandardMaterial) {
        m.transparencyMode = Material.MATERIAL_ALPHABLEND;
        m.needDepthPrePass = true;
      }
    }
    for (const c of this.casters) c.visibility = this.opacity;
  }

  /** Capture and measurement only: world-space height of the character's meshes, in metres, from the ground up. */
  /** Capture only: the skinned body's world top and bottom in metres. Weapons are not skinned and are left out. */
  measureHeight(): { top: number; bottom: number } {
    let top = -Infinity;
    let bottom = Infinity;
    for (const m of this.casters) {
      if (!(m instanceof Mesh) || m.getTotalVertices() === 0 || m.skeleton === null) continue;
      m.refreshBoundingInfo({ applySkeleton: true, applyMorph: true });
      const box = m.getBoundingInfo().boundingBox;
      top = Math.max(top, box.maximumWorld.y);
      bottom = Math.min(bottom, box.minimumWorld.y);
    }
    return { top, bottom };
  }

  dispose(): void {
    if (this.afterAnimations) this.scene.onAfterAnimationsObservable.removeCallback(this.afterAnimations);
    for (const m of this.casters) this.shadow.removeShadowCaster(m);
    this.player.dispose();
    this.discMaterial?.dispose();
    this.disc?.dispose();
    this.root.dispose(false, true);
  }
}

/** The bones the proportions reshape. Names as authored in the KayKit rig; a missing one is a load error, not a silent skip. */
function findProportionBones(bones: Map<string, Node>, model: string): { head: TransformNode; chest: TransformNode; legs: [TransformNode, TransformNode][] } {
  const get = (name: string): TransformNode => {
    const b = bones.get(name);
    if (!(b instanceof TransformNode)) throw new Error(`Bone ${name} missing on ${model} (proportions)`);
    return b;
  };
  return {
    head: get('head'),
    chest: get('chest'),
    legs: (['l', 'r'] as const).map((side): [TransformNode, TransformNode] => [get(`upperleg.${side}`), get(`foot.${side}`)]),
  };
}
