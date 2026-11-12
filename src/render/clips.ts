// Plays retargeted animation groups on one character. Poses name a clip and how to play it.
// 'scrub' pins the clip to a 0..1 progress, so the motion tracks sim timers (wind-up, swing, draw).

import type { AnimationGroup } from '@babylonjs/core';

export type Pose =
  | { kind: 'loop'; clip: string; speed: number }
  | { kind: 'once'; clip: string }
  | { kind: 'hold'; clip: string }
  | { kind: 'scrub'; clip: string; t: number; range: ClipRange };

/** A slice of a clip, as fractions 0..1 of its length: [start, end]. */
export type ClipRange = [number, number];
const FULL: ClipRange = [0, 1];

export const loop = (clip: string, speed = 1): Pose => ({ kind: 'loop', clip, speed });
export const once = (clip: string): Pose => ({ kind: 'once', clip });
export const hold = (clip: string): Pose => ({ kind: 'hold', clip });
export const scrub = (clip: string, t: number, range: ClipRange = FULL): Pose => ({ kind: 'scrub', clip, t, range });

export class ClipPlayer {
  private activeClip: string | null = null;
  private activeKind: Pose['kind'] | null = null;

  constructor(private readonly groups: Map<string, AnimationGroup>) {}

  apply(pose: Pose): void {
    const group = this.groups.get(pose.clip);
    if (!group) throw new Error(`Missing clip "${pose.clip}"`);
    const same = this.activeClip === pose.clip && this.activeKind === pose.kind;

    if (pose.kind === 'scrub') {
      if (!same) {
        this.stopAll();
        group.start(false, 1);
        group.pause();
      }
      const t = Math.min(1, Math.max(0, pose.t));
      const [r0, r1] = pose.range;
      const f = r0 + (r1 - r0) * t;
      group.goToFrame(group.from + (group.to - group.from) * f);
    } else if (pose.kind === 'loop') {
      if (!same) {
        this.stopAll();
        group.start(true, pose.speed);
      } else {
        group.speedRatio = pose.speed;
      }
    } else if (!same) {
      // 'once' and 'hold' both play to the end; 'hold' simply never restarts.
      this.stopAll();
      group.start(false, 1);
    }
    this.activeClip = pose.clip;
    this.activeKind = pose.kind;
  }

  stopAll(): void {
    for (const g of this.groups.values()) if (g.isPlaying || g.animatables.length > 0) g.stop();
  }

  dispose(): void {
    for (const g of this.groups.values()) g.dispose();
    this.groups.clear();
  }
}
