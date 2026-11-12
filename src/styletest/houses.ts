// House standard test. Reached only at ?styletest=houses. A test sheet, not game content.
// KayKit Medieval Hexagon buildings (CC0, the same artist as the people), scaled to the people and dressed.
// window.__styletestSet({ tod, view }) draws one frame; window.__styletestReady is set once built.

import {
  AssetContainer, Color3, Color4, DirectionalLight, Engine, FreeCamera, HemisphericLight, ImageProcessingConfiguration,
  MeshBuilder, Node, PBRMaterial, Scene, SceneLoader, ShadowGenerator, StandardMaterial, TransformNode, Vector3,
} from '@babylonjs/core';
import { assetUrl, bindClips, loadAssets, nodeMap } from '../render/assets';
import { ClipPlayer, scrub } from '../render/clips';
import { PROPORTIONS } from './upgrade';

const HEX = 'assets/kaykit_medieval_hexagon/';
const KAY = 'assets/kaykit_adventurers/characters/';

/**
 * The miniatures are about 0.8 m wide. The people stand about 2.2 m tall as modelled, so this brings a door
 * to roughly a head taller than the tallest of them.
 */
export const BUILDING_SCALE = 8;

interface Lot { id: string; file: string; x: number; yaw?: number }
const LOTS: Lot[] = [
  { id: 'home-a', file: 'buildings/building_home_A_blue', x: -40 },
  { id: 'home-b', file: 'buildings/building_home_B_red', x: -27 },
  { id: 'tavern', file: 'buildings/building_tavern_green', x: -12 },
  { id: 'blacksmith', file: 'buildings/building_blacksmith_yellow', x: 4 },
  { id: 'watermill', file: 'buildings/building_watermill_blue', x: 20 },
  { id: 'well', file: 'buildings/building_well_blue', x: 33 },
  { id: 'tower', file: 'buildings/building_tower_A_red', x: 45 },
];

async function load(scene: Scene, path: string): Promise<AssetContainer> {
  const url = assetUrl(path);
  const cut = url.lastIndexOf('/');
  return SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene);
}

export async function startHouseTest(canvas: HTMLCanvasElement): Promise<void> {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const scene = new Scene(engine);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 90;
  scene.fogEnd = 330;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  const sun = new DirectionalLight('sun', new Vector3(0.4, -1, 0.7), scene);
  sun.position = new Vector3(-30, 50, -40);
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 160;
  const shadow = new ShadowGenerator(4096, sun);
  shadow.usePercentageCloserFiltering = true;
  shadow.darkness = 0.4;

  const ground = MeshBuilder.CreateGround('ground', { width: 400, height: 400 }, scene);
  const gm = new StandardMaterial('ground_mat', scene);
  gm.diffuseColor = new Color3(0.23, 0.33, 0.14);
  gm.specularColor = Color3.Black();
  ground.material = gm;
  ground.receiveShadows = true;
  const path = MeshBuilder.CreateGround('path', { width: 130, height: 3.6 }, scene);
  const pm = new StandardMaterial('path_mat', scene);
  pm.diffuseColor = new Color3(0.42, 0.34, 0.24);
  pm.specularColor = Color3.Black();
  path.material = pm;
  path.position.set(4, 0.02, -9.2);
  path.receiveShadows = true;

  const place = async (file: string, x: number, z: number, scale: number, yaw = 0): Promise<TransformNode> => {
    const c = await load(scene, `${HEX}${file}.gltf`);
    const e = c.instantiateModelsToScene((n) => `${file}_${x}_${z}_${n}`, false);
    const root = new TransformNode(`${file}_${x}_${z}`, scene);
    for (const n of e.rootNodes) n.parent = root;
    root.position.set(x, 0, z);
    root.rotation.y = yaw;
    root.scaling.setAll(scale);
    for (const m of root.getChildMeshes(false)) {
      m.receiveShadows = true;
      shadow.addShadowCaster(m);
      if (m.material instanceof PBRMaterial) { m.material.roughness = 0.9; m.material.metallic = 0; }
    }
    return root;
  };

  for (const lot of LOTS) await place(lot.file, lot.x, 0, BUILDING_SCALE, lot.yaw ?? Math.PI);

  // Dressing: what stands around a lived-in house. Props are at the people's own scale.
  const P = 3.2;
  await place('props/barrel', -35.2, -4.6, P);
  await place('props/crate_A_big', -34.0, -4.9, P, 0.4);
  await place('props/sack', -44.6, -4.4, P, 1.2);
  await place('props/bucket_water', -45.4, -3.6, P);
  await place('props/wheelbarrow', -21.0, -5.6, P, -0.6);
  await place('props/crate_long_A', -6.0, -6.4, P, 0.2);
  await place('props/barrel', -17.6, -6.2, P);
  await place('props/barrel', -16.5, -6.6, P);
  await place('props/weaponrack', 10.4, -5.4, P, -0.3);
  await place('props/resource_stone', -1.5, -5.8, P);
  await place('props/resource_lumber', 26.2, -5.2, P, 0.5);
  await place('props/bucket_empty', 35.6, -2.6, P);
  await place('props/target', 39.5, -4.5, P, 0.5);
  // Background: so the houses are judged against something, as they will be in the valley.
  for (const [f, x, z, s] of [
    ['nature/trees_A_large', -48, 16, 12], ['nature/trees_B_large', -20, 18, 12], ['nature/trees_A_medium', 12, 17, 12],
    ['nature/trees_B_large', 38, 16, 12], ['nature/tree_single_A', -33, 11, 11], ['nature/tree_single_B', 27, 10, 11],
    ['nature/trees_A_large', 58, 14, 12], ['nature/tree_single_A', -55, 6, 11],
    ['nature/hills_A_trees', -70, 80, 34], ['nature/hills_B_trees', 0, 95, 34], ['nature/hills_C_trees', 75, 85, 34],
    ['nature/mountain_A_grass_trees', -40, 170, 55], ['nature/mountain_B_grass', 55, 175, 55],
    ['nature/rock_single_B', -8, -11.5, 6], ['nature/rock_single_D', 17, -11.8, 6],
  ] as [string, number, number, number][]) await place(f, x, z, s);

  // Two people for scale, in the proportions Greg chose (column B), standing at each door in turn.
  const assets = await loadAssets(scene, () => undefined);
  const people: { root: TransformNode; player: ClipPlayer; reshape: () => void }[] = [];
  for (const [model, tint] of [[`${KAY}Ranger.glb`, [1, 1, 1]], [`${KAY}Barbarian.glb`, [0.6, 0.3, 0.25]]] as [string, number[]][]) {
    const c = assets.characters.get(model) ?? await load(scene, model);
    const e = c.instantiateModelsToScene((n) => n, true);
    const root = new TransformNode(`person_${model}`, scene);
    for (const r of e.rootNodes) r.parent = root;
    root.rotation.y = Math.PI;
    root.position.y = PROPORTIONS.legLength * (PROPORTIONS.leg - 1);
    const bones = nodeMap(e.rootNodes as Node[]);
    const bone = (n: string) => bones.get(n) as TransformNode;
    for (const m of root.getChildMeshes(false)) {
      if (m.material instanceof PBRMaterial) m.material.albedoColor = new Color3(tint[0], tint[1], tint[2]);
      m.renderOutline = true;
      m.outlineWidth = 0.011;
      m.outlineColor = new Color3(0.16, 0.1, 0.08);
      shadow.addShadowCaster(m);
    }
    const player = new ClipPlayer(bindClips(e.rootNodes, assets.clips, ['Idle_A'], `p_${model}`));
    people.push({
      root, player,
      reshape: () => {
        const Q = PROPORTIONS;
        bone('head').scaling.set(Q.head / Q.chestWidth, Q.head, Q.head);
        bone('chest').scaling.set(Q.chestWidth, 1, 1);
        for (const s of ['l', 'r']) { bone(`upperleg.${s}`).scaling.set(1, Q.leg, 1); bone(`foot.${s}`).scaling.set(1, 1 / Q.leg, 1); }
      },
    });
  }
  scene.onAfterAnimationsObservable.add(() => { for (const p of people) p.reshape(); });

  const camera = new FreeCamera('cam', new Vector3(0, 2, -20), scene);
  camera.minZ = 0.2;
  camera.maxZ = 400;

  const draw = (state: { tod?: number; view?: string; px?: number; pz?: number }): void => {
    const tod = state.tod ?? 12;
    const dusk = tod >= 18;
    scene.clearColor = dusk ? new Color4(0.9, 0.6, 0.42, 1) : new Color4(0.6, 0.76, 0.93, 1);
    scene.fogColor = dusk ? new Color3(0.86, 0.6, 0.46) : new Color3(0.7, 0.82, 0.93);
    hemi.intensity = dusk ? 0.75 : 0.85;
    hemi.diffuse = dusk ? new Color3(1, 0.8, 0.64) : new Color3(1, 1, 1);
    hemi.groundColor = dusk ? new Color3(0.42, 0.32, 0.36) : new Color3(0.42, 0.44, 0.42);
    sun.intensity = dusk ? 1.7 : 2.0;
    sun.diffuse = dusk ? new Color3(1, 0.64, 0.36) : new Color3(1, 0.97, 0.92);
    sun.direction = dusk ? new Vector3(0.75, -0.4, 0.5).normalize() : new Vector3(0.4, -1, 0.7).normalize();

    const view = state.view ?? 'row';
    const lot = LOTS.find((l) => l.id === view);
    const cx = lot?.x ?? 0;
    people[0].root.position.x = (state.px ?? cx - 1.4);
    people[0].root.position.z = state.pz ?? -5.2;
    people[1].root.position.x = (state.px ?? cx - 1.4) + 1.7;
    people[1].root.position.z = (state.pz ?? -5.2) + 0.1;
    if (lot) {
      camera.position.set(cx - 3, 2.4, -19);
      camera.setTarget(new Vector3(cx, 3.2, 0));
      camera.fov = 0.72;
    } else if (view === 'street') {
      camera.position.set(-52, 2.0, -11.5);
      camera.setTarget(new Vector3(-12, 3.6, -3));
      camera.fov = 0.85;
      people[0].root.position.set(-36, people[0].root.position.y, -8.6);
      people[1].root.position.set(-34.2, people[1].root.position.y, -8.2);
    } else {
      camera.position.set(3, 9, -50);
      camera.setTarget(new Vector3(3, 5.5, 0));
      camera.fov = 0.95;
    }
    for (const p of people) p.player.apply(scrub('Idle_A', 0.2));
    scene.render();
    scene.render();
  };

  const w = window as unknown as { __styletestReady?: boolean; __styletestSet?: typeof draw };
  w.__styletestSet = draw;
  draw({ tod: 12, view: 'row' });
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  w.__styletestReady = true;
}
