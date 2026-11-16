// Item 28: where each household of Wick spends the day (GAME_DESIGN.md section 9, "A daily life"). The writing gives
// no workplaces or hours, so every spot here is a placeholder: the household's own plot, stall or post from the
// seeded Wick plan where it has one (docs/tasks/003-layout/wick.json "things" and "gates"), otherwise its own door.
// Who is drawn comes from HOUSEHOLDS' members (the written names). Hesper is not here: she is the talking actor.
import type { WickDay } from '../core/people/daily';

export const WICK_DAYS: readonly WickDay[] = [
  { household: 'maren', work: 'door', stays: true }, // "never left"; very old, so she keeps to her door
  { household: 'marrins', work: 'door' }, // the Mill is outside Wick and can be retaken: they work at home
  { household: 'aldrics', work: 'door' }, // the Forge is outside Wick
  { household: 'sedges', work: 'north_gate' }, // the east road's gate, toward their flock
  { household: 'pikes', work: 'pike_field' },
  { household: 'wains', work: 'door' },
  { household: 'kettles', work: 'market_stalls' },
  { household: 'brands', work: 'brand_woodpile' },
  { household: 'oona', work: 'oona_garden' },
  { household: 'hollins', work: 'door' }, // the inn is roofless until its project
  { household: 'tolleys', work: 'door' },
  { household: 'ashbys', work: 'ashby_hives' },
  { household: 'loomises', work: 'door' },
  { household: 'dunns', work: 'dunn_field' },
  { household: 'rudds', work: 'bell_post' },
];
