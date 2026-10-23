// The renderer shared by every package. renderIcon(icon, props) returns a
// node tree ['svg', attrs, children] that each framework turns into its own
// elements; toSvg serializes it to a string.

import { ANIMATIONS, TRIGGERS, animationCss, frameState } from './animate.js';
import { iconAnimation, sampleTimeline, stateStyle, timelineCss, usesDash } from './timeline.js';
import { normalizeCorner, withModifier } from './compose.js';
import { pairOpacity, pairPoints, pointsToPath, prepareMorph } from './morph.js';
import { hash, iconNodes, nodesToString, splitLayers } from './nodes.js';
import { solidLayers } from './solid.js';
import { directionProps } from '../smart/locale.js'; // smart icons hook: RTL mirroring of directional icons

export const VARIANTS = ['outline', 'duotone', 'solid'];
export const CORNER_STYLES = ['round', 'sharp'];

/** Every prop shared by the packages, in documentation order. */
export const PROPS = [
  'size',
  'color',
  'secondaryColor',
  'secondaryOpacity',
  'weight',
  'absoluteWeight',
  'corners',
  'variant',
  'rotate',
  'flipX',
  'flipY',
  'mirrorRtl',
  'animate',
  'trigger',
  'active',
  'duration',
  'delay',
  'loop',
  'modifier',
  'modifierCorner',
  'morphTo',
  'title',
  'decorative',
  'animation',
  'triggerParent',
  'disabled',
];

export const DEFAULTS = Object.freeze({
  size: 24,
  weight: 2,
  absoluteWeight: false,
  corners: 'round',
  variant: 'outline',
  rotate: 0,
  flipX: false,
  flipY: false,
  mirrorRtl: false,
  trigger: 'mount',
  active: false,
  delay: 0,
  modifierCorner: 'bottom-right',
  triggerParent: false,
  disabled: false,
});

const RTL_CSS = '[dir=rtl] .gf-rtl,.gf-rtl:dir(rtl){transform:scaleX(-1)}';

/** Pixel size for a size value, or null for relative units such as 1em. */
export function sizeToPx(size) {
  if (typeof size === 'number') return Number.isFinite(size) && size > 0 ? size : null;
  const m = /^\s*(\d*\.?\d+)\s*(px)?\s*$/.exec(String(size ?? ''));
  return m ? parseFloat(m[1]) : null;
}

const round3 = (v) => Math.round(v * 1000) / 1000;

/**
 * Stroke width in grid units for a weight. Weight runs from 1 to 3; below
 * 24 px it is compensated optically so small icons keep their presence.
 * absoluteWeight keeps the stroke at `weight` pixels at every size.
 */
export function strokeWidth({ size = 24, weight = 2, absoluteWeight = false } = {}) {
  let w = Number(weight);
  if (!Number.isFinite(w)) w = 2;
  w = Math.min(4, Math.max(0.5, w));
  const px = sizeToPx(size);
  if (absoluteWeight) return px ? round3((w * 24) / px) : w;
  if (px && px < 24) return round3(w * Math.min(1.3, Math.pow(24 / px, 0.3)));
  return w;
}

/** Boolean props also accept "", "true" and "false" (HTML attributes). */
export function bool(v) {
  if (v === '' || v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  const s = String(v).toLowerCase();
  return s !== 'false' && s !== '0' && s !== 'no';
}

function transformFor(rotate, flipX, flipY) {
  const parts = [];
  const r = Number(rotate) || 0;
  if (r % 360) parts.push(`rotate(${round3(r)} 12 12)`);
  if (flipX && flipY) parts.push('matrix(-1 0 0 -1 24 24)');
  else if (flipX) parts.push('matrix(-1 0 0 1 24 0)');
  else if (flipY) parts.push('matrix(1 0 0 -1 0 24)');
  return parts.join(' ');
}

const modCache = new WeakMap();
function modified(icon, modifier, corner, weight) {
  let m = modCache.get(icon);
  if (!m) {
    m = new Map();
    modCache.set(icon, m);
  }
  const key = `${modifier}|${corner}|${weight}`;
  let out = m.get(key);
  if (!out) {
    out = withModifier(icon, modifier, corner, { weight });
    m.set(key, out);
  }
  return out;
}

function maskDef(maskNodes, sw, cap) {
  const children = maskNodes.map(([tag, a]) => {
    if (a.fill !== undefined || a.stroke !== undefined) return [tag, a];
    return [tag, { ...a, fill: 'none', stroke: '#000' }];
  });
  const id = 'gf-m' + hash(nodesToString(children) + '|' + sw + '|' + cap);
  return {
    id,
    node: ['mask', { id, maskUnits: 'userSpaceOnUse', x: '-2', y: '-2', width: '28', height: '28' }, [['rect', { x: '-2', y: '-2', width: '28', height: '28', fill: '#fff', stroke: 'none' }], ...children]],
  };
}

function fillGroups(layers, { duotone, secondaryColor, secondaryOpacity, sw, cap, defs, opacityScale = 1 }) {
  const out = [];
  for (const g of layers.groups) {
    const attrs = { class: duotone ? 'gf-secondary gf-fill' : 'gf-fill', fill: 'currentColor', stroke: 'none' };
    if (g.mask && g.mask.length) {
      const m = maskDef(g.mask, sw, cap);
      if (!defs.some((d) => d[1].id === m.id)) defs.push(m.node);
      attrs.mask = `url(#${m.id})`;
    }
    if (secondaryColor) attrs.color = secondaryColor;
    let op = duotone ? 0.3 : 1;
    if (secondaryOpacity !== undefined && secondaryOpacity !== null && secondaryOpacity !== '') op = Number(secondaryOpacity);
    op *= opacityScale;
    if (op < 1) attrs.opacity = round3(Math.max(0, op));
    out.push(['g', attrs, g.fill.map(([tag, a]) => [tag, a])]);
  }
  return out;
}

function secondaryNode(node, { secondaryColor, secondaryOpacity, opacityScale = 1 }) {
  const [tag, a] = node;
  const attrs = { ...a, class: 'gf-secondary gf-fill' };
  if (secondaryColor) attrs.color = secondaryColor;
  let op = a.opacity !== undefined ? Number(a.opacity) : 0.3;
  if (secondaryOpacity !== undefined && secondaryOpacity !== null && secondaryOpacity !== '') op = Number(secondaryOpacity);
  attrs.opacity = round3(Math.max(0, op * opacityScale));
  return [tag, attrs];
}

/** Variant layers of an icon: fill nodes drawn behind, and the stroke nodes. */
function variantLayers(icon, variant, ctx) {
  const { secondary, primary } = splitLayers(iconNodes(icon));
  if (variant === 'duotone') {
    if (secondary) return { fills: [secondaryNode(secondary, ctx)], strokes: primary };
    const sl = solidLayers(icon);
    if (sl) return { fills: fillGroups(sl, { ...ctx, duotone: true }), strokes: primary };
  } else if (variant === 'solid') {
    const sl = solidLayers(icon);
    if (sl) return { fills: fillGroups(sl, { ...ctx, duotone: false }), strokes: sl.strokes };
  }
  return { fills: [], strokes: primary };
}

function safeName(name) {
  return String(name || 'icon')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function rootAttrs(icon, o, sw, extraClasses) {
  const sharp = o.corners === 'sharp';
  const attrs = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: String(o.size ?? 24),
    height: String(o.size ?? 24),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': String(sw),
    'stroke-linecap': sharp ? 'square' : 'round',
    'stroke-linejoin': sharp ? 'miter' : 'round',
  };
  if (o.color) attrs.color = String(o.color);
  const classes = ['glyphfox', 'glyphfox-' + safeName(icon.name), ...extraClasses];
  if (bool(o.mirrorRtl)) classes.push('gf-rtl');
  if (o.class) classes.push(String(o.class));
  attrs.class = classes.join(' ');
  if (typeof o.style === 'string' && o.style) attrs.style = o.style;
  const decorative = o.decorative === undefined || o.decorative === null ? !o.title : bool(o.decorative);
  if (decorative) attrs['aria-hidden'] = 'true';
  else {
    attrs.role = 'img';
    if (o.title) attrs['aria-label'] = String(o.title);
  }
  return attrs;
}

/**
 * Renders an icon data object with props. Returns ['svg', attrs, children].
 * Internal props: `run` ("1" or "2", replays click animations) and `frame`
 * (time in ms, samples the animation into static attributes for export).
 */
export function renderIcon(icon, props = {}) {
  if (!icon || typeof icon.body !== 'string') throw new TypeError('renderIcon expects an icon data object');
  const o = directionProps(icon, props); // smart icons hook (src/smart/locale.js)
  const sw = strokeWidth(o);
  // Filled icons (from filled sets) keep their own paint: the style axis has
  // nothing to change and the draw animation falls back to pop.
  const filled = icon.filled === true;
  const variant = !filled && VARIANTS.includes(o.variant) ? o.variant : 'outline';
  const cap = o.corners === 'sharp' ? 'sharp' : 'round';
  let ic = icon;
  if (o.modifier) ic = modified(ic, String(o.modifier), normalizeCorner(o.modifierCorner), sw);
  if (o.morphTo && typeof o.morphTo === 'object' && o.morphTo.body !== undefined) {
    const target = o.modifier ? modified(o.morphTo, String(o.modifier), normalizeCorner(o.modifierCorner), sw) : o.morphTo;
    return renderStaticMorph(ic, target, o, sw);
  }

  const defs = [];
  const ctx = { secondaryColor: o.secondaryColor, secondaryOpacity: o.secondaryOpacity, sw, cap, defs };
  let fills;
  let strokes;
  if (ic.morph) {
    const { from, to, t, fromVariant, toVariant } = ic.morph;
    const a = variantLayers(from, fromVariant || variant, { ...ctx, opacityScale: 1 - t });
    const b = variantLayers(to, toVariant || variant, { ...ctx, opacityScale: t });
    fills = [...a.fills, ...b.fills];
    strokes = splitLayers(iconNodes(ic)).primary;
  } else {
    ({ fills, strokes } = variantLayers(ic, variant, ctx));
  }

  // disabled stops every animation; a designed animation (the icon's own
  // timeline, or one passed as an object or JSON) wins over the presets.
  const disabled = bool(o.disabled);
  const timeline = !disabled && o.animation !== undefined && o.animation !== null && o.animation !== false && o.animation !== 'false' ? iconAnimation(icon, o.animation) : null;
  let anim = !disabled && !timeline && o.animate && ANIMATIONS[o.animate] ? String(o.animate) : null;
  if (anim === 'draw' && (filled || ic.filled === true)) anim = 'pop';
  const trigger = TRIGGERS.includes(o.trigger) ? o.trigger : 'mount';
  const frame = typeof o.frame === 'number' && Number.isFinite(o.frame) ? o.frame : null;
  const classes = [];
  let css = '';
  let content;
  if (timeline) {
    const tracks = new Map(timeline.tracks.map((tr) => [tr.element, tr]));
    const states = frame !== null ? new Map(sampleTimeline(timeline, frame, { duration: o.duration, delay: o.delay, loop: o.loop }).map((st) => [st.element, st])) : null;
    const dressed = (node, key, extraClass) => {
      const tr = tracks.get(key);
      if (!tr) return node;
      const [tag, a, ch] = node;
      const attrs = { ...a };
      if (extraClass) attrs.class = a.class ? `${a.class} ${extraClass}` : extraClass;
      if (usesDash(tr)) {
        attrs.pathLength = '1';
        attrs['stroke-dasharray'] = '1 1';
      }
      if (states) {
        const st = states.get(key);
        const style = stateStyle(st, timeline.origin);
        if (style) attrs.style = style;
        if (st.d !== undefined && tag === 'path') attrs.d = st.d;
      }
      return ch === undefined ? [tag, attrs] : [tag, attrs, ch];
    };
    const strokeNodes = strokes.map((n, i) => dressed(n, String(i), `gf-e${i}`));
    const fillNodes = fills.map((n) => (n[1] && typeof n[1].class === 'string' && n[1].class.includes('gf-secondary') ? dressed(n, 'secondary') : n));
    if (!states) {
      const tc = timelineCss(timeline, { trigger, triggerParent: o.triggerParent, duration: o.duration, delay: o.delay, loop: o.loop });
      classes.push(tc.className);
      css += tc.css;
      if (trigger === 'state' && bool(o.active)) classes.push('gf-on');
    }
    const group = { class: 'gf-anim' };
    if (states && states.has('all')) {
      const style = stateStyle(states.get('all'), timeline.origin);
      if (style) group.style = style;
    }
    content = [['g', group, [...fillNodes, ...strokeNodes]]];
  } else if (anim) {
    const spec = { animate: anim, trigger, triggerParent: o.triggerParent, duration: o.duration, delay: o.delay, loop: o.loop, count: strokes.length };
    let groupAttrs = { class: 'gf-anim' };
    let strokeNodes = strokes;
    if (frame !== null) {
      const st = frameState(spec, frame);
      if (anim === 'draw') {
        strokeNodes = strokes.map(([tag, a], k) => {
          const d = st.draw[k] || { offset: 0, opacity: 1 };
          return [tag, { ...a, pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': String(round3(d.offset)), opacity: d.opacity < 1 ? String(round3(d.opacity)) : undefined }];
        });
        fills = fills.map(([tag, a, ch]) => [tag, { ...a, opacity: String(round3((a.opacity !== undefined ? Number(a.opacity) : 1) * st.fill)) }, ch]);
      } else {
        groupAttrs = { class: 'gf-anim', transform: st.transform };
        if (st.opacity < 1) groupAttrs.opacity = String(st.opacity);
      }
    } else {
      const ac = animationCss(spec);
      classes.push(ac.className);
      css += ac.css;
      if (trigger === 'state' && bool(o.active)) classes.push('gf-on');
      if (anim === 'draw') strokeNodes = strokes.map(([tag, a]) => [tag, { ...a, pathLength: '1' }]);
    }
    content = anim === 'draw' ? [...fills, ['g', groupAttrs, strokeNodes]] : [['g', groupAttrs, [...fills, ...strokeNodes]]];
  } else {
    content = [...fills, ...strokes];
  }
  if (defs.length) content.unshift(['defs', {}, defs]);
  const tf = transformFor(o.rotate, bool(o.flipX), bool(o.flipY));
  if (tf) content = [['g', { transform: tf }, content]];

  const attrs = rootAttrs(ic, o, sw, classes);
  if ((anim || timeline) && trigger === 'click' && (o.run === '1' || o.run === '2' || o.run === 1 || o.run === 2)) attrs['data-gf-run'] = String(o.run);
  if (bool(o.mirrorRtl)) css += RTL_CSS;
  const children = [];
  if (o.title) children.push(['title', {}, String(o.title)]);
  if (css) children.push(['style', {}, css]);
  children.push(...content);
  return ['svg', attrs, children];
}

/** Renders an icon to an SVG string. */
export function renderToString(icon, props) {
  return nodesToString(renderIcon(icon, props));
}

const MORPH_EASE = 'cubic-bezier(.65,0,.35,1)';

/** Content of a rendered icon without its title and style, for morph layers. */
function layerContent(icon, o, variant) {
  const node = renderIcon(icon, { ...o, morphTo: undefined, modifier: undefined, title: undefined, decorative: true, animate: undefined, rotate: 0, flipX: false, flipY: false, mirrorRtl: false, variant });
  return node[2].filter((c) => c[0] !== 'title' && c[0] !== 'style');
}

/** CSS morph for filled icons: the source fades out while the target fades in. */
function renderFadeMorph(from, to, o, sw, { dur, del, trigger }) {
  const key = 'gf-x' + hash(`${from.body}>${to.body}|${dur}|${del}|${trigger}|fade`);
  const sel = trigger === 'hover' ? [`.${key}:hover`, `:hover>.${key}`] : [`.${key}.gf-on`];
  const S = (tail) => sel.map((s) => `${s} ${tail}`).join(',');
  let css = `.${key} .gf-mb{opacity:0}`;
  if (trigger === 'mount') {
    css += `@keyframes ${key}-f{to{opacity:1}}@keyframes ${key}-o{to{opacity:0}}.${key} .gf-ma{animation:${key}-o ${dur}ms ${MORPH_EASE} ${del}ms both}.${key} .gf-mb{animation:${key}-f ${dur}ms ${MORPH_EASE} ${del}ms both}`;
  } else {
    css += `.${key} .gf-ma,.${key} .gf-mb{transition:opacity ${dur}ms ${MORPH_EASE} ${del}ms}${S('.gf-ma')}{opacity:0}${S('.gf-mb')}{opacity:1}`;
  }
  css += `@media (prefers-reduced-motion:reduce){.${key} *{transition:none!important;animation-duration:1ms!important}}`;
  const children = [];
  if (o.title) children.push(['title', {}, String(o.title)]);
  children.push(['style', {}, css]);
  let content = [
    ['g', { class: 'gf-ma' }, layerContent(from, o, o.variant)],
    ['g', { class: 'gf-mb' }, layerContent(to, o, o.morphVariant || o.variant)],
  ];
  const tf = transformFor(o.rotate, bool(o.flipX), bool(o.flipY));
  if (tf) content = [['g', { transform: tf }, content]];
  children.push(...content);
  return ['svg', rootAttrs(from, o, sw, [key]), children];
}

/**
 * CSS only morph: the paths carry the source shape and switch to the target
 * shape with a `d` transition when the trigger matches (hover, the gf-on
 * class for state and click, or on load for mount). Browsers without CSS
 * `d` support cross fade to the exact target instead.
 */
function renderStaticMorph(from, to, o, sw) {
  const dur = Number.isFinite(Number(o.duration)) && o.duration !== undefined ? Math.round(Number(o.duration)) : 450;
  const del = Number.isFinite(Number(o.delay)) ? Math.round(Number(o.delay)) : 0;
  const trigger = ['mount', 'hover', 'click', 'state'].includes(o.trigger) ? o.trigger : 'mount';
  if (from.filled === true || to.filled === true) return renderFadeMorph(from, to, o, sw, { dur, del, trigger });
  const prep = prepareMorph(from, to);
  const paths = prep.pairs.map((p) => {
    const a = { d: pointsToPath(pairPoints(p, 0), p.closed) };
    const op = pairOpacity(p, 0);
    if (op < 1) a.opacity = String(op);
    return ['path', a];
  });
  const targets = prep.pairs.map((p) => ({ d: pointsToPath(pairPoints(p, 1), p.closed), op: pairOpacity(p, 1) }));
  const key = 'gf-x' + hash(paths.map((p) => p[1].d).join('|') + targets.map((t) => t.d).join('|') + dur + del + trigger);
  const sel = trigger === 'hover' ? [`.${key}:hover`, `:hover>.${key}`] : trigger === 'mount' ? null : [`.${key}.gf-on`];
  const S = (tail) => (sel || [`.${key}`]).map((s) => `${s} ${tail}`).join(',');
  let css = '';
  if (trigger === 'mount') {
    targets.forEach((t, k) => {
      css += `@keyframes ${key}-${k}{to{d:path("${t.d}");opacity:${t.op}}}`;
      css += `.${key} .gf-ma>:nth-child(${k + 1}){animation:${key}-${k} ${dur}ms ${MORPH_EASE} ${del}ms both}`;
    });
    css += `@keyframes ${key}-f{to{opacity:1}}@keyframes ${key}-o{to{opacity:0}}`;
  } else {
    css += `.${key} .gf-ma>*{transition:d ${dur}ms ${MORPH_EASE} ${del}ms,opacity ${dur}ms ${MORPH_EASE} ${del}ms}`;
    targets.forEach((t, k) => {
      css += `${S(`.gf-ma>:nth-child(${k + 1})`)}{d:path("${t.d}");opacity:${t.op}}`;
    });
  }
  css += `.${key} .gf-mb{opacity:0}`;
  if (trigger === 'mount') {
    css += `@supports not (d:path("M0 0")){.${key} .gf-ma{animation:${key}-o ${dur}ms ${del}ms both}.${key} .gf-mb{animation:${key}-f ${dur}ms ${del}ms both}}`;
  } else {
    css += `@supports not (d:path("M0 0")){.${key} .gf-ma,.${key} .gf-mb{transition:opacity ${dur}ms ${del}ms}${S('.gf-ma')}{opacity:0}${S('.gf-mb')}{opacity:1}}`;
  }
  css += `@supports (d:path("M0 0")){.${key} .gf-mb{display:none}}`;
  css += `@media (prefers-reduced-motion:reduce){.${key} *{transition:none!important;animation-duration:1ms!important}}`;
  const target = renderIcon(to, { ...o, morphTo: undefined, modifier: undefined, title: undefined, decorative: true, animate: undefined, rotate: 0, flipX: false, flipY: false, mirrorRtl: false, variant: o.morphVariant || o.variant });
  const targetContent = target[2].filter((c) => c[0] !== 'title' && c[0] !== 'style');
  const attrs = rootAttrs(from, o, sw, [key]);
  const children = [];
  if (o.title) children.push(['title', {}, String(o.title)]);
  children.push(['style', {}, css]);
  let content = [['g', { class: 'gf-ma' }, paths], ['g', { class: 'gf-mb' }, targetContent]];
  const tf = transformFor(o.rotate, bool(o.flipX), bool(o.flipY));
  if (tf) content = [['g', { transform: tf }, content]];
  children.push(...content);
  return ['svg', attrs, children];
}
