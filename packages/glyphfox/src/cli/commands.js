// The newer glyphfox commands: glyph script, the usage scanner and the
// exporters (animated favicon, CSS cursor, plotter SVG and G-code, STL).
// Node only. index.js passes the icon helpers in `deps` (the generated icon
// index only exists in dist), and every module is loaded on demand so the
// other commands start as fast as before.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve as resolvePath, sep } from 'node:path';
import { deflateSync } from 'node:zlib';
import { foxify } from '../core/foxify.js';
import { lintSvg } from '../core/lint.js';
import { parseSpec } from '../core/spec.js';

/** Commands handled by runCommand. */
export const COMMANDS = ['script', 'scan', 'favicon', 'cursor', 'plot', 'stl'];

const deflate = (bytes) => new Uint8Array(deflateSync(bytes));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const fixed = (v, d = 1) => String(Math.round(v * 10 ** d) / 10 ** d);
const given = (v) => v !== undefined && v !== true && v !== '';

function num(flags, key, def) {
  const v = flags[key];
  if (!given(v)) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new RangeError(`--${key} must be a number (got "${v}")`);
  return n;
}

function str(flags, key, def) {
  const v = flags[key];
  return given(v) ? String(v) : def;
}

const slug = (spec) =>
  String(spec)
    .replace(/\+/g, '_')
    .replace(/&/g, '__')
    .replace(/[:@/]/g, '-');

const shown = (io, file) => relative(io.cwd, file).split(sep).join('/') || '.';

function writeOut(io, path, data) {
  const file = resolvePath(io.cwd, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  return file;
}

function writeFiles(io, dir, files) {
  for (const [name, data] of Object.entries(files)) writeOut(io, join(dir, name), data);
  return Object.keys(files).length;
}

function outDir(io, flags, def) {
  return resolvePath(io.cwd, given(flags.out) ? String(flags.out) : def);
}

/**
 * Icon for the export commands: an icon spec, a .gfs glyph script or an
 * .svg file (used as is when it passes the icon rules, Fox-ified when not).
 * Returns { icon, name, variant }.
 */
export async function loadInput(input, io, deps = {}) {
  if (!input) throw new Error('missing the icon: give a spec (heart, file+check), a .gfs glyph script or an .svg file');
  const ext = extname(input).toLowerCase();
  if (ext === '.gfs' || ext === '.svg') {
    const file = resolvePath(io.cwd, input);
    if (!existsSync(file)) throw new Error(`no such file: ${input}`);
    const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const name = basename(file, extname(file));
    if (ext === '.gfs') {
      const { compileScript, formatError } = await import('../script/index.js');
      const r = compileScript(text, { name });
      for (const w of r.warnings || []) io.err(formatError(text, w, { file: input }));
      if (!r.ok) throw new Error(`${input} does not compile\n${r.errors.map((e) => formatError(text, e, { file: input })).join('\n')}`);
      return { icon: r.icon, name, variant: undefined };
    }
    if (!lintSvg(text).length) {
      const body = /<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/.exec(text.trim())[1].trim();
      return { icon: { name, body, tags: [], categories: [] }, name, variant: undefined };
    }
    const r = foxify(text);
    io.err(`${input} does not follow the icon rules, converted with Fox-ify first`);
    for (const p of r.problems) io.err(`[${p.rule}] ${p.message}`);
    return { icon: { name, body: r.body, tags: [], categories: [] }, name, variant: undefined };
  }
  const props = deps.props || {};
  const icon = deps.resolve(input, { weight: props.weight, gap: props.gap });
  return { icon, name: slug(input), variant: parseSpec(input).variant };
}

async function script(args, flags, io) {
  const input = args[0];
  if (!input) throw new Error('usage: glyphfox script <file.gfs> [--out icon.svg] [--json] [--check]');
  const file = resolvePath(io.cwd, input);
  if (!existsSync(file)) throw new Error(`no such file: ${input}`);
  const source = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const { compileScript, formatError } = await import('../script/index.js');
  const r = compileScript(source, { name: basename(file, extname(file)) });
  if (flags.json) {
    io.log(JSON.stringify({ ok: r.ok, svg: r.ok ? r.svg : '', errors: r.errors, warnings: r.warnings, meta: r.meta }, null, 2));
    return r.ok ? 0 : 1;
  }
  for (const w of r.warnings || []) io.err(formatError(source, w, { file: input }));
  if (!r.ok) {
    for (const e of r.errors) io.err(formatError(source, e, { file: input }));
    io.err(`${input}: ${plural(r.errors.length, 'error')}`);
    return 1;
  }
  if (flags.check) {
    const n = (r.body.match(/<[a-z]+/g) || []).length;
    io.log(`${input}: ok, ${plural(n, 'element')}, passes the icon rules`);
    return 0;
  }
  if (given(flags.out)) {
    writeOut(io, String(flags.out), r.svg.endsWith('\n') ? r.svg : r.svg + '\n');
    io.err(`wrote ${flags.out}`);
  } else io.log(r.svg.trimEnd());
  return 0;
}

async function scan(args, flags, io, deps) {
  const target = resolvePath(io.cwd, args[0] || '.');
  if (!existsSync(target)) throw new Error(`no such file or directory: ${args[0]}`);
  const { formatReport, scanFiles, subsetEsm, subsetSprite } = await import('../export/scan.js');
  const names = deps.iconNames;
  let report;
  if (statSync(target).isFile()) {
    report = scanFiles([{ file: shown(io, target), text: readFileSync(target, 'utf8') }], { names });
  } else {
    const { scanDir } = await import('../export/scan-fs.js');
    report = scanDir(target, { names });
  }
  if (flags.json) io.log(JSON.stringify(report, null, 2));
  else io.log(formatReport(report, { color: io.color === true }));
  const type = str(flags, 'type', '');
  if (type) {
    const icons = report.used.map((n) => deps.getIcon(n)).filter(Boolean);
    let text;
    let def;
    if (type === 'esm' || type === 'js') {
      text = subsetEsm(icons);
      def = 'glyphfox-icons.js';
    } else if (type === 'sprite') {
      text = subsetSprite(icons);
      def = 'glyphfox-sprite.svg';
    } else throw new RangeError(`unknown subset type "${type}" (use sprite or esm)`);
    const file = writeOut(io, str(flags, 'out', def), text);
    io.err(`wrote ${shown(io, file)} with ${plural(icons.length, 'icon')}`);
  }
  if (report.unknown.length) return 1;
  if (flags.strict && report.a11y.length) return 1;
  return 0;
}

async function favicon(args, flags, io, deps) {
  const props = deps.props || {};
  const { icon, name, variant } = await loadInput(args[0], io, deps);
  const { faviconKit } = await import('../export/favicon.js');
  const animate = props.animate || (props.morphTo ? 'morph' : 'pulse');
  let morphTo;
  if (animate === 'morph') {
    if (!props.morphTo) throw new Error('the morph animation needs --morph-to <spec>');
    morphTo = (await loadInput(String(props.morphTo), io, deps)).icon;
  }
  const background = str(flags, 'background', null);
  const frames = num(flags, 'frames', 24);
  const files = faviconKit(icon, {
    animate,
    morphTo,
    frames,
    fps: num(flags, 'fps', 12),
    duration: props.duration,
    color: props.color || '#ff7a1a',
    background: background === 'none' ? null : background,
    radius: num(flags, 'radius', 7),
    weight: props.weight ?? 2,
    variant: props.variant || variant || 'outline',
    loop: !flags.once,
    autostart: !flags['no-autostart'],
    deflate,
  });
  const dir = outDir(io, flags, 'favicon');
  const k = writeFiles(io, dir, files);
  io.err(`wrote ${plural(k, 'file')} in ${shown(io, dir)} (${name}, ${animate}, ${plural(frames, 'frame')})`);
  return 0;
}

async function cursor(args, flags, io, deps) {
  const props = deps.props || {};
  const { icon, name, variant } = await loadInput(args[0], io, deps);
  const { cursorKit } = await import('../export/cursor.js');
  const outline = str(flags, 'outline', '#ffffff');
  const kit = cursorKit(icon, {
    name: str(flags, 'name', name),
    hotspot: str(flags, 'hotspot', 'center'),
    color: props.color || '#111111',
    outline: outline === 'none' ? null : outline,
    outlineWidth: num(flags, 'outline-width', 1.5),
    weight: props.weight ?? 2,
    variant: props.variant || variant || 'outline',
    fallback: str(flags, 'fallback', 'auto'),
    inline: Boolean(flags.inline),
    deflate,
  });
  const dir = outDir(io, flags, 'cursor');
  const k = writeFiles(io, dir, kit.files);
  io.log(kit.css.trimEnd());
  io.err(`wrote ${plural(k, 'file')} in ${shown(io, dir)} (hotspot ${kit.hotspot.join(' ')} at 32 px)`);
  return 0;
}

const gLines = (s) => String(s).split(/\\n|\r?\n/);

function pair(v, def) {
  if (!given(v)) return def;
  const m = /^\s*(-?\d*\.?\d+)\s*[,\s]\s*(-?\d*\.?\d+)\s*$/.exec(String(v));
  if (!m) throw new RangeError(`--origin must be "x,y" in mm (got "${v}")`);
  return [Number(m[1]), Number(m[2])];
}

async function plot(args, flags, io, deps) {
  const { icon, name } = await loadInput(args[0], io, deps);
  const { plotPaths, toGcode, toPlotSvg } = await import('../export/plotter.js');
  const format = str(flags, 'format', 'svg');
  const size = num(flags, 'size', 50);
  const base = { size, tolerance: num(flags, 'tolerance', 0.05), optimize: !flags['no-optimize'] };
  const flipY = !flags['no-flip'];
  let text;
  let start = [0, 0];
  if (format === 'svg') text = toPlotSvg(icon, { ...base, penWidth: num(flags, 'pen-width', 0.3) });
  else if (format === 'gcode' || format === 'nc') {
    start = flipY ? [0, size] : [0, 0];
    text = toGcode(icon, {
      ...base,
      feed: num(flags, 'feed', 1500),
      travelFeed: num(flags, 'travel-feed', 3000),
      penUp: gLines(str(flags, 'pen-up', 'G0 Z5')),
      penDown: gLines(str(flags, 'pen-down', 'G1 Z0 F500')),
      dwell: num(flags, 'dwell', 0),
      origin: pair(flags.origin, [0, 0]),
      flipY,
      decimals: num(flags, 'decimals', 3),
    });
  } else throw new RangeError(`unknown plot format "${format}" (use svg or gcode)`);
  const plan = plotPaths(icon, { ...base, start });
  if (given(flags.out)) {
    writeOut(io, String(flags.out), text);
    io.err(`wrote ${flags.out}`);
  } else io.log(text.trimEnd());
  io.err(`${name}: ${plural(plan.lifts, 'stroke')}, draw ${fixed(plan.draw)} mm, travel ${fixed(plan.travel)} mm (${fixed(plan.travelBefore)} mm in source order)`);
  return 0;
}

async function stl(args, flags, io, deps) {
  const props = deps.props || {};
  const { icon, name, variant } = await loadInput(args[0], io, deps);
  const { meshStats, stlMesh, toStl } = await import('../export/stl.js');
  const style = str(flags, 'bevel-style', 'chamfer');
  if (style !== 'chamfer' && style !== 'round') throw new RangeError(`--bevel-style must be chamfer or round (got "${style}")`);
  const kind = props.variant || variant || 'outline';
  if (kind !== 'outline' && kind !== 'solid') throw new RangeError(`STL takes the outline or the solid style (got "${kind}")`);
  const options = {
    size: num(flags, 'size', 48),
    thickness: num(flags, 'thickness', 3),
    bevel: num(flags, 'bevel', 0),
    bevelStyle: style,
    variant: kind,
    resolution: num(flags, 'resolution', 6),
    weight: props.weight ?? 2,
    name,
  };
  const data = toStl(icon, { ...options, format: flags.ascii ? 'ascii' : 'binary' });
  const stats = meshStats(stlMesh(icon, options));
  const file = writeOut(io, str(flags, 'out', `${name}.stl`), data);
  const box = stats.bounds.max.map((v, d) => fixed(v - stats.bounds.min[d]));
  io.err(`wrote ${shown(io, file)}: ${plural(stats.triangles, 'triangle')}, ${fixed(stats.volume)} mm3, ${box.join(' x ')} mm, ${stats.watertight ? 'watertight' : 'not watertight'}`);
  return 0;
}

/**
 * Runs one of COMMANDS and resolves to the exit code. deps: { resolve,
 * iconNames, getIcon, props } (props are the shared props read from the
 * flags). Errors are thrown; index.js prints them.
 */
export async function runCommand(cmd, args, flags, io, deps = {}) {
  switch (cmd) {
    case 'script':
      return script(args, flags, io);
    case 'scan':
      return scan(args, flags, io, deps);
    case 'favicon':
      return favicon(args, flags, io, deps);
    case 'cursor':
      return cursor(args, flags, io, deps);
    case 'plot':
      return plot(args, flags, io, deps);
    case 'stl':
      return stl(args, flags, io, deps);
    default:
      throw new Error(`unknown command "${cmd}"`);
  }
}
