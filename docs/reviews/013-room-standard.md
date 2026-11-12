# Review 013: the room standard and the furniture survey

Claude did both. They are on `main`.

## The furniture survey (from review 010): done

Three KayKit packs, all CC0, by the artist who made the people, and already at the people's scale (use them at scale 1):

| Pack | In `public/assets/` | Use |
| --- | --- | --- |
| Dungeon Remastered (203 models) | `kaykit_dungeon/`, complete | Beds, chests, trunks, tables, chairs, stools, shelves, barrels, kegs, candles lit and unlit, torches, plates, bottles, keys, banners, wood floors |
| Furniture Bits | `kaykit_furniture/`, a few pieces | Rugs, wooden chairs, bookshelves. The rest of the pack is modern and is not used |
| Restaurant Bits | `kaykit_restaurant/`, a few pieces | Pots, stew, bowls, jars |

No pack has a hearth, a loom, a bread oven, or an anvil. Build those from blocks in the pack's colours, as the hearth is built in the room test.

## The room standard

`?styletest=room` is Hesper's cottage, dressed from `docs/writing/interiors.md`. Frames: `docs/pr-media/styletest/room/`.

- The room is its own space, 8 m by 8 m inside and 3.9 m high: plaster walls between dark timbers, beams, a wood floor from the pack.
- Light at night is the hearth and the lamp in the window, both amber. Nothing else.
- In first person the hero is the camera and is not drawn.
- Hesper is the hooded rogue with the hood up and the mask hidden, with a slight stoop set on the spine in code. She stands at the window: there is no sitting clip yet.
- Walls and furniture must both be PBR surfaces, or the same light blows one out and leaves the other dark.

Task 003 builds Hesper's cottage from this. Task 004 makes the other five layouts the same way.

## A mistake of mine, fixed

Between 11:54 and 12:02 ET, `main` contained a `node_modules` symbolic link that I committed by accident. Anyone who pulled in that window had their `node_modules` folder replaced by a broken link. It is removed (`51dca0a`) and `.gitignore` now covers it. If typecheck or tests suddenly cannot find packages: pull, then run `npm ci`.
