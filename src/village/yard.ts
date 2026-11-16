// Hesper's yard: where the first evening's bow lesson stands (task 010 step 2; queue item 26). Pure placement data,
// no engine imports. The house is at (86, 98) with its door looking south-east; the hero stands at the mark a few
// steps from her, the three straw men are ten paces off to the south-east, and the far one stands by the west wall
// of the Dunn house, across the yard and the gate lane. The line to the far target passes clear of the straw men.
import { FAR_ID, STRAW_IDS } from '../core/tutorial/yard';

export interface YardSpot { id: string; x: number; z: number; radius: number; height: number }
/** Where she has the hero stand to shoot. */
export const YARD_MARK = { x: 91, z: 105 } as const;
/** Ten paces, about 7.5 m, from the mark. */
export const STRAW_TARGETS: readonly YardSpot[] = [
  { id: STRAW_IDS[0], x: 96.2, z: 110.2, radius: 0.35, height: 1.7 },
  { id: STRAW_IDS[1], x: 97.6, z: 108.9, radius: 0.35, height: 1.7 },
  { id: STRAW_IDS[2], x: 98.6, z: 107.3, radius: 0.35, height: 1.7 },
];
/** By the wall, about 17 m from the mark. */
export const FAR_TARGET: YardSpot = { id: FAR_ID, x: 107.5, z: 102.5, radius: 0.45, height: 1.8 };
export const YARD_TARGETS: readonly YardSpot[] = [...STRAW_TARGETS, FAR_TARGET];
