#!/usr/bin/env node
// Type checks the published declarations with test/types/check.ts.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/bin/tsc');
const r = spawnSync(process.execPath, [tsc, '-p', join(root, 'test', 'types', 'tsconfig.json')], { stdio: 'inherit' });
if (r.status === 0) console.log('types ok');
process.exit(r.status ?? 1);
