// Character upgrade test (review 011). Reached only at ?styletest=upgrade. A test sheet, not game content.
// The same four people in four columns: A as now; B proportions; C surface and light; D what they carry.
// window.__styletestSet({ tod, view }) draws one frame; window.__styletestReady is set once built.

import {
  AssetContainer, Color3, Color4, DirectionalLight, DynamicTexture, Engine, FreeCamera,
  HemisphericLight, ImageProcessingConfiguration, MeshBuilder, Quaternion, Node, PBRMaterial, Scene, SceneLoader,
  ShadowGenerator, StandardMaterial, TransformNode, Vector3,
} from '@babylonjs/core';
import { assetUrl, bindClips, loadAssets, nodeMap, type LoadedAssets } from '../render/assets';
import { ClipPlayer, scrub } from '../render/clips';

const KAY = 'assets/kaykit_adventurers/characters/';
type Column = 'A' | 'B' | 'C' | 'D';
const COLUMNS: Column[] = ['A', 'B', 'C', 'D'];
const LABELS: Record<Column, string> = {
  A: 'A  As now',
  B: 'B  Proportions',
  C: 'C  + surface and light',
  D: 'D  + what they carry',
};

interface Who {
  id: string;
  model: string;
  hide?: RegExp;
  tint: [number, number, number];
  carries: ('bow' | 'sword' | 'lantern')[];
}
const PEOPLE: Who[] = [
  { id: 'hero', model: `${KAY}Ranger.glb`, tint: [1, 1, 1], carries: ['bow', 'sword', 'lantern'] },
  { id: 'bram', model: `${KAY}Knight.glb`, hide: /Knight_Helmet|Knight_HelmetVisor/, tint: [1, 0.9, 0.7], carries: ['sword'] },
  { id: 'brute', model: `${KAY}Barbarian.glb`, tint: [0.6, 0.3, 0.25], carries: ['sword'] },
  { id: 'villager', model: `${KAY}Mage.glb`, hide: /Mage_Cape|Mage_Hat/, tint: [0.75, 0.6, 0.45], carries: [] },
];

export { PROPORTIONS } from '../render/proportions';
import { PROPORTIONS } from '../render/proportions';

const X_STEP = 1.9;
/** Clips the test can pin, to check that reshaped bodies still move properly. */
const CLIPS = ['Idle_A', 'Running_A', 'Walking_A', 'Ranged_Bow_Draw', 'Melee_1H_Attack_Chop', 'Sneaking'];

async function load(scene: Scene, path: string): Promise<AssetContainer> {
  const url = assetUrl(path);
  const cut = url.lastIndexOf('/');
  return SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene);
}

function label(scene: Scene, text: string, x: number, y: number, z: number, w = 1.7): void {
  const tex = new DynamicTexture(`lbl_${text}`, { width: 512, height: 96 }, scene, true);
  const c = tex.getContext() as CanvasRenderingContext2D;
  c.fillStyle = '#f1ead8';
  c.fillRect(0, 0, 512, 96);
  c.fillStyle = '#1d1a16';
  c.font = 'bold 40px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 256, 50);
  tex.update();
  const mat = new StandardMaterial(`lblmat_${text}`, scene);
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  const plane = MeshBuilder.CreatePlane(`lblp_${text}`, { width: w, height: w * 96 / 512 }, scene);
  plane.material = mat;
  plane.position.set(x, y, z);
}

export async function startUpgradeTest(canvas: HTMLCanvasElement): Promise<void> {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const scene = new Scene(engine);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  const sun = new DirectionalLight('sun', new Vector3(0.4, -1, 0.7), scene);
  sun.position = new Vector3(-12, 20, -16);
  const shadow = new ShadowGenerator(2048, sun);
  shadow.usePercentageCloserFiltering = true;
  shadow.darkness = 0.4;
  /** A warm light from behind and to one side, for the rim. Only columns C and D take it. */
  const rim = new DirectionalLight('rim', new Vector3(-0.5, -0.25, -1), scene);
  rim.specular = Color3.Black();
  rim.includedOnlyMeshes = [];

  const ground = MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, scene);
  const gm = new StandardMaterial('ground_mat', scene);
  gm.diffuseColor = new Color3(0.2, 0.3, 0.12);
  gm.specularColor = Color3.Black();
  ground.material = gm;
  ground.receiveShadows = true;

  const assets: LoadedAssets = await loadAssets(scene, () => undefined);
  const containers = new Map<string, AssetContainer>();
  for (const p of PEOPLE) containers.set(p.model, assets.characters.get(p.model) ?? await load(scene, p.model));

  const blobTex = new DynamicTexture('blob', { width: 128, height: 128 }, scene, true);
  {
    const c = blobTex.getContext() as CanvasRenderingContext2D;
    const g = c.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    blobTex.update();
    blobTex.hasAlpha = true;
  }
  const blobMat = new StandardMaterial('blob_mat', scene);
  blobMat.diffuseTexture = blobTex;
  blobMat.useAlphaFromDiffuseTexture = true;
  blobMat.disableLighting = true;
  blobMat.emissiveColor = Color3.Black();
  blobMat.specularColor = Color3.Black();

  const players: ClipPlayer[] = [];
  const rows: TransformNode[][] = [];
  const blobs: TransformNode[][] = [];
  const reshape: (() => void)[] = [];
  const rimColor = { value: new Color3(1, 0.8, 0.55) };
  const rimMats: PBRMaterial[] = [];

  PEOPLE.forEach((who, row) => {
    COLUMNS.forEach((col, ci) => {
      const tag = `${who.id}_${col}`;
      const entries = containers.get(who.model)!.instantiateModelsToScene((n) => n, true);
      const root = new TransformNode(tag, scene);
      for (const r of entries.rootNodes) r.parent = root;
      const x = (ci - 1.5) * X_STEP;
      const z = 0;
      root.position.set(x, 0, z);
      (rows[row] ??= []).push(root);
      root.rotation.y = Math.PI;
      const bones = nodeMap(entries.rootNodes as Node[]);
      const bone = (name: string): TransformNode => {
        const b = bones.get(name);
        if (!(b instanceof TransformNode)) throw new Error(`Upgrade test: no bone ${name} on ${who.model}`);
        return b;
      };

      const upgraded = col !== 'A';
      const surfaced = col === 'C' || col === 'D';
      for (const m of root.getChildMeshes(false)) {
        if (who.hide?.test(m.name)) { m.setEnabled(false); continue; }
        const pbr = m.material;
        if (pbr instanceof PBRMaterial) {
          const tint = new Color3(who.tint[0], who.tint[1], who.tint[2]);
          pbr.albedoColor = tint;
          if (surfaced) {
            // The same surface, with a soft warm edge where it turns away, a thin dark outline, and a light from behind.
            pbr.sheen.isEnabled = true;
            pbr.sheen.intensity = 0.22;
            pbr.sheen.roughness = 0.35;
            pbr.sheen.color = rimColor.value;
            pbr.roughness = 0.82;
            rimMats.push(pbr);
            m.renderOutline = true;
            m.outlineWidth = 0.011;
            m.outlineColor = new Color3(0.16, 0.1, 0.08);
            rim.includedOnlyMeshes.push(m);
          }
        }
        m.receiveShadows = true;
        shadow.addShadowCaster(m);
      }

      if (upgraded) {
        const P = PROPORTIONS;
        root.position.y = P.legLength * (P.leg - 1);
        reshape.push(() => {
          bone('head').scaling.set(P.head / P.chestWidth, P.head, P.head);
          bone('chest').scaling.set(P.chestWidth, 1, 1);
          for (const side of ['l', 'r']) {
            bone(`upperleg.${side}`).scaling.set(1, P.leg, 1);
            bone(`foot.${side}`).scaling.set(1, 1 / P.leg, 1);
          }
        });
      }

      if (surfaced) {
        const blob = MeshBuilder.CreateGround(`${tag}_blob`, { width: 1.1, height: 1.1 }, scene);
        blob.material = blobMat;
        blob.position.set(x, 0.012, z);
        blob.parent = null;
        (blobs[row] ??= []).push(blob);
      }

      if (col === 'D') {
        const mount = (c: AssetContainer, name: string, to: string, pos: [number, number, number], turn: Quaternion, scale = 1): void => {
          const e = c.instantiateModelsToScene((n) => `${tag}_${name}_${n}`, true);
          const holder = new TransformNode(`${tag}_${name}`, scene);
          for (const n of e.rootNodes) n.parent = holder;
          holder.parent = bone(to);
          holder.position.set(...pos);
          holder.rotationQuaternion = turn;
          holder.scaling.setAll(scale);
          for (const m of holder.getChildMeshes(false)) { shadow.addShadowCaster(m); m.renderOutline = true; m.outlineWidth = 0.011; m.outlineColor = new Color3(0.16, 0.1, 0.08); }
        };
        const about = (axis: Vector3, angle: number): Quaternion => Quaternion.RotationAxis(axis, angle);
        const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
        // The bow's length runs along its own z. Stand it up, lay its curve flat to the back, then lean it across the shoulders.
        if (who.carries.includes('bow')) mount(assets.bow, 'bow', 'chest', [0, 0.1, -0.3], about(Z, -0.6).multiply(about(Y, Math.PI / 2)).multiply(about(X, Math.PI / 2)), 0.62);
        // The blade's length runs along its own y, point up. Hang it point down at the hip, leaning back.
        if (who.carries.includes('sword')) mount(assets.sword, 'sword', 'hips', [0.3, 0.12, -0.04], about(X, Math.PI + 0.35), 0.55);
        if (who.carries.includes('lantern')) {
          const cage = MeshBuilder.CreateCylinder(`${tag}_lantern`, { diameter: 0.085, height: 0.11, tessellation: 10 }, scene);
          const lm = new StandardMaterial(`${tag}_lantern_mat`, scene);
          lm.diffuseColor = new Color3(0.2, 0.16, 0.1);
          lm.emissiveColor = new Color3(0.9, 0.5, 0.16);
          cage.material = lm;
          cage.parent = bone('hips');
          cage.position.set(-0.3, 0.0, 0.12);
          const cap = MeshBuilder.CreateCylinder(`${tag}_lantern_cap`, { diameterTop: 0.05, diameterBottom: 0.11, height: 0.04, tessellation: 10 }, scene);
          const cm = new StandardMaterial(`${tag}_lantern_cap_mat`, scene);
          cm.diffuseColor = new Color3(0.12, 0.1, 0.08);
          cap.material = cm;
          cap.parent = cage;
          cap.position.y = 0.075;
          const base = MeshBuilder.CreateCylinder(`${tag}_lantern_base`, { diameter: 0.1, height: 0.025, tessellation: 10 }, scene);
          base.material = cm;
          base.parent = cage;
          base.position.y = -0.065;
          shadow.addShadowCaster(cage);
        }
      }

      const player = new ClipPlayer(bindClips(entries.rootNodes, assets.clips, CLIPS, tag));
      player.apply(scrub('Idle_A', 0.2));
      players.push(player);
    });
  });

  COLUMNS.forEach((col, ci) => label(scene, LABELS[col], (ci - 1.5) * X_STEP, 2.36, 0));
  scene.onAfterAnimationsObservable.add(() => { for (const r of reshape) r(); });

  const camera = new FreeCamera('cam', new Vector3(0, 2, -8), scene);
  camera.minZ = 0.1;

  type View = 'hero' | 'bram' | 'brute' | 'villager' | 'hero-back';
  const draw = (state: { tod?: number; view?: string; clip?: string; t?: number }): void => {
    const clip = state.clip && CLIPS.includes(state.clip) ? state.clip : 'Idle_A';
    const t = state.t ?? 0.2;
    const tod = state.tod ?? 12;
    const dusk = tod >= 18;
    scene.clearColor = dusk ? new Color4(0.86, 0.56, 0.4, 1) : new Color4(0.62, 0.76, 0.92, 1);
    hemi.intensity = dusk ? 0.8 : 0.85;
    hemi.diffuse = dusk ? new Color3(1, 0.78, 0.62) : new Color3(1, 1, 1);
    hemi.groundColor = dusk ? new Color3(0.42, 0.32, 0.36) : new Color3(0.4, 0.42, 0.4);
    sun.intensity = dusk ? 1.5 : 2.0;
    sun.diffuse = dusk ? new Color3(1, 0.62, 0.34) : new Color3(1, 0.97, 0.92);
    sun.direction = dusk ? new Vector3(0.8, -0.42, 0.45).normalize() : new Vector3(0.4, -1, 0.7).normalize();
    rim.intensity = dusk ? 1.3 : 0.35;
    rim.diffuse = dusk ? new Color3(1, 0.6, 0.3) : new Color3(1, 0.95, 0.85);
    for (const m of rimMats) { m.sheen.color = dusk ? new Color3(1, 0.6, 0.3) : new Color3(1, 0.95, 0.85); m.sheen.intensity = dusk ? 0.55 : 0.22; }

    const view = (state.view ?? 'hero') as View;
    const row = Math.max(0, PEOPLE.findIndex((p) => view.startsWith(p.id)));
    rows.forEach((r, i) => { for (const n of r) n.setEnabled(i === row); });
    blobs.forEach((r, i) => { for (const n of r) n.setEnabled(i === row); });
    if (view.endsWith('-back')) {
      camera.position.set(3.2, 1.5, 6.2);
      camera.setTarget(new Vector3(1.4, 0.8, 0));
      camera.fov = 0.5;
    } else {
      camera.position.set(0, 1.2, -6.6);
      camera.setTarget(new Vector3(0, 1.02, 0));
      camera.fov = 0.62;
    }
    for (const p of players) p.apply(scrub(clip, t));
    scene.render();
    scene.render();
  };

  const w = window as unknown as { __styletestReady?: boolean; __styletestSet?: typeof draw };
  w.__styletestSet = draw;
  draw({ tod: 12, view: 'hero' });
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());
  w.__styletestReady = true;
}
