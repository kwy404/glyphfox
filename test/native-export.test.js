// Native exports: Android VectorDrawable, Jetpack Compose, the iOS asset
// catalog, SwiftUI and Flutter, through the module and `glyphfox export`.
import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { JSDOM } from 'jsdom';
import { getIcon, iconNames } from '../packages/glyphfox/dist/index.js';
import { main } from '../packages/glyphfox/dist/cli/index.js';
import { NATIVE_TARGETS, exportNative } from '../packages/glyphfox/dist/native-export/index.js';
import { parsePath, segmentsBounds, shapeToSegments } from '../packages/glyphfox/dist/core/geometry.js';
import { parseBody, splitLayers } from '../packages/glyphfox/dist/core/nodes.js';

const ANDROID_NS = 'http://schemas.android.com/apk/res/android';
const { DOMParser } = new JSDOM('').window;
const dir = mkdtempSync(join(os.tmpdir(), 'glyphfox-native-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Parses XML strictly and returns the root element. */
function xml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const error = doc.getElementsByTagName('parsererror')[0];
  if (error) throw new Error(`invalid XML: ${error.textContent}`);
  return doc.documentElement;
}

const android = (el, name) => el.getAttributeNS(ANDROID_NS, name);
const children = (el, tag) => [...el.getElementsByTagName(tag)];

/** Bounds of the stroke elements of an icon source, to compare with the exports. */
function sourceBounds(name) {
  const { primary } = splitLayers(parseBody(getIcon(name).body));
  return segmentsBounds(primary.flatMap((n) => shapeToSegments(n)));
}

function expectBounds(segs, name) {
  const b = segmentsBounds(segs);
  const s = sourceBounds(name);
  for (const k of ['minX', 'minY', 'maxX', 'maxY']) expect(b[k], `${name} ${k}`).toBeCloseTo(s[k], 2);
}

/** Reads the PathBuilder calls of a Kotlin file back into segments. */
function kotlinSegments(code) {
  const segs = [];
  let cx = 0;
  let cy = 0;
  for (const m of code.matchAll(/^\s*(moveTo|lineTo|horizontalLineTo|verticalLineTo|curveTo|quadTo|arcTo|close)\(([^)]*)\)$/gm)) {
    const args = m[2] ? m[2].split(', ') : [];
    for (const a of args) expect(a, m[0]).toMatch(/^(-?\d+(\.\d+)?f|true|false)$/);
    const n = args.map((a) => (a === 'true' ? 1 : a === 'false' ? 0 : parseFloat(a)));
    if (m[1] === 'moveTo') segs.push(['M', ...n]);
    else if (m[1] === 'lineTo') segs.push(['L', ...n]);
    else if (m[1] === 'horizontalLineTo') segs.push(['L', n[0], cy]);
    else if (m[1] === 'verticalLineTo') segs.push(['L', cx, n[0]]);
    else if (m[1] === 'curveTo') segs.push(['C', ...n]);
    else if (m[1] === 'quadTo') segs.push(['Q', ...n]);
    else if (m[1] === 'arcTo') segs.push(['A', ...n]);
    else segs.push(['Z']);
    const last = segs[segs.length - 1];
    if (last[0] !== 'Z') {
      cx = last[last.length - 2];
      cy = last[last.length - 1];
    }
  }
  return segs;
}

function balanced(code) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  for (const ch of code.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/[^\n]*/g, '')) {
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (')}]'.includes(ch) && stack.pop() !== ch) return false;
  }
  return stack.length === 0;
}

async function run(...argv) {
  const out = [];
  const err = [];
  const code = await main(argv, { log: (s) => out.push(s), err: (s) => err.push(s), cwd: dir, tty: false, clipboard: () => true });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

const read = (...p) => readFileSync(join(dir, ...p), 'utf8');

describe('native exports', () => {
  it('exports every icon for every target', () => {
    for (const target of NATIVE_TARGETS) {
      const r = exportNative(target, iconNames);
      expect(r.count, target).toBe(iconNames.length);
      expect(Object.keys(r.files).length, target).toBeGreaterThanOrEqual(iconNames.length);
    }
  });

  it('writes VectorDrawable XML with the strokes converted', () => {
    const { files } = exportNative('android', iconNames);
    for (const name of iconNames) {
      const root = xml(files[`drawable/gf_${name.replace(/-/g, '_')}.xml`]);
      expect(root.tagName, name).toBe('vector');
      expect(android(root, 'width')).toBe('24dp');
      expect(android(root, 'viewportWidth')).toBe('24');
      expect(android(root, 'viewportHeight')).toBe('24');
      expect(android(root, 'tint')).toBe('?attr/colorControlNormal');
      const paths = children(root, 'path');
      expect(paths.length, name).toBeGreaterThan(0);
      const segs = [];
      for (const p of paths) {
        expect(p.hasAttributeNS(ANDROID_NS, 'fillColor'), name).toBe(false);
        expect(android(p, 'strokeWidth')).toBe('2');
        expect(android(p, 'strokeLineCap')).toBe('round');
        expect(android(p, 'strokeLineJoin')).toBe('round');
        expect(android(p, 'strokeColor')).toBe('@android:color/white');
        segs.push(...parsePath(android(p, 'pathData')));
      }
      expectBounds(segs, name);
    }
  });

  it('maps size, weight, corners, color, duotone and transforms to VectorDrawable', () => {
    const one = (spec, options) => xml(Object.values(exportNative('android', [spec], options).files)[0]);
    let root = one('search', { size: 16, weight: 1.5 });
    expect(android(root, 'width')).toBe('16dp');
    expect(android(root, 'height')).toBe('16dp');
    expect(android(children(root, 'path')[0], 'strokeWidth')).toBe('1.694');
    root = one('search', { size: 32, weight: 3, absoluteWeight: true });
    expect(android(children(root, 'path')[0], 'strokeWidth')).toBe('2.25');
    root = one('square', { corners: 'sharp' });
    expect(android(children(root, 'path')[0], 'strokeLineCap')).toBe('square');
    expect(android(children(root, 'path')[0], 'strokeLineJoin')).toBe('miter');
    root = one('heart', { color: '#ff7a1a' });
    expect(root.hasAttributeNS(ANDROID_NS, 'tint')).toBe(false);
    expect(android(children(root, 'path')[0], 'strokeColor')).toBe('#FF7A1A');
    expect(android(one('heart', { color: '#ff7a1a80' }).getElementsByTagName('path')[0], 'strokeColor')).toBe('#80FF7A1A');
    expect(android(one('heart', { color: '?attr/colorPrimary' }), 'tint')).toBe('?attr/colorPrimary');
    expect(android(one('heart', { color: '@color/brand' }), 'tint')).toBe('@color/brand');
    root = one('heart/duotone', { color: '#222222', secondaryColor: '#ff7a1a' });
    const [fill, stroke] = children(root, 'path');
    expect(android(fill, 'fillColor')).toBe('#FF7A1A');
    expect(android(fill, 'fillAlpha')).toBe('0.3');
    expect(fill.hasAttributeNS(ANDROID_NS, 'strokeColor')).toBe(false);
    expect(android(stroke, 'strokeColor')).toBe('#222222');
    expect(children(one('folder', { variant: 'duotone', secondaryOpacity: 0.5 }), 'path').some((p) => android(p, 'fillAlpha') === '0.5')).toBe(true);
    root = one('arrow-right', { rotate: 90, flipX: true, mirrorRtl: true });
    expect(android(root, 'autoMirrored')).toBe('true');
    const group = children(root, 'group')[0];
    expect(android(group, 'pivotX')).toBe('12');
    expect(android(group, 'rotation')).toBe('90');
    expect(android(group, 'scaleX')).toBe('-1');
    expect(children(group, 'path').length).toBeGreaterThan(0);
    for (const spec of ['file+check@tr', 'cloud&lock:overlap', 'user&shield:badge']) expect(children(one(spec), 'path').length, spec).toBeGreaterThan(1);
    expect(Object.keys(exportNative('android', ['file+check', 'cloud&lock:side']).files)).toEqual(['drawable/gf_file_check.xml', 'drawable/gf_cloud_lock_side.xml']);
    expect(Object.keys(exportNative('android', ['home'], { prefix: 'ic_' }).files)).toEqual(['drawable/ic_home.xml']);
  });

  it('writes Compose ImageVector files with a GlyphFox object', () => {
    const { files } = exportNative('compose', iconNames, { package: 'com.acme.icons' });
    const object = files['com/acme/icons/GlyphFox.kt'];
    expect(object).toMatch(/^package com\.acme\.icons$/m);
    expect(object).toContain('object GlyphFox {');
    expect(object).toContain('"arrow-right" to ArrowRight,');
    expect(balanced(object)).toBe(true);
    for (const name of iconNames) {
      const prop = name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
      const code = files[`com/acme/icons/${prop}.kt`];
      expect(code, name).toMatch(/^package com\.acme\.icons$/m);
      expect(code).toContain('import androidx.compose.ui.graphics.vector.ImageVector');
      expect(code).toContain('import androidx.compose.ui.graphics.vector.path');
      expect(code).toContain(`val GlyphFox.${prop}: ImageVector`);
      expect(code).toContain('ImageVector.Builder(');
      expect(code).toContain('defaultWidth = 24.dp,');
      expect(code).toContain('viewportWidth = 24f,');
      expect(code).toContain('strokeLineWidth = 2f,');
      expect(code).toContain('strokeLineCap = StrokeCap.Round,');
      expect(code).toContain('}.build()');
      expect(code).toMatch(new RegExp(`^private var _${prop[0].toLowerCase()}${prop.slice(1)}: ImageVector\\? = null$`, 'm'));
      expect(code).not.toMatch(/\bfill = /);
      expect(balanced(code), name).toBe(true);
      expectBounds(kotlinSegments(code), name);
    }
    const duo = exportNative('compose', ['bell/duotone'], { color: '#ff7a1a', corners: 'sharp', rotate: 45, mirrorRtl: true }).files['glyphfox/BellDuotone.kt'];
    expect(duo).toContain('fill = SolidColor(Color(0xFFFF7A1A)),');
    expect(duo).toContain('fillAlpha = 0.3f,');
    expect(duo).toContain('stroke = SolidColor(Color(0xFFFF7A1A)),');
    expect(duo).toContain('strokeLineCap = StrokeCap.Square,');
    expect(duo).toContain('strokeLineJoin = StrokeJoin.Miter,');
    expect(duo).toContain('rotate = 45f,');
    expect(duo).toContain('autoMirror = true,');
    expect(duo).toContain('import androidx.compose.ui.graphics.vector.group');
    expect(duo.indexOf('fill = ')).toBeLessThan(duo.indexOf('stroke = '));
    expect(balanced(duo)).toBe(true);
  });

  it('writes an asset catalog with SVG image sets', () => {
    const { files } = exportNative('ios', ['home', 'arrow-right', 'heart/duotone']);
    const root = JSON.parse(files['GlyphFox.xcassets/Contents.json']);
    expect(root).toEqual({ info: { author: 'xcode', version: 1 } });
    for (const asset of ['gf-home', 'gf-arrow-right', 'gf-heart-duotone']) {
      const set = `GlyphFox.xcassets/${asset}.imageset`;
      const contents = JSON.parse(files[`${set}/Contents.json`]);
      expect(contents.images).toEqual([{ filename: `${asset}.svg`, idiom: 'universal' }]);
      expect(contents.info).toEqual({ author: 'xcode', version: 1 });
      expect(contents.properties).toEqual({ 'preserves-vector-representation': true, 'template-rendering-intent': 'template' });
      const svg = xml(files[`${set}/${asset}.svg`]);
      expect(svg.tagName).toBe('svg');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(files[`${set}/${asset}.svg`]).not.toContain('currentColor');
    }
    expect(files['GlyphFox.xcassets/gf-home.imageset/Contents.json']).toContain('"preserves-vector-representation" : true');
    const svg = xml(files['GlyphFox.xcassets/gf-heart-duotone.imageset/gf-heart-duotone.svg']);
    expect(children(svg, 'path')[0].getAttribute('fill-opacity')).toBe('0.3');
    const g = children(svg, 'g')[0];
    expect(g.getAttribute('stroke-linecap')).toBe('round');
    expect(g.getAttribute('fill')).toBe('none');
    const baked = exportNative('ios', ['home'], { color: '#ff7a1a', mirrorRtl: true, size: 20 }).files;
    const props = JSON.parse(baked['GlyphFox.xcassets/gf-home.imageset/Contents.json']);
    expect(props.properties['template-rendering-intent']).toBe('original');
    expect(props.images[0]['language-direction']).toBe('left-to-right');
    expect(baked['GlyphFox.xcassets/gf-home.imageset/gf-home.svg']).toContain('stroke="#ff7a1a"');
    expect(baked['GlyphFox.xcassets/gf-home.imageset/gf-home.svg']).toContain('width="20"');
  });

  it('writes the SwiftUI enum and Image(glyphfox:)', () => {
    const { files } = exportNative('swiftui', ['home', 'arrow-right', 'repeat']);
    const swift = files['GlyphFox.swift'];
    expect(swift).toMatch(/^import SwiftUI$/m);
    expect(swift).toContain('public enum GlyphFox: String, CaseIterable, Sendable {');
    expect(swift).toContain('    case home = "gf-home"');
    expect(swift).toContain('    case arrowRight = "gf-arrow-right"');
    expect(swift).toContain('    case `repeat` = "gf-repeat"');
    expect(swift).toContain('public extension Image {');
    expect(swift).toContain('init(glyphfox icon: GlyphFox, bundle: Bundle? = nil) {');
    expect(swift).toContain('.renderingMode(.template)');
    expect(swift).toContain('static func glyphfox(_ icon: GlyphFox, in bundle: Bundle? = nil) -> UIImage? {');
    expect(balanced(swift)).toBe(true);
    for (const m of swift.matchAll(/case \S+ = "([^"]+)"/g)) expect(files[`GlyphFox.xcassets/${m[1]}.imageset/Contents.json`], m[1]).toBeDefined();
    expect(exportNative('swiftui', ['home'], { rendering: 'original' }).files['GlyphFox.swift']).toContain('.renderingMode(.original)');
  });

  it('writes Flutter SVG assets, the constants and the GlyphFoxIcon widget', () => {
    const { files, notes } = exportNative('flutter', ['home', 'arrow-right', 'bell/duotone']);
    const dart = files['lib/glyphfox.dart'];
    expect(dart).toContain("import 'package:flutter/widgets.dart';");
    expect(dart).toContain("import 'package:flutter_svg/flutter_svg.dart';");
    expect(dart).toContain('class GlyphFoxIcons {');
    expect(dart).toContain('class GlyphFoxIcon extends StatelessWidget {');
    expect(dart).toContain('SvgPicture.asset(');
    expect(dart).toContain('ColorFilter.mode(tint, BlendMode.srcIn)');
    expect(dart).toContain('final Color? tint = color ?? theme.color;');
    expect(dart).toContain('static const List<String> values = <String>[home, arrowRight, bellDuotone];');
    expect(balanced(dart)).toBe(true);
    const consts = [...dart.matchAll(/static const String (\w+) = '([^']+)';/g)];
    expect(consts.map((m) => m[1])).toEqual(['home', 'arrowRight', 'bellDuotone']);
    for (const [, , path] of consts) expect(xml(files[path]).tagName, path).toBe('svg');
    expect(notes.join('\n')).toContain('flutter_svg');
    expect(exportNative('flutter', ['home'], { color: '#ff7a1a' }).files['lib/glyphfox.dart']).toContain('final Color? tint = color;');
  });

  it('rejects what native vectors cannot draw and names that collide', () => {
    expect(() => exportNative('android', ['heart/solid'])).toThrow(/solid/);
    expect(() => exportNative('compose', ['heart'], { variant: 'solid' })).toThrow(/solid/);
    expect(() => exportNative('android', ['calendar-check', 'calendar+check'])).toThrow(/both export/);
    expect(() => exportNative('android', ['home'], { color: 'orange' })).toThrow(/hex color/);
    expect(() => exportNative('compose', ['home'], { color: '?attr/colorPrimary' })).toThrow(/hex color/);
    expect(() => exportNative('ios', ['home'], { size: '1em' })).toThrow(/size/);
    expect(() => exportNative('android', ['nope'])).toThrow(/unknown icon/);
    expect(() => exportNative('watch', ['home'])).toThrow(/unknown export target/);
    expect(() => exportNative('android', ['package'], { prefix: '' })).toThrow(/resource name/);
    expect(() => exportNative('compose', ['home'], { package: 'com.acme-icons' })).toThrow(/package/);
  });
});

describe('glyphfox export', () => {
  it('is listed in the help', async () => {
    expect((await run('--help')).out).toContain('glyphfox export <target>');
  });

  it('writes each target into --out', async () => {
    writeFileSync(join(dir, 'icons.txt'), 'home\nsearch # find\nfile+check, heart/duotone\n');
    let r = await run('export', 'android', '--from', 'icons.txt', '--out', 'res', '--size', '20');
    expect(r.code, r.err).toBe(0);
    expect(r.err).toContain('exported 4 icons for android');
    expect(readdirSync(join(dir, 'res', 'drawable')).sort()).toEqual(['gf_file_check.xml', 'gf_heart_duotone.xml', 'gf_home.xml', 'gf_search.xml']);
    expect(android(xml(read('res', 'drawable', 'gf_home.xml')), 'width')).toBe('20dp');

    r = await run('export', 'compose', 'home', 'arrow-right', '--package', 'com.acme.icons', '--out', 'kotlin');
    expect(r.code, r.err).toBe(0);
    expect(read('kotlin', 'com', 'acme', 'icons', 'ArrowRight.kt')).toContain('val GlyphFox.ArrowRight: ImageVector');
    expect(existsSync(join(dir, 'kotlin', 'com', 'acme', 'icons', 'GlyphFox.kt'))).toBe(true);

    r = await run('export', 'swiftui', 'home', 'bell', '--out', 'ios-app');
    expect(r.code, r.err).toBe(0);
    expect(read('ios-app', 'GlyphFox.swift')).toContain('case bell = "gf-bell"');
    expect(JSON.parse(read('ios-app', 'GlyphFox.xcassets', 'gf-bell.imageset', 'Contents.json')).images[0].filename).toBe('gf-bell.svg');

    r = await run('export', 'flutter', 'home', '--out', 'flutter-app', '--weight', '1.5');
    expect(r.code, r.err).toBe(0);
    expect(r.err).toContain('pubspec.yaml');
    expect(read('flutter-app', 'assets', 'glyphfox', 'home.svg')).toContain('stroke-width="1.5"');
    expect(read('flutter-app', 'lib', 'glyphfox.dart')).toContain("static const String home = 'assets/glyphfox/home.svg';");
  });

  it('adds image sets to an existing catalog and keeps its Contents.json', async () => {
    const catalog = join(dir, 'App', 'Assets.xcassets');
    mkdirSync(catalog, { recursive: true });
    writeFileSync(join(catalog, 'Contents.json'), '{"info":{"author":"xcode","version":1},"properties":{"provides-namespace":false}}\n');
    const r = await run('export', 'ios', 'home', '--out', 'App/Assets.xcassets');
    expect(r.code, r.err).toBe(0);
    expect(readFileSync(join(catalog, 'Contents.json'), 'utf8')).toContain('provides-namespace');
    expect(existsSync(join(catalog, 'gf-home.imageset', 'gf-home.svg'))).toBe(true);
    expect(existsSync(join(dirname(catalog), 'GlyphFox.xcassets'))).toBe(false);
  });

  it('exports every icon with --all and reports mistakes', async () => {
    let r = await run('export', '--all', 'android', '--out', 'all');
    expect(r.code, r.err).toBe(0);
    expect(readdirSync(join(dir, 'all', 'drawable')).length).toBe(iconNames.length);
    r = await run('export', 'blackberry', 'home');
    expect(r.code).toBe(1);
    expect(r.err).toContain('unknown export target');
    r = await run('export', 'android');
    expect(r.code).toBe(1);
    expect(r.err).toContain('usage: glyphfox export');
    r = await run('export', 'android', 'heart/solid');
    expect(r.code).toBe(1);
    expect(r.err).toContain('solid');
  });
});
