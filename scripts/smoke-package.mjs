// Loads the built glyphfox package (ESM and CJS) and renders an icon, so CI
// can check the Node versions listed in its engines field.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esm = await import('../packages/glyphfox/dist/index.js');
const cjs = require('../packages/glyphfox/dist/index.cjs');

for (const [kind, lib] of [['ESM', esm], ['CJS', cjs]]) {
  const svg = lib.toSvg('heart');
  if (!svg.startsWith('<svg')) throw new Error(`${kind} toSvg returned ${svg.slice(0, 40)}`);
}
console.log(`glyphfox loads on Node ${process.versions.node}`);
