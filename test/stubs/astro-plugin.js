// Compiles .astro files for the tests with the Astro compiler, the way the
// Astro Vite plugin does, so the Container API can render the components of
// glyphfox/astro without a full Astro project.

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export function astroForTests() {
  let compiler;
  return {
    name: 'glyphfox-astro-tests',
    enforce: 'pre',
    async transform(code, id) {
      const file = id.split('?')[0];
      if (!file.endsWith('.astro')) return null;
      if (!compiler) {
        const astro = createRequire(import.meta.url).resolve('astro/package.json');
        compiler = await import(pathToFileURL(createRequire(astro).resolve('@astrojs/compiler-rs')).href);
      }
      const result = compiler.transform(code, {
        filename: file,
        normalizedFilename: file,
        internalURL: 'astro/compiler-runtime',
        resultScopedSlot: true,
        resolvePath: (specifier) => specifier,
      });
      const errors = (result.diagnostics || []).filter((d) => d.severity === 'error');
      if (errors.length) throw new Error(`${file}: ${errors.map((d) => d.text).join('; ')}`);
      const { transform } = await import('esbuild');
      const js = await transform(result.code, { loader: 'ts', format: 'esm', sourcefile: file });
      return { code: js.code, map: null };
    },
  };
}
