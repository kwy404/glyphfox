import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import os from 'node:os';
import { FORMATS, LAYOUTS } from 'glyphfox';
import { main, parseArgs, preview } from '../packages/glyphfox/dist/cli/index.js';
import { lintSvg } from '../packages/glyphfox/dist/core/lint.js';

const dir = mkdtempSync(join(os.tmpdir(), 'glyphfox-cli-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function run(...argv) {
  const out = [];
  const err = [];
  let copied = null;
  const code = await main(argv, { log: (s) => out.push(s), err: (s) => err.push(s), cwd: dir, tty: true, clipboard: (t) => ((copied = t), true) });
  return { code, out: out.join('\n'), err: err.join('\n'), copied };
}

describe('glyphfox CLI', () => {
  it('parses flags', () => {
    expect(parseArgs(['copy', 'file', '--size', '32', '--flip-x', '--format=jsx', '-o', 'a.txt', '--loop'])).toEqual({
      positionals: ['copy', 'file'],
      flags: { size: '32', 'flip-x': true, format: 'jsx', out: 'a.txt', loop: 'true' },
    });
  });

  it('prints help and the version', async () => {
    expect((await run('--help')).out).toContain('glyphfox search');
    expect((await run('--version')).out).toMatch(/^\d+\.\d+\.\d+/);
    expect((await run()).code).toBe(1);
    const bad = await run('nope');
    expect(bad.code).toBe(1);
    expect(bad.err).toContain('unknown command');
  });

  it('searches by name, tag and category', async () => {
    const r = await run('search', 'lock');
    expect(r.code).toBe(0);
    expect(r.out.split('\n')[0]).toMatch(/^lock\b/);
    const json = JSON.parse((await run('search', 'file', '--json')).out);
    expect(json[0].name).toBe('file');
    expect((await run('search', 'zzzz-none')).code).toBe(1);
    expect((await run('list', '--category', 'files')).out).toContain('file');
    expect((await run('categories')).out).toMatch(/files \(\d+\)/);
  });

  it('shows an icon with a terminal preview', async () => {
    const r = await run('show', 'heart', '--variant', 'solid');
    expect(r.code).toBe(0);
    expect(r.out).toContain('component   HeartIcon');
    expect(r.out).toMatch(/[▀▄█]/);
    expect(r.out).toContain('<svg');
    expect(preview('menu').split('\n').length).toBe(16);
    expect(JSON.parse((await run('show', 'file+check', '--json')).out).name).toBe('file+check');
  });

  it('copies in every format and reaches the clipboard', async () => {
    for (const f of FORMATS) {
      const r = await run('copy', 'file+check', '--format', f, '--size', '32', '--weight', '1.5');
      expect(r.code, f).toBe(0);
      expect(r.copied, f).toBe(r.out);
      expect(r.err, f).toContain('copied');
    }
    expect((await run('copy', 'file', '--format', 'jsx', '--print')).copied).toBeNull();
    expect((await run('copy', 'heart', '--format', 'svg', '--animate', 'draw')).out).toContain('@keyframes gf-draw');
  });

  it('fuses icons in every layout, valid for the icon lint', async () => {
    for (const layout of LAYOUTS) {
      const list = layout === 'inside' ? ['file', 'heart'] : ['cloud', 'lock'];
      const r = await run('fuse', ...list, '--layout', layout, '--canonical');
      expect(r.code, layout).toBe(0);
      expect(lintSvg(r.out), layout).toEqual([]);
    }
    expect((await run('fuse', 'cloud', 'lock', '--format', 'jsx')).out).toContain('<Fusion');
    expect((await run('fuse', 'cloud')).code).toBe(1);
  });

  it('writes a CSS only morph', async () => {
    const r = await run('morph', 'menu', 'x', '--out', 'morph.svg');
    expect(r.code).toBe(0);
    expect(readFileSync(join(dir, 'morph.svg'), 'utf8')).toContain('d:path(');
  });

  it('builds a sprite, CSS masks and a package from a list', async () => {
    writeFileSync(join(dir, 'list.txt'), 'file\nheart # favorite\ncloud&lock:side\nfile+check\n');
    let r = await run('build', '--from', 'list.txt', '--type', 'sprite', '--out', 'out-sprite', '--weight', '1.5');
    expect(r.code).toBe(0);
    const sprite = readFileSync(join(dir, 'out-sprite', 'sprite.svg'), 'utf8');
    expect((sprite.match(/<symbol /g) || []).length).toBe(4);
    expect(sprite).toContain('id="gf-cloud__lock-side"');
    expect(sprite).toContain('stroke-width="1.5"');
    r = await run('build', 'file', 'heart+plus', '--type', 'css', '--out', 'out-css');
    const css = readFileSync(join(dir, 'out-css', 'glyphfox.css'), 'utf8');
    expect(css).toContain('.gf-file{--gf-icon:url("data:image/svg+xml,');
    expect(css).toContain('.gf-heart\\+plus{');
    r = await run('build', 'file', 'lock', '--type', 'package', '--name', 'my-icons', '--out', 'pkg');
    const files = readdirSync(join(dir, 'pkg'));
    expect(files).toEqual(expect.arrayContaining(['package.json', 'index.js', 'index.d.ts', 'sprite.svg', 'icons', 'README.md']));
    const mod = await import('file://' + resolve(dir, 'pkg', 'index.js').replace(/\\/g, '/'));
    expect(mod.file).toContain('<svg');
    expect(JSON.parse(readFileSync(join(dir, 'pkg', 'package.json'), 'utf8')).name).toBe('my-icons');
    expect((await run('build', 'no-such-icon')).code).toBe(1);
  });

  it('lints and fox-ifies files', async () => {
    writeFileSync(join(dir, 'good.svg'), readFileSync(resolve('icons/file.svg'), 'utf8'));
    writeFileSync(join(dir, 'bad.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h30" transform="scale(2)"/></svg>');
    expect((await run('lint', 'good.svg')).code).toBe(0);
    const bad = await run('lint', 'bad.svg');
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('[no-transform]');
    writeFileSync(join(dir, 'foreign.svg'), '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(16 16)"><path fill="#333" d="M0 0h480v480H0z"/><circle cx="240" cy="240" r="120" fill="none" stroke="#000" stroke-width="32"/></g></svg>');
    const fx = await run('foxify', 'foreign.svg', '--out', 'fox.svg');
    expect(fx.code).toBe(0);
    expect(lintSvg(readFileSync(join(dir, 'fox.svg'), 'utf8'))).toEqual([]);
  });

  it('runs as a bin', () => {
    const r = spawnSync(process.execPath, [resolve('packages/glyphfox/bin/glyphfox.js'), 'copy', 'file', '--format', 'html', '--print'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('<glyph-fox name="file"></glyph-fox>');
    expect(existsSync(resolve('packages/glyphfox/bin/glyphfox.js'))).toBe(true);
  });
});
