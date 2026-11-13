// Builds Wick in a scene from the plan (docs/tasks/003-wick.md). Claude's. One call from the valley scene:
//   const wick = await buildWick(scene, { heightAt, seed, shadow });  wick.light(lightingAt(tod), tod);
// KayKit Medieval Hexagon buildings and props (CC0), at the scales set in review 012.
import {
  AssetContainer, Color3, Mesh, MeshBuilder, ParticleSystem, PBRMaterial, PointLight, Scene, SceneLoader, ShadowGenerator,
  StandardMaterial, Texture, TransformNode, Vector3, VertexData, DynamicTexture, Color4,
} from '@babylonjs/core';
import { assetUrl } from '../render/assets';
import type { Lighting } from '../render/lighting';
import { bearingVector, chance, WICK_GATES, WICK_LANES, WICK_THINGS, wickHouses, type House } from './plan';

const HEX = 'assets/kaykit_medieval_hexagon/';
/** Review 012: buildings at 8, props at 3.2, trees about 12. */
export const BUILDING_SCALE = 8;
const PROP = 3.2;

/**
 * Where the door and the windows are on each model's front and sides, in metres at BUILDING_SCALE, measured from
 * the house's centre: `u` along the wall (toward the house's own left hand, as it looks out of its door), `y` up, `out` from the centre to the wall face.
 */
export const OPENINGS = {
  // A cottage: the door at the ground in the middle of the front, one window above it in the gable.
  home_A: { door: { u: 0, y: 1.3, out: 2.62, w: 1.4, h: 2.1 }, window: { u: 0, y: 4.0, out: 2.5, w: 0.62, h: 0.74 } },
  // A taller house on a stone footing with steps: the door to one side, a window beside it.
  home_B: { door: { u: 1.05, y: 3.0, out: 2.3, w: 1.5, h: 2.0 }, window: { u: -1.08, y: 3.3, out: 2.3, w: 0.62, h: 0.74 } },
} as const;

export interface WickOptions {
  heightAt: (x: number, z: number) => number;
  seed: number;
  shadow?: ShadowGenerator;
}
export interface Wick {
  root: TransformNode;
  houses: readonly House[];
  /** Call when the light changes. Hesper's lamp is lit from late afternoon until the small hours. */
  light(l: Lighting, tod: number): void;
  /** Hesper's lamp, for anything that wants to know where the one light is. */
  lamp: PointLight;
  dispose(): void;
}

const cache = new WeakMap<Scene, Map<string, Promise<AssetContainer>>>();
function container(scene: Scene, file: string): Promise<AssetContainer> {
  let m = cache.get(scene);
  if (!m) cache.set(scene, (m = new Map()));
  let c = m.get(file);
  if (!c) {
    const url = assetUrl(`${HEX}${file}.gltf`);
    const cut = url.lastIndexOf('/');
    c = SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene);
    m.set(file, c);
  }
  return c;
}

/** Babylon yaw that turns a model whose front looks south (+z) to look along a compass bearing. */
export const yawFor = (bearing: number): number => Math.PI - (bearing * Math.PI) / 180;

export async function buildWick(scene: Scene, o: WickOptions): Promise<Wick> {
  const root = new TransformNode('wick', scene);
  const houses = wickHouses(o.seed);
  const ground = o.heightAt;
  const cast = (m: Mesh | TransformNode): void => {
    const all = m instanceof Mesh ? [m, ...m.getChildMeshes(false)] : m.getChildMeshes(false);
    for (const x of all) { x.receiveShadows = true; o.shadow?.addShadowCaster(x); }
  };
  const pbr = (name: string, c: Color3, rough = 0.95): PBRMaterial => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = c; m.roughness = rough; m.metallic = 0;
    return m;
  };
  const wood = pbr('wick_wood', new Color3(0.33, 0.24, 0.16));
  const greyWood = pbr('wick_grey_wood', new Color3(0.42, 0.39, 0.34));
  const stone = pbr('wick_stone', new Color3(0.5, 0.48, 0.44));
  const lane = pbr('wick_lane', new Color3(0.46, 0.38, 0.27));
  const soil = pbr('wick_soil', new Color3(0.36, 0.34, 0.2));
  const weed = pbr('wick_weed', new Color3(0.33, 0.44, 0.18));
  weed.backFaceCulling = false;
  const dryWeed = pbr('wick_dry_weed', new Color3(0.55, 0.5, 0.26));
  dryWeed.backFaceCulling = false;
  const straw = pbr('wick_straw', new Color3(0.66, 0.55, 0.3));
  const iron = pbr('wick_iron', new Color3(0.2, 0.2, 0.22), 0.6);

  const place = async (file: string, x: number, z: number, scale: number, yaw = 0, sink = 0): Promise<TransformNode> => {
    const c = await container(scene, file);
    const e = c.instantiateModelsToScene((n) => `${file}_${Math.round(x)}_${Math.round(z)}_${n}`, false);
    const node = new TransformNode(`${file}_${Math.round(x)}_${Math.round(z)}`, scene);
    for (const n of e.rootNodes) n.parent = node;
    node.position.set(x, ground(x, z) - sink, z);
    node.rotation.y = yaw;
    node.scaling.setAll(scale);
    node.parent = root;
    for (const m of node.getChildMeshes(false)) {
      if (m.material instanceof PBRMaterial) { m.material.roughness = 0.9; m.material.metallic = 0; }
    }
    cast(node);
    return node;
  };
  /** A box of timber or stone, given by its centre, size, and turn. Sits on the ground unless `y` is given. */
  const box = (name: string, mat: PBRMaterial, x: number, z: number, w: number, h: number, d: number, yaw = 0, y?: number, tilt = 0, roll = 0): Mesh => {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.position.set(x, (y ?? ground(x, z)) + h / 2, z);
    b.rotation.set(tilt, yaw, roll);
    b.material = mat;
    b.parent = root;
    cast(b);
    return b;
  };

  // ---- The houses ----
  let lampAt = new Vector3(0, 0, 0);
  const glow = new StandardMaterial('wick_window_glow', scene);
  glow.emissiveColor = new Color3(1, 0.72, 0.36);
  glow.diffuseColor = Color3.Black();
  glow.specularColor = Color3.Black();
  glow.disableLighting = true;
  let chimney = new Vector3(0, 0, 0);
  for (const h of houses) {
    const half = 4.5;
    const corners = [[-half, -half], [half, -half], [-half, half], [half, half], [0, 0]].map(([dx, dz]) => ground(h.x + dx, h.z + dz));
    const sink = ground(h.x, h.z) - Math.min(...corners) + 0.05;
    const file = h.model === 'destroyed' ? 'buildings/building_destroyed' : `buildings/building_${h.model}_${h.colour}`;
    const node = await place(file, h.x, h.z, BUILDING_SCALE, yawFor(h.facing), sink);
    const base = node.position.y;
    if (h.model === 'destroyed') continue;
    const open = OPENINGS[h.model];
    const front = bearingVector(h.facing);
    const right = { x: -front.z, z: front.x };
    const yaw = yawFor(h.facing);
    const at = (u: number, out: number) => ({ x: h.x + right.x * u + front.x * out, z: h.z + right.z * u + front.z * out });
    if (h.state === 'boarded') {
      // Planks across the door, nailed up in a hurry: two crossed and one level, none of them straight.
      const d = at(open.door.u, open.door.out + 0.08);
      const lean = (k: string) => (chance(o.seed, `${h.id}:${k}`) - 0.5) * 0.3;
      box(`${h.id}_plank_a`, greyWood, d.x, d.z, open.door.w * 1.45, 0.2, 0.06, yaw, base + open.door.y - 0.25, 0, 0.7 + lean('a'));
      box(`${h.id}_plank_b`, greyWood, d.x, d.z, open.door.w * 1.45, 0.2, 0.06, yaw, base + open.door.y - 0.25, 0, -0.7 + lean('b'));
      box(`${h.id}_plank_c`, greyWood, d.x, d.z, open.door.w * 1.3, 0.18, 0.07, yaw, base + open.door.y + 0.55, 0, lean('c') * 0.5);
      // And one across the window.
      const wn = at(open.window.u, open.window.out + 0.1);
      box(`${h.id}_plank_w`, greyWood, wn.x, wn.z, open.window.w * 1.9, 0.16, 0.05, yaw, base + open.window.y - 0.08, 0, 0.25 + lean('w'));
      box(`${h.id}_plank_w2`, greyWood, wn.x, wn.z, open.window.w * 1.9, 0.16, 0.05, yaw, base + open.window.y - 0.08, 0, -0.3 + lean('w2'));
    }
    if (h.state === 'lit') {
      // Hesper's window: a pane that glows, and the lamp behind it.
      const wv = bearingVector(h.window);
      const wr = { x: -wv.z, z: wv.x };
      const p = { x: h.x + wv.x * (open.window.out + 0.05) + wr.x * open.window.u, z: h.z + wv.z * (open.window.out + 0.05) + wr.z * open.window.u };
      const pane = MeshBuilder.CreatePlane('hesper_window', { width: open.window.w, height: open.window.h, sideOrientation: Mesh.DOUBLESIDE }, scene);
      pane.position.set(p.x, base + open.window.y, p.z);
      pane.rotation.y = yawFor(h.window);
      pane.material = glow;
      pane.parent = root;
      lampAt = new Vector3(h.x + wv.x * (open.window.out + 1.2), base + open.window.y, h.z + wv.z * (open.window.out + 1.2));
      chimney = new Vector3(h.x, base + 7.4, h.z);
      // What stands round a lived-in house.
      const side = at(3.6, 1.2);
      await place('props/barrel', side.x, side.z, PROP);
      const side2 = at(-3.4, 1.6);
      await place('props/bucket_water', side2.x, side2.z, PROP);
      const stack = at(4.2, -1.5);
      await place('props/resource_lumber', stack.x, stack.z, PROP, yaw + 0.4);
    }
  }
  const lamp = new PointLight('hesper_lamp', lampAt, scene);
  lamp.diffuse = new Color3(1, 0.62, 0.3);
  lamp.specular = Color3.Black();
  lamp.range = 32;
  lamp.parent = root;

  // Smoke from the one chimney in use.
  const dot = new DynamicTexture('wick_smoke_tex', 32, scene, false);
  const g = dot.getContext();
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32); dot.update();
  dot.hasAlpha = true;
  const smoke = new ParticleSystem('hesper_smoke', 60, scene);
  smoke.particleTexture = dot as unknown as Texture;
  smoke.emitter = chimney;
  smoke.minEmitBox = new Vector3(-0.15, 0, -0.15); smoke.maxEmitBox = new Vector3(0.15, 0, 0.15);
  smoke.direction1 = new Vector3(-0.15, 1, -0.1); smoke.direction2 = new Vector3(0.35, 1.3, 0.2);
  smoke.minEmitPower = 0.5; smoke.maxEmitPower = 0.9;
  smoke.minLifeTime = 5; smoke.maxLifeTime = 8;
  smoke.minSize = 0.7; smoke.maxSize = 2.4;
  smoke.emitRate = 6;
  smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  smoke.color1 = new Color4(0.8, 0.78, 0.76, 0.32); smoke.color2 = new Color4(0.7, 0.68, 0.68, 0.22); smoke.colorDead = new Color4(0.7, 0.7, 0.72, 0);
  smoke.preWarmCycles = 200;
  smoke.start();

  // ---- The lanes: worn earth that follows the ground ----
  const ribbon = (name: string, pts: readonly (readonly [number, number])[], width: number, mat: PBRMaterial, lift = 0.05, wander = 0.35): void => {
    const positions: number[] = [], indices: number[] = [], normals: number[] = [];
    const samples: { x: number; z: number; nx: number; nz: number }[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(len / 1.5));
      for (let k = i === 0 ? 0 : 1; k <= n; k++) samples.push({ x: ax + ((bx - ax) * k) / n, z: az + ((bz - az) * k) / n, nx: -(bz - az) / len, nz: (bx - ax) / len });
    }
    samples.forEach((s, i) => {
      // The edges wander, so a lane never has a ruled edge.
      const wob = 1 + (chance(o.seed, `${name}:${i}`) - 0.5) * wander;
      for (const side of [-1, 1]) {
        const x = s.x + s.nx * side * (width / 2) * wob, z = s.z + s.nz * side * (width / 2) * wob;
        positions.push(x, ground(x, z) + lift, z);
      }
      if (i > 0) { const a = (i - 1) * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    VertexData.ComputeNormals(positions, indices, normals);
    const mesh = new Mesh(name, scene);
    const vd = new VertexData();
    vd.positions = positions; vd.indices = indices; vd.normals = normals;
    vd.applyToMesh(mesh);
    mat.backFaceCulling = false;
    mesh.material = mat;
    mesh.receiveShadows = true;
    mesh.parent = root;
  };
  for (const [name, pts] of Object.entries(WICK_LANES)) ribbon(`lane_${name}`, pts, name === 'hesper_yard' ? 1.4 : 2.6, lane);
  // The square: bare, trodden ground where the lanes meet.
  ribbon('square', [[70, 80], [86, 80]], 14, lane, 0.04);

  // ---- The gates: two posts and a broken bar, with a little leaning fence either side ----
  const fenceRun = (name: string, ax: number, az: number, bx: number, bz: number): void => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.2));
    const yaw = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
      const lean = (chance(o.seed, `${name}:lean:${k}`) - 0.5) * 0.35;
      box(`${name}_post_${k}`, greyWood, x, z, 0.16, 1.15, 0.16, yaw, ground(x, z) - 0.1, lean, lean * 0.6);
      // Gaps: about one rail in three is missing.
      if (k < n && chance(o.seed, `${name}:gap:${k}`) > 0.34) {
        const mx = x + (bx - ax) / n / 2, mz = z + (bz - az) / n / 2;
        const droop = (chance(o.seed, `${name}:droop:${k}`) - 0.5) * 0.25;
        box(`${name}_rail_${k}`, greyWood, mx, mz, len / n + 0.1, 0.1, 0.06, yaw, ground(mx, mz) + 0.72, 0, droop);
        if (chance(o.seed, `${name}:low:${k}`) > 0.4) box(`${name}_rail_low_${k}`, greyWood, mx, mz, len / n + 0.1, 0.1, 0.06, yaw, ground(mx, mz) + 0.32, 0, -droop);
      }
    }
  };
  const gateDir: Record<string, { along: [number, number] }> = {
    south_gate: { along: [1, 0] }, west_gate: { along: [0, 1] }, north_gate: { along: [1, 0] },
  };
  for (const gate of WICK_GATES) {
    const [ax, az] = gateDir[gate.id]?.along ?? [1, 0];
    const yaw = Math.atan2(ax, az) + Math.PI / 2;
    for (const s of [-1, 1]) {
      const px = gate.x + ax * s * 2.1, pz = gate.z + az * s * 2.1;
      box(`${gate.id}_post_${s}`, wood, px, pz, 0.3, 2.3, 0.3, yaw, ground(px, pz) - 0.15, 0, s * 0.04);
      fenceRun(`${gate.id}_fence_${s}`, px + ax * s * 0.6, pz + az * s * 0.6, px + ax * s * 9, pz + az * s * 9);
    }
    // The bar: snapped, one half still on its post and hanging, the other on the ground.
    const hx = gate.x - ax * 1.1, hz = gate.z - az * 1.1;
    box(`${gate.id}_bar_hanging`, wood, hx, hz, 2.1, 0.16, 0.12, yaw, ground(hx, hz) + 0.75, 0, 0.42);
    const fx = gate.x + ax * 1.2 + az * 1.3, fz = gate.z + az * 1.2 + ax * 1.3;
    box(`${gate.id}_bar_fallen`, wood, fx, fz, 1.9, 0.16, 0.12, yaw + 0.7, ground(fx, fz) + 0.02);
  }

  // ---- The small things ----
  const thing = (id: string) => WICK_THINGS.find((t) => t.id === id)!;
  {
    // The well, with a dead tree across it.
    const w = thing('well');
    await place('buildings/building_well_blue', w.x, w.z, BUILDING_SCALE * 0.55, 0.4);
    const log = MeshBuilder.CreateCylinder('well_dead_tree', { height: 9, diameterTop: 0.35, diameterBottom: 0.7, tessellation: 8 }, scene);
    log.position.set(w.x + 1.2, ground(w.x, w.z) + 1.5, w.z - 0.4);
    log.rotation.set(0, 0.5, Math.PI / 2 - 0.2);
    log.material = greyWood; log.parent = root; cast(log);
    for (const [k, a] of [[2.6, 0.9], [3.6, -0.8], [1.4, 0.5]] as const) {
      const br = MeshBuilder.CreateCylinder(`well_branch_${k}`, { height: 2.6, diameterTop: 0.05, diameterBottom: 0.2, tessellation: 6 }, scene);
      br.position.set(w.x + 1.2 + k * 0.85, ground(w.x, w.z) + 2.5 - k * 0.15, w.z - 0.4 - k * 0.45 + a);
      br.rotation.set(a, 0.5, 0.5);
      br.material = greyWood; br.parent = root; cast(br);
    }
  }
  {
    // The bell post, the bell lying beside it.
    const b = thing('bell_post');
    box('bell_post', wood, b.x, b.z, 0.34, 3.6, 0.34, 0.3, ground(b.x, b.z) - 0.2, 0.03, -0.05);
    box('bell_arm', wood, b.x + 0.6, b.z + 0.2, 1.6, 0.22, 0.22, 0.3, ground(b.x, b.z) + 3.1);
    const bell = MeshBuilder.CreateCylinder('bell_fallen', { height: 0.9, diameterTop: 0.35, diameterBottom: 0.95, tessellation: 12 }, scene);
    bell.position.set(b.x + 1.5, ground(b.x + 1.5, b.z + 0.9) + 0.4, b.z + 0.9);
    bell.rotation.set(0.3, 0.8, Math.PI / 2 - 0.25);
    bell.material = iron; bell.parent = root; cast(bell);
  }
  {
    // Three bare stall frames.
    const s = thing('market_stalls');
    for (let i = 0; i < 3; i++) {
      const x = s.x + (chance(o.seed, `stall:x:${i}`) - 0.5) * 0.8, z = s.z - 5 + i * 4.6;
      const yaw = Math.PI / 2 + (chance(o.seed, `stall:yaw:${i}`) - 0.5) * 0.3;
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      const off = (u: number, v: number) => [x + c * u + sn * v, z - sn * u + c * v] as const;
      const gone = i === 1 ? 3 : -1; // the middle stall has lost a leg and leans
      [[-1.4, -0.8], [1.4, -0.8], [-1.4, 0.8], [1.4, 0.8]].forEach(([u, v], k) => {
        if (k === gone) return;
        const [px, pz] = off(u, v);
        box(`stall_${i}_leg_${k}`, greyWood, px, pz, 0.14, 2.3, 0.14, yaw, undefined, i === 1 ? 0.12 : 0, 0);
      });
      for (const v of [-0.8, 0.8]) { const [px, pz] = off(0, v); box(`stall_${i}_top_${v}`, greyWood, px, pz, 3.0, 0.12, 0.12, yaw, ground(px, pz) + 2.2, 0, i === 1 ? 0.1 : 0); }
      const [cx, cz] = off(0, -0.8);
      box(`stall_${i}_counter`, greyWood, cx, cz, 2.9, 0.1, 0.5, yaw, ground(cx, cz) + 0.95, i === 1 ? 0.2 : 0, 0);
    }
  }
  {
    // The overturned cart.
    const c = thing('overturned_cart');
    const cart = await place('props/wheelbarrow', c.x, c.z, PROP * 1.5, 0.8);
    cart.rotation.z = Math.PI * 0.62;
    cart.position.y += 1.25;
    await place('props/crate_open', c.x + 2.1, c.z + 1.0, PROP, 1.9);
    await place('props/sack', c.x - 1.6, c.z + 1.6, PROP, 0.4);
  }
  {
    // The landing: a short jetty, and one boat sunk beside it.
    const l = thing('landing');
    const out = { x: -0.5, z: -0.87 };
    const yaw = Math.atan2(out.x, out.z);
    const deck = Math.max(ground(l.x, l.z), 2) + 0.55;
    for (let k = 0; k < 7; k++) {
      const x = l.x + out.x * (k * 1.25 - 1), z = l.z + out.z * (k * 1.25 - 1);
      if (k === 4) continue; // a missing board
      box(`landing_board_${k}`, greyWood, x, z, 2.2, 0.1, 1.1, yaw, deck + (chance(o.seed, `board:${k}`) - 0.5) * 0.08, 0, (chance(o.seed, `boardr:${k}`) - 0.5) * 0.08);
      if (k % 2 === 0) for (const s of [-1, 1]) box(`landing_pile_${k}_${s}`, wood, x + out.z * s * 1.0, z - out.x * s * 1.0, 0.22, 2.6, 0.22, yaw, deck - 2.0);
    }
    const bx = l.x + out.x * 4 + 3.0, bz = l.z + out.z * 4 + 0.6;
    const hull = MeshBuilder.CreateBox('sunk_boat', { width: 1.5, height: 0.55, depth: 4.2 }, scene);
    hull.position.set(bx, 2 - 0.05, bz);
    hull.rotation.set(0.16, yaw + 0.5, 0.42);
    hull.material = wood; hull.parent = root; cast(hull);
  }
  {
    // The Ashbys' empty hives: straw skeps on a board, one tipped over.
    const hv = thing('ashby_hives');
    box('hive_bench', greyWood, hv.x, hv.z, 3.4, 0.12, 0.7, 0.2, ground(hv.x, hv.z) + 0.45);
    for (let i = 0; i < 4; i++) {
      const skep = MeshBuilder.CreateSphere(`skep_${i}`, { diameterX: 0.7, diameterY: 0.85, diameterZ: 0.7, segments: 8 }, scene);
      const tipped = i === 3;
      const x = hv.x - 1.2 + i * 0.85 + (tipped ? 0.9 : 0), z = hv.z + (tipped ? 1.1 : 0);
      skep.position.set(x, ground(x, z) + (tipped ? 0.32 : 0.92), z);
      if (tipped) skep.rotation.z = 1.4;
      skep.material = straw; skep.parent = root; cast(skep);
    }
  }
  {
    const wp = thing('brand_woodpile');
    await place('props/resource_lumber', wp.x, wp.z, PROP * 1.2, 0.3);
    await place('props/resource_lumber', wp.x + 2.2, wp.z + 0.5, PROP * 1.1, 1.2);
    box('chopping_block', wood, wp.x - 2.4, wp.z + 1.2, 0.8, 0.7, 0.8, 0.5);
  }
  // Fields and the garden: turned earth gone to weed.
  const plot = (id: string, w: number, d: number, yaw: number): void => {
    const t = thing(id);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    ribbon(`${id}_earth`, [[t.x - s * d / 2, t.z - c * d / 2], [t.x + s * d / 2, t.z + c * d / 2]], w, soil, 0.035, 0.06);
  };
  plot('oona_garden', 9, 10, -0.3);

  // ---- Weeds: in every lane and yard, through the square, thick in the fields (rule 3) ----
  const tuft = (name: string, mat: PBRMaterial, hgt: number): Mesh => {
    const positions: number[] = [], indices: number[] = [], normals: number[] = [];
    // A clump of narrow blades leaning outward, not a card.
    for (let b = 0; b < 7; b++) {
      const a = (b / 7) * Math.PI * 2 + b, r = 0.05 + (b % 3) * 0.05, h = hgt * (0.55 + ((b * 37) % 10) / 22);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a) * 0.035, pz = Math.cos(a) * 0.035, i0 = positions.length / 3;
      positions.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, cx + Math.cos(a) * h * 0.45, h, cz + Math.sin(a) * h * 0.45);
      indices.push(i0, i0 + 1, i0 + 2);
      for (let k = 0; k < 3; k++) normals.push(0, 1, 0); // lit as the ground is, so blades never go black
    }
    const m = new Mesh(name, scene);
    const vd = new VertexData();
    vd.positions = positions; vd.indices = indices; vd.normals = normals;
    vd.applyToMesh(m);
    m.material = mat; m.parent = root; m.isPickable = false;
    return m;
  };
  const green = tuft('wick_weeds', weed, 0.5);
  const dry = tuft('wick_dry_weeds', dryWeed, 0.8);
  const greenAt: number[] = [], dryAt: number[] = [];
  const scatter = (key: string, cx: number, cz: number, rx: number, rz: number, count: number, tall = 1): void => {
    for (let i = 0; i < count; i++) {
      const x = cx + (chance(o.seed, `${key}:x:${i}`) * 2 - 1) * rx, z = cz + (chance(o.seed, `${key}:z:${i}`) * 2 - 1) * rz;
      const y = ground(x, z);
      if (y < 2.15) continue;
      const s = (0.6 + chance(o.seed, `${key}:s:${i}`) * 0.9) * tall;
      const mesh = chance(o.seed, `${key}:m:${i}`) > 0.78 ? dry : green;
      const a = chance(o.seed, `${key}:a:${i}`) * Math.PI, c = Math.cos(a) * s, sn = Math.sin(a) * s;
      (mesh === dry ? dryAt : greenAt).push(c, 0, -sn, 0, 0, s, 0, 0, sn, 0, c, 0, x, y, z, 1);
    }
  };
  // Hesper's window faces 135; the arrival line runs south-east from her house. Weeds there stay low (rule 6).
  for (const [name, pts] of Object.entries(WICK_LANES)) {
    pts.slice(0, -1).forEach((p, i) => {
      const q = pts[i + 1];
      const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 6);
      for (let k = 0; k < n; k++) scatter(`${name}:${i}:${k}`, p[0] + ((q[0] - p[0]) * (k + 0.5)) / n, p[1] + ((q[1] - p[1]) * (k + 0.5)) / n, 3.4, 3.4, 22, 0.7);
    });
  }
  scatter('square', 78, 80, 9, 7, 150, 0.6);
  for (const h of houses) if (h.state !== 'lit') scatter(`yard:${h.id}`, h.x, h.z, 7.5, 7.5, 150, 1.2);
  scatter('pike_field', thing('pike_field').x, thing('pike_field').z, 11, 15, 1100, 1.5);
  scatter('dunn_field', thing('dunn_field').x, thing('dunn_field').z, 8, 7, 420, 0.6);
  scatter('oona_garden', thing('oona_garden').x, thing('oona_garden').z, 5, 5.5, 300, 1.7);
  green.thinInstanceSetBuffer('matrix', new Float32Array(greenAt), 16, true);
  dry.thinInstanceSetBuffer('matrix', new Float32Array(dryAt), 16, true);
  for (const m of [green, dry]) { m.alwaysSelectAsActiveMesh = true; m.receiveShadows = true; }
  void stone;

  return {
    root, houses, lamp,
    light(l, tod) {
      const on = tod >= 17 || tod < 1;
      // Brightest once the daylight has gone; present, but not shouting, in the gold hour before.
      lamp.intensity = on ? 8 + 22 * l.nightness : 0;
      glow.emissiveColor = on ? new Color3(1, 0.72, 0.36).scale(0.9 + 0.5 * l.nightness) : new Color3(0.1, 0.1, 0.12);
    },
    dispose() { smoke.dispose(); dot.dispose(); root.dispose(false, true); },
  };
}
