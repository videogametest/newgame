// Unit definitions: which model each unit uses, its team tint, the weapons it carries and the clip names it plays.
// Clip names come from the KayKit Character Animations pack (Rig_Medium). The render layer loads
// every file in ANIMATION_FILES and looks clips up by name. Nothing here imports Babylon.

import type { FighterKind, WeaponId } from '../core/types';

export interface UnitDef {
  kind: FighterKind;
  /** Character model, relative to public/assets. */
  model: string;
  /** Multiplier colour so allies and enemies read apart on the same model. */
  tint: [number, number, number];
  /** Weapons the model carries. A weapon is shown only when the unit (or hero, for its equipped one) uses it. */
  weapons: WeaponId[];
  clips: {
    idle: string;
    run: string;
    /** Walking clip for slow hero movement. */
    walk?: string;
    /** Clip played while a strike is telegraphed (soldier wind-up). */
    windup?: string;
    /** Part of the windup clip to play, as 0..1 of its length (defaults to the whole clip). */
    windupRange?: [number, number];
    /** Strike or shot clip. */
    attack: string;
    /** Part of the attack clip that is the strike, as 0..1 of its length. */
    attackRange?: [number, number];
    /** Bow draw and release (archers and the hero's bow). */
    draw?: string;
    release?: string;
    aim?: string;
    /** Dodge clips by direction relative to the unit's facing (hero only). */
    dodge?: { forward: string; backward: string; left: string; right: string };
    hit: string;
    death: string;
  };
}

export const UNITS: Record<string, UnitDef> = {
  hero: {
    kind: 'hero',
    model: 'assets/kaykit_adventurers/characters/Knight.glb',
    tint: [1, 1, 1],
    weapons: ['sword', 'bow'],
    clips: {
      idle: 'Idle_A',
      run: 'Running_A',
      walk: 'Walking_A',
      attack: 'Melee_1H_Attack_Slice_Horizontal',
      draw: 'Ranged_Bow_Draw',
      release: 'Ranged_Bow_Release',
      aim: 'Ranged_Bow_Aiming_Idle',
      dodge: {
        forward: 'Dodge_Forward',
        backward: 'Dodge_Backward',
        left: 'Dodge_Left',
        right: 'Dodge_Right',
      },
      hit: 'Hit_A',
      death: 'Death_A',
    },
  },
  ally_soldier: {
    kind: 'soldier',
    model: 'assets/kaykit_adventurers/characters/Barbarian.glb',
    tint: [0.55, 0.8, 1.0],
    weapons: ['sword'],
    clips: {
      idle: 'Idle_A',
      run: 'Running_A',
      windup: 'Melee_1H_Attack_Chop',
      windupRange: [0, 0.4],
      attack: 'Melee_1H_Attack_Chop',
      attackRange: [0.4, 0.8],
      hit: 'Hit_A',
      death: 'Death_A',
    },
  },
  enemy_soldier: {
    kind: 'soldier',
    model: 'assets/kaykit_adventurers/characters/Rogue.glb',
    tint: [1.0, 0.55, 0.45],
    weapons: ['sword'],
    clips: {
      idle: 'Idle_A',
      run: 'Running_A',
      windup: 'Melee_1H_Attack_Chop',
      windupRange: [0, 0.4],
      attack: 'Melee_1H_Attack_Chop',
      attackRange: [0.4, 0.8],
      hit: 'Hit_A',
      death: 'Death_A',
    },
  },
  enemy_archer: {
    kind: 'archer',
    model: 'assets/kaykit_adventurers/characters/Ranger.glb',
    tint: [1.0, 0.85, 0.5],
    weapons: ['bow'],
    clips: {
      idle: 'Ranged_Bow_Aiming_Idle',
      run: 'Running_A',
      attack: 'Ranged_Bow_Release',
      draw: 'Ranged_Bow_Draw',
      release: 'Ranged_Bow_Release',
      aim: 'Ranged_Bow_Aiming_Idle',
      hit: 'Hit_A',
      death: 'Death_A',
    },
  },
};

/** Animation files (Rig_Medium) whose clips the characters use, relative to public/assets. */
export const ANIMATION_FILES = [
  'assets/kaykit_character_animations/Rig_Medium_General.glb',
  'assets/kaykit_character_animations/Rig_Medium_MovementBasic.glb',
  'assets/kaykit_character_animations/Rig_Medium_MovementAdvanced.glb',
  'assets/kaykit_character_animations/Rig_Medium_CombatMelee.glb',
  'assets/kaykit_character_animations/Rig_Medium_CombatRanged.glb',
];

/** Weapon and projectile models, relative to public/assets. Weapons attach to the hand bone named in `bone`. */
export const WEAPON_MODELS = {
  sword: { file: 'assets/kaykit_adventurers/weapons/sword_1handed.gltf', bone: 'handslot.r' },
  bow: { file: 'assets/kaykit_adventurers/weapons/bow_withString.gltf', bone: 'handslot.l' },
  arrow: { file: 'assets/kaykit_adventurers/weapons/arrow_bow.gltf', bone: '' },
} as const;
