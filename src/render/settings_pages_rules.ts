// The settings pages' rules (task 009 step 2, item 2). Pure: which page a setting is on, what "Back to defaults"
// puts back, which settings the game does not use yet, and the words the writing gives for them. The DOM is in
// settings_pages.ts. Words are from docs/writing/interface.md ("Settings and controls"); anything else is marked
// as a draft in docs/status.md.
import { defaultSettings, type Difficulty, type Settings } from '../core/settings/settings';

/** The pages of the Settings screen, in tab order. Sound keeps its own store (sound_settings.ts). */
export type SettingsPage = 'display' | 'sound' | 'camera' | 'controller' | 'play';
export const SETTINGS_PAGES: readonly SettingsPage[] = ['display', 'sound', 'camera', 'controller', 'play'];

/** Page names as the writing gives them. */
export const PAGE_LABEL: Record<SettingsPage, string> = {
  display: 'Display',
  sound: 'Sound',
  camera: 'Camera',
  controller: 'Controller',
  play: 'Play',
};

/**
 * Settings the game does not use yet. They are shown, saved, and marked "Not yet in the game", so the page is
 * complete and the player's choice is kept for when the feature arrives. Keys are "group.field".
 * Sound: the valley plays no sound yet; the prototype battle reads these at its next start. Remove a key here in
 * the same PR that wires its feature.
 */
export const NOT_YET_IN_GAME: ReadonlySet<string> = new Set([
  'display.fullscreen',
  'display.frameCap',
  'display.showFrameRate',
  'sound.master',
  'sound.effects',
  'sound.music',
  'camera.mouseSensitivity',
  'camera.invertY',
  'camera.fovThirdPerson',
  'camera.fovFirstPerson',
  'camera.shake',
  'camera.hitFreeze',
  'controller.deadzone',
  'controller.lookSensitivity',
  'controller.invertY',
  'controller.southpaw',
  'controller.aimAssist',
  'controller.vibration',
  'play.difficulty',
  'play.crouchToggle',
  'play.sprintToggle',
  'play.awarenessMarkers',
  'play.minimalHud',
  'play.characterTones',
  'play.textSize',
  'play.textSpeed',
]);

/** Shown next to a setting the game does not use yet. Draft wording, not in the writing (see docs/status.md). */
export const NOT_YET_NOTE = 'Not yet in the game';

export function isInGame(key: string): boolean {
  return !NOT_YET_IN_GAME.has(key);
}

/** The writing's "Back to defaults" and its confirmation, used at the foot of every page. */
export const RESET_TEXT = {
  button: 'Back to defaults',
  question: 'Put this page back as it was?',
  yes: 'Yes',
  no: 'No',
} as const;

/** The writing's difficulty choices, with their descriptions, in order. */
export const DIFFICULTY_CHOICES: readonly { value: Difficulty; label: string; text: string }[] = [
  { value: 'lantern', label: 'Lantern', text: 'For the valley and its story. Enemies are slower to notice you and hit less hard.' },
  { value: 'dusk', label: 'Dusk', text: 'The game as it was made.' },
  { value: 'moonless', label: 'Moonless', text: 'For a hard stealth game. Enemies sense more, hit harder, and call more help. Arrows and food are scarce.' },
];
export const DIFFICULTY_NOTE = 'You can change this at any time. Nothing is locked behind it.';

/** The settings as they are after "Back to defaults" on one core page. Other pages, bindings and brightnessSet are kept. */
export function resetPage(current: Settings, page: Exclude<SettingsPage, 'sound'>): Settings {
  const d = defaultSettings();
  switch (page) {
    case 'display':
      return { ...current, display: { ...d.display, brightnessSet: current.display.brightnessSet } };
    case 'camera':
      return { ...current, camera: d.camera };
    case 'controller':
      return { ...current, controller: d.controller };
    case 'play':
      return { ...current, play: d.play };
  }
}

/** Frame-rate cap choices. 0 is "No cap" (writing: the cap reads "30", "60", "No cap"). */
export const FRAME_CAP_LABEL: Record<0 | 30 | 60, string> = { 0: 'No cap', 30: '30', 60: '60' };

/** Field of view is shown in degrees; other sliders are a plain number with no unit (writing, "Settings and controls"). */
export function fieldOfViewLabel(degrees: number): string {
  return `${Math.round(degrees)} degrees`;
}

/** A slider's readout: plain number, to the step's precision. */
export function sliderReadout(value: number, step: number): string {
  const digits = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return value.toFixed(digits);
}
