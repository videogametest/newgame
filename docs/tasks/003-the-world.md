# 003: The world (milestone 3)

Status: open

## Goal

Build Tallowmere as a place worth walking through, with nobody to fight yet. Scoped in `GAME_DESIGN.md` section 8, milestone 3. Follow section 4 for the world, section 5 (Views) for the cameras, section 9 for names and the village, section 10 for menus, and section 7 for architecture.

This task is judged on how the world looks and feels. Greg does not look at it until Claude has reviewed the screenshots against the first-look bar below.

## Build in two steps

Open a PR, merge, and deploy after each step, and log each in `docs/status.md` as "not ready for first look" until the bar is met.

### Step 1: Ground, sky, and movement

- Seeded terrain with a pure `heightAt(x, z)` in `src/core`, about 800 m across, shaped to give a central lake, a river with a waterfall, hills, a ridge, and the signal hill as the highest point.
- **Land that hides things** (section 4). Shape and place hills, ridges, and tree stands so that Wick cannot be seen whole from the start, no enemy place is visible from Wick, and each of the ten secret places is hidden from the nearest path by a rise or by trees. Every rise between two places can be crossed or walked round. Tour mode captures one frame from each of five viewpoints showing something half-hidden ahead.
- Chunked terrain around the hero, with no visible pop-in at walking speed.
- Sky, a moving sun with shadows, the day-night cycle, a moon and stars, distance haze.
- The hero walks, sprints, and crouches across the valley, standing on the terrain.
- The first-person toggle on `V` as specified in section 5 (Views), including the visible bow and short blade and the sidestep.
- The pause menu and settings from section 10, with "Copy debug report" in the pause menu.
- The prototype arena stays reachable behind a URL flag until task 004 removes it, so combat is not lost in the meantime.

### Step 2: A living place

- Scenery scattered by biome using instancing: at least three kinds of tree, bushes, rocks, fallen logs, grass, and flowers in clumps. Forest, open field, lakeshore, and hillside should each look different.
- Water with an animated surface for the lake, river, and waterfall.
- A natural boundary of cliffs, dense forest, and water. No invisible walls in open ground.
- Horizon landmarks, above all the castle with its dark beacon, placed so the castle is visible from the signal hill and completely hidden from where the patrol hut will stand beyond the ridge.
- Wick beside the lake in its abandoned starting state: at least eight buildings, a well or square, a road, fences, boarded windows, an overturned cart, weeds, empty fields, and Hesper's house with its one lit window, visible across the valley at night. The Fairlow house, dark and boarded, and the family marker stones along the road in.
- Paths leading out of Wick toward where the Mill, the Forge, and the Watch-house will be. Leave those sites as recognisable buildings with no people.
- Wind in grass and foliage, drifting clouds, butterflies by day, fireflies at dusk and night.
- Ambient wildlife from section 4: songbirds, rabbits, and deer that scatter, owls at night, bees at the orchard site, fish in the lake.
- Ambient sound by area and time of day, and footsteps by surface.
- The music system from section 4 (Music): scores as note data played through sampled instruments, with support for synchronised stems as an alternative. Play Wick's theme and the calm exploration music from `docs/writing/melody.md`, layer 1 only at this stage, sparse and quiet, with long silences. Add music volume to settings.
- The hero starts at the valley's edge at dusk, facing the lit window.
- Tour mode (`?tour=1`).

## The first-look bar

**Lighting, carried over from the style test (review 007).** These three failed there and are settled here, in the real world, before anything else in the bar is judged:

- **Dusk lights things, not only the sky.** A low warm sun, long shadows, and walls, ground, and faces that take the colour. The ground is never near-black while the sky is bright.
- **Window light is warm.** Pools of light under lit windows and doors are amber, never white or grey, and fall where the window faces.
- **Windows are lit at the right hours.** Dark at 18, lit from 19, per section 5, "The clock". Hesper's is lit in every dusk and night frame.

Richness comes before breadth: if time is short, make a smaller area dense rather than the whole valley thin.

- **The arrival view is composed by hand, not left to chance.** Standing at the start at dusk, the player sees in one frame: the path ahead, Hesper's lit window as the brightest point, the village around it, tall grass moving in the foreground, trees framing the sides, and the castle on the horizon behind. Place terrain and scenery deliberately to make this view work, in both camera views.
- **Lighting and image quality:** soft shadows, ambient occlusion, tone mapping, gentle bloom on lit windows and fires, distance haze, and a colour grade that keeps the image warm. Night is dark blue, not black, and lit things glow against it.
- **Density:** no patch of bare ground larger than a few metres anywhere the player can walk.
- **The village reads as a village** and as abandoned, at a glance.
- **Sound** is present from the first second, and the melody is heard, quietly, on the walk toward the lit window.
- **Evidence:** tour-mode screenshots of the arrival view at dusk in both camera views, the village at noon and at night, a forest view, a field view, the lake, the waterfall, and the view from the signal hill, plus the measured frame rate and draw calls for each.

## Rules

- Build only from what the reviewed `docs/assets.md` lists, and keep it up to date. Follow section 7 (Assets): CC0 confirmed at the source, one shared palette, scale corrected to the characters, the fallback ladder for gaps, and a stop for any must-have.
- Use only original or CC0 audio and art. Do not imitate characters, symbols, or melodies from any existing game.
- Use the names in section 9 everywhere, and keep them in data.
- Use everything in `docs/writing/` exactly as written. See `docs/writing/README.md`. The pause menu, settings, and prompts use the words in `docs/writing/interface.md`.
- Meet the performance budgets in section 7 and report the measured numbers after each step.

## Done when

- Both steps are merged and deployed, and `docs/status.md` says the evidence is ready for review against the first-look bar.
- Wait for Claude's review before starting task 004. If the review asks for changes, make them first.
