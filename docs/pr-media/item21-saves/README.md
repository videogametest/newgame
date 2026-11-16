# Item 21 persistence verification

Repeat on a production preview (or pass the live URL):

```sh
npx vite-node scripts/item21_fixture.ts > /tmp/item21-fixture.json
node scripts/item21_capture.mjs http://localhost:4189/ docs/pr-media/item21-saves /tmp/item21-fixture.json
```

Use a new output folder and `--no-images` for subsequent functional checks. It creates isolated browser contexts with a synthetic save, not a player's game. Real game auto-resumes while item 22's title screen is pending. Tour mode ignores and cannot overwrite a game save.

Three full-page frames, captured once, no fallback or retake. Not visually judged under unattended mode. The first set predates an autosave allocation optimization and additional test-only cases; `final/report.json` repeats all checks without more images on the final game build.

The completed-rest test calls the real save projection through the persistence hook. It does not perform a rest: no rest interaction exists yet. Place-freeing and rest-action producers are not invented here; capture autosave observes the actual GameState transition, and future completed rests call `save('rest')`. Unit tests cover capture, relighting, retry, active interval, town entry, and completed-rest triggers. Browser checks cover actual load, write, reload, settings separation, quota failure, damaged JSON, and tour isolation. This is not a keyboard Mill playthrough or a claim that every later game system is wired.

Initial medium-quality settled draw calls: restored 266 (111 chunks), reloaded 268 (110 chunks), damaged-save new-game view 372 (76 chunks). The last is over 300. No same-view baseline was captured, so no causal claim or performance improvement is made. Reported for critique, not a visual merge veto.
