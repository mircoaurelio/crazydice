import './index.css';
import { Game } from './game/Game';

const container = document.getElementById('canvas-container');
if (!container) throw new Error('Missing #canvas-container');

const game = new Game(container);
game.start();

window.addEventListener('resize', () => game.onResize());
