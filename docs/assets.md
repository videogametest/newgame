# Assets: survey (task 002, last step)

Status: survey read 2026-11-12; **awaiting review**. Task 003 does not start until the survey is reviewed and the must-have gaps have a decision. [survey, 2026-11-12]

Research only. Nothing was bought, authored, machine-generated, or downloaded into the repo. The full survey JSON is kept outside the repo; this file is generated from it.

## Counts

- **43 found**: licensed source inspected (format, scale or poly count noted).
- **20 found, needs check**: candidate exists; file, rig, clips or scale not verified.
- **23 gap**: no suitable source found.
- Total rows: 86. Must-have rows: 23.

## Must-have gaps: decision needed

The survey marks these seven as must-have gaps. For each, the survey recommends a fallback. None is selected yet; Greg chooses.

| id | For | Fallback rung | Recommendation (from survey) |
| --- | --- | --- | --- |
| `houses_16` | at least 16 distinguishable house silhouettes | 2 | Recommend assembling 16 modular variants with different footprints, heights and roof combinations; no set of 16 finished houses verified. Option, NOT an authoring decision. |
| `lightable_windows` | individually lightable house windows | 2 | Add separate emissive window quads or split pane triangles/materials. Inspected Kenney glass windows and KayKit home A/B are fused one-mesh/one-material, NOT ready independently lightable. |
| `fairlow_house` | Fairlow eaves/wren nests/finale window | 2 | Author a distinct Kenney modular house variant, nest cups under eaves, and independent finale emissive pane; do not light the entire shared atlas material. |
| `hesper_cottage` | Hesper's single lit window cottage | 2 | Author low cottage silhouette with exactly one separately emissive window pane using modular kit. |
| `forge_anvil` | usable smith's anvil | 2 | Build simple anvil from bevelled boxes/wedge in matching palette; Quaternius Fantasy Props is a CC0 candidate but exact anvil file and Standard tier availability were not verified. |
| `watch_house` | guard house with yard and bell tower | 2 | Recommend assembling stone/timber house + Castle Kit tower modules + fenced yard, banners and separately authored bell; not a complete ready-made Watch-house. |
| `lantern_hanging` | hanging/handheld lantern for Hesper | 2 | Adapt lantern head by separating/removing post, add hanging loop and emissive insert; no verified ready hanging lantern. |

Building options as the survey lists them (rung 2 is recommendation only; not approved):

- Rung 1, `hex`, found-needs-check, purchase USD 0: KayKit Hexagon as-is is the closest palette match, but only two house silhouettes (A height0.930, B1.280) and four recolours each; windows fused. RTS-scale blacksmith0.985, tavern1.397. Needs scaling ~5-7x, door/collision test; as-is does NOT meet 16 distinct silhouettes or independently lit windows. Legacy Builder's 10+ buildings are also RTS; dimensions unknown.
- Rung 2, `town`, recommendation_only, purchase USD 0: Author 16 houses plus Fairlow/Hesper variants from wall/roof/chimney modules, add separate emissive pane quads, preserve shared atlas. Measured door leaf0.75 high: ~3x architecture gives2.25 m door. Costs authoring time, not purchase. NOT approved/selected; parent will put choice to Greg. No authoring performed.
- Rung 1, `q_village`, found-needs-check, purchase USD 0: CC0 modular kit with both interiors/exteriors and doors/windows is plausible character-size candidate. Scale not measured; Standard exact pieces unknown. More detailed/textured than KayKit; art-direction and texture-weight check required. NOT a verified drop-in 16-house solution.

## Must-have rows found but needing checks

| id | For | Notes (from survey) |
| --- | --- | --- |
| `hesper` | older female scout-warden with cloak and lantern | Female modular base only. Older face/hair, scout cloak, lantern and rig compatibility must be authored/verified; not a finished Hesper. |
| `stane` | Captain Edric Stane, armoured officer, sword and shield | Use existing Knight with exclusive dark/metal palette, crest/pauldron and officer banner; same medium rig. Distinct officer variant not authored. |
| `bram` | companion with shield and sword | Knight base; unique round shield, uncrested helm and warm tabard separate him from Stane/guards. |
| `tamsin_sedge` | second bow companion | Ranger base; distinct scarf/hair/quiver/colour treatment needed, not just duplicate player. |
| `tobin_pike` | bandit-turned-ally companion | Rogue base with unique shoulder wrap, exposed face and ally sash; keep different from generic melee bandit. |
| `oona` | herbwife companion | Female base; herb basket, apron, hair and shawl not verified assets; retargeting and visual compatibility unresolved. |
| `garrick_aldric` | apprentice smith with two-handed hammer | Barbarian base plus apron and two-handed hammer; exact hammer file not verified. Existing Medium animations include two-handed combat/tool hammering. |
| `sheep` | grazing flock, must-have | Original CC0 licence read. Verified existing conversion: https://threejs.org/manual/examples/resources/models/animals/Sheep.gltf (244038 bytes) + Sheep.bin (394584 bytes). 1 skin; WalkSlow/Death/Jump/Walk/Idle. 612 triangles. No texture files. Raw mesh/rig scene oversized; set world shoulder ~0.8 m after runtime bounds. Third-party conversion provenance points to Quaternius farm example; retain original licence evidence. |
| `geese` | honking/waddling geese, must-have | Rigged only confirmed; 813 kB listed. No honk/walk animation clips confirmed. Export to glTF legally allowed; animate if absent. Do NOT substitute duck silently. |
| `wolves` | packs of three, fear fire | Original CC0 and 3 MB filename verified; 12+ animations advertised. Quota blocked download, so exact clips and scale unverified. Instantiate shared mesh/rig clone for 3 wolves; fire fear is code. |

## Licences

Every row names its pack. Whether each licence was read in a licence file, or only on the pack page:

| Pack | Licence wording (exact, from survey) | Basis |
| --- | --- | --- |
| KayKit Medieval Hexagon Pack 1.0 | License: (Creative Commons Zero, CC0) | page only (no licence file read) |
| KayKit Medieval Builder Pack 1.0 (Legacy) | Yes, all included game assets are public domain (Creative Commons Zero) licensed. | page only (no licence file read) |
| Kenney Fantasy Town Kit 2.0 | License: (Creative Commons Zero, CC0) | licence file read |
| Kenney Nature Kit 2.1 | License: (Creative Commons Zero, CC0) | licence file read |
| Kenney Castle Kit 2.0 | License: (Creative Commons Zero, CC0) | licence file read |
| Kenney Cube Pets 1.0 | License: (Creative Commons Zero, CC0) | licence file read |
| KayKit Character Pack: Adventurers 2.0 | Free for personal and commercial use, no attribution required. (CC0 Licensed) | page only (no licence file read) |
| KayKit Character Animations 1.1 | Free for personal and commercial use, no attribution required. (CC0 Licensed) | page only (no licence file read) |
| KayKit Dungeon Remastered 1.0 | License: (Creative Commons Zero, CC0) | page only (no licence file read) |
| Quaternius Medieval Village MegaKit | Free to use in personal, educational and commercial projects. (CC0 License) | page only (no licence file read) |
| Quaternius Fantasy Props MegaKit | Free to use in personal, educational and commercial projects. (CC0 License) | page only (no licence file read) |
| Quaternius Ultimate Animated Animal Pack | License CC0 | page only (no licence file read) |
| Quaternius Farm Animals Pack | CC0 1.0 Universal (CC0 1.0) Public Domain Dedication | licence file read |
| Quaternius 5 Low Poly Animals | License(s): CC0 | page only (no licence file read) |
| Quaternius Ultimate Modular Women Pack | License CC0 | page only (no licence file read) |
| Quaternius Ultimate Modular Men Pack | License CC0 | page only (no licence file read) |
| Plewr 3D Goose | License type: CC0 | page only (no licence file read) |
| tevy Hooded Crow v1 | License CC0 1.0 | page only (no licence file read) |
| KayKit Forest Nature Pack | Free for personal and commercial use, no attribution required. (CC0 Licensed) | page only (no licence file read) |

Sheep: the original Quaternius Farm Animals CC0 licence was read. The glTF the survey verified is a third-party conversion from threejs.org (provenance: Quaternius farm example). Keep the original licence evidence with the file.

Crow: CC0 on the author page, but the creation method is not disclosed. The survey asks for a provenance and art-fit check before adoption, and approval if the origin is generative.

## Excluded (not used)

- https://models.codelove.in/models/bird-goose-grey-01/: Search result explicitly says MIT, not CC0; rejected.
- https://www.cgtrader.com/3d-models/animal/bird/animated-white-goose-lowpoly-art-style: Royalty Free License, not CC0; rejected even if inexpensive.
- https://1camou.itch.io/cozy-farm-blockimagine: Own indexed text states generated using BlockImagine AI; no adoption/approval.
- https://gobkit.itch.io/gobkit-free-animal-pack-vol-2: CC0 claimed by creator, but generative provenance/approval not resolved; no adoption. No machine-generated models commissioned.
- https://poly.pizza/m/mKev485XTR: HTTP403 Cloudflare on direct request; no licence from third-party search accepted as confirmation. Rabbit supplied instead by inspected Kenney original licence.
- https://sketchfab.com: Search returned collections, not a verified CC0 item page for missing species; no Sketchfab assets selected.

## Money

- Purchased: False. Approval required: True. Recommended purchase: USD 0.
- Optional paid packs (prices from the pack pages):
  - KayKit Medieval Hexagon EXTRA: USD 9.99 (CC0 confirmed on pack page). 150+ extra buildings/vehicles/units/horses. Contents/scale NOT verified; does not automatically solve 16 houses or playable windows.
  - KayKit Adventurers EXTRA 2.0: USD 7.95 (CC0 confirmed on pack page). Engineer, Druid, larger Barbarian, alternate textures; not ready Hesper/Oona.
  - Quaternius Medieval Village MegaKit Pro: USD 9.99 (Creative Commons Zero v1.0 Universal). More modules, 291 MB author archive. SOURCE $14.99/675 MB. First-load must be selected/optimized GLBs only.
  - Quaternius Fantasy Props MegaKit Pro: USD 9.99 (Creative Commons Zero v1.0 Universal). More variants/collisions, 249 MB. SOURCE $14.99/545 MB.
  - KayKit Forest Nature EXTRA: USD 9.99 (CC0 confirmed on pack page). More trees/rocks/modular terrain; 81 MB. SOURCE $14.99/94 MB.
- All five optional tiers together: USD 47.91 before tax. Prices read from own pack pages on survey date, optional alternatives not shopping list. All five optional EXTRA/Pro tiers total47.91 USD before any tax; do NOT buy without Greg. Most are unnecessary if free modular approach approved.

## Download and runtime budget

- First-load target (survey value): 25,000,000 bytes.
- Measured Kenney runtime models and atlases: 8,686,129 bytes; with sheep and crow: 9,413,855 bytes.
- Survey estimate: adding wolf and deer brings it to about 15.5 MB, before the existing hero and NPCs, selected animations, the converted bird, engine, audio and decoders. Under 25 MB is feasible but **not established**.
- Downloaded ZIPs are research packages, not the first-load payload. Do not ship every animal or recolour.

Survey budget notes: Measured downloaded ZIPs are editor/research packages, NOT first-load payload. Four Kenney native model directories+their atlases total8,686,129 bytes (town2,508,543; nature3,034,380; castle2,088,401; pets1,054,805). Add sheep638,622 and crow89,104 =9,413,855 bytes. Add only Wolf+Deer (~6.1MB) =>~15.51MB BEFORE existing hero/NPCs/selected animations, converted bird/goose, engine, audio and decoders. Therefore under25MB is feasible but NOT established. Deferred Fox3MB, Stag3.1MB, Husky2.9MB, Horse3.4MB; don't ship every animal or recolour. Shared character meshes/material variants and selective Rig_Medium clips are required. Do not count chest twice. Current full candidate set has unknown totals due uninspected packs and conversions; no fabricated total.

## Download failures and what was not verified

- Kenney direct requests returned403; remote browser successfully read pack-specific CC0 declarations. Browser download helper only permits /work, refused scratch /tmp; captured legitimate free download URLs then requests still403. Instead fetched author's OGA archives into scratch and read their own License.txt. Quaternius initial guessed farmanimals.html/animatedanimals.html404 corrected via official catalogue to farmanimal.html/ultimateanimatedanimals.html. Six Ultimate Animal individual downloads returned200 HTML 'Google Drive - Quota exceeded', NOT models; saved .gltf scratch placeholders are HTML and MUST NOT be used. Actual glTF filenames/sizes are from original Drive listing. Official KayKit organization endpoint404 corrected to public user endpoint; source assets inspected only, no clone. Sheep .glb404; verified .gltf+.bin conversion works. Character2.0 exact files and all conversions remain unmeasured.

## Full list

Licence column is the pack id (see Licences above). Must = must-have.

| id | For | Source | Format | Status | Must | Scale | Poly | Bytes | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ground_grass` | grass and walkable ground tiles | nature | GLB | found |  | ok at 1.8 m hero | 2 | 1576 | 1x1 unit flat tile; terrain shaping/UV variation still needed. |
| `trees_deciduous` | valley woodland | nature | GLB | found |  | needs scaling | 114 | 9428 | Measured height 1.708; ~4-6x for mature trees. |
| `trees_conifer` | conifer woodland | nature | GLB | found |  | needs scaling | 230 | 17220 | Measured height 1.546; ~4-6x for mature trees. |
| `trees_dead` | dead trees | nature | GLB | gap |  | unknown | — | — | Remove canopy from licensed tree parts or assemble bare trunk/branch shapes; no dedicated dead-tree filename found. |
| `bushes` | hedgerows and undergrowth | nature | GLB | found |  | needs scaling | 32 | 4396 | Height 0.244; ~2-4x by bush size. |
| `tall_grass` | wild grass clusters | nature | GLB | found |  | needs scaling | 224 | 18504 | Height 0.254; enlarge to ~0.6-0.9 m and instance. |
| `rocks` | scattered rock cover | nature | GLB | found |  | needs scaling | 80 | 7552 | — |
| `cliffs` | valley cliffs | nature | GLB | found |  | needs scaling | 12 | 2776 | Modular 1-unit cliff grid; scale independently of houses. |
| `reeds` | lake reeds | — | — | gap |  | unknown | — | — | Build clustered stems and seed-heads from simple shapes in matching colours; inspected pack has generic plants but no confirmed reeds. |
| `flowers` | colour in meadows | nature | GLB | found |  | ok at 1.8 m hero | 76 | 7104 | 0.293 m tall; purple/yellow variants also present. |
| `lake_shore` | shoreline edge | nature | GLB | found |  | needs scaling | 34 | 4544 | River-side tile can form shore; adapt or blend with terrain, not a whole lake. |
| `water_surface` | lake water | nature | GLB | found |  | needs scaling | 128 | 9120 | Static water geometry; add Babylon water material/ripples. Not animated water out of box. |
| `waterfall` | falling water at cliff | nature | GLB | found |  | needs scaling | 34 | 4488 | 34 triangles; static cliff/water strip, animate UVs/foam in engine. |
| `cave_mouth` | secret cave entrance | nature | GLB | found |  | needs scaling | 64 | 5480 | 1-unit cliff-face opening; enlarge for 1.8 m hero; cave tunnel not included. |
| `hills` | valley slopes | castle | GLB | found |  | needs scaling | 116 | 12732 | 1x1 footprint and 0.288 high; broad valley terrain should be sculpted/heightfield. |
| `houses_16` | at least 16 distinguishable house silhouettes | town | GLB | gap | Must | unknown | — | — | Recommend assembling 16 modular variants with different footprints, heights and roof combinations; no set of 16 finished houses verified. Option, NOT an authoring decision. |
| `lightable_windows` | individually lightable house windows | town | GLB | gap | Must | unknown | — | — | Add separate emissive window quads or split pane triangles/materials. Inspected Kenney glass windows and KayKit home A/B are fused one-mesh/one-material, NOT ready independently lightable. |
| `fairlow_house` | Fairlow eaves/wren nests/finale window | town | GLB | gap | Must | unknown | — | — | Author a distinct Kenney modular house variant, nest cups under eaves, and independent finale emissive pane; do not light the entire shared atlas material. |
| `hesper_cottage` | Hesper's single lit window cottage | town | GLB | gap | Must | unknown | — | — | Author low cottage silhouette with exactly one separately emissive window pane using modular kit. |
| `mill` | watermill with independently rotating wheel | hex | glTF | found | Must | needs scaling | 1921 | 116571 | Confirmed separate node building_watermill_wheel_blue at [0,0.245004,-0.054987], wheel centred at its pivot; rotate local Z. Building top 1.218 units, base -0.350; ~5-7x architecture starting point, verify door. No baked animation required. |
| `forge` | smithy exterior and chimney | hex | glTF | found | Must | needs scaling | 2410 | 126139 | Height 0.985 units; RTS exterior. Scale ~5-7x and check door/smith interaction. Single mesh; presence and usefulness of a separate anvil NOT confirmed, covered by forge_anvil gap. |
| `forge_anvil` | usable smith's anvil | q_props | — | gap | Must | unknown | — | — | Build simple anvil from bevelled boxes/wedge in matching palette; Quaternius Fantasy Props is a CC0 candidate but exact anvil file and Standard tier availability were not verified. |
| `watch_house` | guard house with yard and bell tower | castle | GLB | gap | Must | unknown | — | — | Recommend assembling stone/timber house + Castle Kit tower modules + fenced yard, banners and separately authored bell; not a complete ready-made Watch-house. |
| `well` | village well | hex | glTF | found |  | needs scaling | 726 | 45423 | 0.826 units high; enlarge separately to desired well roof height. |
| `fence_straight` | yard and field straight fences | nature | GLB | found |  | needs scaling | 64 | 5712 | — |
| `fence_corner` | yard and field fence corners | nature | GLB | found |  | needs scaling | 116 | 8644 | — |
| `cart` | empty transport cart | town | GLB | found |  | needs scaling | 608 | 52920 | 608 triangles; wheel attachment/steering not inspected. |
| `cart_half_loaded` | story half-loaded cart | town | GLB | gap |  | unknown | — | — | Combine cart.glb with 2-3 instanced crates, sack or logs occupying half its bed. |
| `lantern_standing` | path lanterns | town | GLB | found | Must | needs scaling | 158 | 14984 | 1.556-unit standing post; set ~1.5x for 2.33 m post. No emissive material in file; add local emissive insert/light, not whole atlas. |
| `lantern_hanging` | hanging/handheld lantern for Hesper | town | GLB | gap | Must | unknown | — | — | Adapt lantern head by separating/removing post, add hanging loop and emissive insert; no verified ready hanging lantern. |
| `banners` | Stane's banners | dungeon | GLB | found | Must | needs scaling | 110 | 25164 | 110 triangles; current cloth 3.196 units high; scale down as needed. Clone material/retint for Stane heraldry; no cloth animation. |
| `alarm_bell` | village alarm and Watch-house bell | — | — | gap |  | unknown | — | — | Build low-poly lathed bell + clapper + timber bracket and animate separate pivot; no confirmed CC0 ready bell. |
| `campfire_ring` | campsites and fire safety ring | nature | GLB | found |  | needs scaling | 264 | 17344 | 0.54 m across native; enlarge ~2x, add fire particles. |
| `campfire_logs` | logs within campfire | nature | GLB | found |  | needs scaling | 112 | 9284 | — |
| `cooking_pot` | cooking pot over fire | nature | GLB | gap |  | unknown | — | — | Adapt pot_large.glb with hoop handle and crossbar, or verify a cauldron in CC0 Fantasy Props before use. |
| `chest_closed` | closed loot chest | dungeon | GLB | found |  | needs scaling | 728 | 81412 | Separate chest_lid node with pivot; no baked clip. Set closed lid rotation, ~0.6-0.8x. |
| `chest_open` | open loot chest | dungeon | GLB | found |  | needs scaling | 728 | 81412 | Same 81412-byte asset, rotate chest_lid locally. Do not count download twice. |
| `crates` | cargo and breakable crates | dungeon | GLB | found |  | ok at 1.8 m hero | 188 | 28692 | 1-unit crate; break logic/debris authored, not supplied. |
| `barrels` | breakable barrels | dungeon | GLB | found |  | needs scaling | 561 | 44292 | Height 2 units; scale ~0.45x for 0.9 m barrel. Break logic authored. |
| `pots_breakable` | pots and breakables | nature | GLB | found |  | ok at 1.8 m hero | 72 | 7004 | Height 0.268; destruction/debris authored. |
| `signposts` | route signs | nature | GLB | found |  | needs scaling | 44 | 5040 | 0.409 high; ~3-4x for readable signs. |
| `fence_posts` | standalone posts | town | GLB | found |  | needs scaling | 44 | 5312 | 44 triangles; standalone pillar substitute. |
| `helmet` | story helmet | adventurers | — | gap |  | unknown | — | — | Separate/duplicate an existing Knight helmet if available in current rig; otherwise build low-poly bowl/visor. No standalone helmet filename verified. |
| `boot` | story lost boot | adventurers | — | gap |  | unknown | — | — | Duplicate/separate a boot from existing character or build a low-poly boot; standalone prop not verified. |
| `relay_brazier` | hill relay fire | — | — | gap |  | unknown | — | — | Build tripod/post plus metal bowl and fire particles from matching simple shapes. |
| `archery_targets` | archery training and bow interaction | hex | glTF | found |  | needs scaling | 156 | 10128 | Height 0.302; scale ~4-5x for a human training target. |
| `carved_tree` | tree with carved initials | nature | GLB | gap |  | unknown | — | — | Use tree_default.glb and add authored initials decal/mesh on bark; no premade story-specific carving. |
| `beehives` | village bees and honey | — | — | gap |  | unknown | — | — | Build stacked hive boxes with entrance slit or straw skep from simple shapes; generated models not recommended. |
| `fruit_trees` | orchard trees | nature | GLB | gap |  | unknown | — | — | Add small fruit spheres to tree_default.glb as matching-material instances; no verified fruit-tree asset selected. |
| `market_stall` | optional tavern/market stall | town | GLB | found |  | needs scaling | 106 | 11500 | 106 triangles; attach cloth/material variant or combine with tavern shell. |
| `tavern` | optional village tavern | hex | glTF | found |  | needs scaling | 2992 | 173941 | Height 1.397 units; scale up; exterior only. |
| `church` | optional church | hex | glTF | found |  | needs scaling | 1601 | 92825 | Height 1.645 units; scale up; integrated window/material limitations. |
| `signal_beacon` | distant region signal | — | — | gap |  | unknown | — | — | Build timber log tower or reuse brazier with large fire/VFX; no verified ready signal beacon. |
| `hero` | hooded player archer | adventurers | glTF | found | Must | ok at 1.8 m hero | — | — | Existing Ranger from assignment; not re-downloaded. Current page confirms rig/animations. Exact local filename and byte size not inspected. |
| `hesper` | older female scout-warden with cloak and lantern | q_women | FBX | found-needs-check | Must | unknown | — | — | Female modular base only. Older face/hair, scout cloak, lantern and rig compatibility must be authored/verified; not a finished Hesper. |
| `stane` | Captain Edric Stane, armoured officer, sword and shield | adventurers | glTF | found-needs-check | Must | ok at 1.8 m hero | — | — | Use existing Knight with exclusive dark/metal palette, crest/pauldron and officer banner; same medium rig. Distinct officer variant not authored. |
| `villagers` | several distinct village NPCs | q_men | FBX | found-needs-check |  | unknown | — | — | 11 modular men plus q_women's 10 women are candidate bases. Remove modern outfits; verify medieval parts, formats, rig retargeting and scale. |
| `soldiers_guards` | Stane's soldiers and patrols | adventurers | glTF | found-needs-check |  | ok at 1.8 m hero | — | — | Existing Knight variants with matching faction palette/shields; no new finished guard variants inspected. |
| `bandit_melee` | melee bandit enemy | adventurers | glTF | found-needs-check |  | ok at 1.8 m hero | — | — | Rogue/Barbarian variant plus sword/axe; distinguish from Tobin and Garrick with masks/palette. |
| `bandit_archer` | ranged bandit enemy | adventurers | glTF | found-needs-check |  | ok at 1.8 m hero | — | — | Ranger/Rogue variant plus bow/quiver; avoid identical player silhouette/palette. |
| `bram` | companion with shield and sword | adventurers | glTF | found-needs-check | Must | ok at 1.8 m hero | — | — | Knight base; unique round shield, uncrested helm and warm tabard separate him from Stane/guards. |
| `tamsin_sedge` | second bow companion | adventurers | glTF | found-needs-check | Must | ok at 1.8 m hero | — | — | Ranger base; distinct scarf/hair/quiver/colour treatment needed, not just duplicate player. |
| `tobin_pike` | bandit-turned-ally companion | adventurers | glTF | found-needs-check | Must | ok at 1.8 m hero | — | — | Rogue base with unique shoulder wrap, exposed face and ally sash; keep different from generic melee bandit. |
| `oona` | herbwife companion | q_women | FBX | found-needs-check | Must | unknown | — | — | Female base; herb basket, apron, hair and shawl not verified assets; retargeting and visual compatibility unresolved. |
| `garrick_aldric` | apprentice smith with two-handed hammer | adventurers | glTF | found-needs-check | Must | ok at 1.8 m hero | — | — | Barbarian base plus apron and two-handed hammer; exact hammer file not verified. Existing Medium animations include two-handed combat/tool hammering. |
| `bracken` | sixth companion, sheepdog | pets | GLB | found | Must | needs scaling | 435 | 62140 | Cube dog fallback (walk/run node clips). Scale to ~0.55-0.65 m shoulder and recolour sheepdog; no herding-specific clip. More KayKit-like Husky.gltf in q_animals is ~2.9 MB, scale/download quota unresolved. |
| `songbirds` | fluttering songbirds and wrens | q_five | FBX | found-needs-check |  | unknown | — | 221564 | Original animated bird confirmed; exact flight/takeoff clip set and scale not inspected. Convert from FBX/Blend; tint for wrens. 221564-byte FBX, not runtime GLB size. |
| `rabbits` | scatter and hop rabbits | pets | GLB | found |  | needs scaling | 425 | 62720 | Static/walk/run node animation, no explicit hop. Scale down strongly (~0.2-0.3 initial trial); add root hop motion. Blocky substitute, not a realistic rabbit. |
| `deer` | scatter and huntable deer | q_animals | glTF | found-needs-check |  | unknown | — | 3100000 | Listed 3.1 MB in original download folder. 12+ animation pack; scale and exact clips not inspected due download quota. |
| `sheep` | grazing flock, must-have | q_farm | glTF (conversion available) | found-needs-check | Must | needs scaling | 612 | 638622 | Original CC0 licence read. Verified existing conversion: https://threejs.org/manual/examples/resources/models/animals/Sheep.gltf (244038 bytes) + Sheep.bin (394584 bytes). 1 skin; WalkSlow/Death/Jump/Walk/Idle. 612 triangles. No texture files. Raw mesh/rig scene oversized; set world shoulder ~0.8 m after runtime bounds. Third-party conversion provenance points to Quaternius farm example; retain original licence evidence. |
| `chickens` | farmyard chickens | pets | GLB | found |  | needs scaling | 360 | 55892 | Chick substitute with static/walk/run; no adult hen/peck clip. Alternative original q_five Chick.fbx 123116 bytes; CDmir animated chicken is CC0 but not chosen/inspected. |
| `cat` | cat in lit windows | pets | GLB | found |  | needs scaling | 595 | 84188 | Static/walk/run, no sit clip. Repose node hierarchy or author sitting pose; cube-style substitute. Scale to ~0.3 m shoulder. |
| `geese` | honking/waddling geese, must-have | goose | Blend | found-needs-check | Must | unknown | — | 813000 | Rigged only confirmed; 813 kB listed. No honk/walk animation clips confirmed. Export to glTF legally allowed; animate if absent. Do NOT substitute duck silently. |
| `fox` | fox leading toward secrets | q_animals | glTF | found-needs-check |  | unknown | — | 3000000 | 3 MB original folder listing; animations advertised at pack level; scale and clips uninspected due download quota. |
| `boar` | telegraphed charging boar | pets | GLB | found |  | needs scaling | 512 | 70240 | Blocky tusked hog substitute, static/walk/run only; charge telegraph/stomp and attack behavior require authored motion/code. |
| `wolves` | packs of three, fear fire | q_animals | glTF | found-needs-check | Must | unknown | — | 3000000 | Original CC0 and 3 MB filename verified; 12+ animations advertised. Quota blocked download, so exact clips and scale unverified. Instantiate shared mesh/rig clone for 3 wolves; fire fear is code. |
| `owls` | night owls | q_five | FBX | gap |  | unknown | — | — | Substitute a recoloured generic CC0 bird with enlarged eye/head shapes and authored perch/flight, or defer night-owl sighting. No approved non-generated animated owl selected. |
| `crows` | circling enemy areas | crow | GLB | found-needs-check |  | ok at 1.8 m hero | 900 | 89104 | Verified file 89104 bytes; 900 tris, 1 skin, idle/fly/peck. Metre-scale metadata. Needs Babylon meshopt/KTX2 decoder test and provenance/art-fit check; not adopted. |
| `bees` | bees around hives | — | — | gap |  | unknown | — | — | Build tiny striped low-poly body plus two animated wings and instancing; no model selected. Gobkit alternative not selected: provenance/approval unresolved. |
| `butterflies` | ambient meadow butterflies | — | — | gap |  | unknown | — | — | Build 2-4 wing planes on a pivot and flap; authored matching-material shapes, not machine-generated. |
| `fireflies` | night fireflies | — | — | gap |  | unknown | — | — | Use Babylon particle sprites/points with authored glow; no 3D model needed. |
| `fish` | lake fish | pets | GLB | found |  | needs scaling | 280 | 38436 | Static/walk/run node clips; swimming behavior/path in engine. Small cube fish substitute. Alternative q_five Fish.fbx is animated and 101212 bytes. |
| `white_stag` | rare white stag | q_animals | glTF | found-needs-check |  | unknown | — | 3100000 | 3.1 MB original folder listing; recolour licensed stag to white. Not a second required download if same stag mesh reused; scale unverified. |
| `cow` | farm cow | pets | GLB | found |  | needs scaling | 526 | 58540 | Cube fallback with static/walk/run. More organic native Cow.gltf in q_animals (~3 MB) also CC0 but unmeasured. |
| `pig` | farm pig | pets | GLB | found |  | needs scaling | 366 | 56760 | Static/walk/run node clips; species-specific scale. Original q_farm Pig.fbx also CC0 and 360156 bytes. |
| `horse` | region 2 arrival, deferrable | q_animals | glTF | found-needs-check |  | unknown | — | 3400000 | Each 3.4 MB listed; defer first-load. No rigged rider attachment verified. q_farm Horse.fbx 1023564 bytes is another animated CC0 option. |

Survey last read: 2026-11-12. [survey, 2026-11-12]

## Review 002 changes (task 002b)

Applied from `docs/reviews/002-asset-survey.md`, "Changes wanted in the survey":

1. **Scale screenshots produced.** Style test at `?styletest=1`. Captures in `docs/pr-media/styletest/` (row, quarter view, each item, people, night). Items: three houses, watermill, forge, well, watch-house, scenery.
2. **Villagers and bandits marked must-have.** Counts still needed: about 35 villagers and 27 named bandits (`docs/writing/households.md`, `docs/writing/bandits.md`). Not yet sourced; see blocked list.
3. **Rows for the newly named items** (stolen goods, slate, supper table, logbook, letter, fisher's boat, marker stones, hives, shuttle): not sourced in this PR. Still open for task 003 planning.
4. **Licences:** the Kenney Fantasy Town licence is copied into `public/assets/kenney_fantasy_town/LICENSE.txt` (CC0). KayKit Adventurers licence already in its folder.
5. **Kits side by side:** Kenney Fantasy Town (houses, mill, scenery) and KayKit Adventurers (people) are in the style test on one palette. Kenney Castle and KayKit Hexagon are not in the test (see blocked list).

## Stand-ins used in the style test (labelled in the scene)

- **Forge:** Kenney stand-in (no Hexagon forge model available).
- **Well:** Kenney fountain used as a stand-in.
- **Watch-house tower:** stand-in from stacked Kenney corner modules; no tower module in Kenney Fantasy Town.
- **Ground:** 70 × 36 m, longer than the 40 m in the brief, because the row runs longer.

## Blocked (not downloaded or not found)

- **KayKit Medieval Hexagon (free):** the itch.io free route returned 0 bytes twice. No paid option clicked. Greg to download by hand if wanted.
- **Quaternius Medieval Village and its people:** download quota.
- **Wolves, deer, fox, stag, horse:** Quaternius quota.
- **Castle Kit:** not downloaded.
- **Sheep and goose:** no CC0 model found in the survey sources. Goose is a code-animated candidate per review 002.
- **Mixed people group:** blocked with the Quaternius quota.
- **Tall grass:** no Kenney model; not in the style test.
- **Stylised villager set:** the bounded search for a CC0 stylised villager set (required before group 6) has **not been done** in this PR. Not searched yet; Viktor will run it and log the result before group 6.
