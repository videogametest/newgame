# Status

Viktor updates this file. Newest entry at the top. See `docs/WORKFLOW.md` for what each entry should contain.

## Streams

| Stream | Doing | Open PR | Blocked |
| --- | --- | --- | --- |
| A | Task 002 steps 1–9 merged (PR #12, `659222d`). Done. | none | none |
| B | Task 002b (style test) in progress. Asset survey merged (PR #9, `cfd5bf6`). KayKit Medieval Hexagon free zip not downloadable (0 bytes twice). | none | Greg's decisions on the people question and the seven gaps; task 003 waits on both |
| C–H | Logic streams (world, stealth, combat, items, people, music) | none | Not started; added as capacity allows. Task 003 waits for the survey review. |

## 2026-11-12 03:05 ET (Viktor)

- **Task 002 done.** PR #12 (`659222d`, squash) merged. Its Pages run `43144274493` **failed**, so the live site stayed on the `3e8da2d` build. Cause: `ubuntu-latest` now resolves to Ubuntu 26.04, which Playwright 1.59 does not support. Fix: PR #13 (`2a13035`, squash) pins both jobs to `ubuntu-24.04`. Pages run `43145058218` succeeded.
- **Live check:** `https://everylitwindow.com/` returns HTTP 200 and passes `scripts/smoke.mjs` with no failed requests. Verified 03:05 ET.
- **Verified on the PR #13 branch:** `tsc --noEmit` exit 0; 128 tests pass; `npm run build` exit 0; smoke test against `vite preview` passes.
- **Not verified:** the drawn-bow arm aim in a live deployed frame (checked only on the contact sheet). Greg asked for this check on PR #4 work; it still needs a live frame.
- **Blocked: KayKit Medieval Hexagon (free).** The free download saved a 0-byte file twice, from the itch free route only. The empty file is deleted. No paid option was clicked. Greg: if you can download the free zip by hand into the repo's asset folder, I'll pick it up.
- **Next:** task 002b (style test). Then logic streams C–H, shipped dark, at most four at once.

## 2026-11-11 21:50 ET (Viktor)

- **Review 001 done.** PR #10 merged (`146a73b`, squash). Pages run `43143395385` was in progress when this was written; its conclusion is not verified yet.
- **Shipped, per review 001:** `PlaceKind` is `village | camp | outpost`. `PlaceDef` (data) and `PlaceState` (`status`, `timesFreed`, `bellSilenced`, `morale`). `Household` is `{ id, home, homeSince? }`. `BanditState` union. `GameState` gains `day`, `progression`, `places`, and the missing lists from the review table. `GameState.skills` is replaced by `progression`, and `HeroState.rank` is removed. `ExperienceEvent.repeatable` added, and `awardSharedEvent` reads it from the event.
- **Decision (review 001, item 3):** `ProgressionState` and the types it uses live in `src/core/types/shared.ts`. `src/core/progression/types.ts` re-exports them.
- **Decision (review 001, settings):** settings are not in `GameState`. The own-object and own-storage-key part is not built yet; the settings stream builds it.
- **Deferred, as the review says:** items 5–6 (crowns; `ItemDef` kind, quality, owner, icon) and item 7 (squad as a company) go to the owning streams. No `HouseholdDef` yet; decided when the people stream starts.
- **Verified:** `npx tsc --noEmit` exit 0; `npm test` 11 files, 101 tests pass; `npm run build` exit 0 on the branch. The branch had no PR checks (the deploy workflow runs on pushes to `main` only), so the tests were run locally.
- **Review 002 answered:** accepted as research. Task 003 stays blocked. The five survey changes are **not yet made**; they are part of task 002b, which is in progress. Greg has not yet decided the people question or the seven gaps.

## Task 002, step 10: asset survey (stream B)

- Branch `feat/task-002-asset-survey` from `main`, docs only. No code changed, so no tests were run for this PR. Not merged yet.
- Survey: 86 rows, 43 found, 20 found but needs checking, 23 gaps. The full table, licences and fallbacks are in `docs/assets.md`, generated from the survey file.
- Seven must-have gaps: `houses_16`, `lightable_windows`, `fairlow_house`, `hesper_cottage`, `forge_anvil`, `watch_house`, `lantern_hanging`. The survey recommends fallback rung 2 for most (author from CC0 modular kits, free but costs authoring time). Nothing selected yet; Greg decides.
- Verified: licence wording for every pack, read from the pack's own licence file where one exists and from its page otherwise (table in `docs/assets.md`). Measured file sizes for the Kenney runtime set (8,686,129 bytes) plus the sheep and crow files. The survey estimates about 15.5 MB with wolves and deer added; the 25 MB first-load target is **not yet established**.
- Not verified or not done:
  - Scale screenshots beside the hero, which task 002 step 10 asks for: **not produced**. The survey did no rendering.
  - Wolves, deer, fox, stag and horse: Google Drive quota blocked the downloads, so they are unmeasured and uninspected.
  - Geese: rigged Blend file only; no animation clips confirmed.
  - Crow: CC0 on the author's page, but the creation method is undisclosed. Needs a provenance check.
  - Sheep: the original Quaternius Farm licence was read. The glTF the survey checked is a third-party threejs.org conversion.
  - Coverage against the design doc's full asset list was not re-checked in this entry.
- Nothing purchased. The five optional paid packs total USD 47.91 before tax; the survey says most are unnecessary on the free route.
- Task 003 has not started. Waiting for Claude's review of the survey and Greg's decision on the seven gaps.
- Stream A (task 002 steps 1–9) is on `feat/task-002-foundations`, five commits ahead of `main`, not merged. Its tests, typecheck, build and deploy were not re-run in this entry.

## 2026-11-11 19:30 ET (Viktor)

- **Task 001 done.** PR #5 merged (`775949d`). Pages run `43124527769` succeeded. Shipped: camera fade for fighters blocking the hero, and the camera floor clamp. Teal tint root cause: the translucent boundary wall, not the camera dropping below ground. The wall is now hidden outside arena bounds (`insideBounds` in `src/render/camera_limits.ts`). Verified: 34 tests pass, `tsc` clean, build passes, before/after frames in `docs/pr-media/001-walkback-*.png`. Not verified: a live Pages frame showing the tint gone.
- **Base change (Greg's request 1).** PR #6 merged (`10623c4`). Pages run `43125974189` succeeded. Vite `base` is `/`. README updated. No CNAME file. Verified: 34 tests pass, `tsc` clean, build passes, no `newgame` references in `dist/`.
- **Custom domain: NOT live (Greg's request 2).** `https://everylitwindow.com/` fails the TLS handshake (HTTP 000). The served certificate is the `*.github.io` wildcard, which does not match the domain. Cause: the Pages settings show `cname: null`, so the custom domain is not set on the repo. DNS already resolves to GitHub Pages IPs. Greg needs to set `everylitwindow.com` under Settings → Pages. Then re-check.
- **Legacy URL.** `https://videogametest.github.io/newgame/` returns the HTML, but its assets 404 because the base is now `/`.
- **Question for Greg.** Set the custom domain in Settings → Pages, then tell me. Should the `/newgame/` path build be kept for the old URL?
- **Risk, not verified.** A Pages deploy may clear the custom domain when no CNAME file is in the repo. Watch for this after the next deploy.
- **Next.** Task 002 (sound and showcase) starts after this entry is merged.

## 2026-11-11 18:55 ET (seeded by Claude from Viktor's last report)

- PR #4 merged (`d532b10`): balance targets, tuning panel, visual captures. Live on Pages.
- Task 001 in progress: the camera fade logic runs, but the fading fighter still renders solid. Not merged.
- Known: a teal tint appears when the camera drops below the water plane while walking backward.
