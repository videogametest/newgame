// Small DOM parts shared by the settings screens (display_settings.ts, settings_pages.ts).

/** A range input with the given limits and step, set to the value. */
export function rangeInput(r: { min: number; max: number; step: number }, value: number): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(r.min);
  input.max = String(r.max);
  input.step = String(r.step);
  input.value = String(value);
  return input;
}
