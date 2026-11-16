// The settings pages (task 009, step 2; docs/writing/interface.md, "Settings and controls"): which rows each page shows,
// how a row reads and writes its value, what Back to defaults puts back, and how a value is written on screen.
// Pure: no DOM. The screens are in settings_pages.ts.
import { defaultSettings, parseSettings, RANGES, serializeSettings, type Settings } from '../core/settings/settings';

export const PAGE_IDS = ['display', 'sound', 'camera', 'controller', 'play', 'controls'] as const;
export type PageId = (typeof PAGE_IDS)[number];

export const PAGE_LABEL: Record<PageId, string> = {
  display: 'Display',
  sound: 'Sound',
  camera: 'Camera',
  controller: 'Controller',
  play: 'Play',
  controls: 'Controls',
};

/** Settings kept in the Settings object. */
export type SettingsPath =
  | 'display.brightness' | 'display.quality' | 'display.fullscreen' | 'display.frameCap' | 'display.showFrameRate'
  | 'camera.mouseSensitivity' | 'camera.invertY' | 'camera.fovThirdPerson' | 'camera.fovFirstPerson' | 'camera.shake' | 'camera.hitFreeze'
  | 'controller.deadzone' | 'controller.lookSensitivity' | 'controller.invertY' | 'controller.southpaw' | 'controller.aimAssist' | 'controller.vibration'
  | 'play.difficulty' | 'play.awarenessMarkers' | 'play.minimalHud' | 'play.crouchToggle' | 'play.sprintToggle' | 'play.characterTones' | 'play.textSize' | 'play.textSpeed';

/** Sound volumes live in the audio bank (sound_settings.ts), not in Settings. */
export type SoundPath = 'sound.master' | 'sound.music' | 'sound.effects' | 'sound.muted';

export type RowPath = SettingsPath | SoundPath;

/** The mark beside a setting that is saved but that nothing in the game reads yet. Said once, in the foot line. */
export const SOON_MARK = 'soon';
export const SOON_FOOT = 'A setting marked \u201csoon\u201d is saved, but nothing in the game uses it yet.';

export interface Option { label: string; value: string | number | boolean }

interface RowBase {
  path: RowPath;
  label: string;
  /** A heading drawn above the first row of a new group. */
  group?: string;
  /** Small text under the row. */
  note?: string;
  /** Saved, but nothing in the game reads it yet: the row says so. */
  notYet?: boolean;
  /** Applied while the slider moves (brightness), not on release. */
  live?: boolean;
}
export type Row =
  | (RowBase & { kind: 'slider'; range: { min: number; max: number; step: number }; unit?: 'degrees' })
  | (RowBase & { kind: 'switch' })
  | (RowBase & { kind: 'choice'; options: Option[] });

const DIFFICULTY_NOTE: Record<string, string> = {
  lantern: 'For the valley and its story. Enemies are slower to notice you and hit less hard.',
  dusk: 'The game as it was made.',
  moonless: 'For a hard stealth game. Enemies sense more, hit harder, and call more help. Arrows and food are scarce.',
};
export const DIFFICULTY_BENEATH = 'You can change this at any time. Nothing is locked behind it.';

const SOUND_RANGE = { min: 0, max: 1, step: 0.05 };

const DISPLAY_ROWS: Row[] = [
  { kind: 'slider', path: 'display.brightness', label: 'Brightness', range: RANGES.brightness, live: true },
  {
    kind: 'choice', path: 'display.quality', label: 'Quality',
    options: [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }],
    note: 'Shadow detail and draw distance apply on the next start.',
  },
  {
    kind: 'choice', path: 'display.frameCap', label: 'Frame-rate cap',
    options: [{ label: '30', value: 30 }, { label: '60', value: 60 }, { label: 'No cap', value: 0 }],
    notYet: true,
  },
  { kind: 'switch', path: 'display.fullscreen', label: 'Fullscreen', notYet: true },
  { kind: 'switch', path: 'display.showFrameRate', label: 'Show frame rate', notYet: true },
];

const SOUND_ROWS: Row[] = [
  { kind: 'slider', path: 'sound.master', label: 'Master', range: SOUND_RANGE },
  { kind: 'slider', path: 'sound.music', label: 'Music', range: SOUND_RANGE },
  { kind: 'slider', path: 'sound.effects', label: 'Effects', range: SOUND_RANGE },
  { kind: 'switch', path: 'sound.muted', label: 'Mute all sound' },
];

const CAMERA_ROWS: Row[] = [
  { kind: 'slider', path: 'camera.mouseSensitivity', label: 'Mouse sensitivity', range: RANGES.mouseSensitivity, notYet: true },
  { kind: 'switch', path: 'camera.invertY', label: 'Invert vertical look', notYet: true },
  { kind: 'slider', path: 'camera.fovThirdPerson', label: 'Field of view, third-person', range: RANGES.fov, unit: 'degrees', notYet: true },
  { kind: 'slider', path: 'camera.fovFirstPerson', label: 'Field of view, first-person', range: RANGES.fov, unit: 'degrees', notYet: true },
  { kind: 'slider', path: 'camera.shake', label: 'Camera shake', range: RANGES.shake, notYet: true },
  { kind: 'slider', path: 'camera.hitFreeze', label: 'Hit pause', range: RANGES.hitFreeze, notYet: true },
];

const CONTROLLER_ROWS: Row[] = [
  { kind: 'switch', path: 'controller.southpaw', label: 'Swap sticks', note: 'Move with the right stick and look with the left.', notYet: true },
  { kind: 'slider', path: 'controller.aimAssist', label: 'Aim assist (controller)', range: RANGES.aimAssist, note: 'Slows your aim near an enemy while the bow is drawn. It never aims for you.', notYet: true },
  { kind: 'slider', path: 'controller.vibration', label: 'Vibration', range: RANGES.vibration, notYet: true },
  { kind: 'slider', path: 'controller.deadzone', label: 'Stick dead zone', range: RANGES.deadzone, notYet: true },
  { kind: 'slider', path: 'controller.lookSensitivity', label: 'Look sensitivity', range: RANGES.lookSensitivity, notYet: true },
  { kind: 'switch', path: 'controller.invertY', label: 'Invert vertical look (controller)', notYet: true },
];

const PLAY_ROWS: Row[] = [
  {
    kind: 'choice', path: 'play.difficulty', label: 'Difficulty', group: 'Difficulty', notYet: true,
    options: [{ label: 'Lantern', value: 'lantern' }, { label: 'Dusk', value: 'dusk' }, { label: 'Moonless', value: 'moonless' }],
    note: DIFFICULTY_BENEATH,
  },
  { kind: 'switch', path: 'play.awarenessMarkers', label: 'Awareness markers', group: 'Aids' },
  { kind: 'switch', path: 'play.minimalHud', label: 'Minimal display', note: 'Hide the compass, health bars, and damage numbers until they matter.', notYet: true },
  {
    kind: 'choice', path: 'play.crouchToggle', label: 'Crouch', notYet: true,
    options: [{ label: 'Hold', value: false }, { label: 'Toggle', value: true }],
  },
  {
    kind: 'choice', path: 'play.sprintToggle', label: 'Sprint', notYet: true,
    options: [{ label: 'Hold', value: false }, { label: 'Toggle', value: true }],
  },
  { kind: 'switch', path: 'play.characterTones', label: 'Character tones', notYet: true },
  {
    kind: 'choice', path: 'play.textSize', label: 'Size', group: 'Text',
    options: [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }],
  },
  {
    kind: 'choice', path: 'play.textSpeed', label: 'Speed',
    options: [{ label: 'Slow', value: 'slow' }, { label: 'Medium', value: 'medium' }, { label: 'Fast', value: 'fast' }, { label: 'Instant', value: 'instant' }],
  },
];

/** The rows a page shows. The Controls page is its own screen (controls_page.ts), so it has none here. */
export function rowsFor(page: PageId): Row[] {
  switch (page) {
    case 'display': return DISPLAY_ROWS;
    case 'sound': return SOUND_ROWS;
    case 'camera': return CAMERA_ROWS;
    case 'controller': return CONTROLLER_ROWS;
    case 'play': return PLAY_ROWS;
    case 'controls': return [];
  }
}

/** True when a page has a row marked "soon", so its foot line is shown. */
export function pageHasSoon(page: PageId): boolean {
  return rowsFor(page).some((r) => r.notYet);
}

/** The note for the difficulty that is chosen (the rule text is in the row note). */
export function difficultyNote(value: string): string {
  return DIFFICULTY_NOTE[value] ?? '';
}

export function isSoundPath(path: RowPath): path is SoundPath {
  return path.startsWith('sound.');
}

/** Reads a settings path. */
export function getAt(s: Settings, path: SettingsPath): unknown {
  const [section, key] = path.split('.') as [keyof Settings, string];
  return (s[section] as unknown as Record<string, unknown>)[key];
}

/**
 * Returns the settings with one value changed. The result goes through parseSettings, so a value that is out of
 * range or of the wrong kind is clamped or defaulted rather than saved.
 */
export function withAt(s: Settings, path: SettingsPath, value: unknown): Settings {
  const [section, key] = path.split('.') as [keyof Settings, string];
  const next = { ...s, [section]: { ...(s[section] as object), [key]: value } };
  return parseSettings(serializeSettings(next as Settings));
}

/** The settings paths a settings page owns (not Sound, which is in the audio bank, and not Controls). */
export function settingsPathsOf(page: PageId): SettingsPath[] {
  return rowsFor(page)
    .map((r) => r.path)
    .filter((p): p is SettingsPath => !isSoundPath(p));
}

/** Back to defaults for a settings page: its own values go back, and nothing else changes. */
export function resetPage(s: Settings, page: PageId): Settings {
  const d = defaultSettings();
  let next = s;
  // brightnessSet is not a row, so it is kept: putting the page back does not show the picture again.
  for (const path of settingsPathsOf(page)) next = withAt(next, path, getAt(d, path));
  return next;
}

/** The on-screen text of a slider value: a plain number at the step's precision, or degrees for field of view. */
export function formatSlider(row: Extract<Row, { kind: 'slider' }>, value: number): string {
  const decimals = (String(row.range.step).split('.')[1] ?? '').length;
  const plain = Number(value.toFixed(decimals)).toString();
  return row.unit === 'degrees' ? `${plain} degrees` : plain;
}

/** Every row's path exists in the defaults, so a page can never point at a value the settings do not have. */
export function allRowPathsKnown(): boolean {
  const d = defaultSettings() as unknown as Record<string, Record<string, unknown>>;
  return PAGE_IDS.every((page) => rowsFor(page).every((row) => {
    if (isSoundPath(row.path)) return true;
    const [section, key] = row.path.split('.');
    return section in d && key in (d[section] ?? {});
  }));
}
