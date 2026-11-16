// Item 28: draws the people of Wick that src/core/people/daily.ts returns. Owns no game state: each frame it is
// told who is present and where; anyone indoors, or not returned, is simply not drawn (no interiors yet).
import type { Scene, ShadowGenerator } from '@babylonjs/core';
import type { BattleState, Fighter } from '../core/types';
import { makeFighter } from '../core/battle';
import type { Villager } from '../core/people/daily';
import { walkSurfaceAt } from '../core/world/valley';
import type { LoadedAssets } from './assets';
import { CharacterView } from './characters';
import { PROPORTIONS } from './proportions';

export class WickPeopleView {
  private readonly drawn = new Map<string, { f: Fighter; view: CharacterView }>();
  private shownIds: string[] = [];
  constructor(private readonly scene: Scene, private readonly assets: LoadedAssets,
    private readonly shadow: ShadowGenerator, private readonly battle: BattleState) {}

  update(villagers: readonly Villager[], dt: number, allowed: boolean): void {
    const shown = new Set<string>();
    for (const v of villagers) {
      if (!v.visible || !allowed) continue;
      let d = this.drawn.get(v.id);
      if (!d) {
        const f = makeFighter(this.battle, { unitId: 'villager', kind: 'soldier', team: 'player', x: v.x, z: v.z, yaw: v.yaw });
        const view = new CharacterView(this.scene, this.assets, f, this.shadow, `villager_${v.id.replace(':', '_')}`);
        view.asDesigned(this.scene, PROPORTIONS);
        d = { f, view }; this.drawn.set(v.id, d);
      }
      const { f } = d;
      // Velocity only for the pose (walk or idle); a clock jump is not a walk.
      const step = Math.hypot(v.x - f.x, v.z - f.z);
      f.vx = dt > 0 && step < 3 ? (v.x - f.x) / dt : 0; f.vz = dt > 0 && step < 3 ? (v.z - f.z) / dt : 0;
      f.x = v.x; f.z = v.z; f.yaw = v.yaw; f.y = walkSurfaceAt(v.x, v.z);
      d.view.setShown(true); d.view.update(f, f.y);
      shown.add(v.id);
    }
    for (const [id, d] of this.drawn) if (!shown.has(id)) d.view.setShown(false);
    this.shownIds = [...shown];
  }
  /** Capture/debug: ids drawn this frame. */
  shownNow(): string[] { return [...this.shownIds]; }
  dispose(): void { for (const d of this.drawn.values()) d.view.dispose(); this.drawn.clear(); }
}
