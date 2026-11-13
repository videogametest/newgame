// Sky for the valley: a gradient dome recoloured each frame from the time-of-day lighting, stars at night,
// and a sun and moon disc placed along the sun direction. The dome, stars and discs follow the hero so
// the horizon is never reached, and none of them take fog or lighting.

import { Color3, Color4, Constants, Effect, Mesh, MeshBuilder, Scene, ShaderMaterial, StandardMaterial, Vector2, Vector3, VertexBuffer, VertexData } from '@babylonjs/core';
import { seededValue } from '../core/world/terrain';
import { VALLEY_SEED } from '../core/world/valley';
import { clamp01, mix, PALETTE, type Lighting } from './lighting';

const DOME_DIAMETER = 2300; // wider than the valley corner to corner, so the castle on the far rim is never behind the sky
const DISC_DISTANCE = 700;
const STAR_COUNT = 420;
/** The sun's glow: a soft disc this many metres across at the discs' distance (the sun itself is 60). */
export const SUN_GLOW = { size: 420, strength: 0.7 } as const;

export class ValleySky {
  private readonly dome: Mesh;
  private readonly stars: Mesh;
  private readonly sun: Mesh;
  private readonly moon: Mesh;
  private readonly starMat: ShaderMaterial;
  private readonly glow: Mesh;
  private readonly glowMat: ShaderMaterial;
  private readonly sunMat: StandardMaterial;
  private readonly moonMat: StandardMaterial;

  constructor(scene: Scene) {
    this.dome = MeshBuilder.CreateSphere('valley_sky', { diameter: DOME_DIAMETER, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
    const domeMat = domeMaterial('valley_sky_mat', scene);
    this.dome.material = domeMat;
    // updateVerticesData does nothing for a missing buffer, so create the colour buffer up front.
    const domeVertexCount = this.dome.getTotalVertices();
    this.dome.setVerticesData(VertexBuffer.ColorKind, new Array(domeVertexCount * 4).fill(1), true);
    this.dome.useVertexColors = true;
    this.dome.isPickable = false;
    this.dome.infiniteDistance = true;

    // Stars are small quads facing the valley, not point sprites: point lists drew only one star in the
    // night frames (review 016), so every star is a triangle pair that any renderer draws.
    this.stars = new Mesh('valley_stars', scene);
    // Round, soft-edged, each with its own brightness, size and a touch of colour (review 018 item 7).
    this.starMat = radialMaterial('valley_stars_mat', scene, 0.3, 1);
    this.stars.material = this.starMat;
    this.stars.infiniteDistance = true;
    this.stars.isPickable = false;
    const starData = starQuads(STAR_COUNT);
    const vd = new VertexData();
    vd.positions = starData.positions;
    vd.indices = starData.indices;
    vd.uvs = starData.uvs;
    vd.colors = starData.colors;
    vd.applyToMesh(this.stars);

    // The sun's glow: a soft disc of light around it, added to the sky behind.
    this.glow = MeshBuilder.CreatePlane('valley_sun_glow', { size: SUN_GLOW.size }, scene);
    this.glow.setVerticesData(VertexBuffer.ColorKind, new Array(16).fill(1));
    this.glowMat = radialMaterial('valley_sun_glow_mat', scene, 0, 2.6);
    this.glowMat.alphaMode = Constants.ALPHA_ADD;
    this.glow.material = this.glowMat;
    this.glow.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.glow.infiniteDistance = true;
    this.glow.isPickable = false;

    this.sunMat = unlit('valley_sun_mat', scene);
    this.sun = MeshBuilder.CreateSphere('valley_sun', { diameter: 60, segments: 12 }, scene);
    this.sun.material = this.sunMat;
    this.sun.infiniteDistance = true;

    this.moonMat = unlit('valley_moon_mat', scene);
    this.moon = MeshBuilder.CreateSphere('valley_moon', { diameter: 36, segments: 12 }, scene);
    this.moon.material = this.moonMat;
    this.moon.infiniteDistance = true;
  }

  /** Call every frame. Recolours the dome and places the discs for the current lighting. */
  update(light: Lighting, heroX: number, heroZ: number): void {
    this.dome.position.set(heroX, 0, heroZ);
    this.stars.position.set(heroX, 0, heroZ);
    this.dome.updateVerticesData(VertexBuffer.ColorKind, domeColors(this.dome, light));

    // The discs follow the sun's and moon's paths in the sky (section 5): the sun rises in the east and sets in
    // the west, and the moon rises as the sun sets. A disc is drawn only while it is above the horizon.
    this.sun.position.copyFrom(light.sunSky.scale(DISC_DISTANCE));
    this.moon.position.copyFrom(light.moonSky.scale(DISC_DISTANCE));
    this.sun.setEnabled(light.sunSky.y > -0.02);
    this.moon.setEnabled(light.moonSky.y > -0.02);
    this.sunMat.emissiveColor = light.sunColor;
    this.moonMat.emissiveColor = PALETTE.moon.scale(1.2);
    const starAlpha = clamp01((light.nightness - 0.3) / 0.5);
    this.starMat.setColor4('tint', new Color4(1, 1, 1, starAlpha));
    this.stars.setEnabled(starAlpha > 0.01);
    this.glow.position.copyFrom(light.sunSky.scale(DISC_DISTANCE * 1.02));
    this.glow.setEnabled(light.sunSky.y > -0.08);
    this.glowMat.setColor4('tint', new Color4(light.sunColor.r, light.sunColor.g, light.sunColor.b, SUN_GLOW.strength));
  }

  dispose(): void {
    this.dome.dispose();
    this.stars.dispose();
    this.glow.dispose();
    this.sun.dispose();
    this.moon.dispose();
  }
}

/**
 * Unlit dome: the fragment colour is the interpolated vertex colour, with no lighting, fog or emissive
 * term. (StandardMaterial with disableLighting still mixed in its own colours and rendered black or grey.)
 */
function domeMaterial(name: string, scene: Scene): ShaderMaterial {
  Effect.ShadersStore[`${name}VertexShader`] = [
    'precision highp float;',
    'attribute vec3 position;',
    'attribute vec4 color;',
    'uniform mat4 worldViewProjection;',
    'varying vec4 vColor;',
    'void main(void) {',
    // Pinned to the far plane: the dome can never be cut by the camera's far limit, whatever its size or offset.
    '  vec4 p = worldViewProjection * vec4(position, 1.0);',
    '  gl_Position = vec4(p.xy, p.w * 0.99999, p.w);',
    '  vColor = color;',
    '}',
  ].join('\n');
  Effect.ShadersStore[`${name}FragmentShader`] = [
    'precision highp float;',
    'varying vec4 vColor;',
    'void main(void) {',
    '  gl_FragColor = vec4(vColor.rgb, 1.0);',
    '}',
  ].join('\n');
  const m = new ShaderMaterial(name, scene, name, {
    attributes: ['position', 'color'],
    uniforms: ['worldViewProjection'],
    needAlphaBlending: false,
  });
  m.backFaceCulling = false;
  return m;
}


/** Unlit, no fog. Stars and discs take their colour from the emissive colour set each frame. */
function unlit(name: string, scene: Scene): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.disableLighting = true;
  m.emissiveColor = Color3.White();
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.backFaceCulling = false;
  m.fogEnabled = false;
  return m;
}

/** Vertex colours for the dome: horizon colour at and below the horizon, zenith overhead. */
export function domeColors(dome: Mesh, light: Lighting): number[] {
  const pos = dome.getVerticesData(VertexBuffer.PositionKind);
  if (!pos) throw new Error('Sky dome has no positions');
  const colors: number[] = [];
  const radius = DOME_DIAMETER / 2;
  for (let i = 0; i < pos.length; i += 3) {
    const up = clamp01(pos[i + 1] / radius);
    const c = mix(light.sky, light.zenith, Math.pow(up, 0.55));
    colors.push(c.r, c.g, c.b, 1);
  }
  return colors;
}

function starPoint(i: number): Vector3 {
  const u = seededValue(VALLEY_SEED, i, 1, 11);
  const v = seededValue(VALLEY_SEED, i, 2, 12);
  const az = u * Math.PI * 2;
  // Stars fill the sky from the horizon up; the square of v keeps more of them low and near the horizon's dome.
  const el = 0.04 + v * v * 1.3;
  const r = DISC_DISTANCE * 0.95;
  return new Vector3(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
}

/** Pure: a star's brightness (0.35 to 1; most are faint, a few are bright) and its size in metres. */
export function starLook(i: number): { brightness: number; half: number; tint: [number, number, number] } {
  const b = seededValue(VALLEY_SEED, i, 3, 13);
  const brightness = 0.35 + 0.65 * b * b * b;
  const hue = seededValue(VALLEY_SEED, i, 4, 14);
  // Mostly white; some a little warm, some a little blue.
  const tint: [number, number, number] = hue < 0.2 ? [1, 0.9, 0.78] : hue > 0.8 ? [0.82, 0.9, 1] : [1, 1, 1];
  return { brightness, half: 1.2 + 1.6 * brightness, tint };
}

/** Each star as a small square tangent to the sky; the shader draws a soft round point inside it. */
export function starQuads(count: number): { positions: number[]; indices: number[]; uvs: number[]; colors: number[] } {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  for (let i = 0; i < count; i++) {
    const p = starPoint(i);
    const look = starLook(i);
    const n = p.clone().normalize();
    const ref = Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const t = Vector3.Cross(ref, n).normalize().scale(look.half);
    const b = Vector3.Cross(n, t).normalize().scale(look.half);
    const c = p;
    const corners = [c.add(t).add(b), c.subtract(t).add(b), c.subtract(t).subtract(b), c.add(t).subtract(b)];
    const base = positions.length / 3;
    for (const q of corners) positions.push(q.x, q.y, q.z);
    uvs.push(1, 1, 0, 1, 0, 0, 1, 0);
    for (let k = 0; k < 4; k++) colors.push(look.tint[0], look.tint[1], look.tint[2], look.brightness);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, indices, uvs, colors };
}

/**
 * Unlit, no fog, blended: a soft round point inside each quad. `core` is the radius (0 to 1) inside which it is full
 * strength; `power` sharpens the falloff. Colour is tint times the vertex colour; strength is their alphas multiplied.
 */
function radialMaterial(name: string, scene: Scene, core: number, power: number): ShaderMaterial {
  Effect.ShadersStore[`${name}VertexShader`] = [
    'precision highp float;',
    'attribute vec3 position;',
    'attribute vec2 uv;',
    'attribute vec4 color;',
    'uniform mat4 worldViewProjection;',
    'varying vec2 vUV;',
    'varying vec4 vColor;',
    'void main(void) {',
    '  gl_Position = worldViewProjection * vec4(position, 1.0);',
    '  vUV = uv;',
    '  vColor = color;',
    '}',
  ].join('\n');
  Effect.ShadersStore[`${name}FragmentShader`] = [
    'precision highp float;',
    'uniform vec4 tint;',
    'uniform vec2 shape;',
    'varying vec2 vUV;',
    'varying vec4 vColor;',
    'void main(void) {',
    '  float r = length(vUV * 2.0 - 1.0);',
    '  float a = pow(1.0 - smoothstep(shape.x, 1.0, r), shape.y);',
    '  gl_FragColor = vec4(tint.rgb * vColor.rgb, a * tint.a * vColor.a);',
    '}',
  ].join('\n');
  const m = new ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    attributes: ['position', 'uv', 'color'],
    uniforms: ['worldViewProjection', 'tint', 'shape'],
    needAlphaBlending: true,
  });
  m.setVector2('shape', new Vector2(core, power));
  m.setColor4('tint', new Color4(1, 1, 1, 1));
  m.backFaceCulling = false;
  m.disableDepthWrite = true;
  m.fogEnabled = false;
  return m;
}
