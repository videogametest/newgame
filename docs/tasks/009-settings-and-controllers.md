# Task 009: settings, rebinding, and controllers

Design version 36: section 5 ("On a controller") and section 10 (Settings, Brightness, Controls). Words in `docs/writing/interface.md`, "Settings and controls".

The rules are built and tested in `src/core/settings/` (Claude's, read-only). This task is the screens and the wiring. It is in three steps, each its own PR, each shippable. Steps 1 and 2 can be done now. Step 3 waits for task 004, because there is no fight to tune a stick against until then.

## What is already there

| File | Gives you |
| --- | --- |
| `actions.ts` | `ACTIONS`, `defaultBindings`, `rebind`, `unbind`, `resetDevice`, `actionsDown`, `parseBindings`, `RESERVED`, `ESSENTIAL` |
| `labels.ts` | `inputLabel`, `promptFor`, `fillPrompt`, `padStyleOf` |
| `pad.ts` | `readPad`, `stick`, `deviceInUse`, `aimAssist` |
| `settings.ts` | `Settings`, `defaultSettings`, `parseSettings`, `serializeSettings`, `RANGES`, `brightnessCurve`, `SETTINGS_KEY` |

## Step 1: actions, not keys

1. Load settings once at start with `parseSettings(localStorage.getItem(SETTINGS_KEY))`. The existing sound settings stay where they are and are shown on the Sound page.
2. `src/render/input.ts` keeps a set of inputs that are down (`Key:<code>`, `Mouse:<button>`, and wheel ticks as one-frame inputs) and asks `actionsDown(bindings, down)`. Nothing in the game reads a key's code after this. Search for `KeyW`, `Space`, `code ===` and remove every one.
3. Every prompt and hint goes through `fillPrompt`. Rewrite the existing ones with braces.
4. Done when: a test binds `dodge` to another key and the hero dodges on it and not on Space; the default route plays exactly as before.

## Step 2: the pause menu, Settings, and Controls

1. Pause on the `pause` action. The simulation stops; the valley stays drawn behind, dimmed.
2. The six pages, built from one small set of parts: a slider (from `RANGES`), a switch, a choice. Each change is applied and saved at once.
3. **Brightness:** (status: built in 2c; dark figure and midnight prompt are open, see `docs/status.md`) apply `brightnessCurve` to the scene's image processing (exposure, and a lift of the darkest tones), never to the interface. The brightness picture is the tour's `hesper_door` view at midnight with a dark figure in the yard; show it once at first start (`display.brightnessSet`).
4. **Quality:** low, medium, high set shadow map size, scenery density, and how far the fine land streams. Say in `docs/status.md` what each one sets and the draw calls and frame time of each in the arrival view.
5. **Controls page** for keyboard and mouse: listen for the next key, mouse button, or wheel tick; call `rebind`; show its result in the words given. `Esc` cancels listening and is never bound.
6. Done when: frames of each page; a test that a damaged settings string still gives a playable game; brightness at 0.5, 1, and 1.5 as three frames of the same midnight view.

## Step 3: the controller (after task 004)

1. Poll `navigator.getGamepads()` each frame; use the first with `mapping === 'standard'`. Pass it to `readPad` with the controller settings. Feed `down` to `actionsDown` beside the keyboard's; feed `move` and `look` to the hero and camera; `draw` is the bow's draw.
2. `deviceInUse` each frame decides the prompts and whether the pointer shows. `padStyleOf(gamepad.id)` decides the names.
3. Every menu, the map, the inventory, and conversations work with stick or D-pad, `A`, `B`, and the bumpers.
4. `aimAssist` on the look while the bow is aimed, with the nearest enemy's offset from the crosshair. Never for the mouse.
5. The Controller settings page and the controller tab of Controls.
6. Vibration through `gamepad.vibrationActuator` where it exists, scaled by the setting.
7. A controller that is not standard: the Controls page still lets each action be bound by pressing a button.
8. Done when: the whole of tasks 003 and 004 can be played from start to finish without touching the keyboard, on one Xbox-style and one PlayStation-style controller, and the prompts are right on both. Say which controllers were used. If none can be tested here, say so plainly: Greg will test with his.

## Rules

- No setting may change what can be earned, the story, or the save.
- Nothing reads `localStorage` for settings except through `parseSettings`.
- If a rule seems to be missing from `src/core/settings/`, write it in `docs/status.md`; do not add it elsewhere.
