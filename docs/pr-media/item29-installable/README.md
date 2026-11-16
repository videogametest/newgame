# Item 29: installable

Raw evidence. Frames taken once, not judged.

- `builds/report.json`, `builds/report-no-images.json`: two-build lifecycle runs (39/39 each), with frames
  `build-a-offline-title.png`, `build-a-offline-game.png`, `update-ready-title.png`, `after-update-title.png`,
  `after-update-offline-game.png`.
- `url-local/report-no-images.json`: URL mode against the built preview (13/13).
- `gate/`: tests, typecheck, build, walk gap, smoke, capture logs, item21/item22 regressions, item21 baseline on main.

Fixtures: the save is `scripts/item21_fixture.ts` (`populatedGame()`, synthetic); settings are seeded. Movement is
real keyboard input after real clicks.

Reproduce the two builds (B differs by one number so every code chunk changes):

    npm run build && cp -r dist /tmp/A
    # copy the tree, change TITLE_MOTION.amplitude 0.045 -> 0.046 in src/data/title_screen.ts, vite build, copy dist to /tmp/B
    node scripts/item29_capture.mjs http://localhost:4229/ docs/pr-media/item29-installable/builds --builds /tmp/A,/tmp/B [--no-images]
    node scripts/item29_capture.mjs https://everylitwindow.com/ OUT --no-images   # live: browser-offline mode only
