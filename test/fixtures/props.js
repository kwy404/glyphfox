// One case per shared prop. Every package renders `icon` with `props` and the
// resulting markup must satisfy `check`. The same table drives the core,
// React, Vue, Svelte, Angular and web component tests.

import { expect } from 'vitest';

const classOf = (html) => {
  const m = /<svg[^>]*\sclass="([^"]*)"/.exec(html);
  return m ? m[1] : '';
};
const svgOpen = (html) => {
  const m = /<svg[^>]*>/.exec(html);
  return m ? m[0] : '';
};

export const PROP_CASES = [
  { prop: 'size', icon: 'file', props: { size: 32 }, check: (h) => expect(svgOpen(h)).toMatch(/width="32"[^>]*height="32"/) },
  { prop: 'color', icon: 'file', props: { color: '#ff0000' }, check: (h) => expect(svgOpen(h)).toContain('color="#ff0000"') },
  {
    prop: 'secondaryColor',
    icon: 'file',
    props: { variant: 'duotone', secondaryColor: '#00ff00' },
    check: (h) => expect(h).toMatch(/class="gf-secondary[^"]*"[^>]*color="#00ff00"|color="#00ff00"[^>]*class="gf-secondary/),
  },
  { prop: 'secondaryOpacity', icon: 'file', props: { variant: 'duotone', secondaryOpacity: 0.5 }, check: (h) => expect(h).toMatch(/gf-secondary[^>]*opacity="0.5"/) },
  { prop: 'weight', icon: 'file', props: { weight: 3 }, check: (h) => expect(svgOpen(h)).toContain('stroke-width="3"') },
  { prop: 'absoluteWeight', icon: 'file', props: { size: 48, weight: 2, absoluteWeight: true }, check: (h) => expect(svgOpen(h)).toContain('stroke-width="1"') },
  { prop: 'corners', icon: 'file', props: { corners: 'sharp' }, check: (h) => expect(svgOpen(h)).toMatch(/stroke-linecap="square"[^>]*stroke-linejoin="miter"/) },
  { prop: 'variant', icon: 'file', props: { variant: 'solid' }, check: (h) => expect(h).toContain('class="gf-fill"') },
  { prop: 'rotate', icon: 'file', props: { rotate: 90 }, check: (h) => expect(h).toContain('transform="rotate(90 12 12)"') },
  { prop: 'flipX', icon: 'file', props: { flipX: true }, check: (h) => expect(h).toContain('transform="matrix(-1 0 0 1 24 0)"') },
  { prop: 'flipY', icon: 'file', props: { flipY: true }, check: (h) => expect(h).toContain('transform="matrix(1 0 0 -1 0 24)"') },
  {
    prop: 'mirrorRtl',
    icon: 'file',
    props: { mirrorRtl: true },
    check: (h) => {
      expect(classOf(h).split(/\s+/)).toContain('gf-rtl');
      expect(h).toContain(':dir(rtl)');
    },
  },
  {
    prop: 'animate',
    icon: 'heart',
    props: { animate: 'pop' },
    check: (h) => {
      expect(h).toContain('@keyframes gf-pop');
      expect(classOf(h)).toMatch(/gf-a[0-9a-z]+/);
      expect(h).toContain('class="gf-anim"');
    },
  },
  { prop: 'trigger', icon: 'heart', props: { animate: 'wiggle', trigger: 'hover' }, check: (h) => expect(h).toMatch(/\.gf-a[0-9a-z]+:not\(\.gf-js\):hover \.gf-anim/) },
  { prop: 'active', icon: 'heart', props: { animate: 'shake', trigger: 'state', active: true }, check: (h) => expect(classOf(h).split(/\s+/)).toContain('gf-on') },
  { prop: 'duration', icon: 'heart', props: { animate: 'pop', duration: 1234 }, check: (h) => expect(h).toContain('animation:gf-pop 1234ms') },
  { prop: 'delay', icon: 'heart', props: { animate: 'pop', delay: 321 }, check: (h) => expect(h).toMatch(/animation:gf-pop \d+ms [^;}]* 321ms/) },
  { prop: 'loop', icon: 'heart', props: { animate: 'pop', loop: true }, check: (h) => expect(h).toMatch(/animation:gf-pop [^;}]* infinite/) },
  { prop: 'modifier', icon: 'file', props: { modifier: 'check' }, check: (h) => expect(classOf(h).split(/\s+/)).toContain('glyphfox-file-check') },
  { prop: 'modifierCorner', icon: 'file', props: { modifier: 'plus', modifierCorner: 'top-left' }, check: (h) => expect(classOf(h).split(/\s+/)).toContain('glyphfox-file-plus-tl') },
  { prop: 'morphTo', icon: 'menu', props: { morphTo: 'x', trigger: 'state', active: true }, check: (h) => expect(classOf(h).split(/\s+/)).toContain('glyphfox-x') },
  {
    prop: 'title',
    icon: 'file',
    props: { title: 'Document' },
    check: (h) => {
      expect(h).toContain('<title>Document</title>');
      expect(svgOpen(h)).toContain('role="img"');
      expect(svgOpen(h)).toContain('aria-label="Document"');
    },
  },
  { prop: 'decorative', icon: 'file', props: { title: 'Document', decorative: true }, check: (h) => expect(svgOpen(h)).toContain('aria-hidden="true"') },
  {
    prop: 'animation',
    icon: 'heart',
    props: { animation: '{"name":"beat","duration":640,"frames":[{"at":0,"element":0,"props":{"transform":"scale(1)"}},{"at":0.5,"element":0,"props":{"transform":"scale(1.2)"}},{"at":1,"element":0,"props":{"transform":"scale(1)"}}]}' },
    check: (h) => {
      expect(h).toMatch(/@keyframes gf-t[0-9a-z]+-0\{0%\{transform:scale\(1\)\}50%\{transform:scale\(1\.2\)\}/);
      expect(h).toContain('class="gf-e0"');
      expect(h).toMatch(/\.gf-e0\{animation:gf-t[0-9a-z]+-0 640ms/);
    },
  },
  { prop: 'triggerParent', icon: 'heart', props: { animate: 'pop', trigger: 'hover', triggerParent: true }, check: (h) => expect(h).toMatch(/:is\(a,button[^)]*\):hover \.gf-a[0-9a-z]+/) },
  { prop: 'disabled', icon: 'heart', props: { animate: 'pop', disabled: true }, check: (h) => expect(h).not.toContain('<style') },
];

/** Plain use must stay simple: 24 px, outline, round, hidden from assistive technology. */
export function checkDefault(h) {
  const open = svgOpen(h);
  expect(open).toContain('width="24"');
  expect(open).toContain('viewBox="0 0 24 24"');
  expect(open).toContain('stroke="currentColor"');
  expect(open).toContain('stroke-width="2"');
  expect(open).toContain('stroke-linecap="round"');
  expect(open).toContain('aria-hidden="true"');
  expect(h).not.toContain('<style');
  expect(h).not.toContain('<mask');
}

export { classOf, svgOpen };
