// Offline bundles: find the universe names a project uses, resolve them and
// write a module that registers only those icons (with their license data),
// so builds work without the network. Used by the Vite and webpack plugins
// and by add() (the `glyphfox add prefix:name` command).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { getIcon, getSet, parseName, attributionLine, VERSION } from './node.js';
import { PREFIXES } from './prefixes.js';

export const VIRTUAL_ID = 'virtual:glyphfox-universe';
export const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.html', '.astro', '.md', '.mdx'];
const KNOWN = new Set(PREFIXES);
// A name may be followed by a Fusion layout ("cloud&mdi:home:side"), never by a path or a URL.
const TOKEN = /(?<![\w:/.-])([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9_]+(?:-[a-z0-9_]+)*)(?![\w/]|:\/)/g;

/** Universe names ("prefix:name") written in a piece of code. Only shipped prefixes count. */
export function scanCode(code, known = KNOWN) {
  const out = new Set();
  for (const m of String(code).matchAll(TOKEN)) if (known.has(m[1])) out.add(`${m[1]}:${m[2]}`);
  return out;
}

/** Scans files and folders (recursively, skipping node_modules and dist). */
export function scanFiles(paths, { cwd = process.cwd(), extensions = EXTENSIONS, prefixes } = {}) {
  const known = prefixes ? new Set(prefixes) : KNOWN;
  const names = new Set();
  const walk = (p) => {
    let st;
    try {
      st = statSync(p);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const e of readdirSync(p)) if (!['node_modules', 'dist', '.git', 'build', 'coverage'].includes(e)) walk(join(p, e));
    } else if (extensions.includes(extname(p))) {
      for (const n of scanCode(readFileSync(p, 'utf8'), known)) names.add(n);
    }
  };
  for (const p of paths) walk(join(cwd, p));
  return names;
}

/** Resolves names to { sets, icons, missing } with the license record of every set used. */
export async function resolveBundle(names) {
  const sets = {};
  const icons = {};
  const missing = [];
  for (const full of [...new Set(names)].sort()) {
    const p = parseName(full);
    if (!p) {
      missing.push(full);
      continue;
    }
    const icon = await getIcon(full).catch(() => null);
    if (!icon) {
      missing.push(full);
      continue;
    }
    if (!sets[p.prefix]) {
      const s = await getSet(p.prefix);
      sets[p.prefix] = { prefix: s.prefix, name: s.name, author: s.author, license: s.license, palette: s.palette };
    }
    icons[icon.name] = { body: icon.body, left: icon.left, top: icon.top, width: icon.width, height: icon.height };
  }
  return { sets, icons, missing };
}

/** License header of a bundle: every set used, its license, and the attribution lines. */
export function licenseHeader(bundle) {
  const lines = [`glyphfox-universe ${VERSION} offline icons. Every icon keeps the license of its set:`];
  for (const s of Object.values(bundle.sets)) {
    lines.push(`  ${s.prefix}: ${s.name} by ${s.author.name}, ${s.license.title}${s.license.url ? ` (${s.license.url})` : ''}`);
    if (s.license.attribution) lines.push(`    ${attributionLine(s)}`);
  }
  return lines;
}

/** ES module code that registers the bundle (for the plugins and add()). */
export function moduleCode(bundle, { from = 'glyphfox-universe' } = {}) {
  const header = licenseHeader(bundle)
    .map((l) => ` * ${l.replace(/\*\//g, '* /')}`)
    .join('\n');
  const data = JSON.stringify({ sets: bundle.sets, icons: bundle.icons });
  return `/**\n${header}\n */\nimport { registerIcons } from '${from}';\n\nexport const bundle = ${data};\nregisterIcons(bundle);\nexport default bundle;\n`;
}

/** Reads the names of a module written by moduleCode (to merge with new ones). */
export function namesInModule(code) {
  const m = /export const bundle = (\{[\s\S]*?\});\nregisterIcons/.exec(code || '');
  if (!m) return [];
  try {
    return Object.keys(JSON.parse(m[1]).icons || {});
  } catch {
    return [];
  }
}
