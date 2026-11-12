# newgame

A third-person 3D battle prototype, built with Babylon.js, TypeScript and Vite. Milestone 1 is the combat prototype described in `GAME_DESIGN.md` section 7.

**Live build:** https://everylitwindow.com/

## Run

```
npm ci
npm test        # simulation tests, including the headless bot battle
npm run build   # type check, then production build into dist/
npm run dev     # local dev server
```

## Controls

| Input | Action |
| --- | --- |
| Click the game | Take control (pointer lock) |
| W A S D | Move, relative to the camera |
| Mouse | Look and aim |
| Shift | Sprint |
| Space | Dodge roll |
| 1 / 2 | Sword / bow |
| Left mouse | Attack; hold with the bow to draw |
| Right mouse | Zoom (bow) |
| Esc | Pause |
| `` ` `` (backtick) | Toggle the tuning panel (live sliders, Copy config, Reset). Opening it pauses the sim. |

## Layout

- `src/core/`: the simulation. Pure TypeScript with no Babylon imports, so it runs headless in tests.
- `src/config/`, `src/data/`: tuning values, unit definitions and the training field.
- `src/render/`: Babylon rendering, camera, input, HUD and the game loop. Reads simulation state and draws it.
- `public/assets/`: KayKit Adventurers and KayKit Character Animations (CC0, glTF). Licence files are in each folder.

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs the tests and build on every push to `main`, then publishes `dist/` to GitHub Pages. Vite's `base` is `/`, which matches the custom domain root. A path-based Pages URL (`https://<user>.github.io/<repo>/`) would need `base: '/<repo>/'` instead.

Supabase is not used in milestone 1 (design section 7). Keys and the service-role key do not belong in this repo.
