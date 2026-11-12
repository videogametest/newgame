# Stream G — dark people logic

Implements `GAME_DESIGN.md` v21 §§6, 9, 10 and the pure-logic subset of tasks 004/007.
No running-game imports. No rendering, audio, DOM, clock, random source, or save migration.
All exports operate on inputs and return new state/data.

## Integration contracts

- `PeopleWorld` is a projection of the existing shared `GameState`.
- Local IDs (`mill`, `forge`, `watch-house`, household IDs, `east-road-lanterns`,
  `inn`, `village-bell`, `tobin`, `ketch`) must be mapped by the coordinator to
  the world/content definitions when those streams are integrated.
- `HOUSEHOLDS` has sixteen one-window households with known member names and
  source references. Unnamed members remain in the source descriptions; no
  names or coordinates have been fabricated. `houseId` is an identity, not a
  placement. **TODO: house positions and unnamed member records, not in design.**
- Household `home` is window-enabled progress. `presentFromStart` separately
  records Hesper and Maren's physical presence. **QUESTION (§9): should Maren's
  presence be a separate shared saved field?** Her window trigger is the first
  place lantern, not merely arriving in Wick. This is a provisional local model.
- Trigger evaluation is one simultaneous pass. Call again after changes to allow
  neighbour thresholds to advance; there is no array-order cascade. Home flags
  persist on retaking: the miller flees *to Wick*, not away from the valley.
- Thresholds count homes, independent of time of day; actual lights are derived
  with caller-supplied `WindowHours`. **TODO (§9): exact dusk, dawn and small-hours
  cutoff are not in design. No shipped hour values are guessed.**
- Fairlow is a separate seventeenth light and cannot satisfy return thresholds.
  The caller supplies its finale flag. The `total` denominator stays sixteen.
- Recovery derives from the five §9 inputs. The weights are explicitly untuned
  placeholders. It is not a wounds/food meter. Retaking removes a place's contribution.
- `CompanionState` extends the existing shared squad fields without modifying
  `src/core/types`. It is serializable but not wired into `GameState`.
- Garrick's sold-hammer fallback takes an explicit fact because shared saved
  state does not record sold stolen goods. Recruiting costs no crowns and does
  not auto-change the party. Changing the party is allowed only at Hesper's/a
  campfire, capped at three including Bracken. Ketch and Tobin cannot both travel.
- Bond growth tuning is placeholder, not calibrated to "a few hours". The wish
  reaches stage three; travel alone cannot. **QUESTION (§6): bond decline rule
  not specified.** No decline mechanic is invented.
- **QUESTION (§5 vs companions writing):** Bram breaks guards in §5 but Breaker
  unlocks at bond two in the writing. The local intention follows the written
  gate pending resolution; it is not integrated with combat.
- **QUESTION (§6 vs companions writing):** "three perks ... always active" vs
  joining/bond-two/bond-three unlocks. Local data follows the explicit written
  unlocks pending resolution. Ketch has the same signature-trait ID and exact
  killed-Tobin/won-back eligibility, but **TODO (§6): Ketch's perks/wish are
  unspecified**; no inherited family wish or invented lines.
- `WRITING` imports the six required Markdown files as raw data, without edits.
  `writtenGroup` references exact IDs and quoted lines, omitting stage directions.
  `householdLine` references lighter households by their written headings/phases.
  Caller-authored `DialogueRule` data supplies state, stage, form and sequence
  conditions; no story triggers or spoken words are generated here. The selector
  returns updated history rather than changing it. `cycle` is deterministic,
  never consecutive repeats for multi-line groups, and exhausts the shoulder
  failures before repeating. `once` supports sold lines, `ordered` repeats last.
- Show uses found-item data, character-specific source labels, and the exact
  authored "Anything else" fallback. The hero never has a reply option.

## Deferred / shared requests

Coordinator-owned shared state needs companion joined/travelling/bond/wish fields,
and a way to persist sold stolen goods. Maren's presence model needs review.
Positions, complete unnamed-member records, clock boundaries, Ketch progression,
gear slots (not specified), companion XP formula/levelling, and bond decline are
not invented. Trait outputs and pair behaviours are declarations/intentions only:
combat cooldowns, target visibility/ranges, one-use revival counters, damage,
perk effects, movement, campfire scene scheduling, full dialogue trigger tables,
UI, Notes exclusion for wishes, save wiring and pacing all wait for integration.
