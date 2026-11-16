import { describe, expect, it } from 'vitest';
import { garrisonOf } from '../../data/bandits';
import { PATROL_HUT_FIGHT } from '../../data/patrol_hut_fight';
import { createBattle } from '../battle';
import { newGameState } from '../state';
import { valleyBattleGround } from '../world/valley_battle';
import { lightLantern } from './lantern';
import { MillEncounter } from './mill_encounter';
import { clearPlaceIfGarrisonDown, garrisonDown, garrisonIdsFor } from './clearing';
import type { BanditState, GameState } from '../types';

const lamp = { x: 5, z: 6 };
const held = () => { const g = newGameState(1066); g.places[0].status = 'held'; g.day = 4; return g; };
const firstIds = () => garrisonOf('mill', false).map(b => b.id);
const allDown = (state: BanditState, ids: string[]) => Object.fromEntries(ids.map(id => [id, state]));

describe('the Mill garrison clears when every defender is down', () => {
  it('uses the first garrison of seven before the place has been freed', () => {
    expect(firstIds()).toEqual(['harl_gadd', 'dob_finch', 'wyll_carrow', 'bran_oakes', 'nessa_roke', 'pim', 'odo_varn']);
    expect(garrisonIdsFor('mill', 0)).toEqual(firstIds());
  });

  it('uses the retaken garrison for a held place that has been freed before', () => {
    const retaken = garrisonOf('mill', true).map(b => b.id);
    expect(retaken.length).toBeGreaterThan(0);
    expect(garrisonIdsFor('mill', 1)).toEqual(retaken);
    expect(garrisonIdsFor('mill', 2)).toEqual(retaken);
  });

  it('clears a held place once all seven are dead, knocked out or spared', () => {
    const g = held();
    g.bandits = { ...allDown('dead', firstIds()) };
    expect(clearPlaceIfGarrisonDown(g, 'mill')).toBe(true);
    expect(g.places[0].status).toBe('cleared');
  });

  it('counts knocked_out and spared as down (item 30 produces them)', () => {
    const ids = firstIds();
    const g = held();
    g.bandits = Object.fromEntries(ids.map((id, i) => [id, (['dead', 'knocked_out', 'spared'] as const)[i % 3]]));
    expect(clearPlaceIfGarrisonDown(g, 'mill')).toBe(true);
    expect(g.places[0].status).toBe('cleared');
  });

  it('stays held while one defender is alive, or still unrecorded', () => {
    const ids = firstIds();
    for (const missing of [ids[0], ids[ids.length - 1]]) {
      const g = held();
      g.bandits = { ...allDown('dead', ids), [missing]: 'alive' };
      expect(clearPlaceIfGarrisonDown(g, 'mill')).toBe(false);
      expect(g.places[0].status).toBe('held');
      const h = held();
      h.bandits = Object.fromEntries(ids.filter(id => id !== missing).map(id => [id, 'dead' as const]));
      expect(clearPlaceIfGarrisonDown(h, 'mill')).toBe(false);
      expect(h.places[0].status).toBe('held');
    }
  });

  it('never clears on an empty garrison list', () => {
    expect(garrisonDown({}, [])).toBe(false);
  });

  it('leaves freed and cleared places untouched', () => {
    for (const status of ['freed', 'cleared'] as const) {
      const g = held(); g.places[0].status = status; g.bandits = allDown('dead', firstIds());
      const before = structuredClone(g);
      expect(clearPlaceIfGarrisonDown(g, 'mill')).toBe(false);
      expect(g).toEqual(before);
    }
  });

  it('a retaken place clears only when the retaken garrison is down, not the first one', () => {
    const g = held(); g.places[0].timesFreed = 1; g.bandits = allDown('dead', firstIds());
    expect(clearPlaceIfGarrisonDown(g, 'mill')).toBe(false);
    g.bandits = allDown('dead', garrisonOf('mill', true).map(b => b.id));
    expect(clearPlaceIfGarrisonDown(g, 'mill')).toBe(true);
  });

  it('a cleared place lights through the lantern, and that is the only step that frees it', () => {
    const g = held();
    g.bandits = allDown('dead', firstIds());
    clearPlaceIfGarrisonDown(g, 'mill');
    expect(g.places[0].status).toBe('cleared');
    expect(lightLantern(g, 'mill', lamp, lamp)).toBe(true);
    expect(g.places[0]).toMatchObject({ status: 'freed', timesFreed: 1, freedDay: 4 });
  });
});

describe('clearing from a real Mill fight', () => {
  it('clears after every real MillEncounter fighter is down, and not before', () => {
    const battle = createBattle(PATROL_HUT_FIGHT, valleyBattleGround());
    const encounter = new MillEncounter(battle, 12);
    const g: GameState = held();
    const record = () => {
      for (const [id, member] of encounter.members) {
        if (!member.fighter.alive && (g.bandits[id] === undefined || g.bandits[id] === 'alive')) g.bandits[id] = 'dead';
      }
      return clearPlaceIfGarrisonDown(g, 'mill');
    };
    expect(encounter.members.size).toBe(7);
    const members = [...encounter.members.values()];
    for (const m of members.slice(0, -1)) { m.fighter.alive = false; m.fighter.hp = 0; }
    expect(record()).toBe(false);
    expect(g.places[0].status).toBe('held');
    const last = members[members.length - 1];
    last.fighter.alive = false; last.fighter.hp = 0;
    expect(record()).toBe(true);
    expect(g.places[0].status).toBe('cleared');
  });
});
