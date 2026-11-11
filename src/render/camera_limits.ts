// Pure camera-limit rules. No Babylon imports, so they are tested headless.

/** Lifts a camera height so it never sits below the floor. */
export function clampCameraHeight(y: number, minHeight: number): number {
  return Math.max(y, minHeight);
}
