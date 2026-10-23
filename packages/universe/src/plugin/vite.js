// Vite plugin (also works in Rollup and Rolldown): bundles the universe
// icons a project uses for offline builds. Import the virtual module once:
//
//   import { glyphfoxUniverse } from 'glyphfox-universe/vite';
//   export default { plugins: [glyphfoxUniverse({ include: ['src'] })] };
//
//   // main.js
//   import 'virtual:glyphfox-universe';
//
// Names are found in the files under `include` and in every module the build
// transforms; `icons` adds names that are built at runtime, and `prefixes`
// limits the scan to some sets.

import { VIRTUAL_ID, moduleCode, resolveBundle, scanCode, scanFiles } from '../bundle.js';

const RESOLVED = `\0${VIRTUAL_ID}`;

export function glyphfoxUniverse(options = {}) {
  const { include = ['src'], icons = [], extensions, prefixes } = options;
  const known = prefixes ? new Set(prefixes) : undefined;
  const names = new Set(icons);
  let root = process.cwd();
  let server = null;
  let lastCode = '';
  return {
    name: 'glyphfox-universe',
    enforce: 'pre',
    configResolved(config) {
      root = config.root || root;
    },
    configureServer(s) {
      server = s;
    },
    buildStart() {
      for (const n of scanFiles(include, { cwd: root, extensions, prefixes })) names.add(n);
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED : null;
    },
    async load(id) {
      if (id !== RESOLVED) return null;
      const bundle = await resolveBundle(names);
      for (const m of bundle.missing) this.warn(`glyphfox universe: no icon named "${m}"`);
      lastCode = moduleCode(bundle);
      return lastCode;
    },
    transform(code, id) {
      if (id === RESOLVED || id.includes('node_modules')) return null;
      let added = false;
      for (const n of scanCode(code, known)) {
        if (!names.has(n)) {
          names.add(n);
          added = true;
        }
      }
      if (added && server) {
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.reloadModule(mod);
      }
      return null;
    },
    api: { names, code: () => lastCode },
  };
}

export default glyphfoxUniverse;
