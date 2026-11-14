// The settings (GAME_DESIGN.md section 10). Claude's. Pure: the shape, the defaults, the limits, and reading a
// saved copy safely. Saved in the browser, apart from the game save, so a new game keeps them.
import { defaultBindings, parseBindings, type Bindings } from './actions';

export const SETTINGS_KEY = 'everylitwindow.settings.v1';
export const SETTINGS_VERSION = 1;

export type Quality = 'low' | 'medium' | 'high';
export type Difficulty = 'lantern' | 'dusk' | 'moonless';

export interface Settings {
  version: number;
  display: {
    /** 0.5 to 1.5; 1 is as authored. Applied to the finished picture, never to the interface. */
    brightness: number;
    quality: Quality;
    fullscreen: boolean;
    /** Frames a second: 30, 60, or 0 for no cap. */
    frameCap: 0 | 30 | 60;
    showFrameRate: boolean;
    /** Whether the player has been through the brightness picture once. */
    brightnessSet: boolean;
  };
  camera: {
    mouseSensitivity: number;
    invertY: boolean;
    fovThirdPerson: number;
    fovFirstPerson: number;
    shake: number;
    hitFreeze: number;
  };
  controller: {
    deadzone: number;
    lookSensitivity: number;
    invertY: boolean;
    southpaw: boolean;
    /** 0 off, to 1. */
    aimAssist: number;
    /** 0 off, to 1. */
    vibration: number;
  };
  play: {
    difficulty: Difficulty;
    crouchToggle: boolean;
    sprintToggle: boolean;
    awarenessMarkers: boolean;
    minimalHud: boolean;
    characterTones: boolean;
    textSize: 'small' | 'medium' | 'large';
    textSpeed: 'slow' | 'medium' | 'fast' | 'instant';
  };
  bindings: Bindings;
}

interface Range { min: number; max: number; step: number }
/** The limits and step of every slider, in one place for the settings screen and the parser. */
export const RANGES = {
  brightness: { min: 0.5, max: 1.5, step: 0.05 },
  mouseSensitivity: { min: 0.2, max: 3, step: 0.05 },
  fov: { min: 50, max: 100, step: 1 },
  shake: { min: 0, max: 1, step: 0.1 },
  hitFreeze: { min: 0, max: 1, step: 0.1 },
  deadzone: { min: 0, max: 0.5, step: 0.01 },
  lookSensitivity: { min: 0.2, max: 3, step: 0.05 },
  aimAssist: { min: 0, max: 1, step: 0.1 },
  vibration: { min: 0, max: 1, step: 0.1 },
} as const satisfies Record<string, Range>;

export function defaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    display: { brightness: 1, quality: 'medium', fullscreen: false, frameCap: 60, showFrameRate: false, brightnessSet: false },
    camera: { mouseSensitivity: 1, invertY: false, fovThirdPerson: 60, fovFirstPerson: 75, shake: 1, hitFreeze: 1 },
    controller: { deadzone: 0.15, lookSensitivity: 1, invertY: false, southpaw: false, aimAssist: 0.6, vibration: 0.5 },
    play: { difficulty: 'dusk', crouchToggle: true, sprintToggle: false, awarenessMarkers: true, minimalHud: false, characterTones: true, textSize: 'medium', textSpeed: 'medium' },
    bindings: defaultBindings(),
  };
}

const num = (v: unknown, r: Range, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(r.max, Math.max(r.min, v)) : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const pick = <T extends string | number>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});

/**
 * Read saved settings. Every value is checked on its own: anything missing, out of range, or of the wrong kind
 * takes its default, and the rest is kept. A broken or hand-edited save can never leave the screen black, the
 * sound stuck, or the game without a way to pause.
 */
export function parseSettings(raw: string | null): Settings {
  const d = defaultSettings();
  if (!raw) return d;
  let data: Record<string, unknown>;
  try { data = obj(JSON.parse(raw)); } catch { return d; }
  const display = obj(data.display), camera = obj(data.camera), controller = obj(data.controller), play = obj(data.play);
  return {
    version: SETTINGS_VERSION,
    display: {
      brightness: num(display.brightness, RANGES.brightness, d.display.brightness),
      quality: pick(display.quality, ['low', 'medium', 'high'] as const, d.display.quality),
      fullscreen: bool(display.fullscreen, d.display.fullscreen),
      frameCap: pick(display.frameCap, [0, 30, 60] as const, d.display.frameCap),
      showFrameRate: bool(display.showFrameRate, d.display.showFrameRate),
      brightnessSet: bool(display.brightnessSet, d.display.brightnessSet),
    },
    camera: {
      mouseSensitivity: num(camera.mouseSensitivity, RANGES.mouseSensitivity, d.camera.mouseSensitivity),
      invertY: bool(camera.invertY, d.camera.invertY),
      fovThirdPerson: num(camera.fovThirdPerson, RANGES.fov, d.camera.fovThirdPerson),
      fovFirstPerson: num(camera.fovFirstPerson, RANGES.fov, d.camera.fovFirstPerson),
      shake: num(camera.shake, RANGES.shake, d.camera.shake),
      hitFreeze: num(camera.hitFreeze, RANGES.hitFreeze, d.camera.hitFreeze),
    },
    controller: {
      deadzone: num(controller.deadzone, RANGES.deadzone, d.controller.deadzone),
      lookSensitivity: num(controller.lookSensitivity, RANGES.lookSensitivity, d.controller.lookSensitivity),
      invertY: bool(controller.invertY, d.controller.invertY),
      southpaw: bool(controller.southpaw, d.controller.southpaw),
      aimAssist: num(controller.aimAssist, RANGES.aimAssist, d.controller.aimAssist),
      vibration: num(controller.vibration, RANGES.vibration, d.controller.vibration),
    },
    play: {
      difficulty: pick(play.difficulty, ['lantern', 'dusk', 'moonless'] as const, d.play.difficulty),
      crouchToggle: bool(play.crouchToggle, d.play.crouchToggle),
      sprintToggle: bool(play.sprintToggle, d.play.sprintToggle),
      awarenessMarkers: bool(play.awarenessMarkers, d.play.awarenessMarkers),
      minimalHud: bool(play.minimalHud, d.play.minimalHud),
      characterTones: bool(play.characterTones, d.play.characterTones),
      textSize: pick(play.textSize, ['small', 'medium', 'large'] as const, d.play.textSize),
      textSpeed: pick(play.textSpeed, ['slow', 'medium', 'fast', 'instant'] as const, d.play.textSpeed),
    },
    bindings: parseBindings(data.bindings),
  };
}

export const serializeSettings = (s: Settings): string => JSON.stringify(s);

/**
 * Brightness as the picture sees it: an exposure multiplier and a lift of the darkest tones. Turning it up shows
 * more in the dark without washing out the day; turning it down deepens the night without crushing a lit window.
 */
export function brightnessCurve(brightness: number): { exposure: number; shadowLift: number } {
  const b = Math.min(RANGES.brightness.max, Math.max(RANGES.brightness.min, brightness));
  // Exposure before tone mapping: the tone curve holds the bright end, so the dark end moves most.
  return { exposure: 0.35 + 0.65 * Math.pow(b, 1.5), shadowLift: Math.max(0, (b - 1) * 0.16) };
}
