// Plays a Piece through Web Audio. The only file in this folder that touches the browser.
// Stems are accepted too: `playStems` starts a set of recordings together in place of a score.
import { sampleFor } from './samples';
import { nextStart, type NoteEvent, type Piece } from './sequencer';

/** Loads a file under public/assets and decodes it. The game's existing audio loader can be passed in. */
export type LoadBuffer = (file: string) => Promise<AudioBuffer>;

const RELEASE = 0.35;
const ATTACK = 0.04;

export class MusicPlayer {
  private readonly out: GainNode;
  private live = new Set<AudioBufferSourceNode>();
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ctx: AudioContext, destination: AudioNode, private readonly load: LoadBuffer) {
    this.out = ctx.createGain();
    this.out.connect(destination);
  }

  /** Music volume, 0 to 1, from the settings panel. */
  setVolume(volume: number): void {
    this.out.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.05);
  }

  private async note(e: NoteEvent, startAt: number): Promise<void> {
    const { file, rate } = sampleFor(e.instrument, e.midi);
    const buffer = await this.load(file);
    const when = Math.max(this.ctx.currentTime, startAt + e.at);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(e.gain, when + (e.rings ? 0.005 : ATTACK));
    if (!e.rings) {
      gain.gain.setValueAtTime(e.gain, when + e.seconds);
      gain.gain.linearRampToValueAtTime(0, when + e.seconds + RELEASE);
      source.stop(when + e.seconds + RELEASE + 0.05);
    }
    source.connect(gain).connect(this.out);
    source.onended = () => this.live.delete(source);
    this.live.add(source);
    source.start(when);
  }

  /** Play a piece once. Resolves when every note is scheduled, with the time it started. */
  async play(piece: Piece, startAt: number = this.ctx.currentTime + 0.1): Promise<number> {
    await Promise.all(piece.events.map(e => this.note(e, startAt)));
    return startAt;
  }

  /** One short note, for a character's tone. */
  async tone(e: NoteEvent): Promise<void> {
    await this.note(e, this.ctx.currentTime + 0.02);
  }

  /**
   * Play a piece again and again with its silence between. `choose` is asked before each repeat, so the number of
   * layers can follow the valley: pass a function that builds the piece from the current state.
   */
  async loop(choose: () => Piece): Promise<void> {
    this.stopLoop();
    const round = async (startAt: number): Promise<void> => {
      const piece = choose();
      await this.play(piece, startAt);
      const next = nextStart(startAt, piece);
      this.loopTimer = setTimeout(() => void round(next), Math.max(0, (next - this.ctx.currentTime - 1) * 1000));
    };
    await round(this.ctx.currentTime + 0.1);
  }

  stopLoop(): void {
    if (this.loopTimer !== null) clearTimeout(this.loopTimer);
    this.loopTimer = null;
  }

  /** A musician's version: one recording per instrument, started together. Only the first `layers` are heard. */
  async playStems(files: readonly string[], layers: number = files.length): Promise<void> {
    const buffers = await Promise.all(files.map(f => this.load(f)));
    const when = this.ctx.currentTime + 0.1;
    buffers.forEach((buffer, i) => {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = i < layers ? 1 : 0;
      source.connect(gain).connect(this.out);
      source.onended = () => this.live.delete(source);
      this.live.add(source);
      source.start(when);
    });
  }

  /** Fade everything out and stop. */
  stop(fadeSeconds = 1): void {
    this.stopLoop();
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, fadeSeconds / 4);
    for (const source of this.live) source.stop(now + fadeSeconds);
  }
}
