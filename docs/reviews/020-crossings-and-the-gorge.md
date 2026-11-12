# Review 020: answers on the crossings, the gorge, and the falls (PRs #30 to #35)

12 November, asked for by Greg. `main` at `79dea5a`. Not a first-look review: nothing here is ready for Greg to look at, and none of it claims to be.

Not run here: the tests and the build on `79dea5a`. I measured the land with `valleyHeightAt` and read the status entries.

## Sound

- **Sun and moon (PR #30).** East, south at noon, west; both peak at 35 degrees. Reviews 018 item 1 and 019 item 1 are closed.
- **Rivers (PR #31).** Measured across the mill bridge, the stones, and the ford: a V-shaped valley with banks at 0.3, water about 10 m wide and 1.5 m deep, the ford 0.4 m deep. This is what version 34 asked for.
- **Item 3.** You measured before changing anything, found the fault already gone, and added the test with a control that fails. That is the right way to close an item.
- **You stopped at four missing numbers and did not guess.** Correct. They were a gap in the design, and are filled below.
- **You said plainly that earlier lighting work was lost** with a sandbox and rebuilt from `main`. Good. Push branches early so a lost sandbox costs an hour, not a day.

## Your questions

**1. The four values for item 4.** Now in the design (version 35), in `docs/tasks/003-layout.md`, and in `layout.json` under `crossings`, each with its two end points.

| Crossing | Width | Surface |
| --- | --- | --- |
| The ford | 3.6 m, the east road's width | The bed. No surface of its own |
| The mill bridge | 2.4 m | A deck running straight from the ground height at one bank end to the ground height at the other, never less than 1.0 m above the water |
| The stepping stones | 1.2 m | One unbroken strip 0.3 m above the water. The stones are 1.2 m across with 0.5 m gaps, but the hero walks them without a jump, so the walk surface has no gaps |
| The bridge to the Forge | 3.6 m | Not walkable until its project is built. New in the data; it stands 10 m downstream of the ford |

Roads are 3.6 m wide (road in, mill road, east road, soldiers' road). Every other line in `roads` is a path, 1.2 m wide. Each crossing runs across the river, square to its flow.

**2. "No road or path crosses either."** You are right, and that was my omission. Two paths are added to `roads`: `north_bank_path` goes from the Mill over the mill bridge and up to the soldiers' road, and `stones_path` crosses the stones to the west heights. Both pass stops that were already placed.

**3. Is the gorge the rim wall with a 0.3 slope?** No. There is no gorge yet. Across the river out at x = 300 to 400 the banks rise at 0.3 to about 10 m, the same gentle valley as everywhere else, and anyone could walk out along it. The gorge is the river's last hundred metres, cut through the rim between rock walls steeper than 0.7 and at least 15 m high (now in the design). Build it with item 5; it is one of the ways the edge is closed.

**4. Should a camera spot for the falls be built now?** No. There are no falls to look at: the waterfall is step 2. Your `placeAt` and `lookAt` hooks are enough until then. When the falls exist, stand at (-268, 24) and look at (-296, -22).

**5. The captures do not show the river change.** Your guess is right: the bed is under a flat, opaque sheet of water, so from above nothing changed. Do not spend more time on river captures until the water is drawn properly in step 2. The tests carry this item.

**6. "Confirm I should go ahead."** Go ahead. Items 5 to 9 never depended on these answers, and `docs/WORKFLOW.md` rule 7 says not to wait. When one item is blocked, start the next in the same hour and say so.

## What must change

1. **The Mill moves to the bank.** It stood 20 m from the river, and a mill's wheel has to be in the water. It is now at (-176, 50), built into the south bank. The mill bridge moves 14 m upstream to (-191, 34) to make room. On your land the Mill is still hidden from Wick, by 3.6 m. Regenerate `valley_layout.ts` from `layout.json` and update the sight-line figure.
2. **Item 4 as answered above.** The 11 m discs go; each crossing is a strip between its two ends.
3. **Then items 5 to 9 of review 018**, with the gorge inside item 5.
4. **`docs/tasks/003-wick.md` is new** since your last pull: the village, house by house, for step 2. It asks for two things from the land that are best done with item 6: the lake's edge at the landing (66, 62), and a nearly level shelf under the village.

## Needs Greg

Nothing to decide.
