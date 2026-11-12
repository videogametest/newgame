// Sky for the valley: a gradient dome recoloured each frame from the time-of-day lighting, stars at night,
// and a sun and moon disc placed along the sun direction. The dome, stars and discs follow the hero so
// the horizon is never reached, and none of them take fog or lighting.

import { Color3, Effect, Mesh, MeshBuilder, Scene, ShaderMaterial, StandardMaterial, Vector3, VertexBuffer, VertexData } from '@babylonjs/core';
import { seededValue } from '../core/world/terrain';
import { VALLEY_SEED } from '../core/world/valley';
import { clamp01, mix, PALETTE, type Lighting } from './lighting';

const DOME_DIAMETER = 1700;
const DISC_DISTANCE = 700;
const STAR_COUNT = 420;

export class ValleySky {
  private readonly dome: Mesh;
  private readonly stars: Mesh;
  private readonly sun: Mesh;
  private readonly moon: Mesh;
  private readonly starMat: StandardMaterial;
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

    this.stars = new Mesh('valley_stars', scene);
    this.starMat = unlit('valley_stars_mat', scene);
    this.starMat.pointsCloud = true;
    this.starMat.pointSize = 2;
    this.stars.material = this.starMat;
    this.stars.infiniteDistance = true;
    const starData = starPositions(STAR_COUNT);
    const vd = new VertexData();
    vd.positions = starData;
    vd.indices = Array.from({ length: STAR_COUNT }, (_, i) => i);
    vd.applyToMesh(this.stars);

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

    const sunDir = light.sunDir;
    this.sun.position.copyFrom(sunDir.scale(-DISC_DISTANCE));
    this.moon.position.copyFrom(sunDir.scale(DISC_DISTANCE));
    this.sun.setEnabled(light.elevation > -0.02);
    this.moon.setEnabled(light.nightness > 0.4);
    this.sunMat.emissiveColor = light.sunColor;
    this.moonMat.emissiveColor = PALETTE.moon.scale(1.2);
    this.starMat.alpha = clamp01((light.nightness - 0.3) / 0.5);
    this.stars.setEnabled(this.starMat.alpha > 0.01);
  }

  dispose(): void {
    this.dome.dispose();
    this.stars.dispose();
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
    '  gl_Position = worldViewProjection * vec4(position, 1.0);',
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

/** Stars on the upper hemisphere, deterministic from the valley seed. */
export function starPositions(count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = seededValue(VALLEY_SEED, i, 1, 11);
    const v = seededValue(VALLEY_SEED, i, 2, 12);
    const az = u * Math.PI * 2;
    const el = 0.05 + v * 1.2;
    const r = DISC_DISTANCE * 0.95;
    const p = new Vector3(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
    out.push(p.x, p.y, p.z);
  }
  return out;
}
