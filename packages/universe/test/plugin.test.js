// Offline builds: name scanning, the bundle module with its license header,
// the Vite plugin in a real build, the webpack and Rspack plugin, add() and
// the glyphfox icon source.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as U from '../src/node.js';
import { scanCode, moduleCode, namesInModule, resolveBundle, VIRTUAL_ID } from '../src/bundle.js';
import { glyphfoxUniverse } from '../src/plugin/vite.js';
import { GlyphfoxUniversePlugin } from '../src/plugin/webpack.js';
import { add, addCommand } from '../src/add.js';
import { toGlyphfox, universeSource, registerUniverse } from '../src/glyphfox.js';
import { fixtureCatalog, strokeSet, fillSet } from './fixtures.js';

const known = new Set(['tst', 'fil', 'mdi']);
const tmp = mkdtempSync(join(tmpdir(), 'gf-universe-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

beforeEach(() => {
  U.reset();
  U.configure({ offline: true });
  U.setCatalog(fixtureCatalog());
  U.addSetData('tst', strokeSet);
  U.addSetData('fil', fillSet);
});

describe('scanning', () => {
  it('finds prefix:name tokens of shipped sets only', () => {
    const code = `
      <Icon name="tst:home" /> <glyph-fox name="fil:star+check@tr"></glyph-fox>
      toSvg('tst:arrow-left'); const fused = 'cloud&tst:back:side';
      const url = 'https://example.com/a:b'; const css = 'a:hover'; const t = 'nope:thing';
    `;
    expect([...scanCode(code, known)].sort()).toEqual(['fil:star', 'tst:arrow-left', 'tst:back', 'tst:home']);
  });

  it('writes a module with the icons and the license of every set used', async () => {
    const bundle = await resolveBundle(['fil:star', 'tst:home', 'tst:missing']);
    expect(Object.keys(bundle.icons)).toEqual(['fil:star', 'tst:home']);
    expect(bundle.missing).toEqual(['tst:missing']);
    const code = moduleCode(bundle);
    expect(code).toContain('fil: Fill Brands by Fill Brands Authors, CC-BY-4.0');
    expect(code).toContain('Icons from "Fill Brands"');
    expect(code).toContain("import { registerIcons } from 'glyphfox-universe';");
    expect(namesInModule(code)).toEqual(['fil:star', 'tst:home']);
  });
});

describe('bundler plugins', () => {
  it('inlines only the used icons in a Vite build', async () => {
    const { build } = await import('vite');
    const dir = join(tmp, 'vite');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'main.js'), `import 'virtual:glyphfox-universe';\nexport const icons = ['tst:home', 'fil:star'];\n`);
    const plugin = glyphfoxUniverse({ include: ['src'], icons: ['tst:arrow-left'], prefixes: ['tst', 'fil'] });
    const out = await build({
      root: dir,
      logLevel: 'silent',
      configFile: false,
      plugins: [plugin],
      build: { write: false, minify: false, lib: { entry: join(dir, 'src', 'main.js'), formats: ['es'], fileName: 'out' }, rollupOptions: { external: ['glyphfox-universe'] } },
    });
    const code = (Array.isArray(out) ? out[0] : out).output[0].code;
    expect(code).toContain('M3 10l9-7l9 7v10H3z');
    expect(code).toContain('M8 1l2 5h5');
    expect(code).toContain('M19 12H5');
    expect(code).not.toContain('heart-duotone');
    expect(code).toContain('CC-BY-4.0');
    expect([...plugin.api.names].sort()).toEqual(['fil:star', 'tst:arrow-left', 'tst:home']);
  });

  it('writes the module and the alias for webpack and Rspack', async () => {
    const dir = join(tmp, 'webpack');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'app.jsx'), `<Icon name="tst:arrow-right" />`);
    const taps = {};
    const hook = (name) => ({ tapPromise: (id, fn) => (taps[name] = fn) });
    const compiler = { options: { context: dir, resolve: { alias: { react: 'preact' } } }, hooks: { beforeRun: hook('beforeRun'), watchRun: hook('watchRun') } };
    const plugin = new GlyphfoxUniversePlugin({ include: ['src'], prefixes: ['tst', 'fil'] });
    plugin.apply(compiler);
    expect(compiler.options.resolve.alias.react).toBe('preact');
    const file = compiler.options.resolve.alias[VIRTUAL_ID];
    expect(file).toMatch(/\.glyphfox-universe[\\/]icons\.js$/);
    await taps.beforeRun();
    expect(namesInModule(readFileSync(file, 'utf8'))).toEqual(['tst:arrow-right']);
    expect(typeof taps.watchRun).toBe('function');
  });
});

describe('glyphfox add', () => {
  it('adds icons to the offline module and merges later calls', async () => {
    const r1 = await add(['tst:home'], { cwd: tmp, out: 'src/universe.js' });
    expect(r1.added).toEqual(['tst:home']);
    const r2 = await add(['fil:star', 'tst:nope', 'bad name'], { cwd: tmp, out: 'src/universe.js' });
    expect(r2.added).toEqual(['fil:star']);
    expect(r2.kept).toEqual(['tst:home']);
    expect(r2.missing).toEqual(['tst:nope']);
    expect(r2.invalid).toEqual(['bad name']);
    expect(namesInModule(readFileSync(r2.file, 'utf8'))).toEqual(['fil:star', 'tst:home']);
  });

  it('runs as a command with an exit code', async () => {
    const logs = [];
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      expect(await addCommand([], { log: () => {}, error: (m) => logs.push(m) })).toBe(1);
      expect(logs[0]).toMatch(/^usage: glyphfox add/);
      expect(await addCommand(['tst:back', '--out', 'icons.js'], { log: (m) => logs.push(m), error: () => {} })).toBe(0);
      expect(logs).toContain('added tst:back');
    } finally {
      process.chdir(cwd);
    }
  });
});

describe('glyphfox icon source', () => {
  it('hands glyphfox stroke icons as strokes and filled icons in fill mode', async () => {
    const home = toGlyphfox(await U.getIcon('tst:home'));
    expect(home).toMatchObject({ viewBox: '0 0 24 24', set: 'tst', license: 'MIT' });
    expect(home.mode).toBeUndefined();
    expect(toGlyphfox(await U.getIcon('fil:star')).mode).toBe('fill');
    const src = universeSource('tst');
    expect(src.get('arrow-left')).toBeNull();
    expect((await src.load('arrow-left')).body).toContain('M19 12H5');
    expect(src.get('arrow-left').body).toContain('M19 12H5');
    const seen = [];
    expect(registerUniverse((p) => seen.push(p), ['tst', 'fil'])).toBe(2);
    expect(seen).toEqual(['tst', 'fil']);
  });
});
