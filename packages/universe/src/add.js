// add(): the `glyphfox add prefix:name [...]` command. Resolves the icons and
// merges them into an offline module (default src/glyphfox-universe.js) that
// registers them with glyphfox-universe, with the license of every set used
// in its header. The glyphfox CLI calls it:
//
//   import { add } from 'glyphfox-universe/add';
//   const r = await add(['mdi:home', 'lucide:rocket'], { out: 'src/icons.js' });

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { moduleCode, namesInModule, resolveBundle } from './bundle.js';
import { parseName } from './node.js';

export const ADD_USAGE = 'glyphfox add <prefix:name> [more names] [--out src/glyphfox-universe.js]';

/**
 * Adds icons to the offline module. Returns { file, added, kept, missing, invalid, total }.
 * Options: out (file, default src/glyphfox-universe.js), cwd, from (import path of the runtime).
 */
export async function add(names, { out = 'src/glyphfox-universe.js', cwd = process.cwd(), from } = {}) {
  const file = resolve(cwd, out);
  const before = existsSync(file) ? namesInModule(readFileSync(file, 'utf8')) : [];
  const invalid = names.filter((n) => !parseName(n));
  const wanted = names.filter((n) => parseName(n)).map((n) => n.trim().toLowerCase());
  const bundle = await resolveBundle([...before, ...wanted]);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, moduleCode(bundle, from ? { from } : undefined));
  const total = Object.keys(bundle.icons).length;
  return {
    file,
    added: wanted.filter((n) => !before.includes(n) && bundle.icons[n]),
    kept: before.filter((n) => bundle.icons[n]),
    missing: bundle.missing,
    invalid,
    total,
  };
}

/** Command line wrapper: parses argv, prints a summary, returns the exit code. */
export async function addCommand(argv, { log = console.log, error = console.error } = {}) {
  const names = [];
  let out;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' || argv[i] === '-o') out = argv[++i];
    else names.push(argv[i]);
  }
  if (!names.length) {
    error(`usage: ${ADD_USAGE}`);
    return 1;
  }
  const r = await add(names, out ? { out } : {});
  for (const n of r.added) log(`added ${n}`);
  for (const n of [...r.missing, ...r.invalid]) error(`not found: ${n}`);
  log(`${r.total} icon${r.total === 1 ? '' : 's'} in ${r.file}`);
  return r.missing.length || r.invalid.length ? 1 : 0;
}
