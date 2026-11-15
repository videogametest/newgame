// Checks the data against docs/writing/bandits.md. The writing is the source: when these fail, fix the data,
// never the writing. The writing is read through writing_bandits.ts, the same parse the game uses for its words.
import { describe, expect, it } from 'vitest';
import { BANDITS, banditById, garrisonOf } from './bandits';
import { OVERHEARD } from './overheard';
import { YIELDS } from './overheard';
import { PLACES, defendersOf, placeById } from './places';
import {
  BANDITS_WRITING, OVERHEARD_WRITING, ROSTER, STAY_WRITING, YIELDS_WRITING, normaliseWhen, parseRoster, writtenOverheard,
} from './writing_bandits';

function must(id: string) {
  const d = banditById(id);
  if (!d) throw new Error(`missing bandit ${id}`);
  return d;
}

const WRITTEN_YIELD_IDS = YIELDS_WRITING.map(y => y.id).sort();
const NON_LEARNS = OVERHEARD_WRITING.filter(o => !o.id.startsWith('overheard.learns.'));

describe('roster matches the writing', () => {
  it('has 29 rows: 13 at the Mill (7 first, 6 retaken), 8 at the Forge, 8 at the Watch-house', () => {
    expect(ROSTER).toHaveLength(29);
    const count = (place: string, garrison: string) => ROSTER.filter(r => r.place === place && r.garrison === garrison).length;
    expect(count('mill', 'first')).toBe(7);
    expect(count('mill', 'retaken')).toBe(6);
    expect(count('forge', 'first')).toBe(8);
    expect(count('watch_house', 'first')).toBe(8);
  });

  it('every written row is in the data with the same place, garrison, unit, loyalty, trade, habit and leader flag', () => {
    expect(BANDITS.length).toBeGreaterThanOrEqual(ROSTER.length);
    for (const w of ROSTER) {
      const d = must(w.id);
      expect(d.name, w.id).toBe(w.name);
      expect(d.placeId, w.id).toBe(w.place);
      expect(d.garrison, w.id).toBe(w.garrison);
      expect(d.unit, w.id).toBe(w.unit);
      expect(d.loyalty, w.id).toBe(w.loyalty);
      expect(d.formerTrade, w.id).toBe(w.was);
      expect(d.habitText, w.id).toBe(w.habit);
      expect(d.leader === true, w.id).toBe(w.leader);
    }
  });

  it('the data has no bandit the writing does not name (Stane is the only writing-only leader)', () => {
    const ids = new Set(ROSTER.map(r => r.id));
    for (const d of BANDITS) expect(ids.has(d.id), d.id).toBe(true);
  });
});

describe('places', () => {
  it('each place has the leader the writing gives and the defenders in the roster, minus the leader', () => {
    const expected: Record<string, { leader: string; first?: number; retaken?: number }> = {
      mill: { leader: 'harl_gadd', first: 6, retaken: 5 },
      forge: { leader: 'rafe_dunmore', first: 7 },
      watch_house: { leader: 'stane', first: 8 },
    };
    for (const p of PLACES) {
      const exp = expected[p.id];
      const first = p.garrisons.find(g => !g.retaken);
      expect(first?.leaderId, p.id).toBe(exp.leader);
      expect(defendersOf(p.id, false), p.id).toHaveLength(exp.first!);
      if (exp.retaken !== undefined) {
        const retaken = p.garrisons.find(g => g.retaken);
        expect(retaken?.leaderId, `${p.id} retaken`).toBe('maud_kerr');
        expect(defendersOf(p.id, true), `${p.id} retaken`).toHaveLength(exp.retaken);
      }
    }
  });

  it('a garrison leader is a roster leader, or Stane who is not on the roster', () => {
    for (const p of PLACES) {
      for (const g of p.garrisons) {
        if (g.leaderId === 'stane') continue;
        const d = must(g.leaderId);
        expect(d.leader, g.leaderId).toBe(true);
        expect(d.placeId).toBe(p.id);
        expect(d.garrison).toBe(g.retaken ? 'retaken' : 'first');
      }
    }
  });

  it('the place names and landmark sites are the writing headings', () => {
    expect(placeById('mill').name).toBe('The Mill');
    expect(placeById('forge').name).toBe('The Forge');
    expect(placeById('watch_house').name).toBe('The Watch-house');
    expect(placeById('mill').landmarkSite).toBe('mill');
    expect(placeById('forge').landmarkSite).toBe('forge');
    expect(placeById('watch_house').landmarkSite).toBe('watch_house');
  });

  it('garrisonOf agrees with the roster for every place and garrison', () => {
    for (const p of PLACES) {
      for (const retaken of [false, true]) {
        const fromRoster = ROSTER.filter(r => r.place === p.id && r.garrison === (retaken ? 'retaken' : 'first')).map(r => r.id).sort();
        const fromData = garrisonOf(p.id, retaken).map(d => d.id).sort();
        if (fromRoster.length === 0 && fromData.length === 0) continue;
        expect(fromData, `${p.id} retaken=${retaken}`).toEqual(fromRoster);
      }
    }
  });
});

describe('overheard lines match the writing', () => {
  it('the writing and the data have the same overheard ids (learns excluded)', () => {
    const written = NON_LEARNS.map(o => o.id).sort();
    const data = OVERHEARD.map(o => o.id).sort();
    expect(data).toEqual(written);
  });

  it('the five learns ids exist in the writing with two or three lines each', () => {
    const learns = OVERHEARD_WRITING.filter(o => o.id.startsWith('overheard.learns.'));
    expect(learns).toHaveLength(5);
    for (const l of learns) {
      expect(l.lines.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.lines.length, l.id).toBeLessThanOrEqual(3);
    }
  });

  it('each data entry has the same kind, time, speakers and garrison as the writing', () => {
    for (const d of OVERHEARD) {
      const w = writtenOverheard(d.id);
      expect(d.kind, d.id).toBe(w.kind);
      expect(d.when, d.id).toBe(normaliseWhen(w.when ?? ''));
      expect([...d.speakers].sort(), d.id).toEqual([...w.participants].sort());
      for (const sp of w.speakers) expect(w.participants, `${d.id} speaks but is not in the header`).toContain(sp);
      expect(d.garrison === 'retaken', d.id).toBe(w.garrison === 'retaken');
      expect(d.place, d.id).toBe(w.place);
    }
  });

  it('a tell names a speaker in its tell lines, and that speaker is the one the writing says', () => {
    for (const d of OVERHEARD.filter(x => x.kind === 'tell')) {
      expect(d.tellOf, d.id).toBeDefined();
      const w = writtenOverheard(d.id);
      expect(w.speakers, d.id).toContain(d.tellOf);
    }
  });
});

describe('yield lines match the writing', () => {
  it('the writing and the data have the same yield ids', () => {
    expect(YIELDS.map(y => y.id).sort()).toEqual(WRITTEN_YIELD_IDS);
  });

  it('each yield points at the overheard id it stands for and carries the writing\'s "not said by"', () => {
    for (const y of YIELDS) {
      const w = YIELDS_WRITING.find(x => x.id === y.id)!;
      expect(y.sameAs, y.id).toBe(w.sameAs);
      expect(w.sameAs.startsWith('overheard.'), y.id).toBe(true);
      expect(OVERHEARD.some(o => o.id === y.sameAs), y.id).toBe(true);
      if (w.notSaidBy) expect(y.about, y.id).toBe(w.notSaidBy);
    }
  });
});

describe('the stay table', () => {
  it('has 10 rows and each is a bandit in the data', () => {
    expect(STAY_WRITING).toHaveLength(10);
    const names = new Set(BANDITS.map(b => b.name));
    for (const row of STAY_WRITING) expect(names.has(row.who), row.who).toBe(true);
  });
});

describe('verbatim sentences', () => {
  it('the three close-tie sentences are in the writing word for word', () => {
    expect(BANDITS_WRITING).toContain('Hob Tarn is close to Rafe Dunmore');
    expect(BANDITS_WRITING).toContain('Brock Tull to Maud Kerr');
    expect(BANDITS_WRITING).toContain('Sim Hart to Col Ware');
  });
});

describe('the loader', () => {
  it('parseRoster reads the same rows from the file as the exported roster', () => {
    expect(parseRoster(BANDITS_WRITING)).toEqual(ROSTER);
  });
});
