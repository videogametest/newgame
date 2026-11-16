// Sound effects. Plays the ids that src/core/sound_map.ts picks, through Web Audio.
// Starts on the first click or key press (browsers block audio before a user gesture), and only
// then fetches and decodes the files. Volume and mute come from the saved sound settings.

import { MusicPlayer, melody, sampleFor } from '../audio/music';
import { SOUNDS } from '../data/sounds';
import type { SoundId } from '../core/sound_map';
import {
  DEFAULT_SOUND, parseSoundSettings, serializeSoundSettings, SOUND_STORAGE_KEY, type SoundSettings,
} from './sound_settings';
import { assetUrl } from './assets';
import { fetchBytesWithRetry } from './load_retry';

export class AudioBank {
  private settings: SoundSettings;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private music: MusicPlayer | null = null;
  private readonly musicBuffers = new Map<string, Promise<AudioBuffer>>();

  constructor(private readonly storage: Storage | null = safeStorage()) {
    this.settings = parseSoundSettings(this.storage?.getItem(SOUND_STORAGE_KEY) ?? null);
  }

  get values(): SoundSettings {
    return { ...this.settings };
  }

  /** Sets one setting, saves it, and applies it to the live audio graph. */
  set<K extends keyof SoundSettings>(key: K, value: SoundSettings[K]): void {
    this.settings = { ...this.settings, [key]: value };
    this.storage?.setItem(SOUND_STORAGE_KEY, serializeSoundSettings(this.settings));
    this.applyGains();
  }

  /** Resets every setting to its shipped value. */
  reset(): void {
    this.settings = { ...DEFAULT_SOUND };
    this.storage?.removeItem(SOUND_STORAGE_KEY);
    this.applyGains();
  }

  /** Call from a user gesture (click, key press). Creates the audio context and loads every file once. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.effectsGain = this.ctx.createGain();
      this.effectsGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.music = new MusicPlayer(this.ctx, this.masterGain, file => this.loadMusic(file));
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.loading) this.loading = this.loadAll().catch((err: unknown) => console.warn('Sound load failed', err));
  }

  /** First lantern: the written tune on the existing CC0 concert harp, or an explicit silent fallback. */
  async playLantern(): Promise<boolean> {
    const ctx = this.ctx, music = this.music;
    if (!ctx || !music || this.settings.muted || this.settings.master <= 0 || this.settings.music <= 0) return false;
    try {
      await ctx.resume();
      if (ctx.state !== 'running') return false;
      const piece = melody(1);
      // Preload the whole instrument phrase before scheduling: failed loads cannot leave half a tune playing.
      await Promise.all([...new Set(piece.events.map(e => sampleFor(e.instrument, e.midi).file))].map(f => this.loadMusic(f)));
      if (this.settings.muted || this.settings.master <= 0 || this.settings.music <= 0) return false;
      await music.play(piece);
      return true;
    } catch (error) { console.warn('Lantern melody unavailable; showing the caption instead', error); return false; }
  }

  private loadMusic(file: string): Promise<AudioBuffer> {
    let pending = this.musicBuffers.get(file);
    if (!pending) {
      const ctx = this.ctx;
      if (!ctx) return Promise.reject(new Error('Audio is not unlocked'));
      pending = fetchBytesWithRetry(assetUrl(`assets/${file}`)).then(bytes => ctx.decodeAudioData(bytes));
      this.musicBuffers.set(file, pending);
      void pending.catch(() => this.musicBuffers.delete(file));
    }
    return pending;
  }

  /** Original synthesized bell, through the same effects/master volume controls. */
  ringBell(): void {
    if (!this.ctx || !this.effectsGain) return;
    const now = this.ctx.currentTime;
    for (const [frequency, level] of [[523.25, 0.28], [1049, 0.12], [1465, 0.07]]) {
      const oscillator = this.ctx.createOscillator(), gain = this.ctx.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(level, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      oscillator.connect(gain); gain.connect(this.effectsGain);
      oscillator.start(now); oscillator.stop(now + 2.6);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  }

  /** Plays one loaded effect, respecting the same volume controls. */
  play(id: SoundId): void {
    if (!this.ctx || !this.effectsGain) return;
    const def = SOUNDS[id];
    const path = def.files[Math.floor(Math.random() * def.files.length)];
    const buffer = this.buffers.get(path);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = def.gain;
    src.connect(gain);
    gain.connect(this.effectsGain);
    src.start();
  }

  private applyGains(): void {
    if (!this.masterGain || !this.effectsGain || !this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.02);
    this.effectsGain.gain.setTargetAtTime(s.effects, t, 0.02);
    this.music?.setVolume(s.music);
  }

  private async loadAll(): Promise<void> {
    if (!this.ctx) return;
    const paths = new Set<string>();
    for (const def of Object.values(SOUNDS)) for (const p of def.files) paths.add(p);
    await Promise.all(
      [...paths].map(async (path) => {
        const data = await fetchBytesWithRetry(assetUrl(`assets/${path}`));
        const ctx = this.ctx;
        if (!ctx) return;
        this.buffers.set(path, await ctx.decodeAudioData(data));
      }),
    );
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
