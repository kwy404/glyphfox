#!/usr/bin/env node
// Builds packages/glyphfox-angular with ng-packagr (Angular package format).
// Run after `npm run build` (it imports glyphfox/core from the workspace).

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'packages', 'glyphfox-angular');
if (!existsSync(join(root, 'packages', 'glyphfox', 'dist', 'core', 'index.js'))) {
  console.error('build glyphfox first: npm run build');
  process.exit(1);
}
const { ngPackagr } = await import('ng-packagr');
const t0 = Date.now();
await ngPackagr()
  .forProject(join(pkgDir, 'ng-package.json'))
  .withTsConfig(join(pkgDir, 'tsconfig.lib.json'))
  .build();
console.log(`built glyphfox-angular in ${Date.now() - t0} ms`);
