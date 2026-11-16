// Page entry: finds the canvas and HUD root, then starts the valley (default), showcase mode (?showcase=<clip>),
// or a styletest.

import { startValley } from './render/valley';
import { startShowcase } from './render/showcase';
import { startStyletest } from './styletest/styletest';
import { startUpgradeTest } from './styletest/upgrade';
import { startHouseTest } from './styletest/houses';
import { startRoomTest } from './styletest/room';
import { startWickTest } from './styletest/wick';
import { parseShowcaseTime } from './render/showcase_clips';
import { GAME_TITLE } from './data/title';
import { LoadFailedError } from './render/load_retry';
import { describeError, logEvent } from './render/debug_log';
import { keepFetched, prepareOffline } from './render/offline';

document.title = GAME_TITLE;

const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !ui) {
  throw new Error('index.html must contain <canvas id="game"> and <div id="ui">');
}

const params = new URLSearchParams(window.location.search);
if (params.has('styletest')) {
  (params.get('styletest') === 'upgrade' ? startUpgradeTest(canvas) : params.get('styletest') === 'houses' ? startHouseTest(canvas) : params.get('styletest') === 'room' ? startRoomTest(canvas) : params.get('styletest') === 'wick' ? startWickTest(canvas) : startStyletest(canvas)).catch((err: unknown) => {
    ui.textContent = err instanceof Error ? err.message : String(err);
    console.error(err);
  });
} else if (params.has('showcase')) {
  startShowcase(canvas, params.get('showcase') ?? '', parseShowcaseTime(params.get('t'))).catch((err: unknown) => {
    // Plain words on screen; the detail goes to the debug log (task 019).
    logEvent('showcase_failed', describeError(err).split('\n')[0]);
    ui.textContent = err instanceof LoadFailedError
      ? 'The game could not download some of its files. Reload the page to try again.'
      : 'The showcase could not start. Reload the page to try again.';
    console.error(err);
  });
} else {
  // Item 29: a waiting update is taken here, before the title, or not at all this session.
  prepareOffline().catch((err: unknown) => { logEvent('offline', `failed: ${String(err)}`); return false; }).then(reloading => {
    if (reloading) return;
    startValley(canvas, ui, window.location.search).then(() => keepFetched()).catch((err: unknown) => {
      console.error(err);
    });
  });
}
