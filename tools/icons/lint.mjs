#!/usr/bin/env node
// glyphfox icon lint. Node 20 or newer, no dependencies.
//
//   node tools/icons/lint.mjs                 check every collection
//   node tools/icons/lint.mjs NAME...         check only these icons (display/NAME for a collection)
//   node tools/icons/lint.mjs --fix           also rewrite files in canonical format
//   node tools/icons/lint.mjs --json          print the report as JSON
//
// Collections (see COLLECTIONS in svg.mjs):
//   icons/             base set, 24 grid, 2 px padding
//   icons/display/     hero icons, 48 grid, 4 px padding
//   icons/animated/    24 grid, the sidecar adds an "animation" block
//   icons/isometric/   24 grid
//
// Icon format (icons/NAME.svg, shown for the 24 grid):
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
//        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
//        stroke-linejoin="round">
//     <path class="gf-secondary" d="..." fill="currentColor" stroke="none" opacity="0.3"/>
//     <path d="..."/>
//   </svg>
// Children are empty path, circle, rect, line, polyline, polygon or ellipse elements
// with geometry attributes only. The optional duotone layer is a single element with
// class "gf-secondary", listed first so the strokes paint over it. Every point of the
// geometry stays inside the padding box.
// Sidecar (NAME.json): { "categories": [...], "tags": [...] }, plus "animation" for
// animated icons (the schema is documented in svg.mjs).
// Exits with code 1 when any problem is found.

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES,
  COLLECTIONS,
  ELEMENTS,
  RESERVED_NAMES,
  SECONDARY_CLASS,
  SECONDARY_OPACITY,
  animationProblems,
  canonicalJson,
  decimals,
  elementBounds,
  isNumber,
  parsePath,
  parsePoints,
  parseSvg,
  rootAttrs,
  serializeSvg,
  stripBom,
} from './svg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const fix = args.includes('--fix');
const asJson = args.includes('--json');
const dirArg = args.indexOf('--dir');
const iconsDir = resolve(dirArg >= 0 ? args[dirArg + 1] : join(here, '..', '..', 'icons'));
const only = new Set(args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--dir'));

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAG_RE = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;
const MAX_DECIMALS = 2;
const EPS = 0.001;

const problems = [];
const report = (name, rule, message) => problems.push({ name, rule, message });

function lintSvg(name, text, col) {
  let svg;
  try {
    svg = parseSvg(stripBom(text));
  } catch (err) {
    report(name, 'xml', err.message);
    return null;
  }
  const low = col.padding;
  const high = col.grid - col.padding;

  // Root element.
  const expected = new Map(rootAttrs(col.grid));
  for (const [k, v] of svg.attrs) {
    if (k === 'transform') report(name, 'no-transform', 'the <svg> element has a transform');
    else if (!expected.has(k)) report(name, 'root', `unexpected attribute "${k}" on <svg>`);
    else if (expected.get(k) !== v) report(name, 'root', `${k}="${v}" must be ${k}="${expected.get(k)}"`);
  }
  for (const [k, v] of expected) {
    if (!svg.attrs.has(k)) report(name, 'root', `missing ${k}="${v}" on <svg>`);
  }

  if (!svg.children.length) report(name, 'empty', 'the icon has no elements');
  let strokeCount = 0;
  let secondaryCount = 0;
  svg.children.forEach((el, index) => {
    const where = `<${el.name}> #${index + 1}`;
    const spec = ELEMENTS[el.name];
    if (!spec) {
      report(name, 'element', `${where} is not allowed (use path, circle, rect, line, polyline, polygon or ellipse)`);
      return;
    }
    const secondary = el.attrs.has('class');
    if (secondary) {
      secondaryCount++;
      if (el.attrs.get('class') !== SECONDARY_CLASS) report(name, 'secondary', `${where}: class must be "${SECONDARY_CLASS}"`);
      if (index !== 0) report(name, 'secondary', `${where}: the duotone layer must be the first element`);
      if (el.attrs.get('fill') !== 'currentColor') report(name, 'secondary', `${where}: the duotone layer needs fill="currentColor"`);
      if (el.attrs.get('stroke') !== 'none') report(name, 'secondary', `${where}: the duotone layer needs stroke="none"`);
      if (el.attrs.get('opacity') !== SECONDARY_OPACITY) report(name, 'secondary', `${where}: the duotone layer needs opacity="${SECONDARY_OPACITY}"`);
      if (el.name === 'line' || el.name === 'polyline') report(name, 'secondary', `${where}: the duotone layer must be a closed shape`);
    } else {
      strokeCount++;
    }
    for (const [k, v] of el.attrs) {
      if (k === 'transform') {
        report(name, 'no-transform', `${where} has a transform`);
        continue;
      }
      if (spec.attrs.includes(k)) continue;
      if (secondary && ['class', 'fill', 'stroke', 'opacity'].includes(k)) continue;
      if (k === 'fill' || k === 'stroke' || k === 'opacity' || k === 'fill-opacity') {
        report(name, 'no-fill', `${where}: ${k}="${v}" is only allowed on the "${SECONDARY_CLASS}" layer`);
      } else {
        report(name, 'attribute', `${where}: attribute "${k}" is not allowed`);
      }
    }
    for (const k of spec.required) {
      if (!el.attrs.has(k)) report(name, 'attribute', `${where}: missing "${k}"`);
    }

    // Numbers and geometry.
    const numeric = spec.attrs.filter((k) => k !== 'd' && k !== 'points' && el.attrs.has(k));
    let numbers = [];
    let geometryOk = true;
    for (const k of numeric) {
      const v = el.attrs.get(k);
      if (!isNumber(v)) {
        report(name, 'number', `${where}: ${k}="${v}" is not a plain number`);
        geometryOk = false;
      } else {
        numbers.push(v);
      }
    }
    try {
      if (el.attrs.has('d')) {
        const parsed = parsePath(el.attrs.get('d'));
        numbers = numbers.concat(parsed.numbers);
        if (!parsed.segments.some((s) => s.type !== 'M')) report(name, 'path', `${where}: the path draws nothing`);
      }
      if (el.attrs.has('points')) numbers = numbers.concat(parsePoints(el.attrs.get('points')).numbers);
    } catch (err) {
      report(name, 'path', `${where}: ${err.message}`);
      geometryOk = false;
    }
    for (const v of numbers) {
      if (decimals(v) > MAX_DECIMALS) report(name, 'precision', `${where}: ${v} has more than ${MAX_DECIMALS} decimals`);
    }
    const get = (k) => parseFloat(el.attrs.get(k));
    if (geometryOk) {
      if (el.name === 'circle' && !(get('r') > 0)) report(name, 'geometry', `${where}: r must be positive`);
      if (el.name === 'ellipse' && !(get('rx') > 0 && get('ry') > 0)) report(name, 'geometry', `${where}: rx and ry must be positive`);
      if (el.name === 'rect') {
        if (!(get('width') > 0 && get('height') > 0)) report(name, 'geometry', `${where}: width and height must be positive`);
        if (el.attrs.has('rx')) {
          const rx = get('rx');
          if (rx < 0 || rx > Math.min(get('width'), get('height')) / 2) report(name, 'geometry', `${where}: rx is out of range`);
        }
      }
      if (spec.required.every((k) => el.attrs.has(k))) {
        let box;
        try {
          box = elementBounds(el);
        } catch (err) {
          report(name, 'path', `${where}: ${err.message}`);
        }
        if (box) {
          const out = [];
          if (box.minX < low - EPS) out.push(`left ${fmt(box.minX)}`);
          if (box.minY < low - EPS) out.push(`top ${fmt(box.minY)}`);
          if (box.maxX > high + EPS) out.push(`right ${fmt(box.maxX)}`);
          if (box.maxY > high + EPS) out.push(`bottom ${fmt(box.maxY)}`);
          if (out.length) report(name, 'padding', `${where} leaves the ${low} to ${high} box (${out.join(', ')})`);
        }
      }
    }
  });
  if (secondaryCount > 1) report(name, 'secondary', 'only one duotone element is allowed (merge the shapes into one path)');
  if (svg.children.length && !strokeCount) report(name, 'empty', 'the icon has no stroke elements');
  return svg;
}

function fmt(v) {
  return String(Math.round(v * 1000) / 1000);
}

function lintJson(name, text, col, svg) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    report(name, 'json', `invalid JSON: ${err.message}`);
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    report(name, 'json', 'the sidecar must be an object');
    return null;
  }
  const allowed = col.animation ? ['categories', 'tags', 'animation'] : ['categories', 'tags'];
  for (const k of Object.keys(data)) {
    if (!allowed.includes(k)) report(name, 'json', `unknown key "${k}"`);
  }
  const { categories, tags } = data;
  if (!Array.isArray(categories) || !categories.length) {
    report(name, 'categories', 'categories must be a non-empty array');
  } else {
    for (const c of categories) {
      if (!CATEGORIES.includes(c)) report(name, 'categories', `unknown category "${c}" (known: ${CATEGORIES.join(', ')})`);
    }
    if (new Set(categories).size !== categories.length) report(name, 'categories', 'duplicate categories');
  }
  if (!Array.isArray(tags) || !tags.length) {
    report(name, 'tags', 'tags must be a non-empty array');
  } else {
    for (const t of tags) {
      if (typeof t !== 'string' || !TAG_RE.test(t)) report(name, 'tags', `tag ${JSON.stringify(t)} must be lowercase words`);
    }
    if (new Set(tags).size !== tags.length) report(name, 'tags', 'duplicate tags');
  }
  if (col.animation) {
    if (data.animation === undefined) report(name, 'animation', 'animated icons need an "animation" block');
    else if (svg) for (const p of animationProblems(data.animation, svg, col.grid)) report(name, 'animation', p);
  }
  return data;
}

if (!existsSync(iconsDir)) {
  console.error(`icons directory not found: ${iconsDir}`);
  process.exit(1);
}

const subdirs = new Set(
  Object.values(COLLECTIONS)
    .map((c) => c.dir)
    .filter(Boolean),
);
let checked = 0;

for (const col of Object.values(COLLECTIONS)) {
  const dir = col.dir ? join(iconsDir, col.dir) : iconsDir;
  if (!existsSync(dir)) continue;
  const prefix = col.dir ? `${col.dir}/` : '';
  const svgNames = new Set();
  const jsonNames = new Set();
  for (const f of readdirSync(dir).sort()) {
    const isDir = statSync(join(dir, f)).isDirectory();
    if (!col.dir && isDir && subdirs.has(f)) continue;
    const m = /^(.*)\.(svg|json)$/.exec(f);
    if (!m || isDir) {
      report(prefix + f, 'file', `unexpected entry in icons/${prefix} (only NAME.svg, NAME.json and the collection folders)`);
      continue;
    }
    (m[2] === 'svg' ? svgNames : jsonNames).add(m[1]);
  }
  const lower = new Map();
  const bodies = new Map();
  for (const base of [...new Set([...svgNames, ...jsonNames])].sort()) {
    const name = prefix + base;
    if (only.size && !only.has(name) && !only.has(base)) continue;
    checked++;
    if (!NAME_RE.test(base)) report(name, 'name', 'names must be kebab-case: lowercase letters and digits joined by single hyphens');
    if (RESERVED_NAMES.includes(base)) report(name, 'name', `"${base}" is reserved for an animation class`);
    const key = base.toLowerCase();
    if (lower.has(key)) report(name, 'name', `name clashes with "${lower.get(key)}"`);
    lower.set(key, base);
    if (!svgNames.has(base)) report(name, 'file', `missing icons/${prefix}${base}.svg`);
    if (!jsonNames.has(base)) report(name, 'file', `missing icons/${prefix}${base}.json`);

    let svg = null;
    if (svgNames.has(base)) {
      const path = join(dir, `${base}.svg`);
      const text = readFileSync(path, 'utf8');
      svg = lintSvg(name, text, col);
      if (svg) {
        const canonical = serializeSvg(svg, col.grid);
        const body = canonical.split('\n').slice(1, -2).map((l) => l.trim()).sort().join('\n');
        if (bodies.has(body)) report(name, 'duplicate', `same geometry as "${bodies.get(body)}"`);
        else bodies.set(body, base);
        if (text !== canonical) {
          if (fix) writeFileSync(path, canonical);
          else report(name, 'format', 'not in canonical format (run with --fix)');
        }
      }
    }
    if (jsonNames.has(base)) {
      const path = join(dir, `${base}.json`);
      const text = readFileSync(path, 'utf8');
      const data = lintJson(name, text, col, svg);
      if (data && Array.isArray(data.categories) && Array.isArray(data.tags)) {
        const canonical = canonicalJson(data);
        if (text !== canonical) {
          if (fix) writeFileSync(path, canonical);
          else report(name, 'format', 'sidecar not in canonical format (run with --fix)');
        }
      }
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ checked, problems }, null, 2));
} else {
  for (const p of problems) console.log(`${p.name}: [${p.rule}] ${p.message}`);
  const n = problems.length;
  console.log(`${checked} icon${checked === 1 ? '' : 's'} checked, ${n} problem${n === 1 ? '' : 's'}`);
}
process.exit(problems.length ? 1 : 0);
