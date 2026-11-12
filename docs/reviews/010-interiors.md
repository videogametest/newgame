# Review 010: buildings can be entered (design version 27)

A design change, decided by Greg on 12 Nov. Read `GAME_DESIGN.md` section 4, "Inside", and `docs/writing/interiors.md`.

**The rule:** Hesper's cottage is open from the start. Every other house in Wick is boarded until its family comes home, then opens. The Mill, the Forge, the inn, the Watch-house hall, and the Fairlow house can be entered too. About twenty rooms by the end, from six layouts.

## What changes for the work

| When | What |
| --- | --- |
| Now, before task 003 | **A furniture survey.** Find a CC0 furniture set that matches the people and the buildings: hearth, bed, table, chair, bench, shelf, chest, counter, barrel, workbench, loom, oven. Start with KayKit's own free sets, then Kenney's. Confirm the licence at the source. Put three pieces in the style test scene inside house A, with the hero, one frame at noon through the open door and one inside at night. If nothing fits, say so; the fallback is furniture from simple shapes in the kit's colours |
| PR #22, with the scale fix | Give house A an open doorway and a floor, for that frame and for the doorway frame from review 008 |
| Task 003 | Hesper's cottage only. Boards on every other house. The door and room system, built so that data can open a house later. The switch to first person at the door |
| Task 004 | The six layouts as reusable rooms. The Mill and the Forge inside. Houses that open when households return |
| Later tasks | The inn, the Watch-house hall, the Fairlow house |

## Things to get right

- **No loading and no cut.** A room is in the world. From outside you can see in through the door and the window.
- **The scale rule applies inside:** ceilings at 2.6 m or more, doors as in review 008.
- **Performance:** a room's furniture is drawn only when the hero is near enough to see in. State the cost per room in the status entry.
- **Light:** the hearth and one candle light the room at night, and that same light is what shows in the window from outside. It is amber.
- **Enemies do not fight indoors.** One found inside goes to the door when alert. Pathfinding needs door cells.
