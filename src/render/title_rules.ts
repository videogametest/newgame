import type { SaveRead } from '../core/saves/codec';
import { TITLE_MOTION } from '../data/title_screen';
export type TitleChoice = 'continue' | 'new';
export function canContinue(status: SaveRead['status']): boolean { return status === 'loaded'; }
export function needsConfirmation(choice: TitleChoice, status: SaveRead['status']): boolean {
  return choice === 'new' && canContinue(status);
}
export function titleYaw(base: number, seconds: number): number {
  return base + Math.sin(Math.max(0, seconds) * 2 * Math.PI / TITLE_MOTION.period) * TITLE_MOTION.amplitude;
}
