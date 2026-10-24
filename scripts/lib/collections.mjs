// Generates the collections of the glyphfox package (glyphfox/collections):
// one data module per icon in dist/icons/<id>/, a record per collection
// resolved by name in the core, and the component modules of React, Vue and
// Svelte. The components are reached through deep imports and a
// <framework>/collections entry, so the default entries stay as they are.

import { join } from 'node:path';

const json = (v) => JSON.stringify(v);
const short = (name) => name.slice(name.indexOf('/') + 1);
const title = (id) => id[0].toUpperCase() + id.slice(1);

/** Data modules, dist/collections.js and its types. */
export function writeCollectionData({ dist, collections, write }) {
  const list = collections.flatMap((c) => c.icons);
  for (const icon of list) {
    write(join(dist, 'icons', `${icon.name}.js`), `export default ${json(icon)};\n`);
    write(join(dist, 'icons', `${icon.name}.d.ts`), `import type { IconData } from '../../index.js';\ndeclare const icon: IconData<${json(icon.name)}>;\nexport default icon;\n`);
  }
  const lines = list.map((ic, k) => `import c${k} from './icons/${ic.name}.js';`);
  lines.push('');
  for (const c of collections) {
    lines.push(`/** The ${c.id} collection (${c.grid} grid), keyed by short name. */`);
    lines.push(`export const ${c.id} = {`, ...c.icons.map((ic) => `  ${json(short(ic.name))}: c${list.indexOf(ic)},`), '};');
  }
  lines.push('', '/** Every collection with its grid. */', 'export const collections = {', ...collections.map((c) => `  ${c.id}: { id: ${json(c.id)}, grid: ${c.grid}, icons: ${c.id} },`), '};');
  lines.push('/** Collection icons keyed by their full name ("display/calendar-clock"). */', 'export const collectionIcons = {', ...list.map((ic, k) => `  ${json(ic.name)}: c${k},`), '};');
  lines.push('export const collectionNames = Object.keys(collectionIcons);', '');
  write(join(dist, 'collections.js'), lines.join('\n'));
  const union = (c) => c.icons.map((ic) => json(short(ic.name))).join(' | ') || 'never';
  write(
    join(dist, 'collections.d.ts'),
    [
      "import type { CollectionIconName, IconData } from './index.js';",
      '',
      ...collections.map((c) => `export type ${title(c.id)}IconName = ${union(c)};`),
      'export interface IconCollection<N extends string> {',
      '  id: string;',
      '  /** The drawing grid: 48 for display, 24 for isometric. */',
      '  grid: number;',
      '  icons: Record<N, IconData>;',
      '}',
      ...collections.map((c) => `export declare const ${c.id}: Record<${title(c.id)}IconName, IconData>;`),
      'export declare const collections: {',
      ...collections.map((c) => `  ${c.id}: IconCollection<${title(c.id)}IconName>;`),
      '};',
      'export declare const collectionIcons: Record<CollectionIconName, IconData>;',
      'export declare const collectionNames: CollectionIconName[];',
      '',
    ].join('\n'),
  );
  return list;
}

/**
 * Component modules for one framework: <fw>/icons/<id>/<name>.js (deep
 * import) and the <fw>/collections barrel with its types.
 */
export function writeCollectionComponents({ dist, collections, write, componentName }, fw, type, directive = '') {
  const list = collections.flatMap((c) => c.icons);
  const dir = join(dist, fw);
  for (const icon of list) {
    const comp = componentName(icon.name);
    write(
      join(dir, 'icons', `${icon.name}.js`),
      `${directive}import { createIcon } from '../../runtime.js';\nimport icon from '../../../icons/${icon.name}.js';\n\nexport const ${comp} = /*#__PURE__*/ createIcon(icon);\nexport default ${comp};\n`,
    );
    write(join(dir, 'icons', `${icon.name}.d.ts`), `import type { ${type} } from '../../index.js';\nexport declare const ${comp}: ${type};\nexport default ${comp};\n`);
  }
  write(join(dir, 'collections.js'), `${directive}${list.map((ic) => `export { ${componentName(ic.name)} } from './icons/${ic.name}.js';`).join('\n')}\n`);
  write(join(dir, 'collections.d.ts'), `import type { ${type} } from './index.js';\n${list.map((ic) => `export declare const ${componentName(ic.name)}: ${type};`).join('\n')}\n`);
}

/** Svelte components: .svelte sources compiled by the app. */
export function writeSvelteCollections({ dist, collections, write, componentName }) {
  const list = collections.flatMap((c) => c.icons);
  const dir = join(dist, 'svelte');
  for (const icon of list) {
    write(
      join(dir, 'icons', `${icon.name}.svelte`),
      `<script module>\n  import icon from '../../../icons/${icon.name}.js';\n  import { registerIcons } from '../../glyph.js';\n\n  registerIcons([icon]);\n</script>\n\n<script>\n  import Icon from '../../Icon.svelte';\n\n  let props = $props();\n</script>\n\n<Icon {...props} {icon} />\n`,
    );
    write(join(dir, 'icons', `${icon.name}.svelte.d.ts`), `import type { Component } from 'svelte';\nimport type { GlyphProps } from '../../index.js';\ndeclare const Icon: Component<GlyphProps>;\nexport default Icon;\n`);
  }
  write(join(dir, 'collections.js'), `${list.map((ic) => `export { default as ${componentName(ic.name)} } from './icons/${ic.name}.svelte';`).join('\n')}\n`);
  write(join(dir, 'collections.d.ts'), `import type { Component } from 'svelte';\nimport type { GlyphProps } from './index.js';\n${list.map((ic) => `export declare const ${componentName(ic.name)}: Component<GlyphProps>;`).join('\n')}\n`);
}
