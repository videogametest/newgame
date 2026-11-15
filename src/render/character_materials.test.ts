import { expect, it } from 'vitest';
import { Color3, MeshBuilder, NullEngine, Scene, StandardMaterial } from '@babylonjs/core';
import { CharacterMaterials } from './character_materials';
it('shares neutral defender materials, isolates flash/fade, and preserves peers on disposal', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const a = MeshBuilder.CreateBox('a', {}, scene), b = MeshBuilder.CreateBox('b', {}, scene), c = MeshBuilder.CreateBox('c', {}, scene);
    const ma = new StandardMaterial('a', scene), mb = ma.clone('b'), mc = ma.clone('c');
    a.material = ma; b.material = mb; c.material = mc;
    const pa = new CharacterMaterials(scene, 'soldier', [a]), pb = new CharacterMaterials(scene, 'soldier', [b]), pc = new CharacterMaterials(scene, 'archer', [c]);
    pa.usePrivate(false); pb.usePrivate(false); pc.usePrivate(false);
    const shared = b.material as StandardMaterial;
    expect(a.material).toBe(shared); expect(c.material).not.toBe(shared);
    pa.usePrivate(true); ma.emissiveColor = Color3.Red(); ma.alpha = 0.3;
    expect(a.material).toBe(ma); expect(shared.emissiveColor).toEqual(Color3.Black()); expect(shared.alpha).toBe(1);
    pa.usePrivate(false); expect(a.material).toBe(shared);
    pa.detach(); a.dispose(false, false); ma.dispose(false, false);
    expect(b.material).toBe(shared); expect(scene.materials).toContain(shared);
  } finally { engine.dispose(); }
});
