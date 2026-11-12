// Room standard test: Hesper's cottage, inside. Reached only at ?styletest=room. A test sheet, not game content.
// Furniture is KayKit Dungeon Remastered, Furniture Bits, and Restaurant Bits (all CC0, the people's own artist),
// at the scale they ship: they are made for these characters. Contents follow docs/writing/interiors.md.
// window.__styletestSet({ tod, view }) draws one frame; window.__styletestReady is set once built.

import {
  AssetContainer, Color3, Color4, DirectionalLight, Engine, FreeCamera, GlowLayer, HemisphericLight,
  ImageProcessingConfiguration, Mesh, MeshBuilder, Node, PBRMaterial, PointLight, Scene, SceneLoader, ShadowGenerator,
  TransformNode, Vector3,
} from '@babylonjs/core';
import { assetUrl, bindClips, loadAssets, nodeMap } from '../render/assets';
import { ClipPlayer, scrub } from '../render/clips';
import { PROPORTIONS } from './upgrade';

const DUN = 'assets/kaykit_dungeon/';
const FUR = 'assets/kaykit_furniture/';
const RES = 'assets/kaykit_restaurant/';
const KAY = 'assets/kaykit_adventurers/characters/';

/** Inside measurements of the cottage layout, in metres. Ceilings are well over a person's height. */
export const COTTAGE = { halfWidth: 4, halfDepth: 4, height: 3.9 };

async function load(scene: Scene, path: string): Promise<AssetContainer> {
  const url = assetUrl(path);
  const cut = url.lastIndexOf('/');
  return SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene);
}

export async function startRoomTest(canvas: HTMLCanvasElement): Promise<void> {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const scene = new Scene(engine);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 0.45;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  const sun = new DirectionalLight('sun', new Vector3(0.9, -0.5, 0.2), scene);
  sun.position = new Vector3(-20, 12, -4);
  const hearth = new PointLight('hearth', new Vector3(0, 1.3, 2.0), scene);
  hearth.diffuse = new Color3(1, 0.55, 0.22);
  hearth.range = 14;
  const lamp = new PointLight('lamp', new Vector3(-3.4, 1.9, -0.6), scene);
  lamp.diffuse = new Color3(1, 0.72, 0.38);
  lamp.range = 9;
  const shadow = new ShadowGenerator(1024, hearth);
  shadow.usePercentageCloserFiltering = true;
  shadow.darkness = 0.35;

  // Everything is a PBR surface, like the pack's own materials, so walls and furniture answer the lights alike.
  const mat = (name: string, c: [number, number, number], emissive?: [number, number, number]): PBRMaterial => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = new Color3(c[0], c[1], c[2]);
    m.roughness = 1;
    m.metallic = 0;
    if (emissive) { m.emissiveColor = new Color3(emissive[0], emissive[1], emissive[2]); m.albedoColor = Color3.Black(); }
    return m;
  };
  const plaster = mat('plaster', [0.82, 0.76, 0.64]);
  const timber = mat('timber', [0.32, 0.2, 0.12]);
  const stone = mat('stone', [0.2, 0.2, 0.22]);
  const dark = mat('dark', [0.1, 0.09, 0.09]);
  const fire = mat('fire', [1, 0.5, 0.1], [1, 0.45, 0.1]);
  const flame = mat('flame', [1, 0.8, 0.4], [1, 0.75, 0.35]);
  const cloth = mat('cloak', [0.22, 0.27, 0.36]);
  const brass = mat('brass', [0.7, 0.55, 0.2]);
  const sky = mat('sky', [0.5, 0.7, 0.9], [0.5, 0.7, 0.9]);

  const box = (name: string, size: [number, number, number], pos: [number, number, number], m: PBRMaterial, casts = false): Mesh => {
    const b = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    b.position.set(pos[0], pos[1], pos[2]);
    b.material = m;
    b.receiveShadows = true;
    if (casts) shadow.addShadowCaster(b);
    return b;
  };

  const { halfWidth: W, halfDepth: D, height: H } = COTTAGE;
  // Walls: plaster between dark timbers. The front wall is left off for the cutaway view and exists in first person.
  const frontWall: Mesh[] = [];
  box('wall_back', [2 * W, H, 0.2], [0, H / 2, D + 0.1], plaster);
  box('wall_right', [0.2, H, 2 * D], [W + 0.1, H / 2, 0], plaster);
  // Left wall with a window opening between z = -1.4 and 0.2, y = 1.3 to 2.6.
  box('wall_left_a', [0.2, H, D - 1.4], [-W - 0.1, H / 2, -D + (D - 1.4) / 2], plaster);
  box('wall_left_b', [0.2, H, D - 0.2], [-W - 0.1, H / 2, 0.2 + (D - 0.2) / 2], plaster);
  box('wall_left_sill', [0.2, 1.3, 1.6], [-W - 0.1, 0.65, -0.6], plaster);
  box('wall_left_head', [0.2, H - 2.6, 1.6], [-W - 0.1, 2.6 + (H - 2.6) / 2, -0.6], plaster);
  box('window_sill', [0.5, 0.08, 1.7], [-W + 0.12, 1.3, -0.6], timber);
  box('window_frame_top', [0.24, 0.1, 1.7], [-W - 0.08, 2.6, -0.6], timber);
  box('window_mullion', [0.06, 1.3, 0.06], [-W - 0.1, 1.95, -0.6], timber);
  const outside = box('outside', [0.05, 5, 8], [-W - 1.6, 2, -0.6], sky);
  outside.receiveShadows = false;
  frontWall.push(box('wall_front_a', [W + 1.9, H, 0.2], [-(W - 1.9) / 2 - 1.05, H / 2, -D - 0.1], plaster));
  frontWall.push(box('wall_front_b', [W - 3.1, H, 0.2], [3.1 + (W - 3.1) / 2, H / 2, -D - 0.1], plaster));
  frontWall.push(box('wall_front_head', [1.25, H - 2.9, 0.2], [2.5, 2.9 + (H - 2.9) / 2, -D - 0.1], plaster));
  for (const x of [-W, -W / 3, W / 3, W]) box(`post_back_${x}`, [0.22, H, 0.12], [x, H / 2, D - 0.02], timber);
  for (const z of [-D, 0.9, D]) box(`post_right_${z}`, [0.12, H, 0.22], [W - 0.02, H / 2, z], timber);
  for (const z of [-D, -1.5, 0.3, D]) box(`post_left_${z}`, [0.12, H, 0.22], [-W + 0.02, H / 2, z], timber);
  box('rail_back', [2 * W, 0.18, 0.12], [0, 2.75, D - 0.02], timber);
  box('rail_right', [0.12, 0.18, 2 * D], [W - 0.02, 2.75, 0], timber);
  const ceiling: Mesh[] = [];
  for (const z of [-3, -1, 1, 3]) ceiling.push(box(`beam_${z}`, [2 * W, 0.24, 0.24], [0, H - 0.12, z], timber));
  ceiling.push(box('ceiling', [2 * W + 0.4, 0.1, 2 * D + 0.4], [0, H + 0.05, 0], mat('boards', [0.4, 0.27, 0.17])));

  // The hearth, in stone, on the back wall. No pack has one, so it is built from blocks in the pack's stone colour.
  box('hearth_base', [3.0, 0.3, 1.2], [0, 0.15, D - 0.6], stone);
  box('hearth_jamb_l', [0.5, 1.6, 1.0], [-1.25, 1.1, D - 0.5], stone, true);
  box('hearth_jamb_r', [0.5, 1.6, 1.0], [1.25, 1.1, D - 0.5], stone, true);
  box('hearth_lintel', [3.2, 0.4, 1.1], [0, 2.1, D - 0.55], stone, true);
  box('hearth_mantel', [3.5, 0.12, 1.25], [0, 2.36, D - 0.62], timber, true);
  box('hearth_breast', [2.2, H - 2.4, 0.8], [0, 2.4 + (H - 2.4) / 2, D - 0.4], stone);
  box('hearth_back', [2.0, 1.6, 0.1], [0, 1.1, D - 0.06], dark);
  box('hearth_logs', [1.2, 0.18, 0.4], [0, 0.42, D - 0.55], timber);
  const embers = box('hearth_fire', [0.9, 0.22, 0.3], [0, 0.6, D - 0.55], fire);
  embers.receiveShadows = false;
  const tongue = MeshBuilder.CreateCylinder('hearth_flame', { diameterTop: 0, diameterBottom: 0.42, height: 0.7, tessellation: 6 }, scene);
  tongue.position.set(0, 0.95, D - 0.55);
  tongue.material = flame;

  const kit = new Map<string, AssetContainer>();
  const put = async (path: string, pos: [number, number, number], yaw = 0, scale = 1): Promise<TransformNode> => {
    if (!kit.has(path)) kit.set(path, await load(scene, path));
    const e = kit.get(path)!.instantiateModelsToScene((n) => `${path}_${pos.join('_')}_${n}`, false);
    const root = new TransformNode(`${path}_${pos.join('_')}`, scene);
    for (const n of e.rootNodes) n.parent = root;
    root.position.set(pos[0], pos[1], pos[2]);
    root.rotation.y = yaw;
    root.scaling.setAll(scale);
    for (const m of root.getChildMeshes(false)) {
      m.receiveShadows = true;
      shadow.addShadowCaster(m);
      if (m.material instanceof PBRMaterial) { m.material.roughness = 0.9; m.material.metallic = 0; }
    }
    return root;
  };

  for (const x of [-2, 2]) for (const z of [-2, 2]) await put(`${DUN}floor_wood_large.glb`, [x, 0, z]);
  await put(`${FUR}rug_oval_A.gltf`, [-0.6, 0.06, 0.2], 0.2, 1.25);
  // "A bed, a table, one chair, a shelf."
  await put(`${DUN}bed_frame.glb`, [3.1, 0, 1.9]);
  // The storage chest at the foot of the bed.
  await put(`${DUN}chest.glb`, [3.0, 0.17, -0.9], Math.PI);
  // "One bowl, one cup, one chair." The chair faces the window, not the fire.
  await put(`${DUN}table_small.glb`, [-2.6, 0, 1.3]);
  await put(`${RES}bowl.gltf`, [-2.7, 1.0, 1.2], 0, 0.42);
  await put(`${DUN}bottle_A_brown.glb`, [-2.3, 1.0, 1.5], 0, 0.6);
  await put(`${DUN}chair.glb`, [-2.3, 0, -0.2], -Math.PI / 2 - 0.25);
  // Bram's stool, which appeared when he arrived and never left.
  await put(`${DUN}stool.glb`, [-1.3, 0, 2.4], 0.4);
  await put(`${DUN}shelves.glb`, [-2.6, 0.1, D - 0.78]);
  await put(`${RES}jar_B_medium.gltf`, [-3.1, 1.02, D - 0.42], 0, 0.5);
  await put(`${RES}jar_A_small.gltf`, [-2.5, 1.02, D - 0.42], 0, 0.5);
  await put(`${DUN}bottle_A_brown.glb`, [-2.1, 1.02, D - 0.42], 0, 0.55);
  await put(`${DUN}barrel_small.glb`, [3.3, 0, D - 0.7]);
  await put(`${RES}pot_A_stew.gltf`, [0, 0.72, D - 0.75], 0, 0.5);
  await put(`${DUN}keyring_hanging.glb`, [W - 0.12, 2.3, -2.2], -Math.PI / 2, 0.7);
  // "The lamp in the window, always lit."
  await put(`${DUN}candle_lit.glb`, [-W + 0.22, 1.34, -0.6], 0, 0.8);
  // "A small bell with no clapper on the mantel."
  const bell = MeshBuilder.CreateCylinder('bell', { diameterTop: 0.06, diameterBottom: 0.2, height: 0.2, tessellation: 10 }, scene);
  bell.position.set(1.1, 2.52, D - 0.7);
  bell.material = brass;
  // "Two hooks by the door. One holds her cloak. The other is empty."
  for (const z of [-3.2, -2.75]) {
    const peg = MeshBuilder.CreateCylinder(`peg_${z}`, { diameter: 0.07, height: 0.3 }, scene);
    peg.rotation.z = Math.PI / 2;
    peg.position.set(W - 0.15, 2.45, z);
    peg.material = timber;
  }
  box('cloak', [0.16, 1.5, 0.5], [W - 0.2, 1.68, -3.2], cloth, true);
  box('cloak_hood', [0.2, 0.3, 0.36], [W - 0.2, 2.42, -3.2], cloth, true);

  // Hesper: the hooded rogue, hood up, mask off, grey, with an old woman's stoop. And the hero, for scale.
  const assets = await loadAssets(scene, () => undefined);
  const people: { root: TransformNode; player: ClipPlayer; reshape: () => void }[] = [];
  const person = async (model: string, tint: number[], pos: [number, number], yaw: number, hide: RegExp | null, stoop: number): Promise<void> => {
    const c = assets.characters.get(model) ?? await load(scene, model);
    const e = c.instantiateModelsToScene((n) => n, true);
    const root = new TransformNode(`person_${model}`, scene);
    for (const r of e.rootNodes) r.parent = root;
    root.position.set(pos[0], PROPORTIONS.legLength * (PROPORTIONS.leg - 1), pos[1]);
    root.rotation.y = yaw;
    const bones = nodeMap(e.rootNodes as Node[]);
    const bone = (n: string) => bones.get(n) as TransformNode;
    for (const m of root.getChildMeshes(false)) {
      if (hide?.test(m.name)) { m.setEnabled(false); continue; }
      if (m.material instanceof PBRMaterial) m.material.albedoColor = new Color3(tint[0], tint[1], tint[2]);
      m.renderOutline = true;
      m.outlineWidth = 0.011;
      m.outlineColor = new Color3(0.16, 0.1, 0.08);
      m.receiveShadows = true;
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
        if (stoop) { bone('spine').rotation.x += stoop; bone('head').rotation.x -= stoop * 0.6; }
      },
    });
  };
  await person(`${KAY}Rogue_Hooded.glb`, [0.74, 0.74, 0.8], [-2.5, -1.1], -Math.PI / 2, /RogueHooded_Mask/, 0.2);
  await person(`${KAY}Ranger.glb`, [1, 1, 1], [1.4, -1.6], Math.PI * 0.85, null, 0);
  scene.onAfterAnimationsObservable.add(() => { for (const p of people) p.reshape(); });

  const camera = new FreeCamera('cam', new Vector3(0, 2, -12), scene);
  camera.minZ = 0.1;

  const draw = (state: { tod?: number; view?: string }): void => {
    const tod = state.tod ?? 21;
    const night = tod >= 19 || tod < 6;
    scene.clearColor = night ? new Color4(0.02, 0.03, 0.07, 1) : new Color4(0.55, 0.72, 0.9, 1);
    sky.emissiveColor = night ? new Color3(0.03, 0.05, 0.12) : new Color3(0.55, 0.74, 0.95);
    hemi.intensity = night ? 0.22 : 0.7;
    hemi.diffuse = night ? new Color3(0.5, 0.56, 0.8) : new Color3(1, 0.98, 0.94);
    hemi.groundColor = night ? new Color3(0.1, 0.08, 0.08) : new Color3(0.4, 0.36, 0.32);
    sun.intensity = night ? 0 : 1.1;
    hearth.intensity = night ? 34 : 12;
    lamp.intensity = night ? 16 : 5;

    const view = state.view ?? 'cutaway';
    const inside = view !== 'cutaway';
    for (const m of [...frontWall, ...ceiling]) m.setEnabled(inside);
    // In first person the hero is the camera.
    people[1].root.setEnabled(!inside);
    if (view === 'cutaway') {
      camera.position.set(0.8, 6.4, -12.5);
      camera.setTarget(new Vector3(0, 1.3, 0.8));
      camera.fov = 0.62;
    } else if (view === 'door') {
      // First person, just inside the door, looking across the room to the window and the hearth.
      camera.position.set(1.5, 2.0, -3.7);
      camera.setTarget(new Vector3(-1.4, 1.45, 2.4));
      camera.fov = 1.0;
    } else {
      // First person, by the bed, looking at Hesper's chair and the lamp.
      camera.position.set(2.2, 2.0, 1.2);
      camera.setTarget(new Vector3(-3.6, 1.5, -0.9));
      camera.fov = 0.95;
    }
    for (const p of people) p.player.apply(scrub('Idle_A', 0.2));
    scene.render();
    scene.render();
  };

  const w = window as unknown as { __styletestReady?: boolean; __styletestSet?: typeof draw };
  w.__styletestSet = draw;
  draw({ tod: 21, view: 'cutaway' });
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  w.__styletestReady = true;
}
