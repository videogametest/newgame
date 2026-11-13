// Draws the landmarks from the plan (Claude's). One call from the valley scene:
//   const marks = await buildLandmarks(scene, { heightAt, shadow });
//   marks.setPlace('mill', 'freed'); marks.update(dt, lighting);
// Held is how every place starts: banners up, lantern dark, wheel stopped, forge cold.
import {
  AssetContainer, Color3, Mesh, MeshBuilder, PBRMaterial, PointLight, Scene, SceneLoader, ShadowGenerator, StandardMaterial,
  TransformNode, Vector3,
} from '@babylonjs/core';
import { assetUrl } from '../render/assets';
import type { Lighting } from '../render/lighting';
import { landmarkPieces, PLACE_SITES, type BoxPiece, type ModelPiece, type PlaceId, type Stuff } from './plan';

const HEX = 'assets/kaykit_medieval_hexagon/';
/** The castle is one flat dark tone, a little bluer and paler by day, nearly black at night. */
const CASTLE_DAY = new Color3(0.2, 0.22, 0.29);
const CASTLE_NIGHT = new Color3(0.035, 0.04, 0.06);

export interface LandmarkOptions {
  heightAt: (x: number, z: number) => number;
  shadow?: ShadowGenerator;
}
export interface Landmarks {
  root: TransformNode;
  setPlace(id: PlaceId, state: 'held' | 'freed'): void;
  /** Call each frame: turns the Mill's wheel once it is freed, and lights what should be lit after dark. */
  update(dt: number, l: Lighting): void;
  dispose(): void;
}

const COLOURS: Record<Stuff, [number, number, number]> = {
  wood: [0.33, 0.24, 0.16], grey_wood: [0.42, 0.39, 0.34], stone: [0.5, 0.48, 0.44], dark_stone: [0.3, 0.3, 0.32],
  iron: [0.17, 0.17, 0.19], coal: [0.06, 0.06, 0.07], canvas: [0.62, 0.56, 0.44], straw: [0.66, 0.55, 0.3], ash: [0.36, 0.35, 0.34],
};

export async function buildLandmarks(scene: Scene, o: LandmarkOptions): Promise<Landmarks> {
  const root = new TransformNode('landmarks', scene);
  const pieces = landmarkPieces();
  const ground = o.heightAt;

  const mats = new Map<Stuff, PBRMaterial>();
  const mat = (stuff: Stuff): PBRMaterial => {
    let m = mats.get(stuff);
    if (!m) {
      m = new PBRMaterial(`landmark_${stuff}`, scene);
      m.albedoColor = new Color3(...COLOURS[stuff]);
      m.roughness = stuff === 'iron' ? 0.55 : 0.95;
      m.metallic = 0;
      mats.set(stuff, m);
    }
    return m;
  };

  const containers = new Map<string, Promise<AssetContainer>>();
  const load = (file: string): Promise<AssetContainer> => {
    let c = containers.get(file);
    if (!c) {
      const url = assetUrl(`${HEX}${file}.gltf`);
      const cut = url.lastIndexOf('/');
      c = SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene);
      containers.set(file, c);
    }
    return c;
  };

  const banners: Record<string, TransformNode[]> = {};
  const lanterns: Record<string, { mesh: Mesh; light: PointLight }[]> = {};
  const wheels: Record<string, TransformNode[]> = {};
  const fires: Record<string, PointLight[]> = {};
  const state: Record<string, 'held' | 'freed'> = {};
  const loose = new Map<Stuff, Mesh[]>();
  const glow = new StandardMaterial('landmark_lantern_glow', scene);
  glow.emissiveColor = new Color3(1, 0.72, 0.36);
  glow.diffuseColor = Color3.Black();
  glow.specularColor = Color3.Black();
  glow.disableLighting = true;
  let farMat: StandardMaterial | null = null;
  let atlas: PBRMaterial | null = null;
  const still: Mesh[] = [];
  const farStill: Mesh[] = [];

  for (const p of pieces) {
    if (p.kind === 'model') await placeModel(p);
    else placeBox(p);
  }

  async function placeModel(p: ModelPiece): Promise<void> {
    const c = await load(p.file);
    // Clones, not instances, so everything that never moves can be merged into one mesh at the end.
    const e = c.instantiateModelsToScene((n) => `${p.site}_${n}`, false, { doNotInstantiate: true });
    const node = new TransformNode(`${p.site}_${p.file.split('/').pop()}`, scene);
    for (const n of e.rootNodes) n.parent = node;
    // Never floating: the lowest ground under its footprint decides how far it sits in.
    const h = p.half;
    const cs = Math.cos(p.yaw), sn = Math.sin(p.yaw);
    let low = ground(p.x, p.z);
    if (p.sink === undefined || p.sink >= 0) for (const [dx, dz] of [[-h, -h], [h, -h], [-h, h], [h, h]]) low = Math.min(low, ground(p.x + dx, p.z + dz));
    const [px, pz] = p.pivot ?? [0, 0];
    node.position.set(p.x - (cs * px + sn * pz) * p.scale, low - (p.sink ?? 0.05), p.z - (-sn * px + cs * pz) * p.scale);
    node.rotation.y = p.yaw;
    node.scaling.setAll(p.scale);
    node.parent = root;
    for (const m of node.getChildMeshes(false)) {
      if (p.far) {
        // The castle: one dark, matte surface, in shadow whatever the hour.
        farMat ??= (() => {
          const f = new StandardMaterial('castle_far', scene);
          f.disableLighting = true;
          f.emissiveColor = CASTLE_DAY;
          f.diffuseColor = Color3.Black();
          f.specularColor = Color3.Black();
          // A silhouette against the sky at any distance: the haze that softens the hills would erase it.
          f.fogEnabled = false;
          return f;
        })();
        m.material = farMat;
        m.receiveShadows = false;
        if (m instanceof Mesh) farStill.push(m);
        continue;
      }
      // Every model in the pack is painted from the same sheet, so they can all share one material.
      if (m.material instanceof PBRMaterial) { atlas ??= m.material; atlas.roughness = 0.9; atlas.metallic = 0; m.material = atlas; }
      m.receiveShadows = true;
      const moves = p.role === 'banner' || p.role === 'gate_door' || (p.role === 'wheel' && /wheel/.test(m.name));
      if (m instanceof Mesh && !moves) still.push(m); else o.shadow?.addShadowCaster(m);
    }
    if (p.role === 'banner') (banners[p.site] ??= []).push(node);
    if (p.role === 'wheel') {
      const wheel = node.getChildTransformNodes(false).find((n) => /wheel/.test(n.name)) ?? node.getChildMeshes(false).find((n) => /wheel/.test(n.name));
      if (wheel) (wheels[p.site] ??= []).push(wheel as TransformNode);
    }
    if (p.role === 'forge_fire') {
      const fire = new PointLight(`${p.site}_forge_fire`, new Vector3(p.x, low + 2.2, p.z), scene);
      fire.diffuse = new Color3(1, 0.5, 0.2);
      fire.specular = Color3.Black();
      fire.range = 12;
      fire.intensity = 0;
      fire.parent = root;
      (fires[p.site] ??= []).push(fire);
    }
  }

  function placeBox(p: BoxPiece): void {
    const y = ground(p.x, p.z) + (p.lift ?? 0);
    let m: Mesh;
    if (p.kind === 'drum') m = MeshBuilder.CreateCylinder(`${p.site}_drum`, { diameter: p.w, height: p.h, tessellation: 12 }, scene);
    else if (p.kind === 'mound') { m = MeshBuilder.CreateSphere(`${p.site}_mound`, { diameterX: p.w, diameterY: p.h * 2, diameterZ: p.d, segments: 8 }, scene); }
    else m = MeshBuilder.CreateBox(`${p.site}_box`, { width: p.w, height: p.h, depth: p.d }, scene);
    m.position.set(p.x, p.kind === 'mound' ? y : y + p.h / 2, p.z);
    m.rotation.set(p.tilt ?? 0, p.yaw, p.roll ?? 0);
    m.parent = root;
    if (p.role === 'lantern') {
      m.material = mat('iron');
      const light = new PointLight(`${p.site}_lantern`, new Vector3(p.x, y + p.h / 2, p.z), scene);
      light.diffuse = new Color3(1, 0.66, 0.32);
      light.specular = Color3.Black();
      light.range = 11;
      light.intensity = 0;
      light.parent = root;
      m.receiveShadows = true;
      (lanterns[p.site] ??= []).push({ mesh: m, light });
      return;
    }
    m.material = mat(p.stuff);
    let list = loose.get(p.stuff);
    if (!list) loose.set(p.stuff, (list = []));
    list.push(m);
  }

  // Every model that never moves becomes one mesh; the castle another.
  for (const [name, list, casts] of [['landmarks_models', still, true], ['landmarks_castle', farStill, false]] as const) {
    if (list.length === 0) continue;
    // Models come with empty holder meshes; only those with geometry can be merged, and all must agree on what they carry.
    const solid = list.filter((m) => m.getTotalVertices() > 0);
    for (const m of solid) for (const kind of m.getVerticesDataKinds()) if (!['position', 'normal', 'uv'].includes(kind)) m.removeVerticesData(kind);
    const merged = solid.length ? Mesh.MergeMeshes(solid, true, true) : null;
    if (!merged) continue;
    merged.name = name;
    merged.parent = root;
    merged.receiveShadows = casts;
    if (casts) o.shadow?.addShadowCaster(merged);
  }
  // Everything loose becomes one mesh per material.
  for (const [stuff, list] of loose) {
    const merged = Mesh.MergeMeshes(list, true, true);
    if (!merged) continue;
    merged.name = `landmarks_${stuff}`;
    merged.parent = root;
    merged.receiveShadows = true;
    o.shadow?.addShadowCaster(merged);
  }

  const apply = (site: string): void => {
    const freed = state[site] === 'freed';
    for (const b of banners[site] ?? []) b.setEnabled(!freed);
    for (const l of lanterns[site] ?? []) l.mesh.material = freed ? glow : mat('iron');
  };
  for (const site of Object.values(PLACE_SITES)) { state[site] = 'held'; apply(site); }
  // The hut and the signal hill fly Stane's colours for as long as he holds the valley.
  let spin = 0;

  return {
    root,
    setPlace(id, s) { state[PLACE_SITES[id]] = s; apply(PLACE_SITES[id]); },
    update(dt, l) {
      spin += dt * 0.5;
      // By day the air between softens it toward the sky; by night it is the darkest thing on the horizon.
      if (farMat) farMat.emissiveColor = Color3.Lerp(Color3.Lerp(CASTLE_DAY, l.sky, 0.45), CASTLE_NIGHT, l.nightness);
      for (const [site, list] of Object.entries(wheels)) if (state[site] === 'freed') for (const w of list) w.rotation.x = spin;
      for (const [site, list] of Object.entries(lanterns)) for (const x of list) x.light.intensity = state[site] === 'freed' ? 4 + 5 * l.nightness : 0;
      for (const [site, list] of Object.entries(fires)) for (const f of list) f.intensity = state[site] === 'freed' ? 5 + 4 * l.nightness : 0;
    },
    dispose() { root.dispose(false, true); glow.dispose(); },
  };
}
