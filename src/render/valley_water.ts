// The valley's water (overnight item 5; Claude's). The lake and rivers take the sky: looking across the water you
// see the horizon's colour, looking down into it you see the water's own, and where it is shallow you see the bed.
// One mesh, one shader, no extra render passes. Small ripples move and catch the low sun.
import { Color3, Effect, Mesh, Scene, ShaderMaterial, Vector3, VertexData } from '@babylonjs/core';
import { VALLEY_HALF_EXTENT, valleyHeightAt, WATER_LEVEL } from '../core/world/valley';
import type { Lighting } from './lighting';

export const WATER = {
  /** Metres between samples of the bed's depth. */
  cell: 4,
  /** How far past the valley's edge the sheet runs, so no edge of it is ever seen. */
  margin: 200,
  deep: new Color3(0.05, 0.13, 0.17),
  shallow: new Color3(0.2, 0.34, 0.3),
} as const;

/** Pure: a flat sheet at the water's level, each vertex carrying the depth of water under it (0 on dry land). */
export function waterSheet(heightAt: (x: number, z: number) => number = valleyHeightAt, half: number = VALLEY_HALF_EXTENT + WATER.margin, cell: number = WATER.cell) {
  const n = Math.round((half * 2) / cell) + 1;
  const positions: number[] = [], depth: number[] = [], indices: number[] = [];
  const wet: boolean[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * cell, z = -half + j * cell;
    const d = WATER_LEVEL - heightAt(x, z);
    positions.push(x, WATER_LEVEL, z);
    depth.push(Math.max(0, d));
    wet.push(d > -0.6);
  }
  // Only cells that touch water are kept: the sheet is not drawn under the land.
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i;
    if (!(wet[a] || wet[a + 1] || wet[a + n] || wet[a + n + 1])) continue;
    indices.push(a, a + 1, a + n, a + 1, a + n + 1, a + n);
  }
  return { positions, depth, indices, side: n };
}

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute float depth;
uniform mat4 world;
uniform mat4 viewProjection;
varying vec3 vPos;
varying float vDepth;
void main() {
  vec4 p = world * vec4(position, 1.0);
  vPos = p.xyz;
  vDepth = depth;
  gl_Position = viewProjection * p;
}`;

const FRAGMENT = `
precision highp float;
varying vec3 vPos;
varying float vDepth;
uniform vec3 eye;
uniform float time;
uniform vec3 horizon;
uniform vec3 zenith;
uniform vec3 deep;
uniform vec3 shallow;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float sunPower;
uniform float daylight;
uniform vec3 fogColor;
uniform vec2 fogRange;
void main() {
  vec3 toEye = eye - vPos;
  float dist = length(toEye);
  vec3 V = toEye / dist;
  // Ripples: three crossing waves, fading with distance so far water is calm and never shimmers.
  float calm = 1.0 / (1.0 + dist * 0.02);
  vec2 p = vPos.xz;
  float gx = 0.0, gz = 0.0;
  gx += cos(p.x * 0.9 + p.y * 0.35 + time * 1.1) * 0.9;  gz += cos(p.x * 0.9 + p.y * 0.35 + time * 1.1) * 0.35;
  gx += cos(-p.x * 0.4 + p.y * 1.3 + time * 1.5) * -0.4; gz += cos(-p.x * 0.4 + p.y * 1.3 + time * 1.5) * 1.3;
  gx += cos(p.x * 2.3 - p.y * 1.7 + time * 2.2) * 1.1;   gz += cos(p.x * 2.3 - p.y * 1.7 + time * 2.2) * -0.8;
  vec3 N = normalize(vec3(-gx * 0.022 * calm, 1.0, -gz * 0.022 * calm));
  float facing = max(dot(N, V), 0.0);
  float fresnel = 0.06 + 0.94 * pow(1.0 - facing, 4.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(horizon, zenith, clamp(R.y * 1.8, 0.0, 1.0));
  // The water's own colour: the bed shows through where it is shallow, and it darkens with the day.
  vec3 body = mix(shallow, deep, clamp(vDepth * 0.7, 0.0, 1.0)) * (0.25 + 0.75 * daylight);
  vec3 col = mix(body, sky, fresnel);
  // The low sun on the ripples.
  float glint = pow(max(dot(R, -sunDir), 0.0), 220.0) * sunPower;
  col += sunColor * glint;
  float fog = clamp((dist - fogRange.x) / (fogRange.y - fogRange.x), 0.0, 1.0);
  col = mix(col, fogColor, fog);
  // Thin at the very edge, so the shore is a soft line and not a cut.
  // Shallows stay clear enough to show the bed (the ford gravel at 0.4 m reads through); full by 0.7 m.
  float alpha = clamp(0.3 + vDepth * 0.9, 0.0, 0.94);
  gl_FragColor = vec4(col, alpha);
}`;

export interface ValleyWater {
  mesh: Mesh;
  /** Call every frame: `seconds` runs the ripples, `eye` is the camera's position. */
  update(l: Lighting, seconds: number, eye: Vector3, fogStart: number, fogEnd: number): void;
}

export function buildValleyWater(scene: Scene): ValleyWater {
  const d = waterSheet();
  const mesh = new Mesh('valley_water', scene);
  const vd = new VertexData();
  vd.positions = d.positions;
  vd.indices = d.indices;
  vd.applyToMesh(mesh);
  mesh.setVerticesData('depth', d.depth, false, 1);
  Effect.ShadersStore.valleyWaterVertexShader = VERTEX;
  Effect.ShadersStore.valleyWaterFragmentShader = FRAGMENT;
  const mat = new ShaderMaterial('valley_water_mat', scene, { vertex: 'valleyWater', fragment: 'valleyWater' }, {
    attributes: ['position', 'depth'],
    uniforms: ['world', 'viewProjection', 'eye', 'time', 'horizon', 'zenith', 'deep', 'shallow', 'sunDir', 'sunColor', 'sunPower', 'daylight', 'fogColor', 'fogRange'],
    needAlphaBlending: true,
  });
  mat.backFaceCulling = false;
  mat.setColor3('deep', WATER.deep);
  mat.setColor3('shallow', WATER.shallow);
  mesh.material = mat;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  return {
    mesh,
    update(l, seconds, eye, fogStart, fogEnd) {
      mat.setVector3('eye', eye);
      mat.setFloat('time', seconds);
      mat.setColor3('horizon', l.sky);
      mat.setColor3('zenith', l.zenith);
      mat.setVector3('sunDir', l.sunDir);
      mat.setColor3('sunColor', l.sunColor);
      // The sun glints by day and at dusk; the moon only faintly.
      mat.setFloat('sunPower', 0.25 + 1.2 * (1 - l.nightness));
      mat.setFloat('daylight', Math.min(1, Math.max(0.12, (l.hemiIntensity - 0.5) * 1.6)));
      mat.setColor3('fogColor', l.sky);
      mat.setVector2('fogRange', { x: fogStart, y: fogEnd } as never);
    },
  };
}
