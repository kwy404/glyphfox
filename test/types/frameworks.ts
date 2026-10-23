// Compile time checks of the Solid, Preact, Qwik, Lit, Astro, React Native,
// Ember and React Server Components declarations (npm run typecheck).
import { createComponent, createSignal } from 'solid-js';
import { h as preactH } from 'preact';
import { jsx } from '@qwik.dev/core';
import { iconFile, type IconData, type IconProps } from 'glyphfox';
import * as Solid from 'glyphfox/solid';
import { HeartIcon as SolidHeart } from 'glyphfox/solid/icons/heart';
import * as Preact from 'glyphfox/preact';
import * as Qwik from 'glyphfox/qwik';
import * as Lit from 'glyphfox/lit';
import * as Astro from 'glyphfox/astro';
import * as Native from 'glyphfox/native';
import * as Ember from 'glyphfox/ember';
import * as Server from 'glyphfox/react/server';
import { createElement } from 'react';

const shared: IconProps = { size: 20, weight: 1.5, variant: 'duotone', animate: 'pop', trigger: 'click', modifier: 'check', modifierCorner: 'tr', morphTo: 'x', title: 'File' };

// Solid
const [name] = createSignal<'menu' | 'x'>('menu');
createComponent(Solid.FileIcon, { ...shared, class: 'a', style: { color: 'red' }, onClick: () => {} });
createComponent(SolidHeart, { variant: 'solid' });
createComponent(Solid.Icon, { name: 'file+check@tr' });
createComponent(Solid.Fusion, { icons: ['cloud', 'lock'], layout: 'side' });
createComponent(Solid.MorphIcon, { name: name() });
const solidFrame: { icon: IconData } | null = Solid.useMorph(name)();
void solidFrame;
// @ts-expect-error unknown variant
createComponent(Solid.FileIcon, { variant: 'bold' });

// Preact
preactH(Preact.FileIcon, { ...shared, class: 'a', style: { color: 'red' } });
preactH(Preact.Icon, { name: 'heart/solid' });
preactH(Preact.Fusion, { icons: ['cloud', 'lock'], layout: 'overlap' });
const preactFrame: { icon: IconData } | null = Preact.useMorph('menu', { duration: 200 });
void preactFrame;

// Qwik
jsx(Qwik.FileIcon, { ...shared, class: ['a', { b: true }], style: { color: 'red' } });
jsx(Qwik.Icon, { name: 'file+check@tr' });
jsx(Qwik.Fusion, { icons: ['cloud', 'lock'] });
Qwik.registerIcons([iconFile]);

// Lit
const litClass: Lit.GlyphElementClass = Lit.FileIcon;
Lit.defineIcons([Lit.FileIcon, Lit.Icon, Lit.Fusion, Lit.MorphIcon], { prefix: 'gf' });
const glyph = document.createElement('gf-glyph');
glyph.name = 'file+check@tr';
glyph.weight = 1.5;
const fusionEl = document.createElement('gf-fusion');
fusionEl.icons = ['cloud', 'lock'];
const tag: string = litClass.tagName;
void [tag, fusionEl];

// Astro
Astro.FileIcon({ ...shared, class: 'a', style: { color: 'red' } });
Astro.Icon({ name: 'cloud&lock:side' });
Astro.Fusion({ icons: ['cloud', 'lock'], layout: 'badge' });

// React Native
createElement(Native.FileIcon, { ...shared, style: { margin: 4 }, onPress: () => {}, testID: 'file' });
createElement(Native.Icon, { name: 'file+check' });
createElement(Native.MorphIcon, { name: 'menu' });
const nativeFrame: { icon: IconData } | null = Native.useMorph('x');
void nativeFrame;

// Ember
const html: string = Ember.FileIcon({ ...shared, class: 'a' }).toHTML();
Ember.Glyph('file+check@tr', { variant: 'duotone' });
Ember.Glyph({ name: 'heart', size: 32 });
Ember.Fusion('cloud', 'lock', { layout: 'overlap' });
void html;

// React Server Components
createElement(Server.Icon, { name: 'file+check@tr', className: 'a', size: 20 });
createElement(Server.Fusion, { icons: ['cloud', 'lock'], layout: 'side' });
