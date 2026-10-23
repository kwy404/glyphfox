// Search tags from the upstream metadata of the most used sets (Iconify
// carries names, aliases and categories but no tags): Lucide (ISC), Tabler
// (MIT), Phosphor (MIT) and the Material Symbols and Material Icons metadata
// of Google Fonts (Apache 2.0). Downloads are cached; nothing is executed,
// the files are parsed as data.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

async function latest(name) {
  const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`);
  if (!res.ok) throw new Error(`npm lookup failed for ${name}: ${res.status}`);
  return (await res.json()).version;
}

async function cachedText(cache, url, offline) {
  const file = join(cache, `${createHash('sha1').update(url).digest('hex')}.txt`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  if (offline) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  mkdirSync(cache, { recursive: true });
  writeFileSync(file, text);
  return text;
}

async function npmFile(cache, versions, pkg, path, offline) {
  if (!versions[pkg]) {
    if (offline) return null;
    versions[pkg] = await latest(pkg);
  }
  return cachedText(cache, `https://cdn.jsdelivr.net/npm/${pkg}@${versions[pkg]}/${path}`, offline);
}

const clean = (tag) =>
  String(tag)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Drops tags that say nothing (used by many icons), repeat the name, or break the text rules. */
function refine(map, breaks, maxShare = 0.03) {
  const freq = new Map();
  for (const tags of map.values()) for (const t of new Set(tags)) freq.set(t, (freq.get(t) || 0) + 1);
  const limit = Math.max(40, Math.round(map.size * maxShare));
  const out = new Map();
  for (const [name, tags] of map) {
    const words = new Set(name.split('-'));
    const keep = [...new Set(tags.map(clean))].filter((t) => t && t.length <= 32 && !t.startsWith('*') && !words.has(t) && freq.get(t) <= limit && !breaks(t) && !breaks(t, { name: true }));
    if (keep.length) out.set(name, keep.slice(0, 12));
  }
  return out;
}

/**
 * Tags per set: { prefix: { tags: Map(base name -> tags), base: (name) => base name } }.
 * `versions` pins the npm packages (cached by the caller).
 */
export async function upstreamTags({ cache, versions, offline, breaks }) {
  const out = {};
  const lucide = await npmFile(cache, versions, 'lucide-static', 'tags.json', offline);
  if (lucide) out.lucide = { tags: refine(new Map(Object.entries(JSON.parse(lucide))), breaks), base: (n) => n };

  const tabler = await npmFile(cache, versions, '@tabler/icons', 'icons.json', offline);
  if (tabler) {
    const map = new Map();
    for (const icon of Object.values(JSON.parse(tabler))) {
      const tags = [...(icon.tags || []).map(String), icon.category ? String(icon.category) : ''].filter(Boolean);
      map.set(icon.name, tags);
    }
    out.tabler = { tags: refine(map, breaks), base: (n) => n.replace(/-filled$/, '') };
  }

  const ph = await npmFile(cache, versions, '@phosphor-icons/core', 'dist/index.mjs', offline);
  if (ph) {
    const map = new Map();
    for (const m of ph.matchAll(/name:\s*"([^"]+)",\s*pascal_name:[\s\S]*?tags:\s*\[([\s\S]*?)\]/g)) {
      map.set(m[1], [...m[2].matchAll(/"([^"]*)"/g)].map((t) => t[1]));
    }
    out.ph = { tags: refine(map, breaks), base: (n) => n.replace(/-(thin|light|bold|fill|duotone)$/, '') };
  }

  const google = await cachedText(cache, 'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true', offline);
  if (google) {
    const data = JSON.parse(google.replace(/^\)\]\}'\s*/, ''));
    const map = new Map();
    for (const icon of data.icons || []) map.set(String(icon.name).replace(/_/g, '-'), [...(icon.tags || []), ...(icon.categories || [])]);
    const tags = refine(map, breaks, 0.01);
    const symbols = (n) => n.replace(/-(outline-rounded|outline-sharp|outline|rounded|sharp)$/, '');
    out['material-symbols'] = { tags, base: symbols };
    out['material-symbols-light'] = { tags, base: symbols };
    out.ic = { tags, base: (n) => n.replace(/^(baseline|outline|round|sharp|twotone)-/, '') };
  }
  return out;
}

/**
 * Index form of the tags of a set: a dictionary and one line of tag ids per
 * icon; a line that repeats the previous one (variants of one icon) is "=".
 */
export function encodeTags(names, source) {
  const dict = new Map();
  const lines = [];
  let any = false;
  let last = null;
  for (const name of names) {
    const tags = source.tags.get(source.base(name)) || source.tags.get(name) || [];
    const ids = tags.map((t) => {
      if (!dict.has(t)) dict.set(t, dict.size);
      return dict.get(t).toString(36);
    });
    if (ids.length) any = true;
    const line = ids.join(' ');
    lines.push(line && lines.length && line === last ? '=' : line);
    last = line;
  }
  return any ? { d: [...dict.keys()].join('\n'), r: lines.join('\n') } : null;
}
