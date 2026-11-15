import { expect, it } from 'vitest';
import { MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import { withinShadowRange } from './shadow_range';
it('cuts casters beyond 60 m by world footprint, not a merged origin pivot', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const mesh = MeshBuilder.CreateBox('caster', { size: 2 }, scene);
    mesh.position.set(62, 100, 0); mesh.computeWorldMatrix(true);
    expect(withinShadowRange(mesh, { x: 0, z: 0 })).toBe(false);
    expect(withinShadowRange(mesh, { x: 1, z: 0 })).toBe(true);
    mesh.bakeCurrentTransformIntoVertices(); mesh.computeWorldMatrix(true);
    expect(mesh.position.x).toBe(0);
    expect(withinShadowRange(mesh, { x: 0, z: 0 })).toBe(false);
    expect(withinShadowRange(mesh, { x: 62, z: 0 })).toBe(true);
  } finally { engine.dispose(); }
});
