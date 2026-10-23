#!/usr/bin/env node
// Text rules for the repository: no emoji, no en or em dashes, and no
// mentions of machine generated content. Exits with 1 when a file breaks one.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Third party license texts (LICENSES/, caches of them) are kept verbatim.
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.angular', 'out-tsc', '.cache', 'LICENSES']);
const SKIP_FILES = new Set(['package-lock.json', 'scripts/check-text.mjs', 'SPEC.md']);
const EXT = /\.(md|html|css|js|mjs|cjs|ts|json|svelte|svg|yml|yaml|txt)$/;
const RULES = [
  [/[\u2013\u2014]/u, 'en or em dash (use a comma, a colon or "to")'],
  [/\p{Extended_Pictographic}/u, 'emoji or pictographic symbol'],
  [/\bA\.?I\b(?![-_.])/u, 'mention of AI'],
  [/\b(ChatGPT|OpenAI|Anthropic|Claude|Copilot|LLMs?|GPT-?\d|artificial intelligence|machine learning|neural network)\b/iu, 'mention of a machine generated content tool'],
];

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out);
    } else if (EXT.test(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

const targets = process.argv.slice(2);
const files = targets.length ? targets.flatMap((t) => (statSync(t).isDirectory() ? walk(t, []) : [t])) : walk(root, []);
let bad = 0;
for (const file of files) {
  const rel = relative(root, file).split('\\').join('/');
  if (SKIP_FILES.has(rel) || rel.startsWith('docs/data/')) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [re, what] of RULES) {
      if (re.test(line)) {
        bad++;
        console.log(`${rel}:${i + 1}: ${what}: ${line.trim().slice(0, 120)}`);
      }
    }
  });
}
console.log(`${files.length} files checked, ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
