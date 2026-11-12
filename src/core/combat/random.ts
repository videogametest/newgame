/** Explicit PRNG state in/out; no hidden clock or mutable global seed. */
export function randomStep(seed: number): { seed: number; value: number } {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 0x100000000 };
}
