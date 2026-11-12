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

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const mix = (a: Color3, b: Color3, t: number): Color3 => Color3.Lerp(a, b, clamp01(t));
const css = (c: Color3): string => `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;

const PALETTE = {
  ground: new Color3(0.42, 0.5, 0.3),
  path: new Color3(0.6, 0.52, 0.4),
  wood: new Color3(0.36, 0.23, 0.13),
  windowLit: new Color3(1, 0.72, 0.36),
  windowDark: new Color3(0.12, 0.14, 0.2),
  poolWarm: new Color3(1, 0.66, 0.3),
  nightZenith: new Color3(0.02, 0.03, 0.08),
  nightHorizon: new Color3(0.07, 0.09, 0.18),
  dayZenith: new Color3(0.3, 0.55, 0.9),
  dayHorizon: new Color3(0.74, 0.84, 0.94),
  duskZenith: new Color3(0.22, 0.22, 0.42),
  duskHorizon: new Color3(0.98, 0.52, 0.3),
  moon: new Color3(0.42, 0.5, 0.82),
  dayLight: new Color3(1, 0.98, 0.94),
  sunWarm: new Color3(1, 0.93, 0.82),
};

/** Shared character tint, same rule as the game: a multiplier on the model's own colours. */
function tintMaterial(m: Material, rgb: [number, number, number]): void {
  const c = new Color3(rgb[0], rgb[1], rgb[2]);
  if (m instanceof PBRMaterial) m.albedoColor = c;
  else if (m instanceof StandardMaterial) m.diffuseColor = c;
}

// ---------- time of day: one pure function drives sun, moon, sky, fog, lamps and windows ----------

export interface Lighting {
  sunDir: Vector3;
  sunColor: Color3;
  sunIntensity: number;
  hemiColor: Color3;
  hemiIntensity: number;
  /** Windows and lamps are lit from dusk to dawn. */
  lit: boolean;
  /** 0 in daylight, 1 at full night: drives glow, light pools and the sky. */
  nightness: number;
  zenith: Color3;
  /** Horizon colour; also the fog colour, so distant ground fades into the sky. */
  sky: Color3;
}

/** Hours 0..24. Sunrise 6, noon 12, dusk 18, night 22. Pure: no scene access. */
export function lightingAt(tod: number): Lighting {
  const elev = Math.sin(((tod - 6) / 12) * Math.PI);
  const dayness = clamp01(elev * 2.5);
  const duskness = clamp01(1 - Math.abs(elev) * 4);
  const nightness = clamp01((0.2 - elev) * 3);
  const zenith = mix(PALETTE.nightZenith, PALETTE.dayZenith, dayness);
  const horizon = mix(PALETTE.nightHorizon, PALETTE.dayHorizon, dayness);
  return {
    sunDir: new Vector3(0.45, -Math.max(0.2, elev), 0.6).normalize(),
    sunColor: mix(PALETTE.moon, PALETTE.sunWarm, dayness),
    sunIntensity: 0.35 + 0.85 * dayness,
    hemiColor: mix(PALETTE.moon, PALETTE.dayLight, dayness),
    hemiIntensity: 0.7 + 0.25 * dayness,
    lit: elev < 0.35,
    nightness,
    zenith: mix(zenith, PALETTE.duskZenith, duskness * 0.7),
    sky: mix(horizon, PALETTE.duskHorizon, duskness * 0.9),
  };
}

// ---------- layout (metres; the row runs along x at z = 0; the camera looks along +z from -z) ----------

export type View = 'row-front' | 'row-quarter' | 'people-front' | 'people-quarter' | `item:${string}`;

interface Item {
  id: string;
  label: string;
  x: number;
  /** Where the hero stands for scale: beside the item, at the side, facing away from the camera. */
  heroX: number;
}

const ITEMS: Item[] = [
  { id: 'house-a', label: 'A  Stone town house (Fantasy Town kit)', x: -24, heroX: -20.9 },
  { id: 'house-b', label: 'B  Timber house (Fantasy Town kit)', x: -18, heroX: -14.9 },
  { id: 'house-c', label: 'C  Tall stone house (Fantasy Town kit)', x: -12, heroX: -8.9 },
  { id: 'mill', label: 'Mill  Watermill kit, scaled x3.5', x: -4, heroX: 0.9 },
  { id: 'forge', label: 'Forge  STAND-IN: stone block, chimney, bench', x: 4, heroX: 7.1 },
  { id: 'well', label: 'Well-house  STAND-IN: timber block', x: 9, heroX: 12.1 },
  { id: 'watch', label: 'Watch-house  STAND-IN: tall stone block', x: 16, heroX: 19.1 },
  { id: 'scenery', label: 'Scenery  trees, hedge, rocks, fence, lantern', x: 25, heroX: 27.4 },
];

const HERO_Z = -2.6;
const PEOPLE_Z = 12;
const VILLAGER_Z = 16;
const PEOPLE_X0 = -20;
const PEOPLE_STEP = 1.8;

/** Closed buildings from the Fantasy Town kit. Walls are 1 m modules; floors are 1 m tall. */
interface BuildingSpec {
  w: number;
  d: number;
  floors: number;
  walls: 'stone' | 'wood';
  high: boolean;
  chimney?: boolean;
}

const BUILDINGS: Record<string, BuildingSpec> = {
  'house-a': { w: 3, d: 3, floors: 2, walls: 'stone', high: false },
  'house-b': { w: 3, d: 2, floors: 2, walls: 'wood', high: false },
  'house-c': { w: 3, d: 2, floors: 3, walls: 'stone', high: true },
  forge: { w: 3, d: 2, floors: 1, walls: 'stone', high: false, chimney: true },
  well: { w: 3, d: 2, floors: 1, walls: 'wood', high: false },
  watch: { w: 3, d: 2, floors: 3, walls: 'stone', high: true },
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

const KENNEY_FILES = [
  'wall', 'wall-door', 'wall-window-small', 'wall-corner', 'wall-wood', 'wall-wood-door', 'wall-wood-window-small',
  'roof-gable', 'watermill', 'wheel', 'chimney-base', 'stall-bench', 'tree', 'tree-high', 'tree-crooked',
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
  poolMat: StandardMaterial;
  /** Meshes that glow at night (lit panes and lantern glass). */
  glowMeshes: Mesh[];
  /** Ground light pools: visible at night only. */
  pools: Mesh[];
  n: number;
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
  const entries = container.instantiateModelsToScene((n) => `${name}_${n}`, false);
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
  const winK = stone ? 'wall-window-small' : 'wall-wood-window-small';
  const xs = cellCentres(spec.w);
  const zs = cellCentres(spec.d);
  const xMid = xs.slice(1, -1);
  const zMid = zs.slice(1, -1);
  const frontZ = -spec.d / 2;
  const backZ = spec.d / 2;
  const westX = -spec.w / 2;
  const eastX = spec.w / 2;
  const put = (k: string, x: number, z: number, y: number, yaw: number): void => {
    placeOn(ctx, k, tag, cx + x, cz + z, y, { yaw });
  };
  for (let f = 0; f < spec.floors; f += 1) {
    for (const x of [xs[0], xs[xs.length - 1]]) {
      for (const z of [zs[0], zs[zs.length - 1]]) put('wall-corner', x, z, f, 0);
    }
    // Front (-z) faces the camera; back (+z) is the far side. Walls along x use yaw +-pi/2.
    for (const x of xMid) {
      const mid = Math.abs(x) < 1e-6;
      if (mid && f === 0) put(doorK, x, frontZ, f, Math.PI / 2);
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
      const front = MeshBuilder.CreatePlane(`${tag}_paneF_${ctx.n++}`, { width: 0.5, height: 0.5 }, ctx.scene);
      front.position.set(cx, f + 0.45, cz + frontZ - 0.06);
      front.material = ctx.paneMat;
      const back = MeshBuilder.CreatePlane(`${tag}_paneB_${ctx.n++}`, { width: 0.5, height: 0.5 }, ctx.scene);
      back.position.set(cx, f + 0.45, cz + backZ + 0.06);
      back.rotation.y = Math.PI;
      back.material = ctx.paneMat;
      ctx.glowMeshes.push(front, back);
    }
  }
  gableRoof(ctx, `${tag}_roof`, cx, cz, spec.w, spec.d, spec.floors, spec.high ? 1.3 : 0.9);
  if (spec.chimney) {
    placeOn(ctx, 'chimney-base', `${tag}_chimney`, cx + 0.8, cz + 0.2, spec.floors + 0.1, { scale: 1.6 });
  }
  addPool(ctx, cx, cz + frontZ - 1.4);
}

/** Warm light pool on the ground in front of a door. Visible at night only; alpha follows nightness. */
function addPool(ctx: Ctx, x: number, z: number): void {
  const pool = MeshBuilder.CreatePlane(`pool_${ctx.n++}`, { size: 4.5 }, ctx.scene);
  pool.rotation.x = Math.PI / 2;
  pool.position.set(x, 0.03, z);
  pool.material = ctx.poolMat;
  pool.isPickable = false;
  ctx.pools.push(pool);
}

/** Mill: the watermill kit scaled up. The kit's own wheel is part of the model. */
function buildMill(ctx: Ctx, cx: number, cz: number): void {
  placeOn(ctx, 'watermill', 'mill', cx, cz, 0, { scale: 3.5 });
}

function buildForgeYard(ctx: Ctx, cx: number, cz: number): void {
  placeOn(ctx, 'stall-bench', 'forge_bench', cx + 1.8, cz - 1.6, 0, { scale: 1.4 });
}

/** Scenery: trees, hedges, rocks, a fence, and a wooden lantern post with a hanging lamp. */
function buildScenery(ctx: Ctx, cx: number, cz: number): { lanternLight: TransformNode } {
  const placeAt = (n: string, x: number, z: number, s = 1, yaw = 0): void => {
    placeOn(ctx, n, `scn_${n}`, cx + x, cz + z, 0, { scale: s, yaw });
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
  return buildLantern(ctx, cx + 0.5, cz - 1.2);
}

/** A wooden post with a crossbar and a hanging lantern cage. The glass glows at night. */
function buildLantern(ctx: Ctx, x: number, z: number): { lanternLight: TransformNode } {
  const wood = new StandardMaterial(`post_mat_${ctx.n++}`, ctx.scene);
  wood.diffuseColor = PALETTE.wood;
  wood.specularColor = Color3.Black();
  const post = MeshBuilder.CreateCylinder(`post_${ctx.n++}`, { height: 3, diameter: 0.14, tessellation: 8 }, ctx.scene);
  post.position.set(x, 1.5, z);
  post.material = wood;
  const arm = MeshBuilder.CreateBox(`arm_${ctx.n++}`, { width: 0.9, height: 0.08, depth: 0.08 }, ctx.scene);
  arm.position.set(x + 0.4, 2.9, z);
  arm.material = wood;
  const cage = MeshBuilder.CreateBox(`lamp_${ctx.n++}`, { width: 0.26, height: 0.34, depth: 0.26 }, ctx.scene);
  cage.position.set(x + 0.8, 2.3, z);
  cage.material = ctx.glassMat;
  ctx.glowMeshes.push(cage);
  for (const m of [post, arm, cage]) {
    m.receiveShadows = true;
    ctx.shadow.addShadowCaster(m);
  }
  const light = new TransformNode(`lantern_light_${ctx.n++}`, ctx.scene);
  light.position.set(x + 0.8, 2.2, z);
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
  const entries = c.instantiateModelsToScene((n) => `${tag}_${n}`, true);
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

/** A labelled board on a post. The board faces -z, the way the camera views the row. */
function buildSign(ctx: Ctx, text: string, x: number, z: number): void {
  const post = MeshBuilder.CreateBox(`sign_post_${ctx.n++}`, { width: 0.08, height: 1.3, depth: 0.08 }, ctx.scene);
  post.position.set(x, 0.65, z);
  const board = MeshBuilder.CreatePlane(`sign_${ctx.n++}`, { width: 3.6, height: 0.5 }, ctx.scene);
  board.position.set(x, 1.45, z - 0.06);
  const tex = new DynamicTexture(`sign_tex_${ctx.n++}`, { width: 1024, height: 144 }, ctx.scene, false);
  tex.hasAlpha = false;
  tex.drawText(text, null, 92, 'bold 46px sans-serif', '#1d1d1d', '#f1e6c8', true);
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
    scene, kit, shadow, paneMat, glassMat, roofMat, poolMat, glowMeshes: [], pools: [], n: 0,
  };

  // Buildings. Each one is closed: corners, walls, a door on the front and windows above.
  for (const id of ['house-a', 'house-b', 'house-c', 'forge', 'well', 'watch']) {
    const it = ITEMS.find((i) => i.id === id);
    const spec = BUILDINGS[id];
    if (!it || !spec) throw new Error(`Styletest: no building ${id}`);
    buildBlock(ctx, id, it.x, 0, spec);
  }
  buildForgeYard(ctx, ITEMS[4].x, 0);
  buildMill(ctx, ITEMS[3].x, 0);
  const scenery = buildScenery(ctx, ITEMS[7].x, 0);

  // Labels: one board per item, centred on the item, facing the camera.
  for (const it of ITEMS) buildSign(ctx, it.label, it.x, -3.2);

  // The shared pose clips, re-applied on every frame so no character drops into a T-pose.
  const poses: ClipPlayer[] = [];

  // One hero for scale in item views. Faces away from the camera, as in third person.
  const hero = spawnPerson(ctx, containers, assets.clips, PEOPLE[0], 'hero_item', 0, HERO_Z, 0);
  poses.push(hero.player);
  hero.root.setEnabled(false);

  // The people row: ten characters facing the camera, idle.
  PEOPLE.forEach((p, i) => {
    poses.push(spawnPerson(ctx, containers, assets.clips, p, `person_${i}`, PEOPLE_X0 + i * PEOPLE_STEP, PEOPLE_Z, Math.PI).player);
  });
  // The villager row: the same bodies with armour, capes and weapons hidden and plain clothes.
  VILLAGERS.forEach((p, i) => {
    poses.push(spawnPerson(ctx, containers, assets.clips, p, `villager_${i}`, PEOPLE_X0 + i * PEOPLE_STEP, VILLAGER_Z, Math.PI).player);
  });
  buildSign(ctx, 'People: 10 KayKit originals (row 1), 4 villagers with armour hidden (row 2)', -12, 19.5);

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
    for (const p of ctx.pools) p.setEnabled(L.nightness > 0.02);
    lantern.intensity = L.lit ? 1.2 : 0;
  };

  const applyView = (view: View): void => {
    const at = (x: number, y: number, z: number, tx: number, ty: number, tz: number, fov: number): void => {
      camera.position = new Vector3(x, y, z);
      camera.setTarget(new Vector3(tx, ty, tz));
      camera.fov = fov;
    };
    if (view === 'row-front') at(-2, 6, -34, -2, 2.5, 0, 0.62);
    else if (view === 'row-quarter') at(-36, 9, -24, -4, 2, 0, 0.62);
    else if (view === 'people-front') at(-12, 2.3, 3, -12, 1.3, PEOPLE_Z, 0.95);
    else if (view === 'people-quarter') at(-30, 2.8, 4, -12, 1.2, PEOPLE_Z, 0.85);
    else {
      const id = view.slice('item:'.length);
      const it = ITEMS.find((i) => i.id === id);
      if (!it) throw new Error(`Styletest: no item ${id}`);
      const mx = (it.x + it.heroX) / 2;
      at(mx, 2.2, -12, mx, 1.8, 0, 0.62);
    }
    const inItem = view.startsWith('item:');
    hero.root.setEnabled(inItem);
    if (inItem) {
      const it = ITEMS.find((i) => i.id === view.slice('item:'.length));
      if (it) hero.root.position.set(it.heroX, 0, HERO_Z);
    }
  };

  let tod = 12;
  let view: View = 'row-front';
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
  draw({ tod: 12, view: 'row-front' });
  w.__styletestReady = true;
  engine.runRenderLoop(() => draw({}));
}
