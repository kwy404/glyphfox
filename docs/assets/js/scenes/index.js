// Landing scenes: the hero flight, the sticky scroll scenes and the
// illustrations. Every scene builds itself when it comes near the viewport
// and only draws while it is on screen; with reduced motion each one renders
// a single still frame.

import { loadIcons } from '../app.js';
import { artPieces } from './art.js';
import { fuseScene } from './fuse.js';
import { gridScene } from './grid.js';
import { hero } from './hero.js';
import { modsScene } from './mods.js';
import { morphChain } from './morph.js';
import { startScroll } from './runner.js';
import { syncScene } from './sync.js';
import { weightScene } from './weight.js';

loadIcons().then(() => {
  const steps = [hero, gridScene, weightScene, morphChain, syncScene, modsScene, fuseScene, artPieces];
  for (const step of steps) {
    try {
      step();
    } catch (err) {
      // One broken scene must not take the rest of the page with it.
      console.error(err);
    }
  }
  startScroll();
});
