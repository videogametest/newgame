// Wick on its shelf. Reached only at ?styletest=wick. A test sheet for docs/tasks/003-wick.md, not game content:
// it draws the village module on the valley's own land so it can be judged before it is wired into the valley.
// window.__styletestSet({ tod, view }) draws one frame; window.__styletestReady is set once built.
import {
  Color3, Color4, DirectionalLight, Engine, FreeCamera, GlowLayer, HemisphericLight, ImageProcessingConfiguration, Mesh,
  MeshBuilder, PBRMaterial, Scene, ShadowGenerator, StandardMaterial, Vector3, VertexData,
} from '@babylonjs/core';
import { landHeightAt, valleyHeightAt, VALLEY_PLACES, VALLEY_SEED, WATER_LEVEL } from '../core/world/valley';
import { lightingAt } from '../render/lighting';
import { buildChunkMesh, CHUNK_SIZE } from '../render/valley_terrain';
import { ValleySky } from '../render/valley_sky';
import { buildWick } from '../village/build';

export async function startWickTest(canvas: HTMLCanvasElement): Promise<void> {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const scene = new Scene(engine);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 160;
  scene.fogEnd = 620;

  const flat = new URLSearchParams(location.search).get('shelf') === '0';
  const heightAt = flat ? landHeightAt : valleyHeightAt;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  const sun = new DirectionalLight('sun', new Vector3(0.4, -1, 0.7), scene);
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 420;
  const shadow = new ShadowGenerator(4096, sun);
  shadow.usePercentageCloserFiltering = true;
  shadow.darkness = 0.45;
  shadow.bias = 0.002;

  const gm = new StandardMaterial('ground', scene);
  gm.diffuseColor = Color3.White();
  gm.specularColor = Color3.Black();
  gm.backFaceCulling = false;
  for (let cx = -3; cx <= 5; cx++) for (let cz = -3; cz <= 5; cz++) {
    const d = buildChunkMesh({ x: cx, z: cz }, heightAt);
    const m = new Mesh(`ground_${cx}_${cz}`, scene);
    const vd = new VertexData();
    vd.positions = d.positions; vd.normals = d.normals; vd.colors = d.colors; vd.indices = d.indices;
    vd.applyToMesh(m);
    m.useVertexColors = true;
    m.material = gm;
    m.receiveShadows = true;
  }
  void CHUNK_SIZE;
  const water = MeshBuilder.CreateGround('water', { width: 900, height: 900 }, scene);
  water.position.y = WATER_LEVEL;
  const wm = new PBRMaterial('water', scene);
  wm.albedoColor = new Color3(0.12, 0.24, 0.3);
  wm.roughness = 0.25; wm.metallic = 0; wm.alpha = 0.9;
  water.material = wm;

  const wick = await buildWick(scene, { heightAt, seed: VALLEY_SEED, shadow });
  const glowLayer = new GlowLayer('glow', scene);
  glowLayer.intensity = 0.7;

  const sky = new ValleySky(scene);
  const camera = new FreeCamera('cam', new Vector3(0, 2, -20), scene);
  camera.minZ = 0.3;
  camera.maxZ = 900;

  const eye = (x: number, z: number, up = 1.9) => new Vector3(x, heightAt(x, z) + up, z);
  const draw = (state: { tod?: number; view?: string; house?: string }): void => {
    const tod = state.tod ?? 12;
    const l = lightingAt(tod);
    scene.clearColor = new Color4(l.sky.r, l.sky.g, l.sky.b, 1);
    scene.fogColor = l.sky;
    hemi.diffuse = l.hemiColor; hemi.intensity = l.hemiIntensity;
    hemi.groundColor = l.hemiColor.scale(0.35);
    sun.diffuse = l.sunColor; sun.intensity = l.sunIntensity; sun.direction = l.sunDir;
    sun.position = new Vector3(96, 0, 86).subtract(l.sunDir.scale(220));
    wick.light(l, tod);
    glowLayer.intensity = 0.3 + 0.9 * l.nightness;

    const view = state.view ?? 'above';
    const hesper = wick.houses.find((h) => h.id === 'hesper')!;
    if (view === 'above') {
      camera.position.set(100, 150, 190);
      camera.setTarget(new Vector3(100, 4, 84));
      camera.fov = 0.8;
    } else if (view === 'arrival') {
      const s = VALLEY_PLACES.start;
      camera.position = eye(s.x, s.z, 2.4);
      camera.setTarget(new Vector3(hesper.x, heightAt(hesper.x, hesper.z) + 4, hesper.z));
      camera.fov = 0.5;
    } else if (view === 'road') {
      camera.position = eye(118, 140, 1.9);
      camera.setTarget(new Vector3(hesper.x - 6, heightAt(hesper.x, hesper.z) + 3, hesper.z - 6));
      camera.fov = 0.85;
    } else if (view === 'square') {
      camera.position = eye(88, 90, 1.9);
      camera.setTarget(new Vector3(70, heightAt(74, 74) + 2.6, 70));
      camera.fov = 0.95;
    } else if (view === 'lane') {
      camera.position = eye(150, 86, 1.9);
      camera.setTarget(new Vector3(100, heightAt(100, 86) + 3, 85));
      camera.fov = 0.8;
    } else if (view === 'lake') {
      camera.position = new Vector3(36, 9, 34);
      camera.setTarget(new Vector3(84, 5, 78));
      camera.fov = 0.9;
    } else if (view === 'elev') {
      // Straight on, from far off with a narrow lens, with a metre grid: for measuring where doors and windows are.
      const h = wick.houses.find((x) => x.id === (state.house ?? 'fairlow'))!;
      const r = (h.facing * Math.PI) / 180;
      const fx = Math.sin(r), fz = -Math.cos(r);
      const base = heightAt(h.x, h.z);
      camera.position.set(h.x + fx * 60, base + 4, h.z + fz * 60);
      camera.setTarget(new Vector3(h.x, base + 4, h.z));
      camera.fov = 0.2;
      if (!scene.getMeshByName('grid_0')) {
        const red = new StandardMaterial('grid', scene); red.emissiveColor = new Color3(1, 0, 1); red.disableLighting = true;
        for (let i = -5; i <= 5; i++) {
          const v = MeshBuilder.CreateBox(`grid_${i}`, { width: 0.03, height: 9, depth: 0.03 }, scene);
          v.position.set(h.x + fx * 4.5 - fz * i, base + 4.5, h.z + fz * 4.5 + fx * i); v.material = red;
          if (i >= 0 && i <= 9) { const hz = MeshBuilder.CreateBox(`gridh_${i}`, { width: 0.03, height: 0.03, depth: 0.03 }, scene);
            hz.scaling.set(Math.abs(fz) * 330 + 1, 1, Math.abs(fx) * 330 + 1); hz.position.set(h.x + fx * 4.5, base + i, h.z + fz * 4.5); hz.material = red; }
        }
      }
    } else if (view === 'door') {
      const h = wick.houses.find((x) => x.id === (state.house ?? 'fairlow'))!;
      const r = (h.facing * Math.PI) / 180;
      const fx = Math.sin(r), fz = -Math.cos(r);
      camera.position = eye(h.x + fx * 13 + fz * 3, h.z + fz * 13 - fx * 3, 2.0);
      camera.setTarget(new Vector3(h.x, heightAt(h.x, h.z) + 3.2, h.z));
      camera.fov = 0.8;
    }
    sky.update(l, camera.position.x, camera.position.z);
    scene.render();
    scene.render();
  };

  const w = window as unknown as { __styletestReady?: boolean; __styletestSet?: typeof draw; __wick?: unknown };
  w.__styletestSet = draw;
  w.__wick = { houses: wick.houses, drawCalls: () => scene.getActiveMeshes().length };
  draw({ tod: 12, view: 'above' });
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  w.__styletestReady = true;
}
