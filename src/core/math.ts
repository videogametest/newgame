export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Returns 1 or -1; a zero input counts as `fallback`. */
export function facingOf(delta: number, fallback: 1 | -1 = 1): 1 | -1 {
  if (delta > 0) return 1;
  if (delta < 0) return -1;
  return fallback;
}
