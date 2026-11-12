// Static arena geometry: ground, boundary walls, obstacles, lights and shadows.

import {
  AbstractMesh, Color3, DirectionalLight, HemisphericLight, MeshBuilder, Scene,
  ShadowGenerator, StandardMaterial, Vector3,
} from '@babylonjs/core';
import type { ArenaDef } from '../core/types';

export interface ArenaView {
  shadow: ShadowGenerator;
  walls: AbstractMesh[];
}

export function buildArena(scene: Scene, arena: ArenaDef): ArenaView {
  scene.clearColor = new Color3(0.55, 0.72, 0.86).toColor4();
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 26;
  scene.fogEnd = 70;
  scene.fogColor = new Color3(0.55, 0.72, 0.86);

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  hemi.groundColor = new Color3(0.25, 0.22, 0.2);

  const sun = new DirectionalLight('sun', new Vector3(0.45, -1, 0.6), scene);
  sun.position = new Vector3(-8, 18, -10);
  sun.intensity = 1.1;
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 60;
  const shadow = new ShadowGenerator(1024, sun);
  shadow.usePercentageCloserFiltering = true;
  shadow.darkness = 0.35;

  const ground = MeshBuilder.CreateGround(
    'ground', { width: arena.halfWidth * 2, height: arena.halfDepth * 2 }, scene,
  );
  const groundMat = new StandardMaterial('ground_mat', scene);
  groundMat.diffuseColor = new Color3(0.36, 0.47, 0.3);
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;
  ground.receiveShadows = true;

  const wallMat = new StandardMaterial('wall_mat', scene);
  wallMat.diffuseColor = new Color3(0.2, 0.45, 0.8);
  wallMat.emissiveColor = new Color3(0.12, 0.3, 0.55);
  wallMat.alpha = 0.3;
  wallMat.backFaceCulling = false;
  const wallH = 1.4;
  const t = 0.4;
  const walls: [number, number, number, number][] = [
    [0, arena.halfDepth + t / 2, arena.halfWidth * 2 + t * 2, t],
    [0, -(arena.halfDepth + t / 2), arena.halfWidth * 2 + t * 2, t],
    [arena.halfWidth + t / 2, 0, t, arena.halfDepth * 2],
    [-(arena.halfWidth + t / 2), 0, t, arena.halfDepth * 2],
  ];
  const wallMeshes = walls.map(([x, z, w, d], i) => {
    const box = MeshBuilder.CreateBox(`wall_${i}`, { width: w, depth: d, height: wallH }, scene);
    box.position.set(x, wallH / 2, z);
    box.material = wallMat;
    box.isPickable = false;
    return box;
  });

  const stoneMat = new StandardMaterial('stone_mat', scene);
  stoneMat.diffuseColor = new Color3(0.5, 0.46, 0.42);
  stoneMat.specularColor = Color3.Black();
  arena.obstacles.forEach((o, i) => {
    const cyl = MeshBuilder.CreateCylinder(
      `obstacle_${i}`, { height: o.height, diameter: o.radius * 2, tessellation: 24 }, scene,
    );
    cyl.position.set(o.x, o.height / 2, o.z);
    cyl.material = stoneMat;
    cyl.receiveShadows = true;
    shadow.addShadowCaster(cyl);
  });

  return { shadow, walls: wallMeshes };
}
