// Style test (task 002b, reworked after review 003): one row of candidate buildings, scenery and people,
// lit the way the valley will be. Reached only at ?styletest=1. A test sheet, not game content: nothing here
// is imported by the game. Hooks for the capture script: window.__styletestSet({ tod, view }) draws one
// frame (no wall clock plays); window.__styletestReady is set once the scene is built.

import {
  AssetContainer, Color3, Color4, DirectionalLight, DynamicTexture, Engine, FreeCamera, GlowLayer,
  HemisphericLight, ImageProcessingConfiguration, Material, Mesh, MeshBuilder, PBRMaterial, PointLight,
  Scene, SceneLoader, ShadowGenerator, StandardMaterial, TransformNode, Vector3, VertexData,
} from '@babylonjs/core';
import { assetUrl, bindClips, loadAssets, type LoadedAssets } from '../render/assets';
import { ClipPlayer, scrub } from '../render/clips';
import { PALETTE, lightingAt, type Lighting } from '../render/lighting';

const css = (c: Color3): string => `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;

/** Shared character tint, same rule as the game: a multiplier on the model's own colours. */
function tintMaterial(m: Material, rgb: [number, number, number]): void {
  const c = new Color3(rgb[0], rgb[1], rgb[2]);
  if (m instanceof PBRMaterial) m.albedoColor = c;
  else if (m instanceof StandardMaterial) m.diffuseColor = c;
}

// ---------- layout (metres; the row runs along x at z = 0; the camera looks along +z from -z) ----------

export type View =
  | 'row-west'
  | 'row-east'
  | 'row-quarter'
  | 'people-front'
  | 'people-quarter'
  | 'villagers-front'
  | 'doorway'
  | `item:${string}`;

interface Item {
  id: string;
  label: string;
  /** Short text for the board on the post. */
  short: string;
  /** Centre of the item, in metres along the row. */
  x: number;
  /**
   * Where the hero stands for scale: 6 m to one side of the item, side on (yaw 90 degrees), in front of it.
   * The camera for the item is centred on the item, so the hero sits near the frame edge.
   */
  heroX: number;
}

const ITEMS: Item[] = [
  { id: 'house-a', label: 'A  Stone town house', short: 'A  Stone house', x: -40, heroX: -46 },
  { id: 'house-b', label: 'B  Timber house', short: 'B  Timber house', x: -27, heroX: -33 },
  { id: 'house-c', label: 'C  Tall stone house', short: 'C  Tall stone house', x: -14, heroX: -20 },
  { id: 'mill', label: 'Mill  closed mill, watermill wheel on the east wall', short: 'Mill', x: -1, heroX: -7 },
  { id: 'forge', label: 'Forge  stone smithy, open lean-to, anvil', short: 'Forge', x: 13.5, heroX: 7.5 },
  { id: 'well', label: 'Well  stone ring, small roof on posts', short: 'Well', x: 26, heroX: 20 },
  { id: 'watch', label: 'Watch-house  stone tower in a walled yard', short: 'Watch-house', x: 41, heroX: 35 },
  { id: 'scenery', label: 'Scenery  trees, hedge, rocks, fence, lantern', short: 'Scenery', x: 62, heroX: 56 },
];

/** Hero depth for item views: in front of every item, clear of the yard walls and the light pools. */
const HERO_Z = -9;
/** Doorway view: the front opening of house A (its door is centred on x = -40, on the front wall face). */
const DOORWAY = { x: -40, z: -4.05, personIndex: 4 };
const PEOPLE_Z = 12;
const PEOPLE_X0 = -20;
const PEOPLE_STEP = 1.8;
/** Villager pairs (front on, noon): adventurer at x, its villager at x + PAIR_GAP. */
const PAIR_X0 = -6;
const PAIR_STEP = 3.2;
const PAIR_GAP = 1.4;
const SIGN_Z = -9.5;

/**
 * Kit scale (review 008): the Fantasy Town kit is built in 1 m modules, and a storey is 2.6 to 2.8 m, so every
 * kit piece and every building cell is drawn at M metres per module. Positions in cell units are multiplied by M.
 */
const M = 2.7;

/** Closed buildings from the Fantasy Town kit, in cell units (one cell is M metres). */
interface BuildingSpec {
  w: number;
  d: number;
  floors: number;
  walls: 'stone' | 'wood';
  high: boolean;
  chimney?: boolean;
  /** Open front: the ground-floor door is an open doorway, and the interior floor is drawn. */
  open?: boolean;
}

const BUILDINGS: Record<string, BuildingSpec> = {
  'house-a': { w: 3, d: 3, floors: 2, walls: 'stone', high: false, open: true },
  'house-b': { w: 3, d: 2, floors: 2, walls: 'wood', high: false },
  'house-c': { w: 3, d: 2, floors: 3, walls: 'stone', high: true },
  mill: { w: 3, d: 2, floors: 2, walls: 'wood', high: false },
  forge: { w: 3, d: 2, floors: 1, walls: 'stone', high: false, chimney: true },
  watch: { w: 3, d: 3, floors: 4, walls: 'stone', high: true },
};

interface Person {
  label: string;
  model: string;
  tint: [number, number, number];
  clip: string;
  /** Mesh names to hide (armour, capes, weapons), matched case-insensitively. */
  hide?: RegExp;
}

const KAY = 'assets/kaykit_adventurers/characters/';
/** Exact KayKit armour, cape, hat and mask meshes (names read from the glTF files). */
const VILLAGER_HIDE = /(^|_)(Knight_Cape|Knight_Helmet|Knight_HelmetVisor|Barbarian_BearHat|Mage_Cape|Mage_Hat|Rogue_Cape|RogueHooded_Cape|RogueHooded_Mask)/;

const PEOPLE: Person[] = [
  { label: 'Hero (Ranger)', model: `${KAY}Ranger.glb`, tint: [1, 1, 1], clip: 'Idle_A' },
  { label: 'Hesper (Mage)', model: `${KAY}Mage.glb`, tint: [1, 1, 1], clip: 'Idle_A' },
  { label: 'Stane (Knight, blue-grey)', model: `${KAY}Knight.glb`, tint: [0.6, 0.7, 0.9], clip: 'Idle_A' },
  { label: 'Bram (Knight, gold)', model: `${KAY}Knight.glb`, tint: [1, 0.85, 0.5], clip: 'Idle_A' },
  { label: 'Bandit (Barbarian, dark red)', model: `${KAY}Barbarian.glb`, tint: [0.5, 0.2, 0.15], clip: 'Idle_A' },
  { label: 'Bandit (Rogue Hooded, charcoal)', model: `${KAY}Rogue_Hooded.glb`, tint: [0.25, 0.25, 0.28], clip: 'Idle_A' },
  { label: 'Bandit (Knight, olive)', model: `${KAY}Knight.glb`, tint: [0.45, 0.5, 0.2], clip: 'Idle_A' },
  { label: 'Rogue (lilac)', model: `${KAY}Rogue.glb`, tint: [0.85, 0.7, 0.95], clip: 'Idle_A' },
  { label: 'Barbarian (tan)', model: `${KAY}Barbarian.glb`, tint: [0.95, 0.8, 0.6], clip: 'Idle_A' },
  { label: 'Rogue Hooded (green)', model: `${KAY}Rogue_Hooded.glb`, tint: [0.6, 0.85, 0.6], clip: 'Idle_A' },
];

/** Villagers: the same KayKit bodies with armour, capes and weapons hidden and plain recoloured clothes. */
const VILLAGERS: Person[] = [
  { label: 'Villager (Barbarian, plain tan)', model: `${KAY}Barbarian.glb`, tint: [0.9, 0.78, 0.6], clip: 'Idle_A', hide: VILLAGER_HIDE },
  { label: 'Villager (Rogue Hooded, plain grey)', model: `${KAY}Rogue_Hooded.glb`, tint: [0.7, 0.68, 0.62], clip: 'Idle_A', hide: VILLAGER_HIDE },
  { label: 'Villager (Mage, plain brown)', model: `${KAY}Mage.glb`, tint: [0.7, 0.55, 0.4], clip: 'Idle_A', hide: VILLAGER_HIDE },
  { label: 'Villager (Rogue, plain blue)', model: `${KAY}Rogue.glb`, tint: [0.5, 0.6, 0.75], clip: 'Idle_A', hide: VILLAGER_HIDE },
];

/** The four adventurers the villagers are made from, in the same order as VILLAGERS, in their default colours. */
const PAIR_ADVENTURERS: Person[] = [
  { label: 'Barbarian (KayKit original)', model: `${KAY}Barbarian.glb`, tint: [1, 1, 1], clip: 'Idle_A' },
  { label: 'Rogue Hooded (KayKit original)', model: `${KAY}Rogue_Hooded.glb`, tint: [1, 1, 1], clip: 'Idle_A' },
  { label: 'Mage (KayKit original)', model: `${KAY}Mage.glb`, tint: [1, 1, 1], clip: 'Idle_A' },
  { label: 'Rogue (KayKit original)', model: `${KAY}Rogue.glb`, tint: [1, 1, 1], clip: 'Idle_A' },
];

const KENNEY_FILES = [
  'wall', 'wall-door', 'wall-doorway-square', 'wall-window-small', 'wall-corner', 'wall-wood', 'wall-wood-door', 'wall-wood-window-small',
  'roof-gable', 'watermill', 'wheel', 'chimney-base', 'stall-bench', 'fountain-round', 'tree', 'tree-high', 'tree-crooked',
  'tree-high-crooked', 'hedge', 'rock-small', 'rock-large', 'fence',
];

// ---------- shared build context ----------

interface Ctx {
  scene: Scene;
  kit: Map<string, AssetContainer>;
  shadow: ShadowGenerator;
  paneMat: StandardMaterial;
  glassMat: StandardMaterial;
  roofMat: Material;
  woodMat: StandardMaterial;
  floorMat: StandardMaterial;
  /** Strong pool (in front of lit doors) and faint pool (under upper windows). */
  poolMat: StandardMaterial;
  poolMatFaint: StandardMaterial;
  /** Meshes that glow at night (lit panes and lantern glass). */
  glowMeshes: Mesh[];
  /** Ground light pools: visible at night only. */
  pools: Mesh[];
  n: number;
  /** Door modules as placed (scaled), for the door-height check. */
  doors: { tag: string; height: number; width: number }[];
}

interface PlaceOpts {
  yaw?: number;
  scale?: number;
  /** 'base': the lowest point sits at y. 'centre': the middle of the box sits at y. */
  anchor?: 'base' | 'centre';
}

interface Placed {
  root: TransformNode;
  size: Vector3;
}

/**
 * Places a kit piece so the centre of its footprint lands on (x, z). Yaw and scale apply first, so the
 * footprint is measured as it will be drawn. Because the target is the cell edge for walls, panels sit on
 * the edge and join their neighbours with no gap.
 */
function placeOn(ctx: Ctx, kitName: string, tag: string, x: number, z: number, y: number, opts: PlaceOpts = {}): Placed {
  const container = ctx.kit.get(kitName);
  if (!container) throw new Error(`Styletest: kit piece not loaded ${kitName}`);
  const name = `${tag}_${ctx.n++}`;
  const entries = container.instantiateModelsToScene((n) => n, false);
  const root = new TransformNode(name, ctx.scene);
  for (const r of entries.rootNodes) r.parent = root;
  root.scaling.setAll(opts.scale ?? 1);
  root.rotation.y = opts.yaw ?? 0;
  root.position.set(0, 0, 0);
  root.computeWorldMatrix(true);
  const { min, max } = root.getHierarchyBoundingVectors(true);
  const size = max.subtract(min);
  const cx = (min.x + max.x) / 2;
  const cz = (min.z + max.z) / 2;
  const anchorY = opts.anchor === 'centre' ? (min.y + max.y) / 2 : min.y;
  root.position.set(x - cx, y - anchorY, z - cz);
  root.computeWorldMatrix(true);
  for (const m of root.getChildMeshes(false)) {
    m.receiveShadows = true;
    ctx.shadow.addShadowCaster(m);
  }
  return { root, size };
}

/** Cell centres across a footprint of w metres, as offsets from the building centre: w=3 gives -1, 0, 1. */
function cellCentres(w: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < w; i += 1) out.push(-w / 2 + 0.5 + i);
  return out;
}

/** A gable roof on the wall tops: ridge along x, eaves overhang the walls. Built procedurally because the kit's roof tile is 1 m deep. */
function gableRoof(ctx: Ctx, tag: string, cx: number, cz: number, w: number, d: number, eave: number, rise: number): void {
  const W = w / 2 + 0.2;
  const D = d / 2 + 0.25;
  const ridge = eave + rise;
  const fl: [number, number, number] = [cx - W, eave, cz - D];
  const fr: [number, number, number] = [cx + W, eave, cz - D];
  const bl: [number, number, number] = [cx - W, eave, cz + D];
  const br: [number, number, number] = [cx + W, eave, cz + D];
  const rl: [number, number, number] = [cx - W, ridge, cz];
  const rr: [number, number, number] = [cx + W, ridge, cz];
  const tris = [fl, fr, rr, fl, rr, rl, rl, rr, br, rl, br, bl, fl, rl, bl, fr, br, rr];
  const positions = tris.flat();
  const indices = tris.map((_, i) => i);
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const uvs: number[] = [];
  for (let i = 0; i < tris.length / 3; i += 1) uvs.push(0, 0, 1, 0, 0.5, 1);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  vd.uvs = uvs;
  const mesh = new Mesh(`${tag}_${ctx.n++}`, ctx.scene);
  vd.applyToMesh(mesh);
  mesh.material = ctx.roofMat;
  mesh.receiveShadows = true;
  ctx.shadow.addShadowCaster(mesh);
}

/** A closed building: corners, walls on every edge, a door on the front ground floor, windows above. */
function buildBlock(ctx: Ctx, tag: string, cx: number, cz: number, spec: BuildingSpec): void {
  const stone = spec.walls === 'stone';
  const wallK = stone ? 'wall' : 'wall-wood';
  const doorK = stone ? 'wall-door' : 'wall-wood-door';
  // An open doorway has no door leaf, so the interior floor and the room behind it show through the opening.
  const openK = 'wall-doorway-square';
  const winK = stone ? 'wall-window-small' : 'wall-wood-window-small';
  const xs = cellCentres(spec.w);
  const zs = cellCentres(spec.d);
  const xMid = xs.slice(1, -1);
  const zMid = zs.slice(1, -1);
  const frontZ = -spec.d / 2;
  const backZ = spec.d / 2;
  const westX = -spec.w / 2;
  const eastX = spec.w / 2;
  // x, z, y are in cell units: each is multiplied by M, and the kit module is drawn at scale M.
  const put = (k: string, x: number, z: number, y: number, yaw: number): void => {
    const placed = placeOn(ctx, k, tag, cx + x * M, cz + z * M, y * M, { yaw, scale: M });
    if (k === doorK || k === openK) ctx.doors.push({ tag, height: placed.size.y, width: placed.size.x > placed.size.z ? placed.size.x : placed.size.z });
  };
  for (let f = 0; f < spec.floors; f += 1) {
    for (const x of [xs[0], xs[xs.length - 1]]) {
      for (const z of [zs[0], zs[zs.length - 1]]) put('wall-corner', x, z, f, 0);
    }
    // Front (-z) faces the camera; back (+z) is the far side. Walls along x use yaw +-pi/2.
    for (const x of xMid) {
      const mid = Math.abs(x) < 1e-6;
      if (mid && f === 0) put(spec.open ? openK : doorK, x, frontZ, f, Math.PI / 2);
      else if (mid && f > 0) put(winK, x, frontZ, f, Math.PI / 2);
      else put(wallK, x, frontZ, f, Math.PI / 2);
      if (mid && f > 0) put(winK, x, backZ, f, -Math.PI / 2);
      else put(wallK, x, backZ, f, -Math.PI / 2);
    }
    for (const z of zMid) {
      put(wallK, westX, z, f, Math.PI);
      put(wallK, eastX, z, f, 0);
    }
    // Lit panes: a glowing quad in each upper-floor window opening, front and back.
    if (f > 0) {
      const pane = 0.5 * M;
      const front = MeshBuilder.CreatePlane(`${tag}_paneF_${ctx.n++}`, { width: pane, height: pane }, ctx.scene);
      front.position.set(cx, (f + 0.45) * M, cz + frontZ * M - 0.06 * M);
      front.material = ctx.paneMat;
      const back = MeshBuilder.CreatePlane(`${tag}_paneB_${ctx.n++}`, { width: pane, height: pane }, ctx.scene);
      back.position.set(cx, (f + 0.45) * M, cz + backZ * M + 0.06 * M);
      back.rotation.y = Math.PI;
      back.material = ctx.paneMat;
      ctx.glowMeshes.push(front, back);
    }
  }
  if (spec.open) {
    // Interior floor across the whole footprint at ground level; the walls stand on its edges.
    const floor = MeshBuilder.CreateGround(`${tag}_floor`, { width: spec.w * M, height: spec.d * M }, ctx.scene);
    floor.position.set(cx, 0.04, cz);
    floor.material = ctx.floorMat;
    floor.receiveShadows = true;
  }
  gableRoof(ctx, `${tag}_roof`, cx, cz, spec.w * M, spec.d * M, spec.floors * M, (spec.high ? 1.3 : 0.9) * M);
  if (spec.chimney) {
    // Stands about a metre proud of the ridge.
    placeOn(ctx, 'chimney-base', `${tag}_chimney`, cx + 0.8 * M, cz + 0.2 * M, spec.floors * M, { scale: 1.1 * M });
  }
  // Light falls from the lit door (strong) and from the front upper windows (faint) onto the ground in front.
  addPool(ctx, cx, cz + frontZ * M - 0.9, ctx.poolMat);
  if (spec.floors > 1) addPool(ctx, cx, cz + frontZ * M - 1.8, ctx.poolMatFaint);
}

/** Warm light pool on the ground. Visible at night only; alpha follows nightness in applyLighting. */
function addPool(ctx: Ctx, x: number, z: number, mat: StandardMaterial): void {
  const pool = MeshBuilder.CreatePlane(`pool_${ctx.n++}`, { size: 3.6 }, ctx.scene);
  pool.rotation.x = Math.PI / 2;
  pool.position.set(x, 0.03, z);
  pool.material = mat;
  pool.isPickable = false;
  ctx.pools.push(pool);
}

/** A flat four-sided panel from four corners (two triangles), double sided: used for sloped roofs. */
function quadPanel(ctx: Ctx, tag: string, a: number[], b: number[], c: number[], d: number[]): void {
  const positions = [...a, ...b, ...c, ...a, ...c, ...d];
  const indices = [0, 1, 2, 3, 4, 5];
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  vd.uvs = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
  const mesh = new Mesh(`${tag}_${ctx.n++}`, ctx.scene);
  vd.applyToMesh(mesh);
  mesh.material = ctx.roofMat;
  mesh.receiveShadows = true;
  ctx.shadow.addShadowCaster(mesh);
}

/** A round wooden post, from the ground to height h. */
function woodPost(ctx: Ctx, tag: string, x: number, z: number, h: number): void {
  const post = MeshBuilder.CreateCylinder(`${tag}_${ctx.n++}`, { height: h, diameter: 0.14, tessellation: 8 }, ctx.scene);
  post.position.set(x, h / 2, z);
  post.material = ctx.woodMat;
  post.receiveShadows = true;
  ctx.shadow.addShadowCaster(post);
}

/**
 * Mill: a closed wooden mill, two floors. The kit's watermill wheel hangs on the east wall: its axle runs along x,
 * so its disc is parallel to the wall, and its top stays below the wall top.
 */
function buildMill(ctx: Ctx, cx: number, cz: number): void {
  buildBlock(ctx, 'mill', cx, cz, BUILDINGS.mill);
  const wallEast = cx + (BUILDINGS.mill.w / 2) * M;
  // 1.6 scale: the wheel is 2.9 m across, taller than the tallest character (2.66 m); its centre sits at 2.6 m.
  placeOn(ctx, 'watermill', 'mill_wheel', wallEast + 0.8, cz, 2.6, { anchor: 'centre', scale: 1.6 });
}

/**
 * Forge: the closed smithy (built by buildBlock) plus an open-fronted lean-to on the east side, with a sloped roof
 * on two outer posts and an anvil under it made from three boxes and a cone.
 */
function buildForge(ctx: Ctx, cx: number, cz: number): void {
  // The lean-to runs from the closed east wall one storey-deep module out: 2.7 m past the wall.
  const eastWall = cx + (BUILDINGS.forge.w / 2) * M;
  const x0 = eastWall - 0.1;
  const x1 = eastWall + M;
  const half = (BUILDINGS.forge.d / 2) * M + 0.3;
  const z0 = cz - half;
  const z1 = cz + half;
  // Eave at 2.9 m against the wall, 2.6 m at the posts: the posts are a little over a person's height.
  quadPanel(ctx, 'forge_leanto', [x0, 2.9, z0], [x1, 2.6, z0], [x1, 2.6, z1], [x0, 2.9, z1]);
  woodPost(ctx, 'forge_post', x1, cz - half + 0.2, 2.6);
  woodPost(ctx, 'forge_post', x1, cz + half - 0.2, 2.6);
  const iron = new StandardMaterial(`iron_${ctx.n++}`, ctx.scene);
  iron.diffuseColor = new Color3(0.2, 0.2, 0.22);
  iron.specularColor = Color3.Black();
  // The anvil is a prop at human scale: its top sits at hip height, about 0.98 m.
  const ax = eastWall + 1.0;
  const stump = MeshBuilder.CreateBox(`anvil_stump_${ctx.n++}`, { width: 0.36, height: 0.86, depth: 0.28 }, ctx.scene);
  stump.position.set(ax, 0.43, cz);
  const top = MeshBuilder.CreateBox(`anvil_top_${ctx.n++}`, { width: 0.56, height: 0.12, depth: 0.26 }, ctx.scene);
  top.position.set(ax, 0.92, cz);
  const horn = MeshBuilder.CreateCylinder(`anvil_horn_${ctx.n++}`, { height: 0.3, diameterTop: 0.02, diameterBottom: 0.1, tessellation: 8 }, ctx.scene);
  horn.rotation.z = -Math.PI / 2;
  horn.position.set(ax + 0.43, 0.96, cz);
  for (const m of [stump, top, horn]) {
    m.material = iron;
    m.receiveShadows = true;
    ctx.shadow.addShadowCaster(m);
  }
}

/**
 * Well: a stone drum 2 m across whose rim comes to hip height (1.0 m), with dark water at the top and a small roof
 * on two posts. The kit's round fountain is only 0.28 m tall, so the drum is built here at the required height.
 */
function buildWell(ctx: Ctx, cx: number, cz: number): void {
  const stone = new StandardMaterial(`well_stone_${ctx.n++}`, ctx.scene);
  stone.diffuseColor = PALETTE.stone;
  stone.specularColor = Color3.Black();
  const water = new StandardMaterial(`well_water_${ctx.n++}`, ctx.scene);
  water.diffuseColor = PALETTE.water;
  water.specularColor = Color3.Black();
  const drum = MeshBuilder.CreateCylinder(`well_drum_${ctx.n++}`, { height: 1.0, diameter: 2.0, tessellation: 24 }, ctx.scene);
  drum.position.set(cx, 0.5, cz);
  drum.material = stone;
  const pool = MeshBuilder.CreateCylinder(`well_water_top_${ctx.n++}`, { height: 0.02, diameter: 1.4, tessellation: 24 }, ctx.scene);
  pool.position.set(cx, 1.0, cz);
  pool.material = water;
  for (const m of [drum, pool]) {
    m.receiveShadows = true;
    ctx.shadow.addShadowCaster(m);
  }
  woodPost(ctx, 'well_post', cx - 1.0, cz, 2.3);
  woodPost(ctx, 'well_post', cx + 1.0, cz, 2.3);
  gableRoof(ctx, 'well_roof', cx, cz, 2.6, 2.0, 2.3, 0.5);
}

/** Watch-house: the stone tower (built by buildBlock) inside a one-storey walled yard, open at the front. */
function buildWatchYard(ctx: Ctx, cx: number, cz: number): void {
  const half = 2.5 * M;
  const offsets = [-2, -1, 0, 1, 2].map((k) => k * M);
  // One storey of walls, every module at scale M. The front (-z) wall has a one-module gap at the centre.
  for (const o of offsets) {
    if (o !== 0) placeOn(ctx, 'wall', 'yard_front', cx + o, cz - half, 0, { yaw: Math.PI / 2, scale: M });
    placeOn(ctx, 'wall', 'yard_back', cx + o, cz + half, 0, { yaw: -Math.PI / 2, scale: M });
    placeOn(ctx, 'wall', 'yard_west', cx - half, cz + o, 0, { yaw: Math.PI, scale: M });
    placeOn(ctx, 'wall', 'yard_east', cx + half, cz + o, 0, { yaw: 0, scale: M });
  }
}

/** Scenery: trees, hedges, rocks, a fence, and a wooden lantern post with a hanging lamp. */
function buildScenery(ctx: Ctx, cx: number, cz: number): { lanternLight: TransformNode } {
  // Offsets are in cell units (x M); kit pieces are drawn at scale M.
  const placeAt = (n: string, x: number, z: number, s = 1, yaw = 0): void => {
    placeOn(ctx, n, `scn_${n}`, cx + x * M, cz + z * M, 0, { scale: s * M, yaw });
  };
  placeAt('tree', -3, 1.5);
  placeAt('tree-high', 0, 2, 1, 0.6);
  placeAt('tree-crooked', 3, 1.2, 1, 1.3);
  placeAt('tree-high-crooked', 2, 4);
  placeAt('hedge', -2, 4.5);
  placeAt('hedge', -1, 4.5, 1, Math.PI / 2);
  placeAt('rock-small', -4, 3.6, 1, 0.4);
  placeAt('rock-large', 4.5, 3.8, 1, 1.1);
  // A fence at chest height: the kit's fence panel is 0.38 m tall at scale 1, so it is drawn at 3.4 (1.3 m),
  // run along x as a rail, four panels of 3.4 m each.
  for (let i = 0; i < 4; i += 1) {
    placeOn(ctx, 'fence', `scn_fence_${i}`, cx - 5.1 + i * 3.4, cz - 1.5 * M, 0, { scale: 3.4, yaw: Math.PI / 2 });
  }
  return buildLantern(ctx, cx + 0.5 * M, cz - 1.2 * M);
}

/** A wooden post with a crossbar and a hanging lantern cage. The glass glows at night. */
function buildLantern(ctx: Ctx, x: number, z: number): { lanternLight: TransformNode } {
  const wood = new StandardMaterial(`post_mat_${ctx.n++}`, ctx.scene);
  wood.diffuseColor = PALETTE.wood;
  wood.specularColor = Color3.Black();
  // The post is 3.6 m: twice a person's height (1.8 m, the review 008 basis).
  const post = MeshBuilder.CreateCylinder(`post_${ctx.n++}`, { height: 3.6, diameter: 0.14, tessellation: 8 }, ctx.scene);
  post.position.set(x, 1.8, z);
  post.material = wood;
  const arm = MeshBuilder.CreateBox(`arm_${ctx.n++}`, { width: 0.9, height: 0.08, depth: 0.08 }, ctx.scene);
  arm.position.set(x + 0.4, 3.3, z);
  arm.material = wood;
  const cage = MeshBuilder.CreateBox(`lamp_${ctx.n++}`, { width: 0.26, height: 0.34, depth: 0.26 }, ctx.scene);
  cage.position.set(x + 0.8, 2.8, z);
  cage.material = ctx.glassMat;
  ctx.glowMeshes.push(cage);
  for (const m of [post, arm, cage]) {
    m.receiveShadows = true;
    ctx.shadow.addShadowCaster(m);
  }
  const light = new TransformNode(`lantern_light_${ctx.n++}`, ctx.scene);
  light.position.set(x + 0.8, 2.7, z);
  return { lanternLight: light };
}

interface Spawned {
  root: TransformNode;
  player: ClipPlayer;
}

/** One character, tinted, hidden parts removed, pinned to its idle pose each frame by the caller. */
function spawnPerson(ctx: Ctx, containers: Map<string, AssetContainer>, clips: LoadedAssets['clips'], p: Person, tag: string, x: number, z: number, yaw: number): Spawned {
  const c = containers.get(p.model);
  if (!c) throw new Error(`Styletest: model not loaded ${p.model}`);
  // Bone names stay as authored: the clips look bones up by name (the game does the same).
  const entries = c.instantiateModelsToScene((n) => n, true);
  const root = new TransformNode(tag, ctx.scene);
  for (const r of entries.rootNodes) r.parent = root;
  root.position = new Vector3(x, 0, z);
  root.rotation.y = yaw;
  for (const m of root.getChildMeshes(false)) {
    if (p.hide && p.hide.test(m.name)) {
      m.setEnabled(false);
      continue;
    }
    if (m.material) tintMaterial(m.material, p.tint);
    m.receiveShadows = true;
    ctx.shadow.addShadowCaster(m);
  }
  const player = new ClipPlayer(bindClips(entries.rootNodes, clips, [p.clip], tag));
  player.apply(scrub(p.clip, 0.2));
  return { root, player };
}

/**
 * A short labelled board on a low post at knee height, facing -z (the camera's side). 1.2 m by 0.36 m, so it
 * stays clear of the windows above it.
 */
function buildSign(ctx: Ctx, text: string, x: number, z: number): void {
  const post = MeshBuilder.CreateBox(`sign_post_${ctx.n++}`, { width: 0.06, height: 0.52, depth: 0.06 }, ctx.scene);
  post.position.set(x, 0.26, z);
  const board = MeshBuilder.CreatePlane(`sign_${ctx.n++}`, { width: 1.2, height: 0.36 }, ctx.scene);
  board.position.set(x, 0.7, z - 0.04);
  const tex = new DynamicTexture(`sign_tex_${ctx.n++}`, { width: 512, height: 154 }, ctx.scene, false);
  tex.hasAlpha = false;
  tex.drawText(text, null, 96, 'bold 44px sans-serif', '#1d1d1d', '#f1e6c8', true);
  const mat = new StandardMaterial(`sign_mat_${ctx.n++}`, ctx.scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;
  board.material = mat;
  post.material = mat;
}

// ---------- loading ----------

/** Kenney containers, keyed by file name without extension. */
async function loadKit(scene: Scene, names: string[]): Promise<Map<string, AssetContainer>> {
  const out = new Map<string, AssetContainer>();
  for (const n of names) {
    const url = assetUrl(`assets/kenney_fantasy_town/${n}.glb`);
    const cut = url.lastIndexOf('/');
    out.set(n, await SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene));
  }
  return out;
}

/** KayKit character containers, keyed by model path. */
async function loadPeople(scene: Scene, people: Person[]): Promise<Map<string, AssetContainer>> {
  const out = new Map<string, AssetContainer>();
  for (const p of people) {
    if (out.has(p.model)) continue;
    const url = assetUrl(p.model);
    const cut = url.lastIndexOf('/');
    out.set(p.model, await SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene));
  }
  return out;
}

// ---------- the scene ----------

export interface StyletestWindow {
  __styletestReady?: boolean;
  __styletestSet?: (state: { tod?: number; view?: View }) => void;
  /** Real sizes in metres: kit pieces (unscaled), placed door modules, and every character's height. */
  __styletestMeasure?: () => StyletestMeasure;
}

export interface StyletestMeasure {
  kit: Record<string, [number, number, number]>;
  doors: { tag: string; height: number; width: number }[];
  people: { label: string; height: number }[];
  tallest: { label: string; height: number };
}

/** Bounding size of a node and its children, in metres, after the world matrix is current. */
function boundsSize(node: TransformNode): [number, number, number] {
  node.computeWorldMatrix(true);
  const { min, max } = node.getHierarchyBoundingVectors(true);
  return [max.x - min.x, max.y - min.y, max.z - min.z];
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

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.groundColor = new Color3(0.2, 0.2, 0.26);
  const sun = new DirectionalLight('sun', new Vector3(0, -1, 0), scene);
  sun.position = new Vector3(-30, 45, -40);
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = 140;
  const shadow = new ShadowGenerator(2048, sun);
  shadow.usePercentageCloserFiltering = true;
  shadow.darkness = 0.35;

  // Sky: a dome that follows the camera, with a painted vertical gradient (zenith to horizon).
  const skyTex = new DynamicTexture('sky_tex', { width: 4, height: 512 }, scene, false);
  const skyMat = new StandardMaterial('sky_mat', scene);
  skyMat.disableLighting = true;
  skyMat.diffuseColor = Color3.Black();
  skyMat.specularColor = Color3.Black();
  skyMat.emissiveTexture = skyTex;
  skyMat.backFaceCulling = false;
  skyMat.fogEnabled = false;
  const sky = MeshBuilder.CreateSphere('sky', { diameter: 500, segments: 24 }, scene);
  sky.material = skyMat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  const paintSky = (zenith: Color3, horizon: Color3): void => {
    const g2d = skyTex.getContext();
    const g = g2d.createLinearGradient(0, 0, 0, 512);
    // The camera sees a narrow band around the horizon, so the ramp must reach the zenith colour quickly.
    const mid = Color3.Lerp(zenith, horizon, 0.5);
    g.addColorStop(0, css(zenith));
    g.addColorStop(0.36, css(zenith));
    g.addColorStop(0.44, css(mid));
    g.addColorStop(0.5, css(horizon));
    g.addColorStop(0.56, css(mid));
    g.addColorStop(0.64, css(zenith));
    g.addColorStop(1, css(zenith));
    g2d.fillStyle = g;
    g2d.fillRect(0, 0, 4, 512);
    skyTex.update();
  };

  // Ground: 400 m square, so its edge sits beyond the fog and the sky. The path is a strip across it.
  const ground = MeshBuilder.CreateGround('ground', { width: 400, height: 400 }, scene);
  const groundMat = new StandardMaterial('ground_mat', scene);
  groundMat.diffuseColor = PALETTE.ground;
  groundMat.specularColor = Color3.Black();
  ground.material = groundMat;
  ground.receiveShadows = true;
  const path = MeshBuilder.CreateGround('path', { width: 400, height: 2.2 }, scene);
  path.position.z = 1.3;
  const pathMat = new StandardMaterial('path_mat', scene);
  pathMat.diffuseColor = PALETTE.path;
  pathMat.specularColor = Color3.Black();
  path.material = pathMat;
  path.receiveShadows = true;

  // Materials shared by every building.
  const paneMat = new StandardMaterial('pane_mat', scene);
  paneMat.disableLighting = true;
  paneMat.diffuseColor = Color3.Black();
  paneMat.specularColor = Color3.Black();
  paneMat.backFaceCulling = false;
  const glassMat = new StandardMaterial('lamp_glass_mat', scene);
  glassMat.disableLighting = true;
  glassMat.diffuseColor = Color3.Black();
  glassMat.specularColor = Color3.Black();

  const poolTex = new DynamicTexture('pool_tex', { width: 256, height: 256 }, scene, false);
  poolTex.hasAlpha = true;
  const pg2d = poolTex.getContext();
  const rg = pg2d.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  pg2d.clearRect(0, 0, 256, 256);
  pg2d.fillStyle = rg;
  pg2d.fillRect(0, 0, 256, 256);
  poolTex.update();
  const poolMat = new StandardMaterial('pool_mat', scene);
  poolMat.disableLighting = true;
  poolMat.diffuseColor = Color3.Black();
  poolMat.specularColor = Color3.Black();
  poolMat.emissiveColor = PALETTE.poolWarm;
  poolMat.emissiveTexture = poolTex;
  poolMat.opacityTexture = poolTex;
  poolMat.backFaceCulling = false;
  const poolMatFaint = poolMat.clone('pool_mat_faint') ?? poolMat;
  const woodMat = new StandardMaterial('wood_mat', scene);
  woodMat.diffuseColor = PALETTE.wood;
  woodMat.specularColor = Color3.Black();
  const floorMat = new StandardMaterial('floor_mat', scene);
  floorMat.diffuseColor = PALETTE.floor;
  floorMat.specularColor = Color3.Black();

  const kit = await loadKit(scene, KENNEY_FILES);
  const roofSrc = kit.get('roof-gable')?.meshes.find((m) => m.material !== null)?.material;
  if (!roofSrc) throw new Error('Styletest: roof material not found in roof-gable');
  const roofMat = roofSrc.clone('roof_mat');
  if (!roofMat) throw new Error('Styletest: roof material clone failed');
  roofMat.backFaceCulling = false;
  // Flat muted roof colour: drop the kit's striped texture rather than tint it.
  const roofColour = new Color3(0.36, 0.3, 0.28);
  if (roofMat instanceof PBRMaterial) {
    roofMat.albedoTexture = null;
    roofMat.albedoColor = roofColour;
  } else if (roofMat instanceof StandardMaterial) {
    roofMat.diffuseTexture = null;
    roofMat.diffuseColor = roofColour;
  }

  const assets = await loadAssets(scene, () => undefined);
  const containers = await loadPeople(scene, [...PEOPLE, ...VILLAGERS]);

  const ctx: Ctx = {
    scene, kit, shadow, paneMat, glassMat, roofMat, woodMat, floorMat, poolMat, poolMatFaint, glowMeshes: [], pools: [], n: 0, doors: [],
  };

  // Buildings. Each one is closed: corners, walls, a door on the front and windows above.
  for (const id of ['house-a', 'house-b', 'house-c', 'forge', 'watch']) {
    const it = ITEMS.find((i) => i.id === id);
    const spec = BUILDINGS[id];
    if (!it || !spec) throw new Error(`Styletest: no building ${id}`);
    buildBlock(ctx, id, it.x, 0, spec);
  }
  buildForge(ctx, ITEMS[4].x, 0);
  buildMill(ctx, ITEMS[3].x, 0);
  buildWell(ctx, ITEMS[5].x, 0);
  buildWatchYard(ctx, ITEMS[6].x, 0);
  const scenery = buildScenery(ctx, ITEMS[7].x, 0);

  // Labels: one short board per item, at knee height, in front of the item.
  for (const it of ITEMS) buildSign(ctx, it.short, it.x, SIGN_Z);

  // The shared pose clips, re-applied on every frame so no character drops into a T-pose.
  const poses: ClipPlayer[] = [];

  // One hero for scale in item views. Side on (yaw 90 degrees), at the edge of the frame.
  const hero = spawnPerson(ctx, containers, assets.clips, PEOPLE[0], 'hero_item', 0, HERO_Z, Math.PI / 2);
  poses.push(hero.player);
  hero.root.setEnabled(false);

  // The people row: ten KayKit characters facing the camera, idle.
  const peopleRoots = PEOPLE.map((p, i) => {
    const s = spawnPerson(ctx, containers, assets.clips, p, `person_${i}`, PEOPLE_X0 + i * PEOPLE_STEP, PEOPLE_Z, Math.PI);
    poses.push(s.player);
    return s.root;
  });
  // Villager pairs: each KayKit original beside the villager made from it (armour, capes and weapons hidden).
  const pairRoots: TransformNode[] = [];
  PAIR_ADVENTURERS.forEach((p, i) => {
    const x = PAIR_X0 + i * PAIR_STEP;
    const adv = spawnPerson(ctx, containers, assets.clips, p, `pair_adv_${i}`, x, PEOPLE_Z, Math.PI);
    const vil = spawnPerson(ctx, containers, assets.clips, VILLAGERS[i], `pair_vil_${i}`, x + PAIR_GAP, PEOPLE_Z, Math.PI);
    poses.push(adv.player, vil.player);
    pairRoots.push(adv.root, vil.root);
  });
  for (const r of pairRoots) r.setEnabled(false);

  // Camera.
  const camera = new FreeCamera('styletest_cam', new Vector3(0, 4, -30), scene);
  camera.minZ = 0.1;
  camera.maxZ = 400;
  scene.activeCamera = camera;

  // One lamp, at the lantern. The glow layer lights only the lit panes and the lantern glass.
  const lantern = new PointLight('lantern_light', scenery.lanternLight.position.clone(), scene);
  lantern.diffuse = PALETTE.windowLit;
  lantern.range = 9;
  const glow = new GlowLayer('glow', scene, { blurKernelSize: 32 });
  glow.intensity = 0;
  for (const m of ctx.glowMeshes) glow.addIncludedOnlyMesh(m);

  const applyLighting = (L: Lighting): void => {
    sun.direction = L.sunDir;
    sun.diffuse = L.sunColor;
    sun.intensity = L.sunIntensity;
    hemi.diffuse = L.hemiColor;
    hemi.intensity = L.hemiIntensity;
    scene.clearColor = new Color4(L.sky.r, L.sky.g, L.sky.b, 1);
    scene.fogColor = L.sky;
    paintSky(L.zenith, L.sky);
    const lampColour = L.lit ? PALETTE.windowLit : PALETTE.windowDark;
    paneMat.emissiveColor = lampColour;
    glassMat.emissiveColor = lampColour;
    glow.intensity = 0.9 * L.nightness;
    poolMat.alpha = 0.85 * L.nightness;
    poolMatFaint.alpha = 0.4 * L.nightness;
    for (const p of ctx.pools) p.setEnabled(L.nightness > 0.02);
    lantern.intensity = L.lit ? 1.2 : 0;
  };

  const applyView = (view: View): void => {
    const at = (x: number, y: number, z: number, tx: number, ty: number, tz: number, fov: number): void => {
      camera.position = new Vector3(x, y, z);
      camera.setTarget(new Vector3(tx, ty, tz));
      camera.fov = fov;
    };
    // The row runs from x -44 (house A) to x 71 (scenery): about 115 m. One frame from 100 m back is washed out
    // by the fog (fog starts at 45 m), so the row is shot in two frames about 60 m back, each about 80 m wide.
    if (view === 'row-west') at(-8, 10, -62, -8, 5, 0, 0.7);
    else if (view === 'row-east') at(40, 10, -62, 40, 5, 0, 0.7);
    else if (view === 'row-quarter') at(-52, 14, -36, 8, 3, 0, 0.75);
    else if (view === 'people-front') at(-12, 2.3, 3, -12, 1.3, PEOPLE_Z, 0.95);
    else if (view === 'people-quarter') at(-30, 2.8, 4, -12, 1.2, PEOPLE_Z, 0.85);
    else if (view === 'villagers-front') at(-0.6, 2.3, 3, -0.6, 1.3, PEOPLE_Z, 0.95);
    // Doorway: the camera stands in front of house A, looking at the opening from just inside the yard.
    else if (view === 'doorway') at(DOORWAY.x, 2.0, -12, DOORWAY.x, 2.4, DOORWAY.z, 0.62);
    else {
      const id = view.slice('item:'.length);
      const it = ITEMS.find((i) => i.id === id);
      if (!it) throw new Error(`Styletest: no item ${id}`);
      // The mill is seen three-quarter so the wheel's face shows; every other item is seen straight on.
      if (id === 'mill') at(it.x + 4, 4.0, -24, it.x, 3.0, 0, 0.7);
      else at(it.x, 4.0, -30, it.x, 6.5, 0, 0.66);
    }
    const inItem = view.startsWith('item:');
    const inDoorway = view === 'doorway';
    // The hero is shown for item views (for scale, side on) and for the doorway (front on, in the opening).
    hero.root.setEnabled(inItem || inDoorway);
    if (inItem) {
      const it = ITEMS.find((i) => i.id === view.slice('item:'.length));
      if (it) hero.root.position.set(it.heroX, 0, HERO_Z);
      hero.root.rotation.y = Math.PI / 2;
    }
    if (inDoorway) {
      // House A's front wall face is at z = -1.5 M. The hero and the brute stand in the opening, front on,
      // with the door centred at x = -40.
      hero.root.position.set(DOORWAY.x - 0.6, 0, DOORWAY.z);
      hero.root.rotation.y = Math.PI;
    }
    const pairsOn = view === 'villagers-front';
    peopleRoots.forEach((r, i) => {
      if (inDoorway) {
        r.setEnabled(i === DOORWAY.personIndex);
        if (i === DOORWAY.personIndex) {
          r.position.set(DOORWAY.x + 0.6, 0, DOORWAY.z);
          r.rotation.y = Math.PI;
        }
      } else {
        r.setEnabled(!pairsOn);
        r.position.set(PEOPLE_X0 + i * PEOPLE_STEP, 0, PEOPLE_Z);
        r.rotation.y = Math.PI;
      }
    });
    for (const r of pairRoots) r.setEnabled(pairsOn);
  };

  let tod = 12;
  let view: View = 'row-west';
  // One frame for the given state.
  const draw = (state: { tod?: number; view?: View }): void => {
    if (state.tod !== undefined) tod = state.tod;
    if (state.view !== undefined) view = state.view;
    applyLighting(lightingAt(tod));
    applyView(view);
    for (const p of poses) p.apply(scrub('Idle_A', 0.2));
    scene.render();
  };

  window.addEventListener('resize', () => engine.resize());
  const w = window as unknown as StyletestWindow;
  w.__styletestSet = draw;
  w.__styletestMeasure = (): StyletestMeasure => {
    // Kit pieces as the kit ships them (scale 1), each instantiated, measured, and disposed.
    const kitSizes: Record<string, [number, number, number]> = {};
    for (const n of KENNEY_FILES) {
      const c = kit.get(n);
      if (!c) continue;
      const e = c.instantiateModelsToScene((x) => x, false);
      const root = new TransformNode(`measure_${n}`, scene);
      for (const r of e.rootNodes) r.parent = root;
      kitSizes[n] = boundsSize(root).map((v) => Math.round(v * 1000) / 1000) as [number, number, number];
      root.dispose();
    }
    const all = [...peopleRoots, ...pairRoots];
    const was = all.map((r) => r.isEnabled());
    all.forEach((r) => r.setEnabled(true));
    const peopleOut = PEOPLE.map((p, i) => ({ label: p.label, height: boundsSize(peopleRoots[i])[1] }));
    const villagersOut = PAIR_ADVENTURERS.flatMap((_, i) => [
      { label: PAIR_ADVENTURERS[i].label, height: boundsSize(pairRoots[2 * i])[1] },
      { label: VILLAGERS[i].label, height: boundsSize(pairRoots[2 * i + 1])[1] },
    ]);
    all.forEach((r, i) => r.setEnabled(was[i]));
    const all2 = [...peopleOut, ...villagersOut];
    const tallest = all2.reduce((a, b) => (b.height > a.height ? b : a));
    return {
      kit: kitSizes,
      doors: ctx.doors.map((d) => ({ tag: d.tag, height: Math.round(d.height * 1000) / 1000, width: Math.round(d.width * 1000) / 1000 })),
      people: all2.map((p) => ({ label: p.label, height: Math.round(p.height * 1000) / 1000 })),
      tallest: { label: tallest.label, height: Math.round(tallest.height * 1000) / 1000 },
    };
  };
  draw({ tod: 12, view: 'row-west' });
  w.__styletestReady = true;
  engine.runRenderLoop(() => draw({}));
}
