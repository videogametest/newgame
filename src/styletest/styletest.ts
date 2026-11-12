// Style test (task 002b): one row of candidate buildings, scenery and people, lit the way the valley will be.
// Reached only at ?styletest=1. A test sheet, not game content: nothing here is imported by the game.
// Hooks for the capture script: window.__styletestSet({ tod, view }) draws one frame; no wall clock plays.

import {
  AssetContainer, Color3, Color4, DirectionalLight, DynamicTexture, Engine,
  FreeCamera, HemisphericLight, ImageProcessingConfiguration, Material, MeshBuilder, PBRMaterial,
  PointLight, Scene, SceneLoader, ShadowGenerator, StandardMaterial, TransformNode, Vector3,
} from '@babylonjs/core';
import { assetUrl, bindClips, loadAssets, type LoadedAssets } from '../render/assets';
import { ClipPlayer, loop } from '../render/clips';

// ---------- shared palette: every kit's material goes through these ----------

const PALETTE = {
  ground: new Color3(0.42, 0.5, 0.3),
  path: new Color3(0.6, 0.52, 0.4),
  sky: new Color3(0.55, 0.72, 0.86),
  dusk: new Color3(0.86, 0.6, 0.45),
  night: new Color3(0.04, 0.06, 0.13),
  windowLit: new Color3(1, 0.72, 0.36),
  windowDark: new Color3(0.12, 0.14, 0.18),
};

/** Shared character tint, same rule as the game: a multiplier on the model's own colours. */
function tintMaterial(m: Material, rgb: [number, number, number]): void {
  const c = new Color3(rgb[0], rgb[1], rgb[2]);
  if (m instanceof PBRMaterial) m.albedoColor = c;
  else if (m instanceof StandardMaterial) m.diffuseColor = c;
}

// ---------- time of day: one function drives sun, sky, fog, lamps and windows ----------

export interface Lighting {
  sunDir: Vector3;
  sunIntensity: number;
  hemiIntensity: number;
  lit: boolean;
  sky: Color3;
}

/** Hours 0..24. Sunrise 6, noon 12, dusk 18.5, night 22. Pure: no scene access. */
export function lightingAt(tod: number): Lighting {
  const theta = ((tod - 6) / 12) * Math.PI;
  const elev = Math.sin(theta);
  const dayness = Math.min(1, Math.max(0, elev * 2.5));
  const duskness = Math.max(0, 1 - Math.abs(elev) * 4);
  const sky = Color3.Lerp(PALETTE.night, PALETTE.sky, dayness).scale(1);
  const skyDusk = Color3.Lerp(sky, PALETTE.dusk, duskness * 0.8);
  return {
    sunDir: new Vector3(0.45, -Math.max(0.15, elev), 0.6).normalize(),
    sunIntensity: 1.1 * dayness,
    hemiIntensity: 0.15 + 0.45 * dayness,
    lit: elev < 0.3,
    sky: skyDusk,
  };
}

// ---------- scene layout (metres; the row runs along x at z = 0) ----------

export type View = 'row-front' | 'row-quarter' | 'people-front' | 'people-quarter' | `item:${string}`;

interface Item {
  id: string;
  label: string;
  x: number;
  /** Where the hero stands for scale: in front of the item, facing the camera at -z. */
  heroX: number;
}

const ITEMS: Item[] = [
  { id: 'house-a', label: 'A  Kenney town house (stone and gable)', x: -24, heroX: -21.5 },
  { id: 'house-b', label: 'B  Kenney timber house', x: -18, heroX: -15.5 },
  { id: 'house-c', label: 'C  Kenney tall house', x: -12, heroX: -9.5 },
  { id: 'mill', label: 'Mill  Kenney watermill, scaled x3.5', x: -4, heroX: -1.5 },
  { id: 'forge', label: 'Forge  STAND-IN: Kenney chimney, no Hexagon forge', x: 4, heroX: 6.5 },
  { id: 'well', label: 'Well  STAND-IN: Kenney fountain', x: 9, heroX: 11.5 },
  { id: 'watch', label: 'Watch-house  STAND-IN: Kenney walls (no Castle Kit)', x: 16, heroX: 18.5 },
  { id: 'scenery', label: 'Scenery  Kenney trees, hedge, rocks, fence, lantern', x: 25, heroX: 22.5 },
];

const PEOPLE_Z = 12;
const PEOPLE_X0 = -21;
const PEOPLE_STEP = 2;

/** Clip players for every person, re-applied on each frame so the idle clip stays on. */
const PEOPLE_PLAYERS: ClipPlayer[] = [];

// ---------- Kenney modules: loaded once, placed by their measured bounds ----------

interface Placed {
  root: TransformNode;
  size: Vector3;
}

/** Instantiate a container under a holder whose bounds are centred on x/z with the base at y=0. */
function placeModel(scene: Scene, container: AssetContainer, name: string, shadow: ShadowGenerator): Placed {
  const entries = container.instantiateModelsToScene((n) => `${name}_${n}`, false);
  const root = new TransformNode(name, scene);
  for (const r of entries.rootNodes) r.parent = root;
  root.computeWorldMatrix(true);
  const { min, max } = root.getHierarchyBoundingVectors(true);
  const size = max.subtract(min);
  const centre = new Vector3((min.x + max.x) / 2, min.y, (min.z + max.z) / 2);
  for (const r of entries.rootNodes) {
    if (r instanceof TransformNode) r.position.subtractInPlace(centre);
  }
  for (const m of root.getChildMeshes(false)) {
    m.receiveShadows = true;
    shadow.addShadowCaster(m);
  }
  return { root, size };
}

/** Kenney containers, keyed by file name without extension. */
async function loadKenney(scene: Scene, names: string[]): Promise<Map<string, AssetContainer>> {
  const out = new Map<string, AssetContainer>();
  for (const n of names) {
    const url = assetUrl(`assets/kenney_fantasy_town/${n}.glb`);
    const cut = url.lastIndexOf('/');
    out.set(n, await SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene));
  }
  return out;
}

const KENNEY_FILES = [
  'wall', 'wall-door', 'wall-window-small', 'wall-doorway-square', 'wall-corner', 'wall-wood', 'wall-wood-door',
  'wall-wood-window-small', 'roof-gable', 'roof-high-gable', 'roof-high', 'roof-gable-end', 'chimney',
  'chimney-base', 'chimney-top', 'watermill', 'wheel', 'fountain-round', 'stall-bench', 'tree', 'tree-high',
  'tree-crooked', 'tree-high-crooked', 'hedge', 'rock-small', 'rock-large', 'fence', 'lantern',
];

// ---------- buildings ----------

/** A two-storey house, 4 m square, from 1 m wall modules. Door on the front (-z), a lit pane on the first floor. */
function buildHouse(
  scene: Scene, kit: Map<string, AssetContainer>, shadow: ShadowGenerator, tag: string,
  cx: number, cz: number, wallKit: string, roofKit: string, roofTiers: number,
): { panes: StandardMaterial[] } {
  const panes: StandardMaterial[] = [];
  const parent = new TransformNode(tag, scene);
  parent.position = new Vector3(cx, 0, cz);
  const at = (c: AssetContainer, n: string, x: number, y: number, z: number, yaw = 0): Placed => {
    const p = placeModel(scene, c, `${tag}_${n}_${x}_${y}_${z}`, shadow);
    p.root.parent = parent;
    p.root.position = new Vector3(x, y, z);
    p.root.rotation.y = yaw;
    return p;
  };
  const wall = kit.get(wallKit)!;
  const door = kit.get('wall-door')!;
  const win = kit.get('wall-window-small')!;
  for (let level = 0; level < 2; level += 1) {
    const y = level;
    // Front (-z): door on the ground floor; window on the ground floor at the far right, the lit pane on the first floor.
    for (const x of [-1.5, 0.5, 1.5]) at(wall, 'front', x, y, -2);
    if (level === 0) at(door, 'door', -0.5, y, -2);
    else at(win, 'front-win', -0.5, y, -2);
    // Back (+z) and sides.
    for (const x of [-1.5, -0.5, 0.5, 1.5]) at(wall, 'back', x, y, 2);
    for (const z of [-1.5, -0.5, 0.5, 1.5]) {
      at(wall, 'left', -2, y, z, Math.PI / 2);
      at(wall, 'right', 2, y, z, Math.PI / 2);
    }
  }
  // Roof: gable pieces across the top, one row per tier of the roof kit.
  const roof = kit.get(roofKit)!;
  for (let t = 0; t < roofTiers; t += 1) {
    for (const x of [-1.5, -0.5, 0.5, 1.5]) at(roof, 'roof', x, 2 + t * 0.6, 0);
  }
  // The lit pane: a separate emissive quad over the first-floor window opening.
  const glass = new StandardMaterial(`${tag}_glass`, scene);
  glass.emissiveColor = PALETTE.windowDark;
  glass.diffuseColor = PALETTE.windowDark;
  glass.specularColor = Color3.Black();
  panes.push(glass);
  const pane = MeshBuilder.CreatePlane(`${tag}_pane`, { width: 0.55, height: 0.6 }, scene);
  pane.parent = parent;
  pane.position = new Vector3(-0.5, 1.45, -2.08);
  pane.material = glass;
  return { panes };
}

function buildMill(scene: Scene, kit: Map<string, AssetContainer>, shadow: ShadowGenerator, cx: number, cz: number): { wheel: TransformNode; axis: 'x' | 'y' | 'z' } {
  const mill = placeModel(scene, kit.get('watermill')!, 'mill', shadow);
  mill.root.position = new Vector3(cx, 0, cz);
  mill.root.scaling.setAll(3.5);
  const wheel = placeModel(scene, kit.get('wheel')!, 'mill_wheel', shadow);
  wheel.root.scaling.setAll(5);
  // Hang the wheel on the mill's side, facing the camera (-z). Its thinnest axis is its axle.
  wheel.root.position = new Vector3(cx + 2.4, 2.2, cz - 1.2);
  const { x, y, z } = wheel.size;
  const axis: 'x' | 'y' | 'z' = x <= y && x <= z ? 'x' : y <= z ? 'y' : 'z';
  return { wheel: wheel.root, axis };
}

function buildForge(scene: Scene, kit: Map<string, AssetContainer>, shadow: ShadowGenerator, cx: number, cz: number): void {
  const base = placeModel(scene, kit.get('chimney-base')!, 'forge_base', shadow);
  base.root.position = new Vector3(cx, 0, cz);
  base.root.scaling.setAll(1.6);
  const top = placeModel(scene, kit.get('chimney-top')!, 'forge_top', shadow);
  top.root.position = new Vector3(cx, 2.2, cz);
  top.root.scaling.setAll(1.6);
  const bench = placeModel(scene, kit.get('stall-bench')!, 'forge_bench', shadow);
  bench.root.position = new Vector3(cx + 1.8, 0, cz - 0.6);
  bench.root.scaling.setAll(1.4);
}

function buildWell(scene: Scene, kit: Map<string, AssetContainer>, shadow: ShadowGenerator, cx: number, cz: number): void {
  const w = placeModel(scene, kit.get('fountain-round')!, 'well', shadow);
  w.root.position = new Vector3(cx, 0, cz);
  w.root.scaling.setAll(0.8);
}

function buildWatch(scene: Scene, kit: Map<string, AssetContainer>, shadow: ShadowGenerator, cx: number, cz: number): void {
  // A three-tier stack of corner modules stands in for a tower; a run of walls with a square gate in the middle.
  for (let tier = 0; tier < 3; tier += 1) {
    const t = placeModel(scene, kit.get('wall-corner')!, `watch_tower_${tier}`, shadow);
    t.root.position = new Vector3(cx - 2.5, tier, cz);
  }
  for (const x of [-1.5, -0.5, 0.5]) {
    const p = placeModel(scene, kit.get('wall')!, `watch_wall_${x}`, shadow);
    p.root.position = new Vector3(cx + x * 1 + 0.5, 0, cz);
  }
  const gate = placeModel(scene, kit.get('wall-doorway-square')!, 'watch_gate', shadow);
  gate.root.position = new Vector3(cx + 2.5, 0, cz);
  gate.root.rotation.y = Math.PI / 2;
}

function buildScenery(scene: Scene, kit: Map<string, AssetContainer>, shadow: ShadowGenerator, cx: number, cz: number): { lanterns: TransformNode[] } {
  const lanterns: TransformNode[] = [];
  const placeAt = (n: string, x: number, z: number, s = 1, yaw = 0): TransformNode => {
    const p = placeModel(scene, kit.get(n)!, `scn_${n}_${x}_${z}`, shadow);
    p.root.position = new Vector3(cx + x, 0, cz + z);
    p.root.scaling.setAll(s);
    p.root.rotation.y = yaw;
    return p.root;
  };
  placeAt('tree', -3, 1.5);
  placeAt('tree-high', 0, 2, 1, 0.6);
  placeAt('tree-crooked', 3, 1.2, 1, 1.3);
  placeAt('tree-high-crooked', 2, 4);
  placeAt('hedge', -2, 4.5);
  placeAt('hedge', -1, 4.5, 1, Math.PI / 2);
  placeAt('rock-small', -4, 3.6, 1, 0.4);
  placeAt('rock-large', 4.5, 3.8, 1, 1.1);
  for (let i = 0; i < 4; i += 1) placeAt('fence', -4 + i, -1.5);
  lanterns.push(placeAt('lantern', 0.5, -1.2));
  return { lanterns };
}

// ---------- people (KayKit only: Quaternius group blocked) ----------

interface Person {
  label: string;
  model: string;
  tint: [number, number, number];
  clip: string;
}

const PEOPLE: Person[] = [
  { label: 'Hero (Ranger)', model: 'assets/kaykit_adventurers/characters/Ranger.glb', tint: [1, 1, 1], clip: 'Idle_A' },
  { label: 'Hesper (Mage)', model: 'assets/kaykit_adventurers/characters/Mage.glb', tint: [1, 1, 1], clip: 'Idle_A' },
  { label: 'Stane (Knight, blue-grey)', model: 'assets/kaykit_adventurers/characters/Knight.glb', tint: [0.6, 0.7, 0.9], clip: 'Idle_A' },
  { label: 'Bram (Knight, gold)', model: 'assets/kaykit_adventurers/characters/Knight.glb', tint: [1, 0.85, 0.5], clip: 'Idle_A' },
  { label: 'Villager (Barbarian, tan)', model: 'assets/kaykit_adventurers/characters/Barbarian.glb', tint: [0.95, 0.8, 0.6], clip: 'Idle_A' },
  { label: 'Villager (Rogue Hooded, green)', model: 'assets/kaykit_adventurers/characters/Rogue_Hooded.glb', tint: [0.6, 0.85, 0.6], clip: 'Idle_A' },
  { label: 'Villager (Rogue, lilac)', model: 'assets/kaykit_adventurers/characters/Rogue.glb', tint: [0.85, 0.7, 0.95], clip: 'Idle_A' },
  { label: 'Bandit (Barbarian, dark red)', model: 'assets/kaykit_adventurers/characters/Barbarian.glb', tint: [0.5, 0.2, 0.15], clip: 'Idle_A' },
  { label: 'Bandit (Rogue Hooded, charcoal)', model: 'assets/kaykit_adventurers/characters/Rogue_Hooded.glb', tint: [0.25, 0.25, 0.28], clip: 'Idle_A' },
  { label: 'Bandit (Knight, olive)', model: 'assets/kaykit_adventurers/characters/Knight.glb', tint: [0.45, 0.5, 0.2], clip: 'Idle_A' },
];

/** One character, idle, tinted. Returns the clip player so the frame can pin the pose. */
function spawnPerson(scene: Scene, containers: Map<string, AssetContainer>, clips: LoadedAssets['clips'], p: Person, tag: string, x: number, z: number, yaw: number): void {
  const c = containers.get(p.model);
  if (!c) throw new Error(`Styletest: model not loaded ${p.model}`);
  const entries = c.instantiateModelsToScene((n) => `${tag}_${n}`, true);
  const root = new TransformNode(tag, scene);
  for (const r of entries.rootNodes) r.parent = root;
  root.position = new Vector3(x, 0, z);
  root.rotation.y = yaw;
  for (const m of root.getChildMeshes(false)) {
    if (m.material) tintMaterial(m.material, p.tint);
  }
  const player = new ClipPlayer(bindClips(entries.rootNodes, clips, [p.clip], tag));
  player.apply(loop(p.clip));
  for (const m of root.getChildMeshes(false)) m.receiveShadows = true;
  PEOPLE_PLAYERS.push(player);
}

// ---------- labels: a board on a post, readable at night ----------

function buildSign(scene: Scene, text: string, x: number, z: number): void {
  const post = MeshBuilder.CreateBox(`sign_post_${x}_${z}`, { width: 0.08, height: 1.3, depth: 0.08 }, scene);
  post.position = new Vector3(x, 0.65, z);
  const board = MeshBuilder.CreatePlane(`sign_${x}_${z}`, { width: 3.6, height: 0.5 }, scene);
  board.position = new Vector3(x, 1.45, z - 0.06);
  const tex = new DynamicTexture(`sign_tex_${x}_${z}`, { width: 1024, height: 144 }, scene, false);
  tex.hasAlpha = false;
  tex.drawText(text, null, 92, 'bold 46px sans-serif', '#1d1d1d', '#f1e6c8', true);
  const mat = new StandardMaterial(`sign_mat_${x}_${z}`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.specularColor = Color3.Black();
  board.material = mat;
  board.rotation.y = Math.PI;
  post.material = mat;
}

// ---------- the scene ----------

export interface StyletestWindow {
  __styletestReady?: boolean;
  __styletestSet?: (state: { tod?: number; view?: View }) => void;
}

export async function startStyletest(canvas: HTMLCanvasElement): Promise<void> {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const scene = new Scene(engine);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.0;
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 45;
  scene.fogEnd = 130;
  scene.fogColor = PALETTE.sky;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.groundColor = new Color3(0.25, 0.22, 0.2);
  const sun = new DirectionalLight('sun', new Vector3(0, -1, 0), scene);
  sun.position = new Vector3(-30, 45, -40);
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 140;
  const shadow = new ShadowGenerator(2048, sun);
  shadow.usePercentageCloserFiltering = true;
  shadow.darkness = 0.35;

  const ground = MeshBuilder.CreateGround('ground', { width: 70, height: 36 }, scene);
  const groundMat = new StandardMaterial('ground_mat', scene);
  groundMat.diffuseColor = PALETTE.ground;
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;
  ground.receiveShadows = true;
  const path = MeshBuilder.CreateGround('path', { width: 70, height: 2.2 }, scene);
  path.position.z = 1.3;
  const pathMat = new StandardMaterial('path_mat', scene);
  pathMat.diffuseColor = PALETTE.path;
  pathMat.specularColor = Color3.Black();
  path.material = pathMat;
  path.receiveShadows = true;

  const kit = await loadKenney(scene, KENNEY_FILES);
  const assets = await loadAssets(scene, () => undefined);
  const containers = new Map<string, AssetContainer>();
  for (const p of PEOPLE) {
    if (containers.has(p.model)) continue;
    const url = assetUrl(p.model);
    const cut = url.lastIndexOf('/');
    containers.set(p.model, await SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene));
  }
  // Ranger, Knight, Barbarian and Rogue are already in the shared load; the rest load above.
  for (const [k, c] of [...assets.characters]) if (!containers.has(k)) containers.set(k, c);

  // Buildings.
  const houses = [
    buildHouse(scene, kit, shadow, 'house_a', ITEMS[0].x, 0, 'wall', 'roof-gable', 1),
    buildHouse(scene, kit, shadow, 'house_b', ITEMS[1].x, 0, 'wall-wood', 'roof-gable', 1),
    buildHouse(scene, kit, shadow, 'house_c', ITEMS[2].x, 0, 'wall', 'roof-high-gable', 2),
  ];
  const panes = houses.flatMap((h) => h.panes);
  const mill = buildMill(scene, kit, shadow, ITEMS[3].x, 0);
  buildForge(scene, kit, shadow, ITEMS[4].x, 0);
  buildWell(scene, kit, shadow, ITEMS[5].x, 0);
  buildWatch(scene, kit, shadow, ITEMS[6].x, 0);
  const scenery = buildScenery(scene, kit, shadow, ITEMS[7].x, 0);

  // Labels.
  for (const it of ITEMS) buildSign(scene, it.label, it.x, -3.2);

  // Hero beside each item, facing the camera (-z): the model faces +z, so yaw pi turns it around.
  const heroModel = PEOPLE[0];
  for (const it of ITEMS) spawnPerson(scene, containers, assets.clips, heroModel, `hero_${it.id}`, it.heroX, -2.6, Math.PI);

  // The people group, a few metres behind the row, facing the camera (-z).
  PEOPLE.forEach((p, i) => {
    spawnPerson(scene, containers, assets.clips, p, `person_${i}`, PEOPLE_X0 + i * PEOPLE_STEP, PEOPLE_Z, Math.PI);
  });
  buildSign(scene, 'KayKit people: hero, Hesper, Stane and Bram, 3 villagers, 3 bandits. Quaternius group: blocked', PEOPLE_X0 + 4 * PEOPLE_STEP, PEOPLE_Z - 2.5);

  // Camera.
  const camera = new FreeCamera('styletest_cam', new Vector3(0, 4, -30), scene);
  camera.minZ = 0.1;
  camera.maxZ = 400;
  scene.activeCamera = camera;

  const lanternLight = new PointLight('lantern_light', scenery.lanterns[0].position.add(new Vector3(0, 1.5, 0)), scene);
  lanternLight.diffuse = PALETTE.windowLit;
  lanternLight.range = 9;

  const applyTime = (tod: number): void => {
    const L = lightingAt(tod);
    sun.direction = L.sunDir;
    sun.intensity = L.sunIntensity;
    hemi.intensity = L.hemiIntensity;
    const sky = L.sky;
    scene.clearColor = new Color4(sky.r, sky.g, sky.b, 1);
    scene.fogColor = sky;
    for (const m of panes) {
      m.emissiveColor = L.lit ? PALETTE.windowLit : PALETTE.windowDark;
      m.diffuseColor = L.lit ? PALETTE.windowLit : PALETTE.windowDark;
    }
    lanternLight.intensity = L.lit ? 1.2 : 0;
  };

  const applyView = (view: View): void => {
    const row = (x: number, y: number, z: number, tx: number, ty: number, tz: number, fov: number): void => {
      camera.position = new Vector3(x, y, z);
      camera.setTarget(new Vector3(tx, ty, tz));
      camera.fov = fov;
    };
    if (view === 'row-front') row(-2, 6, -34, -2, 2.5, 0, 0.62);
    else if (view === 'row-quarter') row(-36, 9, -24, -4, 2, 0, 0.62);
    else if (view === 'people-front') row(-12, 2.1, 4.5, -12, 1.2, PEOPLE_Z, 0.5);
    else if (view === 'people-quarter') row(-21, 2.6, 5, -12, 1.2, PEOPLE_Z, 0.55);
    else {
      const id = view.slice('item:'.length);
      const it = ITEMS.find((i) => i.id === id);
      if (!it) throw new Error(`Styletest: no item ${id}`);
      row(it.x + 1, 2.4, -9, it.x + 1, 1.6, 0, 0.62);
    }
  };

  let tod = 12;
  let view: View = 'row-front';
  // One frame for the given state. The wheel turns by a fixed angle per hour, so captures repeat exactly.
  const draw = (state: { tod?: number; view?: View }): void => {
    if (state.tod !== undefined) tod = state.tod;
    if (state.view !== undefined) view = state.view;
    applyTime(tod);
    applyView(view);
    mill.wheel.rotation[mill.axis] = (tod / 24) * Math.PI * 4;
    scene.render();
  };

  window.addEventListener('resize', () => engine.resize());
  const w = window as unknown as StyletestWindow;
  w.__styletestSet = draw;
  draw({ tod: 12, view: 'row-front' });
  w.__styletestReady = true;
  engine.runRenderLoop(() => scene.render());
}
