# Stream F2: items and money (Claude)

Implements `GAME_DESIGN.md` section 6 (Loot, Gathering, Crafting, Carrying, Money and trade) and the inventory, loot, storage, trade, and rebuilding rules of section 10. Pure logic, shipped dark. `src/core/economy/` is the other half.

## What is here

| File | What it decides |
| --- | --- |
| `data.ts` | Every item. Names and descriptions are from `docs/writing/items.md`. |
| `inventory.ts` | Piles, weight, the carry limit, the chest, the tabs, sorting, dropping, names such as "Fine iron blade". |
| `loot.ts` | What can be taken from whom, when a strongbox opens, the loot window, gathering spots. |
| `stolen.ts` | Returning a stolen thing, or what became of it. |
| `recipes.ts` | Recipes, crafting, upgrades, and the Field Fletcher, Night Stew, and Maker's Mark perks. |
| `../economy/purse.ts` | Crowns carried and stored, falling, daily income, the tax, the purse bands. |
| `../economy/trade.ts` | Prices, traders' shelves, buying and selling. |
| `../economy/projects.ts` | The seven projects for Wick. |

## Wiring it in (task 006)

- Every function returns new state. Nothing here changes what it was given.
- Crafting and upgrading return an `ExperienceEvent`. Pass it to `awardSharedEvent` in `src/core/progression`. Nothing here grants experience.
- `CraftContext.perks` is the mastery rank of each **equipped** perk.
- Selling a stolen thing adds it to `InventoryState.soldStolen`. The people stream reads that for sold lines and for Garrick's fallback.
- `returnStolen` gives the household id to add to `GameState.stolenGoodsReturned`.
- `Market.recovery` is the people stream's derived recovery level, 0 to 1.
- Income is paid into the chest each morning by `collectIncome`.

## Not here

- Perk effects that belong to other systems: Sound Shafts and Second Quiver (the quiver, stream E), Trail Food (eating and healing, task 006 wiring).
- Eating: healing over seconds and interruption need the fight loop.
- Furnishings for the Fairlow house: not written yet.
- All numbers are untuned. Task 006 tunes them against the purse bands.
