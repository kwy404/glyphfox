#!/usr/bin/env node
// glyphfox build: reads icons/, optimizes them and generates every package
// output plus the data used by the studio site.
//
//   node scripts/build.mjs                 full build
//   node scripts/build.mjs --check         fail when docs/ data is out of date
//   node scripts/build.mjs --skip-invalid  warn about broken icons instead of failing

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readIcons } from './lib/icons.mjs';
import { buildFrameworks } from './lib/frameworks.mjs';
import { buildDocsData } from './lib/docs.mjs';
import { componentName, dataName } from '../packages/glyphfox/src/core/formats.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const pkgDir = join(root, 'packages', 'glyphfox');
const src = join(pkgDir, 'src');
const dist = join(pkgDir, 'dist');

const t0 = Date.now();
const { icons, problems } = readIcons(join(root, 'icons'));
if (problems.length) {
  for (const p of problems) console.error(p);
  if (!args.has('--skip-invalid')) {
    console.error(`${problems.length} problem(s) in icons/`);
    process.exit(1);
  }
  console.warn(`skipped invalid icons (${problems.length} problem(s))`);
}
if (!icons.length) {
  console.error('no icons found in icons/');
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;

if (args.has('--check')) {
  const changed = await buildDocsData(root, icons, { version, check: true });
  if (changed.length) {
    console.error(`docs data is out of date: ${changed.join(', ')}\nrun: npm run build`);
    process.exit(1);
  }
  console.log(`docs data is up to date (${icons.length} icons)`);
  process.exit(0);
}

export const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};

// Core package.
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(src, 'core'), join(dist, 'core'), { recursive: true });
write(join(dist, 'core', 'index.d.ts'), readFileSync(join(src, 'types', 'core.d.ts'), 'utf8'));
write(join(dist, 'api.js'), readFileSync(join(src, 'api.js'), 'utf8'));

const json = (v) => JSON.stringify(v);
for (const icon of icons) {
  write(join(dist, 'icons', `${icon.name}.js`), `export default ${json(icon)};\n`);
  write(join(dist, 'icons', `${icon.name}.d.ts`), `import type { IconData } from '../index.js';\ndeclare const icon: IconData<${json(icon.name)}>;\nexport default icon;\n`);
}
write(
  join(dist, 'registry.js'),
  icons.map((ic, k) => `import i${k} from './icons/${ic.name}.js';`).join('\n') + `\n\nexport const icons = {\n${icons.map((ic, k) => `  ${json(ic.name)}: i${k},`).join('\n')}\n};\n`,
);
write(
  join(dist, 'index.js'),
  `export * from './api.js';\n${icons.map((ic) => `export { default as ${dataName(ic.name)} } from './icons/${ic.name}.js';`).join('\n')}\n`,
);
const types = readFileSync(join(src, 'types', 'index.d.ts'), 'utf8')
  .replace('/*ICON_NAMES*/', icons.map((ic) => json(ic.name)).join(' | '))
  .replace('/*ICON_EXPORTS*/', icons.map((ic) => `export declare const ${dataName(ic.name)}: IconData<${json(ic.name)}>;`).join('\n'));
write(join(dist, 'index.d.ts'), types);
write(join(dist, 'index.d.cts'), types);
write(join(dist, 'icons.json'), JSON.stringify(Object.fromEntries(icons.map((ic) => [ic.name, ic])), null, 0) + '\n');
write(
  join(dist, 'sprite.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg">\n${icons
    .map((ic) => `<symbol id="gf-${ic.name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.body}</symbol>`)
    .join('\n')}\n</svg>\n`,
);
write(join(dist, 'styles.css'), readFileSync(join(src, 'styles.css'), 'utf8'));
// npm shows the README of the published folder: copy the root README and LICENSE.
write(join(pkgDir, 'README.md'), readFileSync(join(root, 'README.md'), 'utf8'));
write(join(pkgDir, 'LICENSE'), readFileSync(join(root, 'LICENSE'), 'utf8'));

const esbuild = await import('esbuild');
await esbuild.build({
  entryPoints: [join(dist, 'index.js')],
  outfile: join(dist, 'index.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'neutral',
  target: 'es2019',
  logLevel: 'error',
});

await buildFrameworks({ root, dist, src, icons, version, write, esbuild, componentName, dataName });
const changed = await buildDocsData(root, icons, { version, check: false });

const count = (dir) => {
  let n = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name));
      else {
        n++;
        bytes += readFileSync(join(d, e.name)).length;
      }
    }
  };
  walk(dir);
  return { n, bytes };
};
const c = count(dist);
console.log(`built ${icons.length} icons into ${relative(root, dist)} (${c.n} files, ${(c.bytes / 1024).toFixed(0)} KB) and docs data${changed.length ? ` (${changed.length} updated)` : ''} in ${Date.now() - t0} ms`);
if (!existsSync(join(dist, 'web', 'glyphfox.min.js'))) process.exitCode = 1;
