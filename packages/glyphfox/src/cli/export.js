// `glyphfox export <target>`: native assets for Android, Jetpack Compose,
// iOS, SwiftUI and Flutter, built by ../native-export and written here.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve as resolvePath } from 'node:path';
import { iconNames } from '../index.js';
import { NATIVE_TARGETS, exportNative } from '../native-export/index.js';

export const EXPORT_USAGE = `usage: glyphfox export <${NATIVE_TARGETS.join('|')}> <specs...> [--from file] [--all] [--out dir]`;

function readList(file, cwd) {
  const names = [];
  for (const line of readFileSync(resolvePath(cwd, file), 'utf8').split(/\r?\n/)) {
    const t = line.replace(/#.*$/, '').trim();
    if (t) names.push(...t.split(/[\s,]+/));
  }
  return names;
}

/** Runs `glyphfox export`; args are the positionals after "export". Returns the exit code. */
export function exportCommand(args, flags, props, io) {
  // A bare --all may have taken the next word as its value.
  const words = typeof flags.all === 'string' ? [...args, flags.all] : [...args];
  const [target, ...names] = words;
  if (!target) throw new Error(EXPORT_USAGE);
  if (!NATIVE_TARGETS.includes(target)) throw new Error(`unknown export target "${target}" (use ${NATIVE_TARGETS.join(', ')})`);
  const specs = flags.all ? [...iconNames] : [...names, ...(flags.from ? readList(flags.from, io.cwd) : [])];
  if (!specs.length) throw new Error(EXPORT_USAGE);
  let dir = resolvePath(io.cwd, flags.out || '.');
  const options = { ...props, prefix: flags.prefix, package: flags.package, rendering: flags.rendering, assets: flags.assets, gap: flags.gap === undefined ? undefined : Number(flags.gap) };
  if ((target === 'ios' || target === 'swiftui') && /\.xcassets[\\/]*$/i.test(dir)) {
    // --out points at an existing catalog (such as Assets.xcassets): add the image sets to it.
    options.catalog = basename(dir.replace(/[\\/]+$/, ''));
    dir = dirname(dir);
  }
  const { files, notes, count } = exportNative(target, specs, options);
  let written = 0;
  for (const [rel, text] of Object.entries(files)) {
    const file = join(dir, rel);
    // Keep the root Contents.json of a catalog that already exists.
    if (/\.xcassets\/Contents\.json$/.test(rel) && existsSync(file)) continue;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    written++;
  }
  for (const n of notes) io.err(n);
  io.err(`exported ${count} icon${count === 1 ? '' : 's'} for ${target} in ${flags.out || '.'} (${written} file${written === 1 ? '' : 's'})`);
  return 0;
}
