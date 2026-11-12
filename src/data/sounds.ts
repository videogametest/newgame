// Sound data: which CC0 file plays for each sound id, and how loud. Files live in public/assets/audio/,
// one folder per pack, each with its licence file beside it. Nothing here runs logic.

import type { SoundId } from '../core/sound_map';

export interface SoundDef {
  /** Paths relative to public/assets. One is picked at random per play, so repeats do not sound identical. */
  files: string[];
  /** Playback gain before the effects and master volume are applied (0..1). */
  gain: number;
}

const RPG = 'audio/kenney_rpg';
const IMPACT = 'audio/kenney_impact';
const JINGLES = 'audio/kenney_jingles';

export const SOUNDS: Record<SoundId, SoundDef> = {
  sword_swing: { files: [`${RPG}/knifeSlice.ogg`], gain: 0.7 },
  sword_hit: { files: [`${IMPACT}/impactMetal_medium_000.ogg`], gain: 0.8 },
  bow_draw: { files: [`${RPG}/creak1.ogg`], gain: 0.5 },
  // No string twang in the packs; a cloth flap stands in for the release.
  bow_release: { files: [`${RPG}/cloth3.ogg`], gain: 0.6 },
  arrow_impact: { files: [`${IMPACT}/impactWood_medium_001.ogg`], gain: 0.7 },
  footstep: {
    files: [0, 1, 2, 3, 4].map((i) => `${IMPACT}/footstep_grass_00${i}.ogg`),
    gain: 0.35,
  },
  dodge: { files: [`${RPG}/cloth1.ogg`], gain: 0.6 },
  hurt: { files: [`${IMPACT}/impactPunch_medium_000.ogg`], gain: 0.8 },
  death: { files: [`${IMPACT}/impactSoft_heavy_000.ogg`], gain: 0.8 },
  victory: { files: [`${JINGLES}/jingles_NES08.ogg`], gain: 0.7 },
  defeat: { files: [`${JINGLES}/jingles_NES13.ogg`], gain: 0.7 },
};

/** Metres walked between footsteps. */
export const FOOTSTEP_STRIDE = 1.6;
