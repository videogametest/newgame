// Page entry: finds the canvas and HUD root, then starts the valley (default), the combat prototype (?arena=1),
// showcase mode (?showcase=<clip>), or a styletest.

import { startGame } from './render/game';
import { startValley } from './render/valley';
import { startShowcase } from './render/showcase';
import { startStyletest } from './styletest/styletest';
import { startUpgradeTest } from './styletest/upgrade';
import { startHouseTest } from './styletest/houses';
import { startRoomTest } from './styletest/room';
import { parseShowcaseTime } from './render/showcase_clips';
import { GAME_TITLE } from './data/title';

document.title = GAME_TITLE;

const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !ui) {
  throw new Error('index.html must contain <canvas id="game"> and <div id="ui">');
}

const params = new URLSearchParams(window.location.search);
if (params.has('styletest')) {
  (params.get('styletest') === 'upgrade' ? startUpgradeTest(canvas) : params.get('styletest') === 'houses' ? startHouseTest(canvas) : params.get('styletest') === 'room' ? startRoomTest(canvas) : startStyletest(canvas)).catch((err: unknown) => {
    ui.textContent = err instanceof Error ? err.message : String(err);
    console.error(err);
  });
} else if (params.has('showcase')) {
  startShowcase(canvas, params.get('showcase') ?? '', parseShowcaseTime(params.get('t'))).catch((err: unknown) => {
    ui.textContent = err instanceof Error ? err.message : String(err);
    console.error(err);
  });
} else if (params.has('arena')) {
  // The combat prototype stays reachable until task 004 removes it.
  startGame(canvas, ui).catch((err: unknown) => {
    console.error(err);
  });
} else {
  startValley(canvas, ui, window.location.search).catch((err: unknown) => {
    console.error(err);
  });
}
