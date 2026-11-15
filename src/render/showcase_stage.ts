// Flat stage for showcase mode: one ground plane, sky, fog, sun and shadows. No walls or obstacles,
// so contact sheets show only the character. The game has no arena; this is the only stage the render code builds.

import {
  Color3, DirectionalLight, HemisphericLight, MeshBuilder, Scene, ShadowGenerator, StandardMaterial, Vector3,
} from '@babylonjs/core';

export interface ShowcaseStage {
  shadow: ShadowGenerator;
}

export function buildShowcaseStage(scene: Scene): ShowcaseStage {
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

  const ground = MeshBuilder.CreateGround('ground', { width: 40, height: 40 }, scene);
  const groundMat = new StandardMaterial('ground_mat', scene);
  groundMat.diffuseColor = new Color3(0.36, 0.47, 0.3);
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;
  ground.receiveShadows = true;

  return { shadow };
}
