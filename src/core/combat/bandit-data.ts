import type { BanditDef } from './bandits';

// Names, natures and former trades transcribed from docs/writing/bandits.md.
// Place identifiers are module-local definitions pending integration with places.
export const BANDITS: readonly BanditDef[] = [
  { id: 'harl_gadd', name: 'Harl Gadd', placeId: 'mill', loyalty: 'high', formerTrade: "A carter's guard" },
  { id: 'dob_finch', name: 'Dob Finch', placeId: 'mill', loyalty: 'low', formerTrade: "A miller's hand, at this mill" },
  { id: 'wyll_carrow', name: 'Wyll Carrow', placeId: 'mill', loyalty: 'middling', formerTrade: 'A fowler' },
  { id: 'bran_oakes', name: 'Bran Oakes', placeId: 'mill', loyalty: 'middling', formerTrade: 'A ploughman' },
  { id: 'nessa_roke', name: 'Nessa Roke', placeId: 'mill', loyalty: 'high', formerTrade: "A guardsman's daughter" },
  { id: 'pim', name: 'Pim', placeId: 'mill', loyalty: 'low', formerTrade: 'An errand boy. The youngest here' },
  { id: 'odo_varn', name: 'Odo Varn', placeId: 'mill', loyalty: 'middling', formerTrade: 'A drover' },
  { id: 'maud_kerr', name: 'Sergeant Maud Kerr', placeId: 'mill', loyalty: 'high', formerTrade: 'A guardsman' },
  { id: 'brock_tull', name: 'Brock Tull', placeId: 'mill', loyalty: 'high', formerTrade: 'A quarryman' },
  { id: 'annis_pell', name: 'Annis Pell', placeId: 'mill', loyalty: 'high', formerTrade: 'A guardsman' },
  { id: 'col_ware', name: 'Col Ware', placeId: 'mill', loyalty: 'middling', formerTrade: 'A tanner' },
  { id: 'sim_hart', name: 'Sim Hart', placeId: 'mill', loyalty: 'middling', formerTrade: 'A groom' },
  { id: 'jude_barrow', name: 'Jude Barrow', placeId: 'mill', loyalty: 'middling', formerTrade: 'A cooper' },
  { id: 'rafe_dunmore', name: 'Rafe Dunmore', placeId: 'forge', loyalty: 'high', formerTrade: "A drill sergeant's corporal" },
  { id: 'tobin_pike', name: 'Tobin Pike', placeId: 'forge', loyalty: 'low', formerTrade: "A farmer's son, from Wick", recruitRole: 'comrade_knowledge' },
  { id: 'peg_rudge', name: 'Peg Rudge', placeId: 'forge', loyalty: 'low', formerTrade: "A smith's striker, at this forge" },
  { id: 'hob_tarn', name: 'Hob Tarn', placeId: 'forge', loyalty: 'high', formerTrade: 'A quarryman' },
  { id: 'sib_marlowe', name: 'Sib Marlowe', placeId: 'forge', loyalty: 'middling', formerTrade: 'A cooper' },
  { id: 'jory_flint', name: 'Jory Flint', placeId: 'forge', loyalty: 'middling', formerTrade: "A fletcher's boy" },
  { id: 'alda_grice', name: 'Alda Grice', placeId: 'forge', loyalty: 'high', formerTrade: 'A guardsman' },
  { id: 'ketch', name: 'Ketch', placeId: 'forge', loyalty: 'low', formerTrade: "A shepherd's lad, who worked for the Sedges", recruitRole: 'comrade_knowledge', replaces: 'tobin_pike' },
  { id: 'corwin_vale', name: 'Lieutenant Corwin Vale', placeId: 'watch_house', loyalty: 'high', formerTrade: 'A guardsman. One of those who stayed' },
  { id: 'marek_stroud', name: 'Marek Stroud', placeId: 'watch_house', loyalty: 'high', formerTrade: 'A guardsman' },
  { id: 'ilsa_thorn', name: 'Ilsa Thorn', placeId: 'watch_house', loyalty: 'high', formerTrade: 'A huntsman' },
  { id: 'gant', name: 'Gant', placeId: 'watch_house', loyalty: 'middling', formerTrade: 'A guardsman' },
  { id: 'dunstan_lowe', name: 'Dunstan Lowe', placeId: 'watch_house', loyalty: 'middling', formerTrade: "A steward's boy" },
  { id: 'tom_sable', name: 'Tom Sable', placeId: 'watch_house', loyalty: 'middling', formerTrade: 'A wheelwright' },
  { id: 'rikke', name: 'Rikke', placeId: 'watch_house', loyalty: 'middling', formerTrade: 'A kennel hand' },
  { id: 'hew_pollard', name: 'Hew Pollard', placeId: 'watch_house', loyalty: 'low', formerTrade: 'A thatcher, from Wick' },
];
// Stane is deliberately not a win-back candidate: he always yields and leaves
// in the finale. His definition belongs with the coordinator's story module.
