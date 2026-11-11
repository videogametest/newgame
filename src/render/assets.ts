// Asset loading for the render layer. Loads every model once at boot, then instantiates copies per fighter.
// Animations come from separate rig files; each clip is retargeted onto an instance by bone name.

import {
  AbstractMesh, AnimationGroup, AssetContainer, Node, Scene, SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { ANIMATION_FILES, UNITS, WEAPON_MODELS } from '../data/units';

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export interface LoadedAssets {
  /** Character containers keyed by model path (relative to public/assets). */
  characters: Map<string, AssetContainer>;
  /** Clip library: clip name to the animation group inside its source rig file. */
  clips: Map<string, AnimationGroup>;
  sword: AssetContainer;
  bow: AssetContainer;
  arrow: AssetContainer;
}

export type LoadProgress = (done: number, total: number, label: string) => void;

async function loadContainer(scene: Scene, path: string): Promise<AssetContainer> {
  const url = assetUrl(path);
  const cut = url.lastIndexOf('/');
  return SceneLoader.LoadAssetContainerAsync(url.slice(0, cut + 1), url.slice(cut + 1), scene);
}

/** Loads all models and animation rigs. Containers are not added to the scene; instances are. */
export async function loadAssets(scene: Scene, onProgress: LoadProgress): Promise<LoadedAssets> {
  const characterPaths = [...new Set(Object.values(UNITS).map((u) => u.model))];
  const jobs: { label: string; path: string }[] = [
    ...characterPaths.map((p) => ({ label: p, path: p })),
    ...ANIMATION_FILES.map((p) => ({ label: p, path: p })),
    { label: WEAPON_MODELS.sword.file, path: WEAPON_MODELS.sword.file },
    { label: WEAPON_MODELS.bow.file, path: WEAPON_MODELS.bow.file },
    { label: WEAPON_MODELS.arrow.file, path: WEAPON_MODELS.arrow.file },
  ];
  let done = 0;
  onProgress(0, jobs.length, 'Starting');
  const loaded = await Promise.all(
    jobs.map(async (job) => {
      const c = await loadContainer(scene, job.path);
      done += 1;
      onProgress(done, jobs.length, job.label);
      return { path: job.path, container: c };
    }),
  );
  const byPath = new Map(loaded.map((l) => [l.path, l.container]));

  const characters = new Map<string, AssetContainer>();
  for (const p of characterPaths) characters.set(p, byPath.get(p)!);

  const clips = new Map<string, AnimationGroup>();
  for (const rig of ANIMATION_FILES) {
    for (const group of byPath.get(rig)!.animationGroups) {
      if (!clips.has(group.name)) clips.set(group.name, group);
    }
  }
  return {
    characters,
    clips,
    sword: byPath.get(WEAPON_MODELS.sword.file)!,
    bow: byPath.get(WEAPON_MODELS.bow.file)!,
    arrow: byPath.get(WEAPON_MODELS.arrow.file)!,
  };
}

/** Non-mesh nodes of an instance (skeleton joints and helper nodes), keyed by name. */
export function nodeMap(roots: Node[]): Map<string, Node> {
  const map = new Map<string, Node>();
  for (const root of roots) {
    for (const n of [root, ...root.getDescendants(false)]) {
      if (n instanceof AbstractMesh) continue;
      if (!map.has(n.name)) map.set(n.name, n);
    }
  }
  return map;
}

/**
 * Retargets the named clips onto one character instance. Each animated bone is matched by name.
 * A bone that the instance lacks is reported, not silently skipped.
 */
export function bindClips(
  instanceRoots: Node[],
  library: Map<string, AnimationGroup>,
  clipNames: string[],
  prefix: string,
): Map<string, AnimationGroup> {
  const nodes = nodeMap(instanceRoots);
  const out = new Map<string, AnimationGroup>();
  for (const clip of clipNames) {
    const src = library.get(clip);
    if (!src) throw new Error(`Animation clip "${clip}" is not in any loaded rig file`);
    const missing = new Set<string>();
    const group = src.clone(`${prefix}:${clip}`, (old: Node) => {
      const hit = nodes.get(old.name);
      if (!hit) missing.add(old.name);
      return hit ?? old;
    });
    if (missing.size > 0) {
      console.warn(`[bindClips] ${prefix} clip ${clip}: no instance bone for ${[...missing].join(', ')}`);
    }
    out.set(clip, group);
  }
  return out;
}
