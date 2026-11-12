# The melody

A first draft, written without being heard. Greg judges it by ear once it is playing. Keep the system able to swap this score, or to play stems from a musician instead.

## Character

A lullaby someone might hum while lighting a lamp. Warm, plain, a little sad, and unhurried. Played quietly, with space after each phrase.

- Key: G major
- Time: 3/4
- Tempo: 72 beats per minute
- Length: 8 bars, then at least 4 bars of silence before any repeat

## The tune

Notes are in scientific pitch (middle C is C4). The number after each note is its length in beats.

| Bar | Notes |
| --- | --- |
| 1 | D4 (1), G4 (1), B4 (1) |
| 2 | A4 (2), G4 (1) |
| 3 | E4 (1), G4 (1), A4 (1) |
| 4 | D4 (3) |
| 5 | D4 (1), G4 (1), B4 (1) |
| 6 | D5 (2), B4 (1) |
| 7 | A4 (1), G4 (1), E4 (1) |
| 8 | G4 (3) |

Bars 1 and 2 are **the first phrase**: what Hesper hums and what the wren sings.

## Harmony

One chord per bar: G, D, C, D, G, G, C, G.

## Layers

Each layer is added on top of the ones before it. Use the nearest available sampled instrument and log which was used.

| Layer | Instrument | What it plays |
| --- | --- | --- |
| 1 | A plucked instrument: harp or lute | The tune alone |
| 2 | Low plucked strings or harp, an octave or two down | The root of each bar's chord on beat 1, held for the bar: G2, D2, C2, D2, G2, G2, C2, G2 |
| 3 | Flute | Silent for bars 1 to 4, then the tune of bars 5 to 8 one octave higher |
| 4 | Strings, soft and sustained | Two held notes per bar: B3+D4, A3+D4, G3+C4, F#3+A3, B3+D4, B3+G4, G3+E4, B3+D4 |
| 5 | A soft horn | One held note per bar, as a slow line under everything: B3, A3, G3, F#3, B3, B3, C4, B3 |

## Where each version is used

- **The lantern melody:** when the first place is freed, layer 1. Add one layer for each further place freed. When the Watch-house is freed, all layers.
- **Wick's theme:** the same score, looping with long silences. Layer 1 from the start; add layer 2 at four lit windows, layer 3 at eight, layer 4 at twelve, layer 5 at sixteen.
- **Character tones:** Hesper, D4 on the low reedy end of the palette. Bram, G4, warm and round. Stane, B3, flat and formal. Others, A4 or E4.
- **Hesper's hum and the wren's song:** the first phrase alone, bars 1 and 2. The wren's is two octaves up and quicker.
- **The castle:** the tune inverted around G4 and moved to G minor, on low strings alone, slower. D4 becomes C5, B4 becomes Eb4, and so on: each note is as far below G4 as the original was above it, and the reverse.

## Dynamics

Soft throughout. Each phrase swells slightly toward its third bar and falls away. No percussion.

## What plays it now

The first performance uses VSCO 2 Community Edition recordings (CC0), in `public/assets/audio/vsco2_ce/`: the concert harp for layers 1 and 2, the solo flute for layer 3 and Hesper's hum, the viola section for layer 4 and the castle, and a French horn for layer 5. Notes without a recording of their own play the nearest one, shifted by at most three semitones. The code is in `src/audio/music/`.
