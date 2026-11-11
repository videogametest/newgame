# newgame

Browser game prototype: Phaser + TypeScript + Vite, deployed to GitHub Pages.
Live: https://videogametest.github.io/newgame/

Design source of truth: [GAME_DESIGN.md](GAME_DESIGN.md).

## Milestone 1: combat prototype

One arena. Hero with sword and bow, two allied soldiers, one enemy soldier, one enemy archer.
Victory and Defeat screens with restart.

### Controls

- `A` / `D`: move
- `1` / `2`: sword / bow
- Left mouse: sword swing (sword), hold to draw and release to fire at the cursor (bow)
- `R`: restart after a battle ends

## Commands

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (pure logic, no Phaser)
npm run typecheck
npm run build      # typecheck + production build into dist/
```

## Layout

- `src/config/tuning.ts`: every balance number.
- `src/data/`: unit definitions and the arena layout (data, not logic).
- `src/core/`: pure, serializable simulation (no Phaser). Covered by tests.
- `src/scenes/`: Phaser rendering and input only. Reads state from `core`.
- `src/lib/supabase.ts`: Supabase client. Not used in milestone 1; cloud saves come in milestone 4.

## Secrets

Only the Supabase publishable (anon) key is ever used in the client, supplied at build time
from the `VITE_SUPABASE_ANON_KEY` Actions secret. The service-role key must never be in this repo.
