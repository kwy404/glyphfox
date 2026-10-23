// The newer CLI commands: glyph script, scan and the exporters (favicon,
// cursor, plot, stl). The unit group runs commands.js with the icon helpers
// of the dist build; the end to end group runs them through the bin entry.
import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import * as api from '../packages/glyphfox/dist/index.js';
import { main, parseArgs, propsFromFlags } from '../packages/glyphfox/dist/cli/index.js';
import { COMMANDS, runCommand } from '../packages/glyphfox/src/cli/commands.js';
import { lintSvg } from '../packages/glyphfox/src/core/lint.js';

const dir = mkdtempSync(join(os.tmpdir(), 'glyphfox-labs-cli-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const at = (...p) => join(dir, ...p);
const write = (rel, text) => {
  mkdirSync(join(at(rel), '..'), { recursive: true });
  writeFileSync(at(rel), text);
};
const bytes = (rel) => new Uint8Array(readFileSync(at(rel)));
const isPng = (b) => [137, 80, 78, 71, 13, 10, 26, 10].every((v, k) => b[k] === v);
const pngSize = (b) => {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return [v.getUint32(16), v.getUint32(20)];
};

// Same flow as main(): flags, shared props, errors printed with the prefix.
async function run(...argv) {
  const { positionals, flags } = parseArgs(argv);
  const [cmd, ...args] = positionals;
  const out = [];
  const err = [];
  const io = { log: (s) => out.push(s), err: (s) => err.push(s), cwd: dir, tty: false };
  let code;
  try {
    code = await runCommand(cmd, args, flags, io, { resolve: api.resolve, iconNames: api.iconNames, getIcon: api.getIcon, props: propsFromFlags(flags) });
  } catch (e) {
    err.push(`glyphfox: ${e.message}`);
    code = 1;
  }
  return { code, out: out.join('\n'), err: err.join('\n') };
}

const GOOD = '# a target\ncircle 12 12 8\ncircle 12 12 3\nline 12 2 12 6\n';
const BAD = 'circle 12 12 8\ncircel 12 12 4\n';

describe('labs commands', () => {
  it('lists its commands and rejects others', async () => {
    expect(COMMANDS).toEqual(['script', 'scan', 'favicon', 'cursor', 'plot', 'stl']);
    await expect(runCommand('nope', [], {}, { log() {}, err() {}, cwd: dir })).rejects.toThrow(/unknown command/);
  });

  it('compiles a glyph script', async () => {
    write('target.gfs', GOOD);
    const r = await run('script', 'target.gfs');
    expect(r.code).toBe(0);
    expect(lintSvg(r.out)).toEqual([]);
    expect(r.out).toContain('<circle');
    const json = JSON.parse((await run('script', 'target.gfs', '--json')).out);
    expect(json.ok).toBe(true);
    expect(lintSvg(json.svg)).toEqual([]);
    const check = await run('script', 'target.gfs', '--check');
    expect(check.code).toBe(0);
    expect(check.out).toMatch(/target\.gfs: ok/);
    expect((await run('script', 'target.gfs', '--out', 'out/target.svg')).code).toBe(0);
    expect(lintSvg(readFileSync(at('out', 'target.svg'), 'utf8'))).toEqual([]);
  });

  it('reports script errors with the line and column', async () => {
    write('bad.gfs', BAD);
    const r = await run('script', 'bad.gfs');
    expect(r.code).toBe(1);
    expect(r.err).toContain('bad.gfs:2:1');
    expect(r.err).toContain('circel');
    expect(r.out).toBe('');
    const json = await run('script', 'bad.gfs', '--json');
    expect(json.code).toBe(1);
    expect(JSON.parse(json.out).errors[0]).toMatchObject({ line: 2, column: 1 });
    expect((await run('script', 'missing.gfs')).err).toContain('no such file');
    expect((await run('script')).err).toContain('usage: glyphfox script');
  });

  it('scans a project and writes the subsets', async () => {
    write('app/src/App.tsx', "import { HomeIcon, SearchIcon } from 'glyphfox/react';\n\nexport function App(): JSX.Element {\n  const list: Array<string> = [];\n  return (\n    <nav>\n      <HomeIcon title=\"Home\" />\n      <button onClick={() => list.push('x')}><SearchIcon /></button>\n    </nav>\n  );\n}\n");
    write('app/src/Card.vue', '<template>\n  <div class="card">\n    <glyph-fox name="file+check" title="Saved"></glyph-fox>\n    <span class="gf-heart"></span>\n  </div>\n</template>\n');
    write('app/node_modules/pkg/index.js', "toSvg('cloud');\n");
    const r = await run('scan', 'app', '--json');
    expect(r.code).toBe(0);
    const report = JSON.parse(r.out);
    expect(report.used).toEqual(expect.arrayContaining(['home', 'search', 'file', 'heart']));
    expect(report.used).not.toContain('cloud');
    expect(report.a11y.length).toBeGreaterThan(0);
    expect(report.a11y[0].file).toBe('src/App.tsx');
    const text = await run('scan', 'app', '--type', 'esm', '--out', 'subset/icons.js');
    expect(text.code).toBe(0);
    expect(text.out).toContain('home');
    expect(text.err).toContain('subset/icons.js');
    const mod = await import(pathToFileURL(at('subset', 'icons.js')).href);
    expect(mod.icons.map((i) => i.name).sort()).toEqual([...report.used].sort());
    expect((await run('scan', 'app', '--type', 'sprite')).code).toBe(0);
    const sprite = readFileSync(at('glyphfox-sprite.svg'), 'utf8');
    expect((sprite.match(/<symbol /g) || []).length).toBe(report.used.length);
    expect((await run('scan', 'app', '--strict')).code).toBe(1);
    expect((await run('scan', 'app/src/Card.vue', '--json')).code).toBe(0);
    write('app/src/broken.html', '<glyph-fox name="hart"></glyph-fox>\n');
    const bad = await run('scan', 'app');
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('hart');
    expect((await run('scan', 'app', '--type', 'zip')).code).toBe(1);
    expect((await run('scan', 'nowhere')).err).toContain('no such file or directory');
  });

  it('writes an animated favicon kit', async () => {
    const r = await run('favicon', 'heart', '--animate', 'pulse', '--frames', '6', '--color', '#7c5cff', '--out', 'fav');
    expect(r.code).toBe(0);
    for (const f of ['favicon.svg', 'favicon-32.png', 'favicon-animated.js', 'favicon.html']) expect(existsSync(at('fav', f)), f).toBe(true);
    const png = bytes('fav/favicon-32.png');
    expect(isPng(png)).toBe(true);
    expect(pngSize(png)).toEqual([32, 32]);
    expect(png.length).toBeLessThan(32 * 32 * 4);
    expect(readFileSync(at('fav', 'favicon.svg'), 'utf8')).toContain('#7c5cff');
    expect(readFileSync(at('fav', 'favicon-animated.js'), 'utf8')).toContain('export function animateFavicon');
    const morph = await run('favicon', 'menu', '--morph-to', 'x', '--frames', '4', '--background', '#111111', '--out', 'fav-morph');
    expect(morph.code).toBe(0);
    expect(morph.err).toContain('morph');
    expect((await run('favicon', 'heart', '--animate', 'morph')).err).toContain('--morph-to');
    expect((await run('favicon', 'heart', '--frames', 'many')).err).toContain('--frames must be a number');
  });

  it('writes a CSS cursor with a hotspot', async () => {
    const r = await run('cursor', 'cursor', '--hotspot', 'tl', '--out', 'cur');
    expect(r.code).toBe(0);
    expect(pngSize(bytes('cur/cursor-32.png'))).toEqual([32, 32]);
    expect(pngSize(bytes('cur/cursor-64.png'))).toEqual([64, 64]);
    const css = readFileSync(at('cur', 'cursor.css'), 'utf8');
    expect(css).toBe(r.out + '\n');
    expect(css).toContain('url("cursor-32.png") 3 3, auto');
    expect(css).toContain('image-set(url("cursor-32.png") 1x, url("cursor-64.png") 2x) 3 3');
    const inline = await run('cursor', 'target', '--hotspot', '12,12', '--name', 'aim', '--fallback', 'crosshair', '--out', 'cur2', '--inline');
    expect(inline.code).toBe(0);
    expect(inline.out).toContain('.gf-cursor-aim');
    expect(inline.out).toContain('data:image/png;base64,');
    expect(inline.out).toContain('16 16, crosshair');
    expect((await run('cursor', 'target', '--hotspot', 'middle')).code).toBe(1);
  });

  it('writes plotter SVG and G-code', async () => {
    const svg = await run('plot', 'heart', '--size', '40');
    expect(svg.code).toBe(0);
    expect(svg.out).toContain('width="40mm"');
    expect(svg.out).not.toMatch(/fill="(?!none)/);
    expect(svg.out).not.toContain('transform');
    expect(svg.err).toMatch(/heart: \d+ strokes?, draw [\d.]+ mm, travel [\d.]+ mm/);
    const g = await run('plot', 'settings', '--format', 'gcode', '--feed', '1200', '--travel-feed', '2400', '--pen-up', 'M5', '--pen-down', 'M3 S30\\nG4 P0.1', '--dwell', '0.2');
    expect(g.code).toBe(0);
    expect(g.out).toContain('G21');
    expect(g.out).toContain('F1200');
    expect(g.out).toContain('F2400');
    expect(g.out).toContain('M5');
    expect(g.out).toMatch(/M3 S30\nG4 P0\.1/);
    expect(g.out).toContain('G4 P0.2');
    expect(g.out).not.toContain('G1 Z0');
    expect((await run('plot', 'heart', '--format', 'gcode', '--out', 'heart.gcode')).code).toBe(0);
    expect(readFileSync(at('heart.gcode'), 'utf8')).toContain('G1 Z0 F500');
    const plain = await run('plot', 'settings', '--format', 'gcode', '--no-optimize');
    expect(plain.err).toMatch(/travel ([\d.]+) mm \(\1 mm in source order\)/);
    expect((await run('plot', 'heart', '--format', 'hpgl')).code).toBe(1);
  });

  it('writes binary and ASCII STL files', async () => {
    const r = await run('stl', 'heart', '--thickness', '2', '--out', 'heart.stl');
    expect(r.code).toBe(0);
    expect(r.err).toMatch(/^wrote heart\.stl: \d+ triangles, [\d.]+ mm3, [\d.]+ x [\d.]+ x 2 mm, watertight$/);
    const b = bytes('heart.stl');
    const count = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(80, true);
    expect(count).toBeGreaterThan(100);
    expect(b.length).toBe(84 + 50 * count);
    expect((await run('stl', 'heart/solid', '--bevel', '0.6', '--bevel-style', 'round', '--size', '30')).code).toBe(0);
    expect(existsSync(at('heart-solid.stl'))).toBe(true);
    const ascii = await run('stl', 'star', '--out', 'star.stl', '--ascii');
    expect(ascii.code).toBe(0);
    const text = readFileSync(at('star.stl'), 'utf8');
    expect(text.startsWith('solid')).toBe(true);
    expect(text.trimEnd().endsWith('endsolid star')).toBe(true);
    expect((await run('stl', 'heart', '--bevel-style', 'soft')).code).toBe(1);
    expect((await run('stl', 'heart', '--variant', 'duotone')).code).toBe(1);
  });

  it('takes a glyph script or an SVG file as the input', async () => {
    write('target.gfs', GOOD);
    expect((await run('stl', 'target.gfs')).code).toBe(0);
    expect(existsSync(at('target.stl'))).toBe(true);
    const plot = await run('plot', 'target.gfs');
    expect(plot.code).toBe(0);
    expect(plot.out).toContain('<path d="M');
    write('bad.gfs', BAD);
    const bad = await run('cursor', 'bad.gfs');
    expect(bad.code).toBe(1);
    expect(bad.err).toContain('bad.gfs:2:1');
    writeFileSync(at('file.svg'), readFileSync(resolve('icons/file.svg'), 'utf8'));
    const svg = await run('cursor', 'file.svg', '--out', 'cur-file');
    expect(svg.code).toBe(0);
    expect(svg.err).not.toContain('Fox-ify');
    expect(existsSync(at('cur-file', 'file-32.png'))).toBe(true);
    writeFileSync(at('foreign.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="160" fill="none" stroke="#000" stroke-width="40"/></svg>');
    const foreign = await run('plot', 'foreign.svg', '--format', 'gcode');
    expect(foreign.code).toBe(0);
    expect(foreign.err).toContain('Fox-ify');
    expect(foreign.out).toContain('G1 X');
    expect((await run('stl', 'none.svg')).err).toContain('no such file');
    expect((await run('stl', 'not-an-icon')).err).toContain('unknown icon');
    expect((await run('stl')).err).toContain('missing the icon');
  });
});

describe('labs commands end to end', () => {
  async function bin(...argv) {
    const out = [];
    const err = [];
    const code = await main(argv, { log: (s) => out.push(s), err: (s) => err.push(s), cwd: dir, tty: false, clipboard: () => true });
    return { code, out: out.join('\n'), err: err.join('\n') };
  }

  it('routes the new commands and lists them in the help', async () => {
    const help = await bin('--help');
    for (const c of ['glyphfox script', 'glyphfox scan', 'glyphfox favicon', 'glyphfox cursor', 'glyphfox plot', 'glyphfox stl']) expect(help.out).toContain(c);
    write('e2e.gfs', GOOD);
    expect((await bin('script', 'e2e.gfs', '--check')).code).toBe(0);
    const stl = await bin('stl', '--ascii', 'heart', '--out', 'e2e.stl');
    expect(stl.code).toBe(0);
    expect(readFileSync(at('e2e.stl'), 'utf8').startsWith('solid')).toBe(true);
    const bad = await bin('stl', 'heart', '--bevel-style', 'soft');
    expect(bad.code).toBe(1);
    expect(bad.err).toContain('glyphfox: --bevel-style');
  });
});
