// Page entry: finds the canvas and HUD root, then starts the game.

import { startGame } from './render/game';

const canvas = document.getElementById('game');
const ui = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !ui) {
  throw new Error('index.html must contain <canvas id="game"> and <div id="ui">');
}

startGame(canvas, ui).catch((err: unknown) => {
  console.error(err);
});
