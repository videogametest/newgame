// The patrol-hut fight drawn in the open valley (task 004 item 8). The battle is src/core and owns every
// position and hit. This file feeds it the hero's input, keeps the hero on the valley's walkable ground,
// and draws the fighters. Bram is not in the battle (queue decision d).

import { Camera, Matrix, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import { TUNING } from '../config/tuning';
import { MillEncounter } from '../core/places/mill_encounter';
import type { PlaceState } from '../core/types';
import type { Observation } from '../core/stealth';
import { createBattle, getHero, reviveHero, step } from '../core/battle';
import type { BattleEvent, BattleInput, BattleState, Fighter } from '../core/types';
import { soundsForEvent } from '../core/sound_map';
import { blocksHero, insideValley, walkSurfaceAt } from '../core/world/valley';
import { valleyBattleGround } from '../core/world/valley_battle';
import { PATROL_HUT_CENTRE, PATROL_HUT_FIGHT, PATROL_HUT_HERO_SPAWN } from '../data/patrol_hut_fight';
import type { LoadedAssets } from './assets';
import { CharacterView } from './characters';
import { ArrowViews, ImpactBursts } from './effects';
import type { AudioBank } from './audio';
import type { Hud } from './hud';
import { blocksView } from './occlusion';
import { currentSettings } from './settings_store';

export type FightInput = { locked: boolean; zooming: boolean };

/** The hero's health bar and weapon tiles appear once he is this close to the hut (task 004 item 8). */
const CHROME_RANGE = 30;
/** Sim seconds the hero lies down after a fall before he gets back up (placeholder timing, task 004 item 8). */
const KNOCK_DOWN_SECONDS = 2.5;
/**
 * The line shown when he gets back up. PLACEHOLDER: no writing exists for it yet (docs/writing has no knock-down
 * copy). Replace it when the writing does.
 */
export const KNOCK_DOWN_LINE = 'Your hero is down. He gets back up.';

export class ValleyFight {
  battle: BattleState;
  mill: MillEncounter;
  private readonly views = new Map<number, CharacterView>();
  private arrows: ArrowViews;
  private readonly bursts: ImpactBursts;
  private chromeShown = false;
  /** Sim time at which the hero was first seen down, or null while he is up. */
  private downedAt: number | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly assets: LoadedAssets,
    private readonly shadow: ShadowGenerator,
    private readonly audio: AudioBank,
    private readonly hud: Hud,
    private readonly camera: Camera,
    private readonly canvas: HTMLCanvasElement,
    /** Called when the hero is down for long enough and gets back up. The valley shows the line. */
    private readonly onStatus: (line: string) => void,
  ) {
    this.battle = this.newBattle();
    this.mill = new MillEncounter(this.battle);
    this.arrows = new ArrowViews(scene, assets.arrow, shadow);
    this.bursts = new ImpactBursts(scene);
    this.spawnEnemyViews();
  }

  get hero(): Fighter {
    return getHero(this.battle);
  }

  get status(): BattleState['status'] {
    return this.battle.status;
  }

  /** Moves the hero (valley walking, tour and brightness picture). The battle does not move him here. */
  placeHero(x: number, z: number): void {
    const hero = this.hero;
    hero.x = x;
    hero.z = z;
    hero.vx = 0;
    hero.vz = 0;
    hero.y = walkSurfaceAt(x, z);
  }

  /**
   * One fixed step of the fight. The battle moves the hero from the input; a step onto ground the walk
   * rules forbid (water, a solid, a slope too steep, past the valley edge) is undone.
   */
  advance(intent: BattleInput, context?: { hour: number; place: PlaceState; movement: Observation['movement'] }): void {
    const rings = this.mill.bellRings;
    if (context) this.mill.advance(this.battle, context.hour, context.place, context.movement, TUNING.fixedDt);
    if (this.mill.bellRings > rings) this.audio.ringBell();
    const hero = this.hero;
    const fromX = hero.x;
    const fromZ = hero.z;
    const events = step(this.battle, intent);
    const ok = (x: number, z: number): boolean => insideValley(x, z) && !blocksHero(x, z);
    if (!ok(hero.x, hero.z)) {
      // Slide along the blocking axis, as walkStep does for the valley walk; otherwise stop.
      const dx = hero.x - fromX;
      const dz = hero.z - fromZ;
      if (ok(fromX + dx, fromZ)) {
        hero.z = fromZ;
      } else if (ok(fromX, fromZ + dz)) {
        hero.x = fromX;
      } else {
        hero.x = fromX;
        hero.z = fromZ;
      }
    }
    hero.vx = (hero.x - fromX) / TUNING.fixedDt;
    hero.vz = (hero.z - fromZ) / TUNING.fixedDt;
    hero.y = walkSurfaceAt(hero.x, hero.z);
    this.handleKnockDown();
    this.handleEvents(events);
  }

  /** A downed hero stands back up where he fell, at full health, after KNOCK_DOWN_SECONDS of sim time. */
  private handleKnockDown(): void {
    const hero = this.hero;
    if (hero.alive) {
      this.downedAt = null;
      return;
    }
    if (this.downedAt === null) this.downedAt = this.battle.time;
    if (this.battle.time - this.downedAt < KNOCK_DOWN_SECONDS) return;
    if (reviveHero(this.battle)) this.onStatus(KNOCK_DOWN_LINE);
    this.downedAt = null;
  }

  /** Draws the enemies and effects. Visual only: no sim state is written here. */
  sync(dt: number, input: FightInput): void {
    const hero = this.hero;
    const camPos = this.camera.position;
    const ids = new Set(this.battle.fighters.map(f => f.id));
    for (const [id, view] of this.views) if (!ids.has(id)) view.setShown(false);
    for (const f of this.battle.fighters) {
      if (f.id === hero.id) continue;
      let view = this.views.get(f.id);
      if (!view) {
        view = this.makeView(f.id);
        this.views.set(f.id, view);
      }
      view.setShown(true);
      view.update(f, f.y);
      // Enemies between the lens and the hero fade out, so they never block the view.
      view.fade(blocksView(camPos, hero, f), dt);
    }
    this.arrows.sync(this.battle);
    this.bursts.update(dt);
    if (!this.chromeShown && Math.hypot(hero.x - PATROL_HUT_CENTRE.x, hero.z - PATROL_HUT_CENTRE.z) < CHROME_RANGE) {
      this.chromeShown = true;
      this.hud.showFightChrome();
    }
    this.hud.frame({
      state: this.battle,
      hero,
      cards: false,
      awarenessMarkers: currentSettings().play.awarenessMarkers,
      locked: input.locked,
      weapon: hero.weapon,
      zooming: input.zooming,
      drawFraction: hero.weapon === 'bow' ? Math.min(1, hero.drawTime / TUNING.bow.fullDrawTime) : 0,
      project: (x, y, z) => this.project(x, y, z),
      dt,
    });
  }

  /** Clears the fight and rebuilds it. The valley owns the restart button and places the hero. */
  restart(): void {
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.arrows.dispose();
    this.arrows = new ArrowViews(this.scene, this.assets.arrow, this.shadow);
    this.bursts.dispose();
    this.battle = this.newBattle();
    this.mill = new MillEncounter(this.battle);
    this.spawnEnemyViews();
    this.hud.hideOutcome();
    this.downedAt = null;
  }

  dispose(): void {
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.arrows.dispose();
    this.bursts.dispose();
  }

  private newBattle(): BattleState {
    const battle = createBattle(PATROL_HUT_FIGHT, valleyBattleGround());
    battle.openEnded = true; // no win and no loss in the valley (task 004 item 8)
    const hero = getHero(battle);
    hero.x = PATROL_HUT_HERO_SPAWN.x;
    hero.z = PATROL_HUT_HERO_SPAWN.z;
    hero.y = walkSurfaceAt(hero.x, hero.z);
    return battle;
  }

  private handleEvents(events: BattleEvent[]): void {
    const heroId = this.hero.id;
    for (const e of events) {
      for (const id of soundsForEvent(e, heroId)) this.audio.play(id);
      if (e.type === 'damage') {
        this.hud.addDamage(e.x, e.z, e.amount);
      } else if (e.type === 'impact') {
        this.bursts.spawn(e.x, e.y, e.z);
      }
    }
  }

  private spawnEnemyViews(): void {
    for (const f of this.battle.fighters) if (f.id !== this.hero.id) this.views.set(f.id, this.makeView(f.id));
  }

  private makeView(id: number): CharacterView {
    const fighter = this.battle.fighters.find((f) => f.id === id);
    if (!fighter) throw new Error(`No fighter with id ${id}`);
    return new CharacterView(this.scene, this.assets, fighter, this.shadow, `${fighter.kind}${id}`);
  }

  /** World point to CSS pixels on the canvas. visible is false when the point is behind the camera or off-depth. */
  private project(x: number, y: number, z: number): { x: number; y: number; visible: boolean } {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const vp = this.camera.viewport.toGlobal(w, h);
    const p = Vector3.Project(new Vector3(x, y, z), Matrix.Identity(), this.scene.getTransformMatrix(), vp);
    return { x: p.x, y: p.y, visible: p.z > 0 && p.z < 1 };
  }
}
