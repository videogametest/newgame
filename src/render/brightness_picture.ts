// The brightness picture (task 009 step 2c, review 031): the words and the view it shows. The words are the ones in
// docs/writing/interface.md, used exactly as written; brightness_picture.test.ts checks them against that file.
// Pure: no DOM, no scene.

/** The tour view the picture shows: Hesper's yard, with the dark figure (the scarecrow) in view. */
export const PICTURE_VIEW = 'hesper_door';
/** The picture is always at midnight, whatever the game's time is. */
export const PICTURE_HOUR = 0;

export const PICTURE_TITLE = 'Brightness';
export const PICTURE_TEXT = 'Move the slider until you can only just see the figure in the yard.';
export const PICTURE_BUTTON = "That's right.";
export const PICTURE_AGAIN = 'Set brightness again';

/** The picture opens once, at first start, until the player has set brightness. */
export function promptDue(display: { brightnessSet: boolean }): boolean {
  return !display.brightnessSet;
}
