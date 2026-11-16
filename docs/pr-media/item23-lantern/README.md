# Queue 23 verification

`npx vite-node scripts/item23_fixture.ts > /tmp/item23-fixture.json`

`node scripts/item23_capture.mjs URL OUTPUT /tmp/item23-fixture.json [--no-images]`

The fixture explicitly stubs item 18's missing cleared-state producer. No played fight or listening test. `cleared.png`, `lit.png`, `wick-night.png` are full-page 1280x720 medium captures, once, no fallback/retake and not visually judged. JSON contains actual game and renderer samples after chunks settle. Muted music intentionally exercises the authored-caption fallback, distinct from a capture fallback. A separate sound-enabled context verifies the existing CC0 harp samples decode and schedule. Unit tests inject a failed sample and verify no partial tune schedules. No failed network/audio fallback was needed in this browser run.
