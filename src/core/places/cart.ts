import type { Vec2 } from '../types';
import { lerp } from '../vec';

export interface TimedStop {
  hour: number;
  position: Vec2;
}
export interface CartRoute {
  /** Absolute in-game hour of first departure (day * 24 + timeOfDay). */
  firstDeparture: number;
  repeatHours: number;
  /** Offsets from departure; repeated positions encode a stop. */
  stops: readonly TimedStop[];
}
/** §5 and writing/bandits.md: Watch-house → ford → Wick → ford → home.
 * World owns coordinates; no made-up road is baked into logic. */
export function taxCartRoute(anchors: { watchHouse: Vec2; ford: Vec2; wick: Vec2 }): CartRoute {
  return {
    firstDeparture: 8, // untuned placeholder
    repeatHours: 72, // untuned placeholder (every few days)
    stops: [
      { hour: 0, position: { ...anchors.watchHouse } },
      { hour: 1, position: { ...anchors.ford } }, // untuned placeholder
      { hour: 1.25, position: { ...anchors.ford } }, // untuned placeholder
      { hour: 2, position: { ...anchors.wick } }, // untuned placeholder
      { hour: 3, position: { ...anchors.wick } }, // untuned placeholder
      { hour: 3.75, position: { ...anchors.ford } }, // untuned placeholder
      { hour: 4, position: { ...anchors.ford } }, // untuned placeholder
      { hour: 5, position: { ...anchors.watchHouse } }, // untuned placeholder
    ],
  };
}

/** Pure interpolation. null means no running cart (before departure, at home
 * between trips, or once the Watch-house is freed). Ambush state is a caller input. */
export function cartPositionAt(route: CartRoute, absoluteHour: number, watchHouseFreed: boolean, tripStopped = false): Vec2 | null {
  if (watchHouseFreed || tripStopped || absoluteHour < route.firstDeparture || route.repeatHours <= 0 || route.stops.length < 2) return null;
  const elapsed = (absoluteHour - route.firstDeparture) % route.repeatHours;
  const last = route.stops[route.stops.length - 1];
  if (elapsed < route.stops[0].hour || elapsed > last.hour) return null;
  for (let i = 1; i < route.stops.length; i++) {
    const a = route.stops[i - 1], b = route.stops[i];
    if (elapsed <= b.hour) {
      const t = b.hour === a.hour ? 1 : (elapsed - a.hour) / (b.hour - a.hour);
      return { x: lerp(a.position.x, b.position.x, t), z: lerp(a.position.z, b.position.z, t) };
    }
  }
  return { ...last.position };
}
