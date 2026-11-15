// Draw-only Mill torches. Fighter views and markers now share the real battle (item 16).
import { Color3, MeshBuilder, Mesh, Scene, StandardMaterial } from '@babylonjs/core';
import type { Fighter } from '../core/types';
import type { MillEncounter } from '../core/places/mill_encounter';
export class ValleyDefenders {
  private readonly torches = new Map<number, Mesh>();
  private readonly flame: StandardMaterial;
  constructor(private readonly scene: Scene) {
    this.flame = new StandardMaterial('mill_torch_mat', scene);
    this.flame.emissiveColor = new Color3(1, 0.62, 0.22);
    this.flame.diffuseColor = this.flame.emissiveColor;
    this.flame.disableLighting = true;
  }
  update(state: ReturnType<MillEncounter['snapshot']>, fighters: readonly Fighter[]): void {
    for (const torch of this.torches.values()) torch.setEnabled(false);
    for (const d of state.defenders) {
      if (!d.alive || !d.torch || !fighters.some(f => f.id === d.fighterId)) continue;
      let torch = this.torches.get(d.fighterId);
      if (!torch) {
        torch = MeshBuilder.CreateSphere(`mill_torch_${d.id}`, { diameter: 0.18, segments: 6 }, this.scene);
        torch.material = this.flame; this.torches.set(d.fighterId, torch);
      }
      torch.setEnabled(true); torch.position.set(d.x + 0.32, d.y + 1.45, d.z + 0.12);
    }
  }
  dispose(): void {
    for (const torch of this.torches.values()) torch.dispose();
    this.flame.dispose();
  }
}
