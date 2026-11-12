# Review 002: the asset survey

Reviewed: `docs/assets.md` at `cfd5bf6`, against `GAME_DESIGN.md` version 21 and task 002 step 10.
Reviewer: Claude. Status: **accepted as research. Task 003 stays blocked on a style test (task 002b) and on Greg's decisions below.**

This is careful, honest work. Licences were read at the source, rejected candidates are listed with reasons, nothing was bought, and what was not verified is said plainly. The conclusion I draw from it: the valley's scenery can be built from free parts. The people cannot yet, and that is the finding that matters most.

## What the survey establishes

- **Scenery is covered.** Ground, trees, bushes, grass, rocks, cliffs, water, the waterfall, a cave mouth, fences, carts, chests, barrels, campfires, banners, and standing lanterns all have CC0 sources.
- **The mill is solved.** The KayKit watermill's wheel is a separate node on its own pivot, so it can turn. That was the single asset I was most worried about.
- **The download budget is plausible.** About 15.5 MB of the 25 MB target with the main animals, before characters, audio, and the engine. Not established, as the survey says.
- **No purchase is needed for scenery.**

## Decisions for Greg

### 1. The seven must-have gaps: approve building them from modular pieces

The survey recommends the same answer for all seven (the sixteen houses, lightable windows, the Fairlow house, Hesper's cottage, the anvil, the Watch-house, and a hanging lantern): assemble them from free modular kits and simple shapes. It costs build time and no money. I agree with every one.

Two notes for Viktor on how:

- **Houses:** write a small generator that assembles a house from wall, roof, door, window, and chimney modules, given a footprint, a height, and a seed. Sixteen households then get sixteen distinct houses from data, and later regions get theirs for free. Hesper's cottage and the Fairlow house are hand-set variants of the same thing.
- **Windows:** a separate emissive pane per window, as the survey proposes. One pane per house is the household's window and is the only one that lights.

### 2. The people are the real gap, and it needs eyes, not a table

The survey lists Hesper, Oona, and the villagers as "found, needs check," with Quaternius modular men and women as the source. Everyone else is a KayKit Adventurer. Those two families do not look alike: KayKit characters are short and stylised with large heads; Quaternius people have ordinary proportions, different rigs, and come as FBX. Mixing them risks a village where the hero and the villagers seem to be from different games, and it adds an animation retargeting problem.

The alternatives:

- **All KayKit.** Hesper from the Mage, villagers and bandits from recoloured and re-propped versions of the five free characters. One style, one rig, no retargeting. The cost is sameness: about sixty people from five bodies.
- **All KayKit, plus the paid Adventurers EXTRA pack (USD 7.95)**, which adds a Druid, an Engineer, and a larger Barbarian. Three more bodies. The Druid is the natural Hesper or Oona.
- **A different stylised villager set** that matches KayKit better than Quaternius does. Not yet searched for.
- **Quaternius for villagers**, as the survey has it, accepting the mismatch.

This cannot be decided from a list. It needs to be seen. See task 002b.

### 3. Three small calls I recommend

- **Geese:** keep them, and animate them in code (a waddle, a neck stretch, wings out when alarmed). The model is rigged but has no clips. Do not swap in ducks or a dog.
- **Crows and songbirds:** do not use a model at all. Birds seen at a distance are a few triangles flapping, drawn in code. That removes the crow file whose origin is unclear.
- **Wolves, deer, and the fox:** the downloads were blocked by a quota, not by a licence. Retry. If they stay blocked, Greg downloads the pack by hand and attaches it.

## Changes wanted in the survey

1. **The scale screenshots were not produced.** Task 002 step 10 asked for each candidate beside the hero. A table of measured heights is not a substitute: several buildings need scaling five to seven times, and whether a board-game mill enlarged sevenfold still looks right beside a character is exactly what a screenshot answers. Task 002b covers this.
2. **Villagers are not marked must-have, and should be.** A village of sixteen households needs people. Add `villagers` and `bandits` to the must-have list, with a count of how many distinguishable people are needed: about thirty-five villagers and twenty-seven named bandits (`docs/writing/households.md`, `docs/writing/bandits.md`).
3. **Add rows for what the writing now names.** The seven stolen things in `households.md`; the slate, the supper table, the logbook, and the letter in `fragments.md`; a boat for the fisher; marker stones; hives; a loom is not needed, only its shuttle.
4. **Licences read "page only" are acceptable** where the page is the author's own, which these are. When a pack is actually adopted, keep its licence file, or a dated copy of the page's licence line, beside the assets.
5. **Three kits are now in play for buildings** (Kenney Fantasy Town for houses, KayKit Hexagon for the mill, forge, well, and tavern, Kenney Castle for the Watch-house). That is fine if the shared palette makes them one world. The style test should show them side by side.

## What happens next

1. Viktor does task 002b, the style test, and updates the survey per the list above.
2. Claude reviews the style test screenshots and shows Greg only what needs his eye.
3. Greg decides the people question and approves the seven builds.
4. Task 003 starts.
