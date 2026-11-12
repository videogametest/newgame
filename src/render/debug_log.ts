// Rolling event log, error capture and the debug report. Render-layer only: nothing here touches sim state.
// Errors are timestamped, kept in the log and shown as a small notice, so a player can copy a report.

import { BUILD_COMMIT } from '../config/build';
import { SAVE_VERSION } from '../config/save';
import { tuningJson } from '../config/tuning';

export interface LogEntry {
  /** ISO time the event was logged. */
  at: string;
  kind: string;
  detail: string;
}

/** How many events the rolling log keeps. Older ones are dropped. */
export const LOG_CAPACITY = 300;

const entries: LogEntry[] = [];

export function logEvent(kind: string, detail = ''): void {
  entries.push({ at: new Date().toISOString(), kind, detail });
  if (entries.length > LOG_CAPACITY) entries.splice(0, entries.length - LOG_CAPACITY);
}

export function recentLog(): readonly LogEntry[] {
  return entries;
}

/** Plain-text report for a bug report: build, browser, save version, settings and the recent events. */
export function buildDebugReport(settings: Record<string, unknown>): string {
  const lines = [
    'Every Lit Window debug report',
    `generated: ${new Date().toISOString()}`,
    `build commit: ${BUILD_COMMIT}`,
    `save version: ${SAVE_VERSION}`,
    `browser: ${navigator.userAgent}`,
    `viewport: ${window.innerWidth}x${window.innerHeight} (devicePixelRatio ${window.devicePixelRatio})`,
    `page: ${window.location.href}`,
    '',
    'settings:',
    JSON.stringify(settings, null, 2),
    '',
    'tuning:',
    tuningJson(),
    '',
    `recent events (last ${entries.length}, oldest first):`,
    ...entries.map((e) => `${e.at} ${e.kind}${e.detail ? ` ${e.detail}` : ''}`),
  ];
  return lines.join('\n');
}

/** Tiny text description of an error value (message and stack when there is one). */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Captures uncaught errors and unhandled rejections: logs them with a timestamp and shows a notice.
 * The notice stays until dismissed; the debug report carries the details.
 */
export function installErrorCapture(doc: Document = document, win: Window = window): void {
  const notice = doc.createElement('div');
  notice.setAttribute('role', 'alert');
  notice.style.cssText = [
    'position:fixed', 'left:12px', 'bottom:12px', 'max-width:440px', 'z-index:1000',
    'background:rgba(60,12,12,0.95)', 'color:#ffd7d2', 'border:1px solid #a33', 'border-radius:6px',
    'padding:10px 12px', 'font:13px/1.4 system-ui,sans-serif', 'pointer-events:auto', 'display:none',
  ].join(';');
  const text = doc.createElement('div');
  const hint = doc.createElement('div');
  hint.style.cssText = 'margin-top:6px;opacity:0.85';
  hint.textContent = 'Open the tuning panel (`) and press Copy debug report to send it.';
  const dismiss = doc.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = 'Dismiss';
  dismiss.style.cssText = 'margin-top:8px;padding:4px 10px;border:0;border-radius:4px;cursor:pointer;background:#5a2a2a;color:#fff';
  dismiss.addEventListener('click', () => { notice.style.display = 'none'; });
  notice.append(text, hint, dismiss);
  doc.body.appendChild(notice);

  const show = (kind: string, err: unknown): void => {
    const detail = describeError(err);
    logEvent(kind, detail.split('\n').slice(0, 2).join(' | '));
    text.textContent = `An error stopped something from working: ${detail.split('\n')[0]}`;
    notice.style.display = 'block';
  };
  win.addEventListener('error', (e) => show('error', e.error ?? e.message));
  win.addEventListener('unhandledrejection', (e) => show('unhandled_rejection', e.reason));
}
