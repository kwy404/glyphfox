// @vitest-environment jsdom
// Angular: the ng-packagr build (partial compilation) rendered with TestBed.
import '@angular/compiler';
import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { icons } from 'glyphfox';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

const FESM = resolve('packages/glyphfox-angular/dist/fesm2022/glyphfox-angular.mjs');
const built = existsSync(FESM);
let lib;

beforeAll(async () => {
  if (!built) return;
  lib = await import(pathToFileURL(FESM).href);
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  } catch {
    // already initialized
  }
});

async function render(inputs, providers = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [lib.GlyphFoxIcon], providers: [provideZonelessChangeDetection(), lib.provideGlyphFox({ icons }), ...providers] });
  const fixture = TestBed.createComponent(lib.GlyphFoxIcon);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe.skipIf(!built)('glyphfox-angular', () => {
  it('ships the Angular package format', async () => {
    const pkg = JSON.parse(readFileSync(resolve('packages/glyphfox-angular/dist/package.json'), 'utf8'));
    expect(pkg.name).toBe('glyphfox-angular');
    expect(pkg.exports['.'].default).toMatch(/fesm2022/);
    expect(pkg.peerDependencies['@angular/core']).toBeTruthy();
    expect(typeof lib.provideGlyphFox).toBe('function');
    expect(typeof lib.provideGlyphFoxIcons).toBe('function');
  });

  it('renders the plain icon with simple defaults', async () => {
    const f = await render({ name: 'file' });
    const html = f.nativeElement.innerHTML;
    expect(html).toContain('glyphfox-file');
    checkDefault(html);
  });

  for (const c of PROP_CASES) {
    it(`supports the ${c.prop} input`, async () => {
      const f = await render({ name: c.icon, ...c.props });
      c.check(f.nativeElement.innerHTML);
    });
  }

  it('passes class and style through the host element', async () => {
    const Host = Component({
      standalone: true,
      imports: [lib.GlyphFoxIcon],
      template: '<gf-icon name="file" class="extra" style="color: red"></gf-icon>',
    })(class Host {});
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection(), lib.provideGlyphFox({ icons })] });
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    await f.whenStable();
    const host = f.nativeElement.querySelector('gf-icon');
    expect(host.classList.contains('extra')).toBe(true);
    expect(host.getAttribute('style')).toContain('red');
    expect(host.innerHTML).toContain('<svg');
  });

  it('renders specs, fusions and the icons input', async () => {
    expect((await render({ name: 'file+check@tl' })).nativeElement.innerHTML).toContain('glyphfox-file-check-tl');
    expect((await render({ name: 'cloud&lock', layout: 'side' })).nativeElement.innerHTML).toContain('glyphfox-cloud-lock-side');
    expect((await render({ icons: ['cloud', 'lock'], layout: 'overlap' })).nativeElement.innerHTML).toContain('glyphfox-cloud-lock-overlap');
    expect((await render({ name: 'heart/solid' })).nativeElement.innerHTML).toContain('class="gf-fill"');
  });

  it('applies defaults from provideGlyphFox', async () => {
    const f = await render({ name: 'file' }, [lib.provideGlyphFox({ defaults: { weight: 1.5, corners: 'sharp' } })]);
    const html = f.nativeElement.innerHTML;
    expect(html).toContain('stroke-width="1.5"');
    expect(html).toContain('stroke-linecap="square"');
  });

  it('replays click animations', async () => {
    const f = await render({ name: 'heart', animate: 'pop', trigger: 'click' });
    f.nativeElement.click();
    expect(f.nativeElement.querySelector('svg').getAttribute('data-gf-run')).toBe('1');
    f.nativeElement.click();
    expect(f.nativeElement.querySelector('svg').getAttribute('data-gf-run')).toBe('2');
  });
});
