# Item 20: Mill draw-call budget

Medium quality, 1280x720, same Mill bridge tour view at four hours. Clock and combat held; real Mill schedule advanced once at each hour. Twelve distinct rendered samples with stable positive chunk count before each full-page screenshot. No canvas fallback. No visual judgement.

| Hour | Before | After | Saved |
| --- | ---: | ---: | ---: |
| 08:00 | 460 | 268 | 192 |
| 13:00 | 460 | 268 | 192 |
| 18:00 | 406 | 256 | 150 |
| 00:00 | 406 | 248 | 158 |

`before.json` and `after.json` contain state and independent group-removal measurements from `scripts/mill_budget.mjs`. Before at 08:00, hiding shadows gives 320, glow 317, landmarks 417, fighters 169. These deltas overlap, so do not add them. The fighters, drawn in the colour, glow and shadow passes, dominate this view. This is a same-view comparison against main 35c69bb with diagnostic hooks only, not against older task screenshots.

Changes: merge same-material, same-rig, identity-local-transform defender body pieces into one skinned mesh; share neutral materials per unit, keeping flash/fade private; partition already-batched static landmark models and props by site; cast shadows only for footprints intersecting the hero's 60 m radius. Wheels, banners and lanterns remain separate. No glow removal, no missing defenders to meet the budget, no density/quality change.

Correction: the first before capture's diagnostic incorrectly re-enabled absent defenders. Those four frames and their numbers were discarded. The before set here is the single corrected retake. After captured once. A separate measurement-only optimization pass took no images and is not the final table.

These four steady views pass 300. No claim about GPU frame rate, all quality levels, combat peak cost, or every viewpoint. Caption/marker rendering is in the full-page images; this was not a keyboard combat playthrough.
