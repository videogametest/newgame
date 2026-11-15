# Mill awareness and alarm, item 16

Three captures at medium quality, 1280x720. World and DOM marker screenshots, no canvas fallback. No visual judgement or further retake.

| State | Hour | Stable chunks | Draw calls | Markers in viewport |
| --- | --- | --- | --- | --- |
| Unaware | 12:00 | 99 | 460 | 7 |
| Suspicious | 18:06 | 103 | 360 | 2 |
| Alert | 00:00 | 102 | 356 | 1 |

Counts are the per-frame render difference after twelve distinct rendered samples with unchanged chunk count. All exceed the 300 budget. No same-view baseline was measured; no claim about cause.

The script advances the actual Mill sensing and runner rules through `millStep`, with combat held. This is not a keyboard combat playthrough. The final browser check observed one ring and two arriving reinforcements, with no route issues. Unit integration tests also run the real battle step with this controller.

The first attempt reached the hook before the render loop started (frame/chunks/drawCalls all zero). Its report is `startup-attempt-invalid.json`, not rendering evidence. These three images are the single retake, after fixing readiness and setting time after `tourTo` (which resets time).

After these images, code review found the shared fighter view still called `CharacterView.update` without the ground argument. The final code now passes `f.y`, with a render-call regression test. These images predate that final ground-height fix; no third capture was taken. Markers and alarm measurements are from the report, not evidence of final character placement.

The bell is an original synthesized tone through effects/master volume; not listened to here. Entry roster (one generic soldier, one generic archer), fifteen-second travel, runner/investigation speeds and sense ranges are placeholders. Tall-grass cover, later combat-depth tools, retaken rosters and saving the encounter are not supplied by this item.
