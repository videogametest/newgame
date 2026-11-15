// Item 17. Overheard lines at the Mill. Pure: no Babylon, no DOM, no raw writing import (the words are injected).
// Two Mill men talk only while the hero is close and no one at the Mill has noticed him. Each exchange starts once
// per visit, at its time of day, by the people named; a speaker who is gone, asleep, aware or out of earshot stops it.
import { TUNING } from '../../config/tuning';
import { BANDITS } from '../../data/bandits';
import type { OverheardDef } from '../../data/overheard';
import type { Vec2 } from '../types';
import { nextOverheard } from './overheard';

/** One spoken line as the writing gives it: a bandit id, a `{A}`/`{B}` placeholder, or null (unattributed). */
export interface SpokenLine { speaker: string | null; text: string }
export type OverheardWords = (id: string) => SpokenLine[];

export interface OverhearMember {
  id: string;
  x: number;
  z: number;
  alive: boolean;
  /** On duty per the place schedule. */
  present: boolean;
  sleeping: boolean;
  unaware: boolean;
}

export interface OverhearInput {
  hour: number;
  retaken: boolean;
  hero: Vec2;
  members: readonly OverhearMember[];
  /** The hero is in the Mill's visit zone. When he leaves, the visit's lines are forgotten. */
  inVisit: boolean;
  dt: number;
}

export interface Resolved { speakerId: string; text: string }
interface Active { def: OverheardDef; lines: Resolved[]; index: number; t: number }

export interface OverhearCaption { exchangeId: string; speakerId: string; label: string; text: string }
export interface OverhearSnapshot { caption: OverhearCaption | null; saidThisVisit: string[] }

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

export function nameOf(id: string): string {
  return BANDITS.find(b => b.id === id)?.name ?? id;
}

/** Resolves `{A}`/`{B}` to the exchange's first and second speakers; an unattributed line takes the previous speaker. */
export function resolveLines(def: OverheardDef, lines: readonly SpokenLine[]): Resolved[] {
  const out: Resolved[] = [];
  let previous: string | null = def.speakers[0] ?? null;
  for (const l of lines) {
    const speakerId: string | null = l.speaker === null ? previous
      : l.speaker === '{A}' ? def.speakers[0] ?? null
      : l.speaker === '{B}' ? def.speakers[1] ?? null
      : l.speaker;
    if (!speakerId) continue;
    previous = speakerId;
    out.push({ speakerId, text: l.text });
  }
  return out;
}

export class MillOverhearing {
  saidThisVisit: string[] = [];
  private active: Active | null = null;

  constructor(
    private readonly words: OverheardWords,
    private readonly onHeard: (id: string) => void = () => {},
    private readonly earshot: number = TUNING.mill.earshot,
    private readonly dwell: number = TUNING.mill.overheardDwell,
  ) {}

  /** Called once per fixed simulation step while the Mill is held. */
  advance(input: OverhearInput): void {
    if (!input.inVisit) {
      this.saidThisVisit = [];
      this.active = null;
      return;
    }
    const unnoticed = input.members.every(m => !m.alive || m.unaware);
    const audible = new Set(input.members
      .filter(m => m.alive && m.present && !m.sleeping && m.unaware && dist(m, input.hero) <= this.earshot)
      .map(m => m.id));
    if (this.active) {
      const { def } = this.active;
      if (!unnoticed || !def.speakers.every(s => audible.has(s))) {
        this.active = null;
      } else {
        this.active.t += input.dt;
        if (this.active.t >= this.dwell) {
          this.active.index++;
          this.active.t = 0;
          if (this.active.index >= this.active.lines.length) this.active = null;
        }
      }
    }
    if (!this.active) {
      const next = nextOverheard({ place: 'mill', retaken: input.retaken, hour: input.hour, present: [...audible],
        saidThisVisit: this.saidThisVisit, heroCloseAndUnnoticed: unnoticed });
      if (next) this.start(next);
    }
  }

  /** Drops the exchange in progress, e.g. when the Mill stops being held. Lines already said stay said. */
  stop(): void {
    this.active = null;
  }

  snapshot(): OverhearSnapshot {
    const a = this.active;
    const line = a && a.lines[a.index];
    return {
      caption: a && line ? { exchangeId: a.def.id, speakerId: line.speakerId, label: nameOf(line.speakerId), text: line.text } : null,
      saidThisVisit: [...this.saidThisVisit],
    };
  }

  private start(def: OverheardDef): void {
    // An exchange counts as said when it starts, so one cut short is not replayed on the same visit.
    this.saidThisVisit.push(def.id);
    this.onHeard(def.id);
    const lines = resolveLines(def, this.words(def.id));
    if (lines.length > 0) this.active = { def, lines, index: 0, t: 0 };
  }
}
