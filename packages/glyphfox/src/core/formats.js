// Copyable snippets for every format, shared by the CLI and the studio.

import { ATTRIBUTES } from './attributes.js';
import { parseSpec } from './spec.js';

export const FORMATS = ['svg', 'jsx', 'vue', 'svelte', 'angular', 'html', 'tailwind', 'cdn', 'datauri'];

function pascal(name) {
  return String(name)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

/** Component name for an icon: arrow-right becomes ArrowRightIcon. */
export function componentName(name) {
  const p = pascal(name);
  return /^\d/.test(p) ? `Icon${p}` : `${p}Icon`;
}

/** Data export name for an icon: arrow-right becomes iconArrowRight. */
export function dataName(name) {
  return `icon${pascal(name)}`;
}

const DEFAULT_VALUES = { size: 24, weight: 2, corners: 'round', variant: 'outline', rotate: 0, trigger: 'mount', modifierCorner: 'bottom-right' };

/** Props that differ from the defaults, in documentation order. */
export function changedProps(props = {}) {
  const out = [];
  for (const key of Object.keys(ATTRIBUTES)) {
    const v = props[key];
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (DEFAULT_VALUES[key] !== undefined && String(DEFAULT_VALUES[key]) === String(v)) continue;
    out.push([key, v]);
  }
  return out;
}

const q = (v) => String(v).replace(/"/g, '&quot;');
const isNum = (v) => typeof v === 'number';

function jsxAttrs(props) {
  return changedProps(props).map(([k, v]) => (v === true ? k : isNum(v) ? `${k}={${v}}` : `${k}="${q(v)}"`));
}
function vueAttrs(props) {
  return changedProps(props).map(([k, v]) => {
    const a = ATTRIBUTES[k];
    return v === true ? a : isNum(v) ? `:${a}="${v}"` : `${a}="${q(v)}"`;
  });
}
function svelteAttrs(props) {
  return changedProps(props).map(([k, v]) => (v === true ? `${k}={true}` : isNum(v) ? `${k}={${v}}` : `${k}="${q(v)}"`));
}
function angularAttrs(props) {
  return changedProps(props).map(([k, v]) => (v === true ? `[${k}]="true"` : isNum(v) ? `[${k}]="${v}"` : `${k}="${q(v)}"`));
}
function htmlAttrs(props) {
  return changedProps(props).map(([k, v]) => {
    const a = ATTRIBUTES[k];
    return v === true ? a : `${a}="${q(v)}"`;
  });
}

function tag(name, attrs, selfClose = true, indent = '') {
  const one = `<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}${selfClose ? ' />' : '>'}`;
  if (one.length <= 88 || !attrs.length) return indent + one;
  return `${indent}<${name}\n${attrs.map((a) => `${indent}  ${a}`).join('\n')}\n${indent}${selfClose ? '/>' : '>'}`;
}

/** Compact data URI for an SVG string. */
export function toDataUri(svg) {
  const body = svg
    .replace(/"/g, "'")
    .replace(/>\s+</g, '><')
    .replace(/[\r\n%#{}<>]/g, (c) => encodeURIComponent(c));
  return `data:image/svg+xml,${body}`;
}

/**
 * Builds the snippet for `format`. `spec` is the icon name syntax, `props`
 * the shared props, `svg` the rendered markup (used by svg and datauri).
 */
export function snippet(format, spec, props = {}, { svg = '', version = '1' } = {}) {
  const p = parseSpec(spec);
  const fused = p.names.length > 1;
  const single = !fused && !p.modifier && !p.variant;
  const extra = { ...props };
  if (p.modifier && !fused) {
    extra.modifier = p.modifier;
    if (p.corner) extra.modifierCorner = p.corner;
  }
  if (p.variant) extra.variant = p.variant;
  const base = p.names[0] || 'icon';
  switch (format) {
    case 'svg':
      return svg;
    case 'datauri':
      return toDataUri(svg);
    case 'jsx': {
      if (fused) {
        const attrs = [`icons={${JSON.stringify(p.names)}}`, ...(p.layout ? [`layout="${p.layout}"`] : []), ...jsxAttrs(extra)];
        return `import { Fusion } from 'glyphfox/react';\n\n${tag('Fusion', attrs)}`;
      }
      const comp = componentName(base);
      return `import { ${comp} } from 'glyphfox/react';\n\n${tag(comp, jsxAttrs(extra))}`;
    }
    case 'vue': {
      if (fused) {
        const attrs = [`:icons="${q(JSON.stringify(p.names))}"`, ...(p.layout ? [`layout="${p.layout}"`] : []), ...vueAttrs(extra)];
        return `<script setup>\nimport { Fusion } from 'glyphfox/vue';\n</script>\n\n<template>\n${tag('Fusion', attrs, true, '  ')}\n</template>`;
      }
      const comp = componentName(base);
      return `<script setup>\nimport { ${comp} } from 'glyphfox/vue';\n</script>\n\n<template>\n${tag(comp, vueAttrs(extra), true, '  ')}\n</template>`;
    }
    case 'svelte': {
      if (fused) {
        const attrs = [`icons={${JSON.stringify(p.names)}}`, ...(p.layout ? [`layout="${p.layout}"`] : []), ...svelteAttrs(extra)];
        return `<script>\n  import { Fusion } from 'glyphfox/svelte';\n</script>\n\n${tag('Fusion', attrs)}`;
      }
      const comp = componentName(base);
      return `<script>\n  import { ${comp} } from 'glyphfox/svelte';\n</script>\n\n${tag(comp, svelteAttrs(extra))}`;
    }
    case 'angular': {
      const attrs = [`name="${q(fused ? p.names.join('&') + (p.layout ? ':' + p.layout : '') : base)}"`, ...angularAttrs(extra)];
      return `import { GlyphFoxIcon, provideGlyphFox } from 'glyphfox-angular';\n\n${tag('gf-icon', attrs, false)}</gf-icon>`;
    }
    case 'html': {
      const attrs = [`name="${q(fused || !single ? spec : base)}"`, ...htmlAttrs(fused || !single ? props : props)];
      return `${tag('glyph-fox', attrs, false)}</glyph-fox>`;
    }
    case 'cdn': {
      const attrs = [`name="${q(spec)}"`, ...htmlAttrs(props)];
      return `<script src="https://cdn.jsdelivr.net/npm/glyphfox@${version}"></script>\n\n${tag('glyph-fox', attrs, false)}</glyph-fox>`;
    }
    case 'tailwind': {
      const axes = [];
      if (props.variant && props.variant !== 'outline') axes.push(props.variant);
      if (props.corners === 'sharp') axes.push('sharp');
      if (props.weight !== undefined && Number(props.weight) !== 2) axes.push(`w${props.weight}`);
      const cls = `gf-${spec}${axes.length ? '/' + axes.join('-') : ''}`;
      return `<span class="${cls}" aria-hidden="true"></span>`;
    }
    default:
      throw new RangeError(`unknown format "${format}" (use ${FORMATS.join(', ')})`);
  }
}
