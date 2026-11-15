// The Mill's defenders, drawn (GAME_DESIGN.md section 5; task 015). The rules are pure and live in src/core/places/defenders.ts:
// this file asks them where each defender is at the hour and draws the character there. Nothing here decides anything.
// Defenders stand unaware (no awareness or combat yet: items 12 and 16). Shown only while the Mill is held.
// Placeholders, logged for the critique: runners fight as enemy soldiers; sleep and eat are drawn as standing idle;
// a torch is a small glowing ball near the head, not a prop in the hand.

import { Color3, MeshBuilder, Mesh, Scene, ShadowGenerator, StandardMaterial, TransformNode } from '@babylonjs/core';
import { TUNING } from '../config/tuning';
import { defendersAt, defenderGround, type Defender } from '../core/places/defenders';
import type { Fighter } from '../core/types';
import { garrisonOf } from '../data/bandits';
import { walkSurfaceAt } from '../core/world/valley';
import type { LoadedAssets } from './assets';
import { CharacterView } from './characters';

const TORCH_OFFSET = { x: 0.32, y: 1.45, z: 0.12 };
const FIRST_FIGHTER_ID = 5000;

function unitFor(d: Pick<Defender, 'kind'>): string {
  return d.kind === 'archer' ? 'enemy_archer' : 'enemy_soldier';
}

function fighterFor(index: number, d: Defender): Fighter {
  return {
    id: FIRST_FIGHTER_ID + index,
    unitId: unitFor(d),
    kind: d.kind === 'archer' ? 'archer' : 'soldier',
    team: 'enemy',
    x: d.x,
    z: d.z,
    y: defenderGround(d),
    yaw: d.yaw,
    radius: 0.45,
    height: 1.8,
    maxHp: 1,
    hp: 1,
    alive: true,
    vx: 0,
    vz: 0,
    knockX: 0,
    knockZ: 0,
    cooldown: 0,
    hitTimer: 0,
    flashTimer: 0,
    action: { phase: 'idle', t: 0, struck: false, zoneX: 0, zoneZ: 0 },
    weapon: 'sword',
    drawTime: 0,
    dodgeTime: 0,
    dodgeCooldown: 0,
    dodgeX: 0,
    dodgeZ: 0,
  };
}

export class ValleyDefenders {
  private readonly root: TransformNode;
  private readonly views = new Map<string, CharacterView>();
  private readonly fighters = new Map<string, Fighter>();
  private readonly torches = new Map<string, Mesh>();

  constructor(scene: Scene, assets: LoadedAssets, shadow: ShadowGenerator) {
    this.root = new TransformNode('mill_defenders', scene);
    const flame = new StandardMaterial('mill_torch_mat', scene);
    flame.emissiveColor = new Color3(1, 0.62, 0.22);
    flame.diffuseColor = new Color3(1, 0.62, 0.22);
    flame.disableLighting = true;
    garrisonOf('mill', false).forEach((b, index) => {
      const probe = defendersAt('mill', 12).find(d => d.id === b.id);
      if (!probe) throw new Error(`No defender for ${b.id}`);
      const fighter = fighterFor(index, probe);
      this.fighters.set(b.id, fighter);
      this.views.set(b.id, new CharacterView(scene, assets, fighter, shadow, `mill_${b.id}`));
      const torch = MeshBuilder.CreateSphere(`mill_torch_${b.id}`, { diameter: 0.18, segments: 6 }, scene);
      torch.material = flame;
      torch.parent = this.root;
      torch.setEnabled(false);
      this.torches.set(b.id, torch);
    });
  }

  /** Draws every defender at `hour`. millHeld: while the Mill is held by the player, its garrison is absent. */
  update(hour: number, millHeld: boolean): void {
    if (!millHeld) {
      for (const v of this.views.values()) v.setShown(false);
      for (const t of this.torches.values()) t.setEnabled(false);
      return;
    }
    for (const d of defendersAt('mill', hour)) {
      const view = this.views.get(d.id);
      const f = this.fighters.get(d.id);
      const torch = this.torches.get(d.id);
      if (!view || !f || !torch) continue;
      view.setShown(d.present);
      torch.setEnabled(d.present && d.torch);
      if (!d.present) continue;
      const speed = d.moving ? TUNING.soldier.moveSpeed : 0;
      f.x = d.x;
      f.z = d.z;
      f.yaw = d.yaw;
      f.vx = Math.sin(d.yaw) * speed;
      f.vz = Math.cos(d.yaw) * speed;
      const ground = walkSurfaceAt(d.x, d.z);
      f.y = ground;
      view.update(f, ground);
      torch.position.set(d.x + TORCH_OFFSET.x, ground + TORCH_OFFSET.y, d.z + TORCH_OFFSET.z);
    }
  }

  dispose(): void {
    for (const v of this.views.values()) v.dispose();
    for (const t of this.torches.values()) t.dispose();
    this.root.dispose(false, true);
  }
}
