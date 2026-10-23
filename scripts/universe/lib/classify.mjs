// Style, brand and stroke detection for one Iconify icon set. The style of an
// icon comes from, in order: the set palette, the theme of its name (Iconify
// prefixes and suffixes), duotone words, the drawing (stroke only bodies are
// outlines), style words in the name, opacity layers, and a set default.

import { BRAND_SETS, SET_STYLE, THEME_STYLE } from '../../../packages/universe/src/policy.js';

const DUO = new Set(['duotone', 'twotone', 'duo']);
const OUTLINE = new Set(['outline', 'outlined', 'line', 'linear', 'light', 'thin', 'stroke', 'broken']);
const SOLID = new Set(['solid', 'fill', 'filled', 'bold']);

const COLOR_ATTR = /(?:fill|stroke|stop-color)="(?!none"|currentColor"|inherit"|transparent")[^"]+"/;
const OPACITY = /(?:^|\s)(?:fill-)?opacity="(?:0?\.\d+|0)"/;
const DUO_LABEL = /\bduo|two.?tone/i;
const OUTLINE_LABEL = /\b(?:outline|outlined|line|linear|light|thin|stroke|broken)\b/i;
const SOLID_LABEL = /\b(?:solid|fill|filled|bold)\b/i;

/** Style of a theme label. `solidThemes` tells whether the set has a filled theme, so its Regular theme is the outline. */
export function themeStyle(prefix, label, solidThemes = false) {
  if (!label) return null;
  const own = THEME_STYLE[prefix] && THEME_STYLE[prefix][label];
  if (own) return own;
  if (DUO_LABEL.test(label)) return 'duotone';
  if (OUTLINE_LABEL.test(label)) return 'outline';
  if (SOLID_LABEL.test(label)) return 'solid';
  if (/\bregular\b/i.test(label) && solidThemes) return 'outline';
  return null;
}

function wordsStyle(prefix, words) {
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (DUO.has(w) || (w === 'two' && words[i + 1] === 'tone')) return 'duotone';
  }
  let outline = false;
  let solid = false;
  for (const w of words) {
    if (OUTLINE.has(w)) outline = true;
    else if (SOLID.has(w) || (prefix === 'jam' && w === 'f')) solid = true;
  }
  if (outline && prefix === 'ph') return 'outline';
  if (solid && !outline) return prefix === 'ph' && words.includes('bold') ? 'outline' : 'solid';
  if (outline) return 'outline';
  return null;
}

/** Analysis of an SVG body: strokes, fills, colors, opacity layers, stroke widths. */
export function analyzeBody(body) {
  const stroke = /stroke="currentColor"/.test(body);
  const fill = /fill="currentColor"/.test(body) || (!stroke && !/fill="none"/.test(body));
  const widths = [];
  for (const m of body.matchAll(/stroke-width="([\d.]+)"/g)) widths.push(Number(m[1]));
  return { stroke, fill, strokeOnly: stroke && !/fill="currentColor"/.test(body), color: COLOR_ATTR.test(body), opacity: OPACITY.test(body), widths };
}

/** The theme label of a name, from the set prefixes and suffixes. */
export function themeOf(name, data) {
  if (data.suffixes) {
    let best = null;
    for (const s of Object.keys(data.suffixes)) {
      if (s && name.endsWith(`-${s}`) && (!best || s.length > best.length)) best = s;
    }
    if (best !== null) return data.suffixes[best];
    if ('' in data.suffixes) return data.suffixes[''];
  }
  if (data.prefixes) {
    for (const p of Object.keys(data.prefixes)) {
      if (p && name.startsWith(`${p}-`)) return data.prefixes[p];
    }
    if ('' in data.prefixes) return data.prefixes[''];
  }
  return null;
}

/**
 * Classifies every visible icon of a set. Returns a Map name -> { style, brand, stroke }
 * and set level facts (dominant stroke width).
 */
export function classifySet(prefix, data, names, brandNames) {
  const info = data.info || {};
  const palette = Boolean(info.palette);
  const brandSet = BRAND_SETS.has(prefix) || info.category === 'Logos';
  // Which style words does the set use? The icons without a word take the other style.
  let outlineWords = 0;
  let solidWords = 0;
  const pre = new Map();
  const labels = [...Object.values(data.suffixes || {}), ...Object.values(data.prefixes || {})];
  const solidThemes = labels.some((l) => SOLID_LABEL.test(l));
  for (const name of names) {
    const words = name.split('-');
    const tStyle = themeStyle(prefix, themeOf(name, data), solidThemes);
    const wStyle = wordsStyle(prefix, words);
    if (wStyle === 'outline') outlineWords++;
    if (wStyle === 'solid') solidWords++;
    pre.set(name, { tStyle, wStyle });
  }
  let fallback = SET_STYLE[prefix] || null;
  if (!fallback && outlineWords > solidWords * 3) fallback = 'solid';
  if (!fallback && solidWords > outlineWords * 3) fallback = 'outline';
  const out = new Map();
  const widthCount = new Map();
  for (const name of names) {
    const icon = data.icons[name];
    const a = analyzeBody(icon.body || '');
    const { tStyle, wStyle } = pre.get(name);
    let style;
    if (palette || a.color) style = 'color';
    else if (tStyle) style = tStyle;
    else if (wStyle === 'duotone') style = 'duotone';
    else if (a.strokeOnly) style = 'outline';
    else if (wStyle) style = wStyle;
    else if (a.opacity) style = 'duotone';
    else if (fallback) style = fallback;
    else style = a.stroke ? 'outline' : 'solid';
    if (style === 'solid' && a.strokeOnly && !tStyle) style = 'outline';
    const brand = brandSet || brandNames.has(name);
    if (a.stroke) for (const w of a.widths) widthCount.set(w, (widthCount.get(w) || 0) + 1);
    out.set(name, { style, brand, stroke: a.stroke && !palette && !a.color });
  }
  let strokeWidth = null;
  let top = 0;
  for (const [w, n] of widthCount) {
    if (n > top) {
      top = n;
      strokeWidth = w;
    }
  }
  return { icons: out, strokeWidth };
}
