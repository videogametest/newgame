// Overheard lines, as data. Transcribed from docs/writing/bandits.md, which is the source. The words themselves are
// read from the writing by id; this says where, when, who, and what kind.
import { BANDITS, type HabitTime, type PlaceId } from './bandits';

export type OverheardKind = 'information' | 'story' | 'tell';

export interface OverheardDef {
  id: string;
  place: PlaceId | 'tax_cart';
  /** Only the retaken Mill's garrison says the retaken lines. */
  garrison?: 'retaken';
  kind: OverheardKind;
  when: HabitTime | 'any' | 'morning' | 'evening';
  /** Everyone who speaks. If any of them is gone, the exchange is skipped. */
  speakers: string[];
  /** For a tell: whose it is. Sparing them after hearing it guarantees they stay. */
  tellOf?: string;
}

const o = (id: string, place: OverheardDef['place'], kind: OverheardKind, when: OverheardDef['when'], speakers: string[], extra: Partial<OverheardDef> = {}): OverheardDef =>
  ({ id, place, kind, when, speakers, ...extra });

export const OVERHEARD: readonly OverheardDef[] = [
  o('overheard.mill.1', 'mill', 'information', 'midday', ['harl_gadd', 'bran_oakes']),
  o('overheard.mill.2', 'mill', 'information', 'morning', ['dob_finch', 'pim']),
  o('overheard.mill.3', 'mill', 'tell', 'any', ['dob_finch', 'odo_varn'], { tellOf: 'dob_finch' }),
  o('overheard.mill.4', 'mill', 'story', 'dusk', ['nessa_roke', 'wyll_carrow']),
  o('overheard.mill.5', 'mill', 'information', 'night', ['harl_gadd', 'nessa_roke']),
  o('overheard.mill.retaken.1', 'mill', 'story', 'any', ['col_ware', 'jude_barrow'], { garrison: 'retaken' }),
  o('overheard.mill.retaken.2', 'mill', 'information', 'dusk', ['maud_kerr', 'annis_pell'], { garrison: 'retaken' }),
  o('overheard.forge.1', 'forge', 'tell', 'dusk', ['tobin_pike', 'ketch'], { tellOf: 'tobin_pike' }),
  o('overheard.forge.2', 'forge', 'information', 'midday', ['rafe_dunmore', 'peg_rudge']),
  o('overheard.forge.3', 'forge', 'information', 'night', ['sib_marlowe', 'alda_grice']),
  o('overheard.forge.4', 'forge', 'story', 'evening', ['peg_rudge', 'jory_flint']),
  o('overheard.forge.5', 'forge', 'tell', 'before_dawn', ['peg_rudge'], { tellOf: 'peg_rudge' }),
  o('overheard.forge.6', 'forge', 'story', 'evening', ['rafe_dunmore', 'alda_grice']),
  o('overheard.watch.1', 'watch_house', 'story', 'morning', ['dunstan_lowe', 'tom_sable']),
  o('overheard.watch.2', 'watch_house', 'information', 'dusk', ['corwin_vale', 'tom_sable']),
  o('overheard.watch.3', 'watch_house', 'story', 'night', ['ilsa_thorn', 'marek_stroud']),
  o('overheard.watch.4', 'watch_house', 'tell', 'any', ['hew_pollard', 'rikke'], { tellOf: 'hew_pollard' }),
  o('overheard.watch.5', 'watch_house', 'information', 'evening', ['corwin_vale', 'stane']),
  o('overheard.watch.6', 'watch_house', 'story', 'night', ['stane']),
  o('overheard.cart.1', 'tax_cart', 'tell', 'any', ['hew_pollard', 'gant'], { tellOf: 'hew_pollard' }),
  o('overheard.cart.2', 'tax_cart', 'information', 'any', ['gant', 'rikke']),
];

/** The tells that, once heard, guarantee a spared bandit stays. */
export function tellsOf(banditId: string): string[] {
  return OVERHEARD.filter(x => x.tellOf === banditId).map(x => x.id);
}

/** Whether the hero has heard any tell of this bandit. `heard` is the saved list of overheard line ids. */
export function heardTell(banditId: string, heard: readonly string[]): boolean {
  return tellsOf(banditId).some(id => heard.includes(id));
}

/**
 * Who a bandit is close to: everyone at their place they are overheard talking with, and anyone named in their own
 * data. People who talk together are close, so the player learns the ties by listening. Stane is nobody's tie.
 */
export function closeTo(banditId: string): string[] {
  const self = BANDITS.find(b => b.id === banditId);
  if (!self) return [];
  const same = (id: string) => BANDITS.some(b => b.id === id && b.placeId === self.placeId && b.garrison === self.garrison);
  const ties = new Set<string>(self.closeTo ?? []);
  for (const line of OVERHEARD) {
    if (!line.speakers.includes(banditId)) continue;
    for (const s of line.speakers) if (s !== banditId && same(s)) ties.add(s);
  }
  return [...ties];
}

/**
 * What a bandit who yields gives up: one useful thing about their place, in their own words (docs/writing/bandits.md,
 * "When they yield"). Each stands for an information line, and hearing it counts as having overheard that line.
 */
export interface YieldDef { id: string; place: OverheardDef['place']; garrison?: 'retaken'; sameAs: string; /** Not said by the person it is about. */ about?: string }
export const YIELDS: readonly YieldDef[] = [
  { id: 'yield.mill.1', place: 'mill', sameAs: 'overheard.mill.5', about: 'harl_gadd' },
  { id: 'yield.mill.2', place: 'mill', sameAs: 'overheard.mill.1', about: 'bran_oakes' },
  { id: 'yield.mill.retaken.1', place: 'mill', garrison: 'retaken', sameAs: 'overheard.mill.retaken.2' },
  { id: 'yield.forge.1', place: 'forge', sameAs: 'overheard.forge.3', about: 'hob_tarn' },
  { id: 'yield.forge.2', place: 'forge', sameAs: 'overheard.forge.2', about: 'rafe_dunmore' },
  { id: 'yield.watch.1', place: 'watch_house', sameAs: 'overheard.watch.2', about: 'tom_sable' },
  { id: 'yield.cart.1', place: 'tax_cart', sameAs: 'overheard.cart.2' },
];

/**
 * The one thing this bandit tells when they yield, or null if the hero already knows all they could say.
 * `where` is the tax cart for anyone taken on the road.
 */
export function yieldTells(banditId: string, where: OverheardDef['place'], heard: readonly string[]): YieldDef | null {
  const self = BANDITS.find(b => b.id === banditId);
  if (!self) return null;
  return YIELDS.find(y => y.place === where && (where === 'tax_cart' || (y.garrison ?? 'first') === self.garrison)
    && y.about !== banditId && !heard.includes(y.sameAs) && !heard.includes(y.id)) ?? null;
}
