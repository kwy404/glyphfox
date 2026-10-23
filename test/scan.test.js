// The usage scanner: React, Vue, Svelte, Angular and HTML sources, unknown
// names, values the scan cannot resolve, accessible names, the directory
// walker and the subset builders.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { iconNames, icons } from '../packages/glyphfox/dist/index.js';
import { SCAN_EXTENSIONS, formatReport, scanFiles, scanSource, subsetEsm, subsetSprite } from '../packages/glyphfox/src/export/scan.js';
import { listSourceFiles, scanDir } from '../packages/glyphfox/src/export/scan-fs.js';

const names = iconNames;
const tmp = mkdtempSync(join(os.tmpdir(), 'glyphfox-scan-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** 1 based line and column of `needle` (plus `shift` characters) in `text`. */
function at(text, needle, shift = 0, from = 0) {
  const i = text.indexOf(needle, from);
  if (i < 0) throw new Error(`fixture has no ${needle}`);
  const before = text.slice(0, i + shift);
  const line = before.split('\n').length;
  return { line, column: before.length - before.lastIndexOf('\n') };
}

const specs = (r) => r.occurrences.map((o) => o.spec);
const find = (r, spec, via) => r.occurrences.find((o) => o.spec === spec && (!via || o.via === via));

const REACT = `import { useState } from 'react';
import { HomeIcon, FileIcon as Doc, Fusion, MorphIcon, HomIcon } from 'glyphfox/react';
import { HeartIcon } from 'glyphfox/react/icons/heart';
import { toSvg, fuse, iconSearch } from 'glyphfox';

type Item = { names: Array<string> };

export function App({ items, current }: { items: Array<Item>; current: string }) {
  const [open, setOpen] = useState<boolean>(false);
  const n = items.length;
  for (let i = 0; i<n; i++) {}
  const badge = toSvg('file+check@tr', { size: 32 });
  const pair = fuse(['cloud', 'lock'], { layout: 'side' });
  const label = toSvg(current);
  const quote = (s: string) => s.replace(/"/g, '&quot;');
  return (
    <nav className="gf-[cloud&lock]/side">
      <button onClick={() => setOpen(!open)}>
        <MorphIcon name={open ? 'x' : 'menu'} />
      </button>
      <button aria-label="Home"><HomeIcon /></button>
      <a href="/files"><Doc title="Files" /></a>
      <button>Save <HeartIcon /></button>
      <Fusion icons={['user', 'shield']} layout="badge" />
      <HeartIcon decorative={false} />
      <span className="gf-star gf-spin" />
      {open ? <HomeIcon /> : null}
      <button onClick={() => setOpen(false)}>{open ? <HomeIcon /> : <Doc />}</button>
    </nav>
  );
}
`;

const VUE = `<script setup lang="ts">
import { ref } from 'vue';
import { BellIcon, SearchIcon, Icon } from 'glyphfox/vue';
const active = ref(false);
const current = ref('home');
</script>

<template>
  <header :class="['bar', active ? 'gf-[file+check]' : '']">
    <bell-icon />
    <button type="button"><search-icon /></button>
    <button type="button" aria-label="Search"><SearchIcon /></button>
    <Icon :name="current" />
    <Icon name="star" />
    <span :class="{ 'gf-heart/solid': active }"></span>
    <button type="button">{{ label }} <bell-icon /></button>
  </header>
</template>
`;

const SVELTE = `<script>
  import { HeartIcon, Fusion } from 'glyphfox/svelte';
  import StarIcon from 'glyphfox/svelte/icons/star.svelte';
  let liked = $state(false);
</script>

<button onclick={() => (liked = !liked)}>
  {#if liked}<HeartIcon variant="solid" />{:else}<HeartIcon />{/if}
</button>
<button title="Favorite"><StarIcon /></button>
<Fusion icons={['user', 'shield']} layout="badge" />
<glyph-fox name={liked ? 'heart' : 'bell'}></glyph-fox>
`;

const ANGULAR_TS = `import { Component } from '@angular/core';
import { GlyphFoxIcon, provideGlyphFox } from 'glyphfox-angular';
import { iconHome, iconTrash } from 'glyphfox';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [GlyphFoxIcon],
  template: \`
    <button (click)="remove()"><gf-icon name="trash"></gf-icon></button>
    <button (click)="go()" [attr.aria-label]="'Home'"><gf-icon [name]="'home'"></gf-icon></button>
    <gf-icon [icons]="['cloud', 'lock']" layout="overlap"></gf-icon>
    <gf-icon [name]="current"></gf-icon>
  \`,
})
export class Toolbar {
  current = 'home';
  compare(a: number, b: number) { return a < b && b<a; }
}
export const providers = [provideGlyphFox({ icons: [iconHome, iconTrash] })];
`;

const ANGULAR_HTML = `<nav>
  <a routerLink="/settings"><gf-icon name="settings"></gf-icon></a>
  <gf-icon name="alert-triangle"></gf-icon>
  @if (open) {
    <button (click)="close()"><gf-icon name="x"></gf-icon></button>
  }
</nav>
`;

const HTML = `<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/glyphfox@1"></script>
</head>
<body>
  <glyph-fox name="file+check@tr" morph-to="x"></glyph-fox>
  <button><glyph-fox name="cloud&lock" layout="side"></glyph-fox></button>
  <i data-glyph="search" data-size="20"></i>
  <span class="gf-home text-2xl"></span>
  <svg width="24" height="24"><use href="sprite.svg#gf-mail"></use></svg>
  <glyph-fox name="hom"></glyph-fox>
  <button><span class="visually-hidden">Close</span><glyph-fox name="x"></glyph-fox></button>
  <script>
    document.body.insertAdjacentHTML('beforeend', '<glyph-fox name="star"></glyph-fox>');
    const svg = glyphfox.toSvg('moon');
  </script>
</body>
</html>
`;

describe('scanSource: React', () => {
  const r = scanSource(REACT, { file: 'src/App.tsx', names });

  it('finds component, deep, data and call usage', () => {
    for (const s of ['home', 'file', 'heart', 'search', 'file+check@tr', 'cloud&lock:side', 'x', 'menu', 'user&shield:badge', 'star']) expect(specs(r), s).toContain(s);
    expect(find(r, 'file+check@tr').names).toEqual(['file']);
    expect(find(r, 'cloud&lock:side', 'js').names).toEqual(['cloud', 'lock']);
    expect(find(r, 'cloud&lock:side', 'tailwind')).toBeTruthy();
    expect(find(r, 'search').via).toBe('data');
    expect(find(r, 'heart').via).toBe('react');
    expect(find(r, 'user&shield:badge').via).toBe('react');
    expect(specs(r)).not.toContain('spin');
  });

  it('reports lines and columns', () => {
    expect(find(r, 'file+check@tr')).toMatchObject(at(REACT, "'file+check@tr'", 1));
    expect(find(r, 'x', 'react')).toMatchObject(at(REACT, "'x' : 'menu'", 1));
    const doc = r.occurrences.find((o) => o.spec === 'file' && o.kind === 'import');
    expect(doc).toMatchObject(at(REACT, 'FileIcon as Doc'));
  });

  it('is not confused by generics, comparisons or regular expressions', () => {
    expect(r.occurrences.every((o) => o.names.every((n) => names.includes(n)))).toBe(true);
    expect(r.a11y.every((a) => a.line >= at(REACT, '<nav').line)).toBe(true);
  });

  it('flags unknown components with a suggestion and dynamic values', () => {
    expect(r.unknown).toEqual([expect.objectContaining({ name: 'hom', spec: 'HomIcon', suggestion: 'home', via: 'react', ...at(REACT, 'HomIcon') })]);
    expect(r.dynamic).toEqual([expect.objectContaining({ via: 'js', code: 'toSvg(current)', ...at(REACT, 'current);') })]);
  });

  it('flags icons that need an accessible name', () => {
    const lines = r.a11y.map((a) => a.line);
    expect(r.a11y).toContainEqual(expect.objectContaining({ ...at(REACT, '<MorphIcon'), spec: 'x' }));
    expect(r.a11y.find((a) => a.line === at(REACT, '<MorphIcon').line).message).toContain('icon only <button>');
    expect(lines).toContain(at(REACT, '<HeartIcon decorative').line);
    expect(r.a11y.find((a) => a.line === at(REACT, '<HeartIcon decorative').line).message).toContain('decorative');
    expect(lines).toContain(at(REACT, '{open ? <HomeIcon /> : <Doc />}').line);
    for (const ok of ['aria-label="Home"', 'Doc title', 'Save <HeartIcon']) expect(lines, ok).not.toContain(at(REACT, ok).line);
    expect(r.a11y).toHaveLength(3);
  });
});

describe('scanSource: more JavaScript forms', () => {
  const SRC = `import * as G from 'glyphfox/react';
const { BellIcon: Bell } = require('glyphfox/react');
const lazy = () => import('glyphfox/icons/file');
import * as gf from 'glyphfox';
gf.toSvg('x'); gf.iconHome; path.resolve('src'); toSvg('not-glyphfox');
export { StarIcon } from 'glyphfox/react';
const a = <G.HomeIcon />;
const b = <Button icon={<Bell />} />;
const c = <IconButton><Bell /></IconButton>;
const d = <><G.HomeIcon title="Home" /></>;
const e = <p>Don't <Bell /> me</p>;
const f = <button {...props}><Bell /></button>;
el.innerHTML = \`<button><glyph-fox name="\${name}"></glyph-fox></button>\`;
`;
  const r = scanSource(SRC, { file: 'src/more.jsx', names });

  it('reads namespaces, require, dynamic imports and re-exports', () => {
    expect(find(r, 'bell', 'react')).toBeTruthy();
    expect(find(r, 'file', 'data')).toMatchObject(at(SRC, 'glyphfox/icons/file'));
    expect(find(r, 'x', 'js')).toBeTruthy();
    expect(find(r, 'home', 'data')).toBeTruthy();
    expect(find(r, 'star', 'react')).toBeTruthy();
    expect(r.occurrences.filter((o) => o.spec === 'home' && o.via === 'react')).toHaveLength(2);
    expect(specs(r)).not.toContain('src');
    expect(specs(r)).not.toContain('not-glyphfox');
    expect(r.unknown).toEqual([]);
  });

  it('checks names through render props, fragments, spreads and template strings', () => {
    expect(r.a11y.map((a) => a.line)).toEqual([at(SRC, '<IconButton>').line, at(SRC, 'el.innerHTML').line]);
    expect(r.dynamic).toEqual([expect.objectContaining({ via: 'web-component', ...at(SRC, 'name="${name}"') })]);
  });

  it('works without the list of names', () => {
    const plain = scanSource("import { ArrowRightIcon } from 'glyphfox/react';\n<ArrowRightIcon />", { file: 'a.jsx' });
    expect(plain.occurrences.map((o) => o.spec)).toEqual(['arrow-right', 'arrow-right']);
    expect(plain.unknown).toEqual([]);
  });
});

describe('scanSource: Vue, Svelte, Angular and HTML', () => {
  it('reads Vue single file components', () => {
    const r = scanSource(VUE, { file: 'src/Nav.vue', names });
    expect(find(r, 'bell', 'vue')).toBeTruthy();
    expect(r.occurrences.filter((o) => o.spec === 'bell' && o.kind === 'use')[0]).toMatchObject(at(VUE, '<bell-icon'));
    expect(find(r, 'star', 'vue')).toBeTruthy();
    expect(find(r, 'file+check', 'tailwind')).toMatchObject(at(VUE, 'gf-[file+check]'));
    expect(find(r, 'heart/solid', 'tailwind')).toBeTruthy();
    expect(r.dynamic).toEqual([expect.objectContaining({ via: 'vue', code: ':name="current"' })]);
    expect(r.a11y).toEqual([expect.objectContaining({ ...at(VUE, '<search-icon'), spec: 'search' })]);
  });

  it('reads Svelte components', () => {
    const r = scanSource(SVELTE, { file: 'src/Like.svelte', names });
    expect(find(r, 'star', 'svelte')).toBeTruthy();
    expect(find(r, 'heart', 'web-component')).toBeTruthy();
    expect(find(r, 'bell', 'web-component')).toBeTruthy();
    expect(find(r, 'user&shield:badge', 'svelte')).toBeTruthy();
    expect(r.a11y).toEqual([expect.objectContaining({ ...at(SVELTE, '<HeartIcon variant'), spec: 'heart' })]);
  });

  it('reads Angular inline templates and template files', () => {
    const ts = scanSource(ANGULAR_TS, { file: 'src/app/toolbar.component.ts', names });
    expect(find(ts, 'home', 'data')).toBeTruthy();
    expect(find(ts, 'trash', 'angular')).toMatchObject(at(ANGULAR_TS, 'name="trash"', 6));
    expect(find(ts, 'home', 'angular')).toBeTruthy();
    expect(find(ts, 'cloud&lock:overlap', 'angular').names).toEqual(['cloud', 'lock']);
    expect(ts.dynamic).toEqual([expect.objectContaining({ via: 'angular', code: '[name]="current"' })]);
    expect(ts.a11y).toEqual([expect.objectContaining({ ...at(ANGULAR_TS, '<gf-icon name="trash"'), spec: 'trash' })]);
    const html = scanSource(ANGULAR_HTML, { file: 'src/app/nav.component.html', names });
    expect(find(html, 'settings', 'angular')).toBeTruthy();
    expect(html.unknown).toEqual([expect.objectContaining({ name: 'alert-triangle', via: 'angular' })]);
    expect(html.a11y.map((a) => a.spec)).toEqual(['settings', 'x']);
    expect(html.a11y[0].message).toContain('icon only <a>');
  });

  it('reads plain HTML: web component, data-glyph, Tailwind, sprites and scripts', () => {
    const r = scanSource(HTML, { file: 'public/index.html', names });
    expect(find(r, 'file+check@tr', 'web-component')).toMatchObject(at(HTML, 'file+check@tr'));
    expect(find(r, 'x', 'web-component')).toBeTruthy();
    expect(find(r, 'cloud&lock:side', 'web-component')).toBeTruthy();
    expect(find(r, 'search', 'html')).toBeTruthy();
    expect(find(r, 'home', 'tailwind')).toMatchObject(at(HTML, 'gf-home'));
    expect(find(r, 'mail', 'sprite')).toBeTruthy();
    expect(find(r, 'star', 'web-component')).toBeTruthy();
    expect(find(r, 'moon', 'js')).toBeTruthy();
    expect(r.unknown).toEqual([expect.objectContaining({ name: 'hom', suggestion: 'home', via: 'web-component' })]);
    expect(r.a11y).toEqual([expect.objectContaining({ ...at(HTML, '<glyph-fox name="cloud&lock"'), spec: 'cloud&lock:side' })]);
  });

  it('keeps ambiguous names quiet and reports bad modifiers', () => {
    const r = scanSource('<span class="gf-nope gf-on gf-cursor-x gf-[cloud&lock]"></span><glyph-fox name="file+chek"></glyph-fox>', { file: 'a.html', names });
    expect(specs(r)).toEqual(['cloud&lock']);
    expect(r.unknown).toEqual([expect.objectContaining({ name: 'chek', kind: 'modifier', suggestion: 'check' })]);
  });

  it('flags imports that pull in every icon', () => {
    const r = scanSource("import { icons } from 'glyphfox';\nimport 'glyphfox/web';\n", { file: 'main.js', names });
    expect(r.dynamic.map((d) => d.via)).toEqual(['data', 'web-component']);
  });
});

describe('scanFiles, scanDir and subsets', () => {
  const files = [
    { file: 'src/App.tsx', text: REACT },
    { file: 'src/Nav.vue', text: VUE },
    { file: 'src/Like.svelte', text: SVELTE },
    { file: 'src/app/toolbar.component.ts', text: ANGULAR_TS },
    { file: 'src/app/nav.component.html', text: ANGULAR_HTML },
    { file: 'public/index.html', text: HTML },
  ];

  it('merges files into used names and specs', () => {
    const r = scanFiles(files, { names });
    expect(r.files).toBe(6);
    for (const n of ['bell', 'cloud', 'file', 'heart', 'home', 'lock', 'mail', 'menu', 'moon', 'search', 'settings', 'shield', 'star', 'trash', 'user', 'x']) expect(r.used, n).toContain(n);
    expect(r.used).toEqual([...r.used].sort());
    expect(r.used.every((n) => names.includes(n))).toBe(true);
    expect(r.specs).toContain('cloud&lock:overlap');
    expect(r.unknown.map((u) => u.name).sort()).toEqual(['alert-triangle', 'hom', 'hom']);
    const text = formatReport(r);
    expect(text).toContain('icons used in 6 files');
    expect(text).toContain('Unknown icons');
    expect(text).toContain('did you mean "home"?');
    expect(text).toContain('Accessibility');
    expect(text).toMatch(/src\/App\.tsx:\d+:\d+/);
    expect(formatReport(r, { color: true })).toContain('\x1b[');
  });

  it('walks a directory and skips dependencies', () => {
    const write = (rel, text) => {
      const f = join(tmp, 'proj', rel);
      mkdirSync(join(f, '..'), { recursive: true });
      writeFileSync(f, text);
    };
    for (const f of files) write(f.file, f.text);
    write('node_modules/lib/index.js', "import { ZapIcon } from 'glyphfox/react';\n");
    write('src/types.d.ts', "export declare const iconZap: string;\n");
    write('README.md', '<glyph-fox name="zap"></glyph-fox>');
    const list = listSourceFiles(join(tmp, 'proj'));
    expect(list).toHaveLength(6);
    expect(list).toEqual([...list].sort());
    expect(SCAN_EXTENSIONS).toContain('.svelte');
    const r = scanDir(join(tmp, 'proj'), { names });
    expect(r.files).toBe(6);
    expect(r.used).not.toContain('zap');
    expect(r.occurrences.some((o) => o.file === 'src/app/toolbar.component.ts')).toBe(true);
    expect(r.occurrences.every((o) => !o.file.includes('\\'))).toBe(true);
  });

  it('builds an ES module and a sprite with only the used icons', async () => {
    const r = scanFiles(files, { names });
    const data = r.used.map((n) => icons[n]);
    const esm = subsetEsm(data);
    expect(esm.startsWith('// glyphfox subset')).toBe(true);
    const file = join(tmp, 'subset.mjs');
    writeFileSync(file, esm);
    const mod = await import(pathToFileURL(file).href);
    expect(mod.icons).toEqual(data);
    expect(mod.default).toEqual(data);
    expect(mod.iconHome).toEqual(icons.home);
    const sprite = subsetSprite([...data, icons.home]);
    expect((sprite.match(/<symbol /g) || []).length).toBe(data.length);
    expect(sprite).toContain(`<symbol id="gf-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons.home.body}</symbol>`);
    expect(subsetEsm([], { header: 'empty\nsubset' })).toContain('// empty\n// subset\n');
  });
});
