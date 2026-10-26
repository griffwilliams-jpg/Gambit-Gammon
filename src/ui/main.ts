import { App } from './app.js';
import { createBoard } from './board.js';

const boardEl = document.getElementById('board')!;
const panel = document.getElementById('panel')!;
const menu = document.getElementById('menu')!;

createBoard(boardEl).then((scene) => {
  // Exposed for debugging in the browser console only.
  (window as unknown as { gambitGammon: App }).gambitGammon = new App(scene, panel, menu);
});
