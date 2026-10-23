// glyphfox/native rendered with react-test-renderer. react-native-svg and
// react-native need a device runtime, so vitest.config.js aliases them to
// stand ins (test/stubs) whose components are host components: the tree
// shows exactly what the package hands to react-native-svg.
import { describe, expect, it, vi } from 'vitest';
import { createElement as h, createRef } from 'react';
import { act, create } from 'react-test-renderer';
import * as N from 'glyphfox/native';
import { iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { motion } from './stubs/react-native.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const comp = (name) => N[componentName(name)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

function render(C, props = {}) {
  const restore = quiet();
  let r;
  act(() => {
    r = create(h(C, props));
  });
  restore.mockRestore();
  return r;
}
const tree = (r) => r.toJSON();
const all = (node, type, out = []) => {
  if (!node || typeof node !== 'object') return out;
  if (node.type === type) out.push(node);
  for (const c of node.children || []) all(c, type, out);
  return out;
};
const paths = (r) => all(tree(r), 'Path').map((p) => p.props.d);

describe('glyphfox/native', () => {
  it('exports one forwardRef component per icon, named NameIcon', () => {
    for (const n of iconNames) {
      const C = comp(n);
      expect(C.$$typeof, n).toBe(Symbol.for('react.forward_ref'));
      expect(C.displayName).toBe(componentName(n));
    }
  });

  it('keeps the plain use simple', () => {
    const t = tree(render(N.FileIcon));
    expect(t.type).toBe('Svg');
    expect(t.props).toMatchObject({ width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', accessible: false });
    expect(t.props.className).toBeUndefined();
    expect(all(t, 'Path').length).toBeGreaterThan(0);
    expect(JSON.stringify(t)).not.toContain('style');
  });

  it('supports size, color, weight, absoluteWeight and corners', () => {
    expect(tree(render(N.FileIcon, { size: 32 })).props).toMatchObject({ width: '32', height: '32' });
    expect(tree(render(N.FileIcon, { color: '#ff0000' })).props.color).toBe('#ff0000');
    expect(tree(render(N.FileIcon, { weight: 3 })).props.strokeWidth).toBe('3');
    expect(tree(render(N.FileIcon, { size: 48, weight: 2, absoluteWeight: true })).props.strokeWidth).toBe('1');
    expect(tree(render(N.FileIcon, { corners: 'sharp' })).props).toMatchObject({ strokeLinecap: 'square', strokeLinejoin: 'miter' });
  });

  it('supports variant, secondaryColor and secondaryOpacity', () => {
    const duo = tree(render(N.FileIcon, { variant: 'duotone', secondaryColor: '#00ff00', secondaryOpacity: 0.5 }));
    expect(JSON.stringify(duo)).toContain('"color":"#00ff00"');
    expect(JSON.stringify(duo)).toContain('"opacity":0.5');
    expect(JSON.stringify(tree(render(N.HeartIcon, { variant: 'solid' })))).toContain('"fill":"currentColor"');
  });

  it('supports rotate, flipX and flipY', () => {
    const g = (props) => all(tree(render(N.FileIcon, props)), 'G')[0].props.transform;
    expect(g({ rotate: 90 })).toBe('rotate(90 12 12)');
    expect(g({ flipX: true })).toBe('matrix(-1 0 0 1 24 0)');
    expect(g({ flipY: true })).toBe('matrix(1 0 0 -1 0 24)');
  });

  it('supports modifier and modifierCorner', () => {
    const plain = paths(render(N.FileIcon));
    expect(paths(render(N.FileIcon, { modifier: 'check' }))).not.toEqual(plain);
    expect(paths(render(N.FileIcon, { modifier: 'plus', modifierCorner: 'top-left' }))).not.toEqual(paths(render(N.FileIcon, { modifier: 'plus' })));
  });

  it('supports title and decorative', () => {
    expect(tree(render(N.FileIcon, { title: 'Document' })).props).toMatchObject({ accessible: true, accessibilityRole: 'image', accessibilityLabel: 'Document' });
    expect(tree(render(N.FileIcon, { title: 'Document', decorative: true })).props).toMatchObject({ accessible: false, importantForAccessibility: 'no-hide-descendants' });
  });

  it('samples living states frame by frame (animate, trigger, duration, delay, loop)', async () => {
    const r = render(N.HeartIcon, { animate: 'pop', duration: 120, delay: 10 });
    await act(() => wait(60));
    const mid = all(tree(r), 'G').find((g) => /scale\(/.test(g.props.transform || ''));
    expect(mid, 'a scaled frame while the pop plays').toBeTruthy();
    await act(() => wait(200));
    expect(all(tree(r), 'G').some((g) => /scale\(/.test(g.props.transform || ''))).toBe(false);
    act(() => r.unmount());
    const draw = render(N.HeartIcon, { animate: 'draw', loop: true, duration: 200 });
    await act(() => wait(40));
    const dashed = all(tree(draw), 'Path').find((p) => p.props.strokeDasharray);
    expect(dashed.props.strokeDasharray).toMatch(/^[\d.]+ [\d.]+$/);
    expect(Number(dashed.props.strokeDasharray.split(' ')[0])).toBeGreaterThan(1);
    act(() => draw.unmount());
  });

  it('starts state and press triggers on demand', async () => {
    const r = render(N.BellIcon, { animate: 'shake', trigger: 'state', active: false, duration: 400 });
    await act(() => wait(40));
    expect(all(tree(r), 'G').some((g) => /rotate\(/.test(g.props.transform || ''))).toBe(false);
    act(() => r.update(h(N.BellIcon, { animate: 'shake', trigger: 'state', active: true, duration: 400 })));
    await act(() => wait(80));
    expect(all(tree(r), 'G').some((g) => /rotate\(/.test(g.props.transform || ''))).toBe(true);
    act(() => r.unmount());
    const c = render(N.HeartIcon, { animate: 'pop', trigger: 'click', duration: 400 });
    expect(typeof tree(c).props.onPress).toBe('function');
    await act(() => tree(c).props.onPress({}));
    await act(() => wait(60));
    expect(all(tree(c), 'G').some((g) => /scale\(/.test(g.props.transform || ''))).toBe(true);
    act(() => c.unmount());
  });

  it('follows the reduce motion setting', async () => {
    motion.reduce = true;
    const r = render(N.HeartIcon, { animate: 'pop', duration: 400 });
    await act(() => wait(60));
    expect(all(tree(r), 'G').some((g) => /scale\(/.test(g.props.transform || ''))).toBe(false);
    act(() => r.unmount());
    motion.reduce = false;
  });

  it('morphs with morphTo and settles on the exact target', async () => {
    const r = render(N.MenuIcon, { morphTo: 'x', duration: 60 });
    await act(() => wait(250));
    expect(paths(r)).toEqual(paths(render(N.XIcon)));
  });

  it('morphs between names with MorphIcon', async () => {
    const r = render(N.MorphIcon, { name: 'menu', duration: 60 });
    expect(paths(r)).toEqual(paths(render(N.MenuIcon)));
    act(() => r.update(h(N.MorphIcon, { name: 'x', duration: 60 })));
    await act(() => wait(250));
    expect(paths(r)).toEqual(paths(render(N.XIcon)));
    expect(typeof N.useMorph).toBe('function');
  });

  it('passes style and props through and forwards the ref', () => {
    const ref = createRef();
    const restore = quiet();
    let r;
    act(() => {
      r = create(h(N.FileIcon, { ref, style: { margin: 4 }, testID: 'file' }), { createNodeMock: () => ({ svg: true }) });
    });
    restore.mockRestore();
    expect(tree(r).props.style).toEqual({ margin: 4 });
    expect(tree(r).props.testID).toBe('file');
    expect(ref.current).toEqual({ svg: true });
  });

  it('renders specs with Icon and fusions with Fusion', () => {
    expect(paths(render(N.Icon, { name: 'file+check@tr' }))).toEqual(paths(render(N.FileIcon, { modifier: 'check', modifierCorner: 'tr' })));
    expect(JSON.stringify(tree(render(N.Icon, { name: 'heart/solid' })))).toContain('"fill":"currentColor"');
    expect(all(tree(render(N.Fusion, { icons: ['cloud', 'lock'], layout: 'side' })), 'Path').length).toBeGreaterThan(1);
  });
});
