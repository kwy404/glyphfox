#!/usr/bin/env node
// Translation check of the studio site: string files, keys, localized pages
// and English left outside code. Exits with 1 when something is wrong.
// See docs/I18N.md.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkI18n } from './lib/i18n-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { problems, checked, languages } = await checkI18n(root);
for (const p of problems) console.log(p);
console.log(`${checked} pages in ${languages} languages checked, ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
process.exit(problems.length ? 1 : 0);
