// Tour mode (overnight item 11): named camera views of the valley, stepped with the bracket keys and
// reached by name from the capture script. Pure data: no Babylon imports.
// Each view places the hero on walkable ground and turns the camera to a point. Times are the clock hours
// used for the frames (18 for dusk-lit frames, 12 for noon).

export interface TourPoint {
  x: number;
  z: number;
}

export interface TourView {
  readonly name: string;
  /** Where the hero stands. Must be walkable and not blocked (tested). */
  readonly hero: TourPoint;
  /** The point the camera turns to. */
  readonly look: TourPoint;
  /** Clock hour for the frame. */
  readonly tod: number;
  /** One line on what the view is for, shown in the tour label. */
  readonly note: string;
}

export const TOUR_VIEWS: readonly TourView[] = [
  { name: 'arrival', hero: { x: 226, z: 238 }, look: { x: 86, z: 98 }, tod: 18, note: 'Start of the valley, facing Hesper’s window' },
  { name: 'road_in', hero: { x: 176, z: 186 }, look: { x: 88, z: 106 }, tod: 18, note: 'The road in, to Wick' },
  { name: 'wick_square', hero: { x: 84, z: 88 }, look: { x: 77, z: 76 }, tod: 18, note: 'Wick, the well' },
  { name: 'high_lane', hero: { x: 150, z: 86 }, look: { x: 100, z: 85 }, tod: 18, note: 'Wick’s high lane' },
  { name: 'hesper_door', hero: { x: 93.3, z: 107.2 }, look: { x: 86, z: 98 }, tod: 18, note: 'Hesper’s door' },
  { name: 'ridge_path', hero: { x: 160, z: -112 }, look: { x: 254, z: -100 }, tod: 18, note: 'The ridge path' },
  { name: 'landing', hero: { x: 61, z: 63 }, look: { x: 0, z: 0 }, tod: 18, note: 'The landing, looking over the lake' },
  { name: 'signal_hill_top', hero: { x: -82, z: -309 }, look: { x: 0, z: 0 }, tod: 18, note: 'The signal hill, looking back to the lake' },
  { name: 'ford', hero: { x: 142, z: -22 }, look: { x: 142, z: -12 }, tod: 18, note: 'The ford' },
  { name: 'mill_bridge', hero: { x: -191, z: 22 }, look: { x: -191, z: 34 }, tod: 18, note: 'The mill bridge' },
  { name: 'stepping_stones', hero: { x: -238, z: 0 }, look: { x: -250, z: 0 }, tod: 18, note: 'The stepping stones' },
  { name: 'gate', hero: { x: -220, z: -232 }, look: { x: -231.36, z: -243.66 }, tod: 18, note: 'The north-west gate' },
];

/**
 * Heading of the hero at a view: it faces the look point, so the camera (which sits behind the hero
 * along the camera yaw) sees its back. Same convention as the walking code: yaw = atan2(dx, dz).
 */
export function tourYaw(view: Pick<TourView, 'hero' | 'look'>): number {
  return Math.atan2(view.look.x - view.hero.x, view.look.z - view.hero.z);
}

/** Index of the view `delta` steps from `i`, wrapping at both ends. */
export function nextTourIndex(i: number, delta: number, count: number = TOUR_VIEWS.length): number {
  if (count <= 0) throw new Error('nextTourIndex: empty tour');
  return (((i + delta) % count) + count) % count;
}

export function tourIndexOf(name: string): number {
  return TOUR_VIEWS.findIndex((v) => v.name === name);
}
