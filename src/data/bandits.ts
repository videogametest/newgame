// Stane's men, as data. Transcribed from docs/writing/bandits.md, which is the source: change it there first.
// One list for every system: combat, places, people, stories. Ids are lower case with underscores, full names.

export type Loyalty = 'low' | 'middling' | 'high';
export type UnitType = 'soldier' | 'archer' | 'brute' | 'shield_bearer' | 'runner';
export type PlaceId = 'mill' | 'forge' | 'watch_house';
/** When in the day a habit happens. Hours for each are in the places tuning. */
export type HabitTime = 'dawn' | 'before_dawn' | 'midday' | 'afternoon' | 'dusk' | 'night' | 'midnight' | 'guard_change' | 'always';

export interface Habit {
  when: HabitTime;
  /** A named spot at the bandit's place, positioned by the world. */
  where: string;
  /** What the player can use. Shown nowhere; for whoever builds the place. */
  note: string;
  /** The bandit is by themselves while doing it. */
  alone?: boolean;
}

export interface BanditDef {
  id: string;
  name: string;
  placeId: PlaceId;
  /** The Mill has two garrisons that never appear together. Everyone else is 'first'. */
  garrison: 'first' | 'retaken';
  unit: UnitType;
  leader?: boolean;
  loyalty: Loyalty;
  /** The trade they had before, and take up again if they stay. */
  formerTrade: string;
  /** The habit cell exactly as written. Every bandit has one; 'None' means no habit. */
  habitText: string;
  habit?: Habit;
  /** Rides with the tax cart. */
  cart?: boolean;
  /**
   * Someone at the same place they are close to, for those who share no overheard exchange. Everyone else's ties
   * come from who they are overheard talking with (src/data/overheard.ts, `closeTo`).
   */
  closeTo?: string[];
  recruitRole?: 'comrade_knowledge';
  replaces?: string;
}

/** The habit cell exactly as docs/writing/bandits.md has it ("None" where they have none). Tested against the writing. */
const HABIT_TEXT: Readonly<Record<string, string>> = {
  harl_gadd: "Walks the whole yard at every guard change",
  dob_finch: "Feeds the geese at dawn. They are quiet while he does",
  wyll_carrow: "Fishes alone at the mill pond at dusk",
  bran_oakes: "Dozes on the night watch, against the woodpile",
  nessa_roke: "None. She is the one who is always looking",
  pim: "Goes for the bell",
  odo_varn: "Eats last, alone, after the others",
  maud_kerr: "None. She does not have habits",
  brock_tull: "Stands at the door of the mill and does not move from it",
  annis_pell: "Keeps to the loft window",
  col_ware: "Complains, constantly, to anyone",
  sim_hart: "Goes for the bell",
  jude_barrow: "None",
  rafe_dunmore: "Works the anvil himself at midday, badly, with Aldric's hammer",
  tobin_pike: "Stands at the east fence at dusk, looking toward the village",
  peg_rudge: "Tends the fire before dawn. Alone with it for an hour",
  hob_tarn: "Sleeps across the strongroom door",
  sib_marlowe: "Walks the same circuit, never varying it",
  jory_flint: "Slips out to hunt rabbits most afternoons",
  alda_grice: "Watches the road from the roof",
  ketch: "Goes for the bell",
  corwin_vale: "Inspects the gate at dusk and dawn",
  marek_stroud: "Never far from Stane",
  ilsa_thorn: "On the wall walk, always",
  gant: "Leads the tax cart",
  dunstan_lowe: "Dusts the supper table every morning, on Stane's order, and moves nothing",
  tom_sable: "Takes the midnight watch at the back gate",
  rikke: "Rides with the tax cart",
  hew_pollard: "Rides with the tax cart, and hates it",
};

const b = (id: string, name: string, placeId: PlaceId, unit: UnitType, loyalty: Loyalty, formerTrade: string, extra: Partial<BanditDef> = {}): BanditDef =>
  ({ id, name, placeId, garrison: 'first', unit, loyalty, formerTrade, habitText: HABIT_TEXT[id] ?? '', ...extra });

export const BANDITS: readonly BanditDef[] = [
  // The Mill
  b('harl_gadd', 'Harl Gadd', 'mill', 'soldier', 'high', "A carter's guard", { leader: true, habit: { when: 'guard_change', where: 'yard', note: 'Walks the whole yard at every guard change' } }),
  b('dob_finch', 'Dob Finch', 'mill', 'soldier', 'low', "A miller's hand, at this mill", { habit: { when: 'dawn', where: 'geese', note: 'Feeds the geese. They are quiet while he does' } }),
  b('wyll_carrow', 'Wyll Carrow', 'mill', 'archer', 'middling', 'A fowler', { habit: { when: 'dusk', where: 'mill_pond', note: 'Fishes at the mill pond', alone: true } }),
  b('bran_oakes', 'Bran Oakes', 'mill', 'soldier', 'middling', 'A ploughman', { habit: { when: 'night', where: 'woodpile', note: 'Dozes on the night watch, against the woodpile' } }),
  b('nessa_roke', 'Nessa Roke', 'mill', 'archer', 'high', "A guardsman's daughter"),
  b('pim', 'Pim', 'mill', 'runner', 'low', 'An errand boy. The youngest here'),
  b('odo_varn', 'Odo Varn', 'mill', 'soldier', 'middling', 'A drover', { habit: { when: 'midday', where: 'fire', note: 'Eats last, alone, after the others', alone: true } }),
  // The Mill, retaken
  b('maud_kerr', 'Sergeant Maud Kerr', 'mill', 'shield_bearer', 'high', 'A guardsman', { garrison: 'retaken', leader: true }),
  b('brock_tull', 'Brock Tull', 'mill', 'brute', 'high', 'A quarryman', { garrison: 'retaken', closeTo: ['maud_kerr'], habit: { when: 'always', where: 'mill_door', note: 'Stands at the door of the mill and does not move from it' } }),
  b('annis_pell', 'Annis Pell', 'mill', 'archer', 'high', 'A guardsman', { garrison: 'retaken', habit: { when: 'always', where: 'loft_window', note: 'Keeps to the loft window' } }),
  b('col_ware', 'Col Ware', 'mill', 'soldier', 'middling', 'A tanner', { garrison: 'retaken' }),
  b('sim_hart', 'Sim Hart', 'mill', 'runner', 'middling', 'A groom', { garrison: 'retaken', closeTo: ['col_ware'] }),
  b('jude_barrow', 'Jude Barrow', 'mill', 'shield_bearer', 'middling', 'A cooper', { garrison: 'retaken' }),
  // The Forge
  b('rafe_dunmore', 'Rafe Dunmore', 'forge', 'brute', 'high', "A drill sergeant's corporal", { leader: true, habit: { when: 'midday', where: 'anvil', note: "Works the anvil himself, badly, with Aldric's hammer" } }),
  b('tobin_pike', 'Tobin Pike', 'forge', 'soldier', 'low', "A farmer's son, from Wick", { recruitRole: 'comrade_knowledge', habit: { when: 'dusk', where: 'east_fence', note: 'Stands at the east fence, looking toward the village', alone: true } }),
  b('peg_rudge', 'Peg Rudge', 'forge', 'soldier', 'low', "A smith's striker, at this forge", { habit: { when: 'before_dawn', where: 'forge_fire', note: 'Tends the fire. Alone with it for an hour', alone: true } }),
  b('hob_tarn', 'Hob Tarn', 'forge', 'brute', 'high', 'A quarryman', { closeTo: ['rafe_dunmore'], habit: { when: 'night', where: 'store_door', note: 'Sleeps across the strongroom door' } }),
  b('sib_marlowe', 'Sib Marlowe', 'forge', 'shield_bearer', 'middling', 'A cooper', { habit: { when: 'always', where: 'circuit', note: 'Walks the same circuit, never varying it' } }),
  b('jory_flint', 'Jory Flint', 'forge', 'archer', 'middling', "A fletcher's boy", { habit: { when: 'afternoon', where: 'rabbit_run', note: 'Slips out to hunt rabbits most afternoons', alone: true } }),
  b('alda_grice', 'Alda Grice', 'forge', 'archer', 'high', 'A guardsman', { habit: { when: 'always', where: 'roof', note: 'Watches the road from the roof' } }),
  b('ketch', 'Ketch', 'forge', 'runner', 'low', "A shepherd's lad, who worked for the Sedges", { recruitRole: 'comrade_knowledge', replaces: 'tobin_pike' }),
  // The Watch-house
  b('corwin_vale', 'Lieutenant Corwin Vale', 'watch_house', 'shield_bearer', 'high', 'A guardsman. One of those who stayed', { habit: { when: 'dusk', where: 'gate', note: 'Inspects the gate at dusk and dawn. Only the dusk round is scheduled so far' } }),
  b('marek_stroud', 'Marek Stroud', 'watch_house', 'brute', 'high', 'A guardsman', { habit: { when: 'always', where: 'beside_stane', note: 'Never far from Stane' } }),
  b('ilsa_thorn', 'Ilsa Thorn', 'watch_house', 'archer', 'high', 'A huntsman', { habit: { when: 'always', where: 'wall_walk', note: 'On the wall walk, always' } }),
  b('gant', 'Gant', 'watch_house', 'soldier', 'middling', 'A guardsman', { cart: true }),
  b('dunstan_lowe', 'Dunstan Lowe', 'watch_house', 'soldier', 'middling', "A steward's boy", { habit: { when: 'dawn', where: 'supper_table', note: "Dusts the supper table every morning, on Stane's order, and moves nothing" } }),
  b('tom_sable', 'Tom Sable', 'watch_house', 'shield_bearer', 'middling', 'A wheelwright', { habit: { when: 'midnight', where: 'back_gate', note: 'Takes the midnight watch at the back gate', alone: true } }),
  b('rikke', 'Rikke', 'watch_house', 'runner', 'middling', 'A kennel hand', { cart: true }),
  b('hew_pollard', 'Hew Pollard', 'watch_house', 'archer', 'low', 'A thatcher, from Wick', { cart: true }),
];

export const banditById = (id: string): BanditDef | undefined => BANDITS.find(x => x.id === id);

/** Who holds a place: the first garrison, or the one that retook it. */
export function garrisonOf(placeId: PlaceId, retaken = false): BanditDef[] {
  return BANDITS.filter(x => x.placeId === placeId && x.garrison === (retaken ? 'retaken' : 'first'));
}
