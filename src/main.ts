// Page entry: finds the canvas and HUD root, then starts the game, or showcase mode with ?showcase=<clip>.

import { startGame } from './render/game';
import { startShowcase } from './render/showcase';
import { parseShowcaseTime } from './render/showcase_clips';
import { GAME_TITLE } from './data/title';

document.title = GAME_TITLE;

const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !ui) {
  throw new Error('index.html must contain <canvas id="game"> and <div id="ui">');
}

const params = new URLSearchParams(window.location.search);
if (params.has('showcase')) {
  startShowcase(canvas, params.get('showcase') ?? '', parseShowcaseTime(params.get('t'))).catch((err: unknown) => {
    ui.textContent = err instanceof Error ? err.message : String(err);
    console.error(err);
  });
} else {
  startGame(canvas, ui).catch((err: unknown) => {
    console.error(err);
  });
}
