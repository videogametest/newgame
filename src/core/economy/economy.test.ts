import { describe, expect, it } from 'vitest';
import type { PlaceState } from '../types';
import { emptyInventory, indexItems, pickUp, type Stack } from '../items';
import { PACING_BANDS } from '../progression/pacing';
import {
  available, build, buy, buyPrice, checkPurse, collectIncome, dailyIncome, deposit, ECONOMY_TUNING, fall, fallToStane, gain,
  ownerOf, PROJECTS, PURSE_BANDS, sell, sellPrice, shelf, spend, taxed, totalCost, TRADERS, withdraw, type Market,
} from './index';

const index = indexItems();
const get = (id: string) => index.get(id)!;
const place = (id: string, status: PlaceState['status']): PlaceState => ({ id, status, timesFreed: status === 'freed' ? 1 : 0, bellSilenced: false, morale: 1 });
const poor: Market = { recovery: 0, taxed: true };
const thriving: Market = { recovery: 1, taxed: false };

describe('the purse', () => {
  it('holds whole crowns and never goes negative', () => {
    expect(spend({ carried: 10, stored: 50 }, 11)).toBeNull();
    expect(spend({ carried: 10, stored: 50 }, 10)).toEqual({ carried: 0, stored: 50 });
    expect(() => gain({ carried: 0, stored: 0 }, 1.5)).toThrow();
    expect(() => gain({ carried: 0, stored: 0 }, -1)).toThrow();
  });
  it('crowns can be left in the chest and fetched back', () => {
    const p = deposit({ carried: 100, stored: 0 }, 80)!;
    expect(p).toEqual({ carried: 20, stored: 80 });
    expect(withdraw(p, 81)).toBeNull();
    expect(withdraw(p, 30)).toEqual({ carried: 50, stored: 50 });
    expect(deposit(p, 21)).toBeNull();
  });
  it('falling costs a share of what is carried and nothing that is stored', () => {
    expect(fall({ carried: 100, stored: 300 })).toEqual({ purse: { carried: 75, stored: 300 }, lost: 25 });
    expect(fall({ carried: 3, stored: 0 }).lost).toBe(0);
    expect(fallToStane({ carried: 100, stored: 0 }).lost).toBe(0);
  });
  it('the purse is tested at every story beat', () => {
    expect(Object.keys(PURSE_BANDS)).toEqual(Object.keys(PACING_BANDS));
    expect(checkPurse('first_lantern', { carried: 30, stored: 0 })).toEqual([]);
    expect(checkPurse('first_lantern', { carried: 500, stored: 500 })).toHaveLength(1);
    expect(checkPurse('forge_freed', { carried: 0, stored: 0 })).toHaveLength(1);
  });
});

describe('income and the tax', () => {
  const places = [place('mill', 'freed'), place('forge', 'freed'), place('watch_house', 'held')];
  it('each freed place pays a little every day; a retaken place pays nothing', () => {
    expect(dailyIncome(places, false)).toBe(2 * ECONOMY_TUNING.incomePerFreedPlace);
    expect(dailyIncome([place('mill', 'held'), place('forge', 'cleared')], false)).toBe(0);
  });
  it("Stane's tax cuts income until the cart is stopped or the Watch-house is freed", () => {
    const wh = place('watch_house', 'held');
    expect(taxed(wh, false)).toBe(true);
    expect(taxed(wh, true)).toBe(false);
    expect(taxed(place('watch_house', 'freed'), false)).toBe(false);
    expect(dailyIncome(places, true)).toBeLessThan(dailyIncome(places, false));
  });
  it('is paid into the chest, once per day, however often it is asked for', () => {
    const first = collectIncome({ carried: 0, stored: 0 }, 3, 6, places, false);
    expect(first.paid).toBe(3 * 12);
    expect(first.purse).toEqual({ carried: 0, stored: 36 });
    const again = collectIncome(first.purse, first.paidThrough, 6, places, false);
    expect(again.paid).toBe(0);
    expect(collectIncome(first.purse, first.paidThrough, 5, places, false).paidThrough).toBe(6);
  });
});

describe('trade', () => {
  it('selling always pays less than buying back, at every recovery level and quality', () => {
    for (const def of index.values()) {
      if (def.unique) continue;
      for (const market of [poor, thriving, { recovery: 0.5, taxed: false }]) {
        for (const q of ['common', 'fine', 'masterwork'] as const) {
          expect(sellPrice(def, q, market)).toBeLessThan(buyPrice(def, q, market));
          expect(sellPrice(def, q, market)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
  it('prices improve as the valley recovers, and the tax makes them worse', () => {
    const blade = get('iron_blade');
    expect(buyPrice(blade, 'common', thriving)).toBeLessThan(buyPrice(blade, 'common', poor));
    expect(sellPrice(blade, 'common', thriving)).toBeGreaterThan(sellPrice(blade, 'common', poor));
    expect(buyPrice(blade, 'common', { recovery: 0.5, taxed: true })).toBeGreaterThan(buyPrice(blade, 'common', { recovery: 0.5, taxed: false }));
    expect(buyPrice(blade, 'fine', thriving)).toBeGreaterThan(buyPrice(blade, 'common', thriving));
  });
  it('goodwill takes a little off buying and never makes selling a money machine', () => {
    const jerkin = get('steel_jerkin');
    const liked: Market = { ...thriving, goodwill: 1 };
    expect(buyPrice(jerkin, 'common', liked)).toBeLessThan(buyPrice(jerkin, 'common', thriving));
    expect(buyPrice(jerkin, 'common', liked)).toBeGreaterThan(sellPrice(jerkin, 'common', liked));
    expect(buyPrice(jerkin, 'common', { ...thriving, goodwill: 9 })).toBe(buyPrice(jerkin, 'common', liked));
  });
  it('stock widens with recovery and thins under the tax', () => {
    const kettles = TRADERS.find(t => t.id === 'kettles')!;
    expect(shelf(kettles, thriving).length).toBeGreaterThan(shelf(kettles, { recovery: 0, taxed: false }).length);
    const arrows = (m: Market) => shelf(kettles, m).find(s => s.itemId === 'arrow_standard')!.count;
    expect(arrows(poor)).toBeLessThan(arrows({ recovery: 0, taxed: false }));
  });
  it('every trader sells things that exist', () => {
    for (const t of TRADERS) for (const line of t.stock) expect(index.has(line.itemId)).toBe(true);
  });
  it('buys from the shelf if the hero can pay', () => {
    const kettles = shelf(TRADERS[0], thriving);
    const want: Stack = { itemId: 'arrow_standard', count: 10 };
    const price = buyPrice(get('arrow_standard'), 'common', thriving) * 10;
    expect(buy({ carried: price - 1, stored: 999 }, emptyInventory(), kettles, want, thriving, index)).toBe('not_enough_crowns');
    expect(buy({ carried: 999, stored: 0 }, emptyInventory(), kettles, { itemId: 'steel', count: 1 }, thriving, index)).toBe('not_in_stock');
    const deal = buy({ carried: price, stored: 0 }, emptyInventory(), kettles, want, thriving, index);
    expect(deal).toMatchObject({ purse: { carried: 0 }, crowns: price });
    if (typeof deal !== 'string') expect(deal.shelf.find(s => s.itemId === 'arrow_standard')!.count).toBe(20);
  });
  it('unique items are never sold', () => {
    const inv = pickUp(emptyInventory(), { itemId: 'wrens_bow', count: 1 }, index);
    expect(sell({ carried: 0, stored: 0 }, inv, [], { itemId: 'wrens_bow', count: 1 }, thriving, index)).toBe('never_sold');
  });
  it('a stolen thing can be sold, once, for good, and shows whose it was', () => {
    expect(ownerOf(get('wedding_ring'))).toBe('marrins');
    expect(ownerOf(get('apple'))).toBeNull();
    const inv = pickUp(emptyInventory(), { itemId: 'wedding_ring', count: 1 }, index);
    const deal = sell({ carried: 0, stored: 0 }, inv, [], { itemId: 'wedding_ring', count: 1 }, thriving, index);
    if (typeof deal === 'string') throw new Error(deal);
    expect(deal.inventory.soldStolen).toEqual(['wedding_ring']);
    expect(deal.shelf).toEqual([]);
    expect(deal.crowns).toBeGreaterThan(0);
    expect(sell(deal.purse, deal.inventory, deal.shelf, { itemId: 'wedding_ring', count: 1 }, thriving, index)).toBe('not_carried');
  });
});

describe('rebuilding Wick', () => {
  it('has the seven projects, with the written lines', () => {
    expect(PROJECTS.map(p => p.name)).toEqual(['Lanterns on the east road', 'Lanterns on the mill road', 'The well',
      'The bridge to the Forge', 'The market stalls', 'The inn', 'The village bell']);
    expect(PROJECTS.find(p => p.id === 'village_bell')!.line).toBe('Amos Rudd has kept the rope.');
  });
  it('is paid for once, in order where one thing needs another', () => {
    const rich = { carried: 1000, stored: 0 };
    expect(build(rich, [], 'inn')).toBe('needs_another_first');
    expect(build({ carried: 10, stored: 1000 }, [], 'well')).toBe('not_enough_crowns');
    const well = build(rich, [], 'well');
    if (typeof well === 'string') throw new Error(well);
    expect(well.purse.carried).toBe(960);
    expect(build(well.purse, well.built, 'well')).toBe('already_built');
    expect(build(rich, [], 'castle')).toBe('unknown_project');
    expect(available(well.built).map(p => p.id)).toContain('market_stalls');
    expect(available([]).map(p => p.id)).not.toContain('market_stalls');
  });
  it('costs more in total than the purse may hold before Stane, so there is always something left to want', () => {
    expect(totalCost()).toBeGreaterThan(PURSE_BANDS.forge_freed[1]);
  });
});
