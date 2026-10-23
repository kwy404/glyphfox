// Compile time checks of the published type declarations (npm run typecheck).
import { createElement, createRef } from 'react';
import { defineComponent, h } from 'vue';
import type { Component } from 'svelte';
import {
  fuse,
  getIcon,
  hasIconSource,
  loadIcon,
  normalizeIcon,
  registerIconSource,
  iconFile,
  icons,
  resolve,
  search,
  snippet,
  toSvg,
  type IconData,
  type IconName,
  type IconProps,
} from 'glyphfox';
import { FileIcon, Fusion, Icon, MorphIcon, useMorph, type GlyphProps } from 'glyphfox/react';
import * as Vue from 'glyphfox/vue';
import * as Svelte from 'glyphfox/svelte';
import { GlyphFoxElement, defineGlyphFox } from 'glyphfox/web';
import glyphfoxTailwind from 'glyphfox/tailwind';
import { renderIcon, registerIcons, morphFrame } from 'glyphfox/core';
import { foxify, lintSvg } from 'glyphfox/tools';

const name: IconName = 'file';
// @ts-expect-error not an icon name
const wrong: IconName = 'not-an-icon';
void wrong;

const data: IconData = iconFile;
const props: IconProps = {
  size: 24,
  color: 'red',
  secondaryColor: 'blue',
  secondaryOpacity: 0.5,
  weight: 1.5,
  absoluteWeight: true,
  corners: 'sharp',
  variant: 'duotone',
  rotate: 90,
  flipX: true,
  flipY: false,
  mirrorRtl: true,
  animate: 'draw',
  trigger: 'hover',
  active: true,
  duration: 300,
  delay: 0,
  loop: 2,
  modifier: 'check',
  modifierCorner: 'tr',
  morphTo: 'x',
  title: 'File',
  decorative: false,
};
// @ts-expect-error unknown variant
const badProps: IconProps = { variant: 'bold' };
void badProps;

const svg: string = toSvg(name, props) + toSvg('file+check@tr') + toSvg(data, { class: 'x', gap: 1 });
const fused: IconData = fuse(['cloud', 'lock'], { layout: 'overlap', gap: 1 });
const found: IconData[] = search('lock', { limit: 3 });
const icon: IconData | null = getIcon('file');
const all: IconData = icons.file;
const code: string = snippet('jsx', 'file', props);
void [svg, fused, found, icon, all, code, resolve('heart/solid')];

const ref = createRef<SVGSVGElement>();
const reactProps: GlyphProps = { ...props, className: 'a', style: { color: 'red' }, onClick: () => {} };
createElement(FileIcon, { ...reactProps, ref });
createElement(Icon, { name: 'file+check' });
createElement(Fusion, { icons: ['cloud', 'lock'], layout: 'side' });
createElement(MorphIcon, { name: 'menu' });
const morph: { icon: IconData } | null = useMorph('menu', { duration: 200 });
void morph;

defineComponent({ render: () => h(Vue.FileIcon, { size: 32, variant: 'solid' }) });
void Vue.useMorph;
const sv: Component<Svelte.GlyphProps> = Svelte.FileIcon;
void sv;

const el: GlyphFoxElement = document.createElement('glyph-fox');
void el;
defineGlyphFox('my-icon');
glyphfoxTailwind({ prefix: 'gf', combos: ['cloud&lock'], variant: 'solid' });
renderIcon(iconFile, { size: 32 });
registerIcons([iconFile]);
morphFrame(iconFile, null, 0);
const fx: string = foxify('<svg></svg>').svg;
void [fx, lintSvg(fx)];

registerIconSource('demo', { get: (name: string) => (name === 'dot' ? { body: '<circle cx="12" cy="12" r="4"/>' } : null) });
registerIconSource('lazy', (name: string) => Promise.resolve({ body: '<path d="M4 4h16"/>', viewBox: '0 0 24 24', mode: 'stroke' as const, tags: [name] }));
const hasDemo: boolean = hasIconSource('demo');
const loaded: Promise<IconData | null> = loadIcon('demo:dot');
void [hasDemo, loaded, normalizeIcon({ body: '<rect width="48" height="48"/>', viewBox: '0 0 48 48', mode: 'fill' })];
