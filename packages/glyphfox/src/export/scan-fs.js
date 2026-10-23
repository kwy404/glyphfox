// File system side of the usage scanner (Node only): walks a project,
// skips dependencies and build output, and scans every source file.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { SCAN_EXTENSIONS, scanFiles } from './scan.js';

/** Directories skipped by default. */
export const DEFAULT_IGNORE = ['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.nuxt', '.svelte-kit', '.angular', 'out'];

// Bundles and source maps are not sources; very large files are skipped too.
const MAX_BYTES = 2 * 1024 * 1024;
const SKIP_FILE = /\.d\.[cm]?ts$|\.min\.js$/i;

/** Absolute paths of the source files under `dir`, sorted. */
export function listSourceFiles(dir, { ignore = DEFAULT_IGNORE, extensions = SCAN_EXTENSIONS } = {}) {
  const skip = new Set(ignore);
  const exts = extensions.map((e) => e.toLowerCase());
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (skip.has(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        const lower = e.name.toLowerCase();
        if (!SKIP_FILE.test(lower) && exts.some((x) => lower.endsWith(x))) out.push(p);
      }
    }
  };
  walk(resolve(dir));
  return out.sort();
}

/**
 * Scans every source file under `dir`. Returns the scanFiles report with
 * file paths relative to `dir`, using forward slashes.
 */
export function scanDir(dir, { names, ignore, extensions } = {}) {
  const root = resolve(dir);
  const files = [];
  for (const p of listSourceFiles(root, { ignore, extensions })) {
    try {
      if (statSync(p).size > MAX_BYTES) continue;
      files.push({ file: relative(root, p).split(sep).join('/'), text: readFileSync(p, 'utf8') });
    } catch {
      // unreadable file: skip it
    }
  }
  return scanFiles(files, { names });
}
