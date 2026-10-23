// webpack 5 and Rspack plugin: bundles the universe icons a project uses for
// offline builds. Before each compilation it scans `include`, resolves the
// names and writes a module that `virtual:glyphfox-universe` points to.
//
//   const { GlyphfoxUniversePlugin } = require('glyphfox-universe/webpack');
//   plugins: [new GlyphfoxUniversePlugin({ include: ['src'] })]
//
//   // main.js
//   import 'virtual:glyphfox-universe';

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { VIRTUAL_ID, moduleCode, resolveBundle, scanFiles } from '../bundle.js';

export class GlyphfoxUniversePlugin {
  constructor(options = {}) {
    this.options = { include: ['src'], icons: [], ...options };
  }

  /** Scans, resolves and writes the module; returns its path. */
  async write(context) {
    const { include, icons, extensions, prefixes } = this.options;
    const names = new Set(icons);
    for (const n of scanFiles(include, { cwd: context, extensions, prefixes })) names.add(n);
    const bundle = await resolveBundle(names);
    this.missing = bundle.missing;
    const file = resolve(context, this.options.output || join('node_modules', '.glyphfox-universe', 'icons.js'));
    const code = moduleCode(bundle);
    if (!existsSync(file) || readFileSync(file, 'utf8') !== code) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, code);
    }
    return file;
  }

  apply(compiler) {
    const context = compiler.options.context || process.cwd();
    const file = resolve(context, this.options.output || join('node_modules', '.glyphfox-universe', 'icons.js'));
    compiler.options.resolve = compiler.options.resolve || {};
    const alias = compiler.options.resolve.alias;
    if (Array.isArray(alias)) alias.push({ name: VIRTUAL_ID, alias: file });
    else compiler.options.resolve.alias = { ...(alias || {}), [VIRTUAL_ID]: file };
    const run = async () => {
      await this.write(context);
    };
    compiler.hooks.beforeRun.tapPromise('GlyphfoxUniversePlugin', run);
    compiler.hooks.watchRun.tapPromise('GlyphfoxUniversePlugin', run);
  }
}

export default GlyphfoxUniversePlugin;
