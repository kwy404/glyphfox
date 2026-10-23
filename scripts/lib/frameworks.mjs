// Generates the framework entry points of the glyphfox package: React, Vue,
// Svelte, the web component (module and CDN builds), Tailwind, the plain
// HTML runtime and the CLI.

import { cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function buildFrameworks({ dist, src, icons, version, write, esbuild, componentName }) {
  const read = (p) => readFileSync(join(src, p), 'utf8');
  const types = (file, components) => read(join('types', file)).replace('/*COMPONENTS*/', components);
  const bundle = (entry, outfile, options = {}) =>
    esbuild.build({ entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'neutral', target: 'es2019', logLevel: 'error', ...options });

  // React and Vue share the same layout.
  for (const fw of ['react', 'vue']) {
    const dir = join(dist, fw);
    write(join(dir, 'runtime.js'), read(join(fw, 'runtime.js')));
    for (const icon of icons) {
      const comp = componentName(icon.name);
      write(
        join(dir, 'icons', `${icon.name}.js`),
        `import { createIcon } from '../runtime.js';\nimport icon from '../../icons/${icon.name}.js';\n\nexport const ${comp} = /*#__PURE__*/ createIcon(icon);\nexport default ${comp};\n`,
      );
      const t = fw === 'react' ? 'GlyphIconComponent' : 'GlyphComponent';
      write(join(dir, 'icons', `${icon.name}.d.ts`), `import type { ${t} } from '../index.js';\nexport declare const ${comp}: ${t};\nexport default ${comp};\n`);
    }
    write(
      join(dir, 'index.js'),
      `export * from './runtime.js';\nexport * from '../smart/${fw}.js'; // smart icons hook (src/smart)\n${icons.map((ic) => `export { ${componentName(ic.name)} } from './icons/${ic.name}.js';`).join('\n')}\n`,
    );
    const t = fw === 'react' ? 'GlyphIconComponent' : 'GlyphComponent';
    const d = types(`${fw}.d.ts`, icons.map((ic) => `export declare const ${componentName(ic.name)}: ${t};`).join('\n'));
    write(join(dir, 'index.d.ts'), d);
    write(join(dir, 'index.d.cts'), d);
    await bundle(join(dir, 'index.js'), join(dir, 'index.cjs'), { external: [fw] });
  }

  // Svelte: ship .svelte sources (compiled by the app).
  {
    const dir = join(dist, 'svelte');
    for (const f of ['Icon.svelte', 'Fusion.svelte', 'MorphIcon.svelte', 'glyph.js']) write(join(dir, f), read(join('svelte', f)));
    for (const icon of icons) {
      write(
        join(dir, 'icons', `${icon.name}.svelte`),
        `<script module>\n  import icon from '../../icons/${icon.name}.js';\n  import { registerIcons } from '../glyph.js';\n\n  registerIcons([icon]);\n</script>\n\n<script>\n  import Icon from '../Icon.svelte';\n\n  let props = $props();\n</script>\n\n<Icon {...props} {icon} />\n`,
      );
      write(join(dir, 'icons', `${icon.name}.svelte.d.ts`), `import type { Component } from 'svelte';\nimport type { GlyphProps } from '../index.js';\ndeclare const Icon: Component<GlyphProps>;\nexport default Icon;\n`);
    }
    write(
      join(dir, 'index.js'),
      [
        "export { default as Icon } from './Icon.svelte';",
        "export { default as Fusion } from './Fusion.svelte';",
        "export { default as MorphIcon } from './MorphIcon.svelte';",
        "export { morphStore, registerIcons } from './glyph.js';",
        "export * from '../smart/svelte/index.js'; // smart icons hook (src/smart)",
        ...icons.map((ic) => `export { default as ${componentName(ic.name)} } from './icons/${ic.name}.svelte';`),
        '',
      ].join('\n'),
    );
    write(join(dir, 'index.d.ts'), types('svelte.d.ts', icons.map((ic) => `export declare const ${componentName(ic.name)}: Component<GlyphProps>;`).join('\n')));
  }

  // Web component.
  {
    const dir = join(dist, 'web');
    write(join(dir, 'element.js'), read(join('web', 'element.js')));
    write(join(dir, 'element.d.ts'), read(join('types', 'web.d.ts')));
    write(
      join(dir, 'index.js'),
      "import { icons } from '../registry.js';\nimport { registerIcons } from '../core/lookup.js';\nimport { GlyphFoxElement, defineGlyphFox } from './element.js';\nimport { defineSmartElements } from '../smart/web.js'; // smart icons hook (src/smart)\n\nregisterIcons(icons);\ndefineGlyphFox();\ndefineSmartElements();\n\nexport { GlyphFoxElement, defineGlyphFox };\nexport * from '../smart/web.js';\n",
    );
    write(join(dir, 'index.d.ts'), read(join('types', 'web.d.ts')) + "export * from '../smart/web.js'; // smart icons hook (src/smart)\n");
    write(join(dir, 'cdn.js'), read(join('web', 'cdn.js')));
    const banner = `/*! glyphfox ${version} | MIT | Alexandre Kohler | https://github.com/kwy404/glyphfox */`;
    await esbuild.build({
      entryPoints: [join(dir, 'cdn.js')],
      outfile: join(dir, 'glyphfox.min.js'),
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2019',
      minify: true,
      banner: { js: banner },
      logLevel: 'error',
    });
    await esbuild.build({
      entryPoints: [join(dir, 'cdn.js')],
      outfile: join(dir, 'glyphfox.esm.js'),
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2019',
      minify: true,
      banner: { js: banner },
      logLevel: 'error',
    });
  }

  // Tailwind plugin.
  {
    const dir = join(dist, 'tailwind');
    write(join(dir, 'index.js'), read(join('tailwind', 'index.js')));
    write(join(dir, 'index.d.ts'), read(join('types', 'tailwind.d.ts')));
    write(join(dir, 'index.d.cts'), read(join('types', 'tailwind.d.ts')));
    await bundle(join(dir, 'index.js'), join(dir, 'index.cjs'), {
      platform: 'node',
      footer: { js: 'module.exports = Object.assign(module.exports.default, module.exports);' },
    });
  }

  // Plain HTML runtime: <script type="module" src="glyphfox/runtime">.
  write(join(dist, 'runtime', 'auto.js'), "import { replaceGlyphs } from '../index.js';\n\nconst run = () => replaceGlyphs(document, { observe: true });\nif (typeof document !== 'undefined') {\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });\n  else run();\n}\n\nexport { replaceGlyphs };\n");
  write(join(dist, 'runtime', 'auto.d.ts'), "export { replaceGlyphs } from '../index.js';\n");

  // Tools (lint, Fox-ify) and the CLI.
  write(join(dist, 'tools.js'), "export { lintSvg, lintBody, canonicalSvg } from './core/lint.js';\nexport { foxify, parseTransform } from './core/foxify.js';\nexport { parseXml } from './core/xml.js';\n");
  write(
    join(dist, 'tools.d.ts'),
    "export interface LintProblem { rule: string; message: string }\nexport declare function lintSvg(svg: string): LintProblem[];\nexport declare function lintBody(body: string): LintProblem[];\nexport declare function canonicalSvg(body: string): string;\nexport declare function foxify(svg: string, options?: { snap?: number; fit?: 'auto' | 'viewbox' | 'content'; padding?: number }): { svg: string; body: string; problems: LintProblem[]; notes: string[] };\nexport declare function parseTransform(transform: string): [number, number, number, number, number, number];\n",
  );
  cpSync(join(src, 'cli'), join(dist, 'cli'), { recursive: true });
}
