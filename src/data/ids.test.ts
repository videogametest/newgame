// One set of names. Every id that one file refers to must exist in the file that defines it (review 004).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPANIONS } from '../core/people/companions';
import { HOUSEHOLDS, type Trigger } from '../core/people/households';
import { PROJECTS } from '../core/economy/projects';
import { TRADERS } from '../core/economy/trade';
import { ITEMS } from '../core/items/data';
import { RECIPES } from '../core/items/recipes';
import { ANSWERS } from '../core/valley/learns';
import { BANDITS } from './bandits';
import { OVERHEARD } from './overheard';
import { TALLOWMERE_PERKS } from './perks/tallowmere';

const SNAKE = /^[a-z][a-z0-9_]*$/;
const households = new Set(HOUSEHOLDS.map(h => h.id));
const bandits = new Set(BANDITS.map(b => b.id));
const projects = new Set(PROJECTS.map(p => p.id));
const places = new Set(['wick', 'mill', 'forge', 'watch_house']);

function walk(t: Trigger, visit: (t: Trigger) => void): void {
  visit(t);
  if (t.kind === 'any' || t.kind === 'all') t.conditions.forEach(c => walk(c, visit));
}

describe('one set of names', () => {
  it('every id is lower case with underscores', () => {
    const all = [...households, ...bandits, ...projects, ...places, ...ITEMS.map(i => i.id), ...RECIPES.map(r => r.id),
      ...TALLOWMERE_PERKS.map(p => p.id), ...COMPANIONS.map(c => c.id), ...TRADERS.map(t => t.id)];
    for (const id of all) expect(id, id).toMatch(SNAKE);
  });
  it('household triggers name real places, projects, households, and bandits', () => {
    for (const h of HOUSEHOLDS) {
      walk(h.trigger, t => {
        if (t.kind === 'place') expect(places.has(t.id), `${h.id}: place ${t.id}`).toBe(true);
        if (t.kind === 'project') expect(projects.has(t.id), `${h.id}: project ${t.id}`).toBe(true);
        if (t.kind === 'household' || t.kind === 'returned') expect(households.has(t.id), `${h.id}: household ${t.id}`).toBe(true);
        if (t.kind === 'bandit') expect(bandits.has(t.id), `${h.id}: bandit ${t.id}`).toBe(true);
      });
    }
  });
  it('there are sixteen households, and every stolen thing belongs to one', () => {
    expect(households.size).toBe(16);
    for (const item of ITEMS.filter(i => i.owner)) expect(households.has(item.owner!), item.id).toBe(true);
  });
  it('every household that waits on a stolen thing has one', () => {
    const owners = new Set(ITEMS.filter(i => i.kind === 'stolen').map(i => i.owner));
    for (const h of HOUSEHOLDS) walk(h.trigger, t => { if (t.kind === 'returned') expect(owners.has(t.id), h.id).toBe(true); });
  });
  it('traders and recipe teachers are households, perks, or the fisher', () => {
    const perks = new Set(TALLOWMERE_PERKS.map(p => p.id));
    for (const t of TRADERS) expect(households.has(t.household) || t.household === 'fisher', t.id).toBe(true);
    for (const r of RECIPES.filter(x => x.from)) expect(households.has(r.from!) || perks.has(r.from!), r.id).toBe(true);
  });
  it('bandits are at real places, and a stand-in replaces a real bandit', () => {
    for (const b of BANDITS) {
      expect(places.has(b.placeId), b.id).toBe(true);
      if (b.replaces) expect(bandits.has(b.replaces), b.id).toBe(true);
    }
  });
  it('companions who were bandits use the bandit\'s id', () => {
    const ids = new Set(COMPANIONS.map(c => c.id as string));
    expect(ids.has('tobin_pike')).toBe(true);
    expect(ids.has('ketch')).toBe(true);
    expect(ids.has('tobin')).toBe(false);
  });
  it('every line the code names is in the writing', () => {
    const bandit = readFileSync('docs/writing/bandits.md', 'utf8');
    for (const line of OVERHEARD) expect(bandit, line.id).toContain(`\`${line.id}\``);
    for (const a of Object.values(ANSWERS)) expect(bandit, a.line).toContain(`\`${a.line}\``);
  });
});
