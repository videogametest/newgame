import type { Awareness } from '../core/stealth';

/** The shapes carry meaning without colour. Null means there is no tracked awareness (e.g. the hero). */
export function awarenessMarker(awareness: Awareness | undefined, alive: boolean, enabled: boolean):
  { symbol: string; label: Awareness; colour: string } | null {
  if (!enabled || !alive || awareness === undefined) return null;
  const states = {
    unaware: { symbol: '○', label: 'unaware' as const, colour: '#f4f1e8' },
    suspicious: { symbol: '?', label: 'suspicious' as const, colour: '#ffe27a' },
    alert: { symbol: '!', label: 'alert' as const, colour: '#ef6a5a' },
  };
  return states[awareness];
}
