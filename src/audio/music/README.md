# Stream H: the music (Claude)

The game performs its music from notes (`GAME_DESIGN.md` section 4, Music). The score is `docs/writing/melody.md`.

| File | What it is |
| --- | --- |
| `score.ts` | The tune and its five layers, as note data. |
| `sequencer.ts` | Pure. Turns the score into timed notes: the melody at any number of layers, Hesper's hum, the wren, the castle, character tones. |
| `samples.ts` | Which recording plays each note, and how far it is shifted. |
| `player.ts` | Web Audio. Plays a piece once or as a loop with its silences, plays stems, sets volume, fades out. |

## Wiring it in (task 003)

```ts
const music = new MusicPlayer(audioContext, musicBus, loadBuffer); // loadBuffer: the existing loader in src/render/audio.ts
music.setVolume(settings.music);
music.loop(() => melody(wickLayers(litWindows)));                  // Wick's theme; asked again before every repeat
music.play(melody(lanternLayers(placesFreed, watchHouseFreed)));   // when a lantern is lit
music.tone(characterTone('hesper'));                               // as a line of text appears, if the setting is on
```

- Start only after the first click, as browsers require.
- Preload `allSampleFiles()` (about 1 MB) after the first frame, not before it.
- Not heard in a browser yet: the player is typechecked only. The notes, timing, and pitches are tested, and an offline render of the same notes was checked for pitch.
