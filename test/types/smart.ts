// Compile time checks of the smart icon declarations (npm run typecheck).
import { createElement } from 'react';
import { defineComponent, h } from 'vue';
import type { Component } from 'svelte';
import { currencyInfo, groupSvg, isRtlLocale, smartIcon, smartSvg, statusSvg, type CurrencyInfo, type SmartIconData } from 'glyphfox';
import { smartSvg as coreSmartSvg } from 'glyphfox/core';
import { IconGroup, SmartIcon, StatusIcon } from 'glyphfox/react';
import * as Vue from 'glyphfox/vue';
import * as Svelte from 'glyphfox/svelte';
import { GlyphFoxGroupElement, GlyphFoxSmartElement, GlyphFoxStatusElement, defineSmartElements } from 'glyphfox/web';

const data: SmartIconData = smartIcon('battery', { value: 0.4, charging: true });
const svg: string = smartSvg('clock', { time: '09:30', seconds: true, size: 32, title: 'auto' }) + smartSvg('arrow-right', { locale: 'ar' }) + coreSmartSvg('wifi', { value: 1 });
const status: string = statusSvg('success', { from: 'loading', duration: 300 });
const group: string = groupSvg(['home', { kind: 'badge', count: 3 }], { animate: 'pop', stagger: 80, trigger: 'hover' });
const info: CurrencyInfo = currencyInfo({ locale: 'pt-BR' });
const rtl: boolean = isRtlLocale('he');
// @ts-expect-error not a smart kind
smartIcon('toaster');
// @ts-expect-error not a state
statusSvg('done');
void [data, svg, status, group, info, rtl];

createElement(SmartIcon, { kind: 'progress', value: 0.5, label: true, className: 'x', onClick: () => {} });
createElement(SmartIcon, { name: 'chevron-right', locale: 'fa' });
createElement(StatusIcon, { state: 'loading', spinDuration: 800 });
createElement(IconGroup, { animate: 'draw', stagger: 60, icons: ['home', { kind: 'wifi', value: 0.5 }] });
defineComponent({ render: () => [h(Vue.SmartIcon, { kind: 'currency', locale: 'ja-JP' }), h(Vue.StatusIcon, { state: 'error' }), h(Vue.IconGroup, { animate: 'pop' })] });
const sv: Component<{ state?: 'idle' | 'loading' | 'success' | 'error' }> = Svelte.StatusIcon;
void [sv, Svelte.SmartIcon, Svelte.IconGroup];

const els: [typeof GlyphFoxSmartElement, typeof GlyphFoxStatusElement, typeof GlyphFoxGroupElement] = [GlyphFoxSmartElement, GlyphFoxStatusElement, GlyphFoxGroupElement];
const tag: GlyphFoxSmartElement | null = document.querySelector('glyph-fox-smart');
void [els, tag, defineSmartElements()];
