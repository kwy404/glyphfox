// Rendering for the smart family: the core renderer plus direction props
// (locale and dir), an automatic accessible title (title="auto") and the
// stroke bump under prefers-contrast: more.

import { renderIcon, strokeWidth } from '../core/render.js';
import { labelWeight } from './draw.js';
import { CONTRAST_BUMP, directionProps } from './locale.js';

const r3 = (v) => Math.round(v * 1000) / 1000;

/**
 * The scoped rule for the contrast bump of an icon drawn at stroke width `sw`:
 * { className, css }. Lines get heavier, labels bolder, dimmed parts stronger.
 */
export function contrastCss(sw, bump = CONTRAST_BUMP) {
  const hc = r3(Math.min(4.5, Number(sw) + bump));
  const className = 'gf-hc' + Math.round(hc * 100);
  const css = `@media (prefers-contrast:more){.${className}{stroke-width:${hc}}.${className} .gf-text{font-weight:${labelWeight(hc)}}.${className} .gf-off{opacity:.6}}`;
  return { className, css };
}

/** Contrast mode of the props: "auto" (default, follows the media query), "more" or "off". */
export function contrastMode(props = {}) {
  const c = props.contrast;
  if (c === undefined || c === null || c === '' || c === 'auto' || c === true) return 'auto';
  if (c === 'more' || c === 'high') return 'more';
  if (c === 'done') return 'done';
  return 'off';
}

/** Applies contrast="more" to the props (a heavier weight, once). */
export function contrastProps(props = {}) {
  if (contrastMode(props) !== 'more') return props;
  const w = props.weight === undefined || props.weight === null || props.weight === '' ? 2 : Number(props.weight);
  return { ...props, weight: (Number.isFinite(w) ? w : 2) + CONTRAST_BUMP, contrast: 'done' };
}

function withStyle(node, className, css) {
  const [tag, attrs, children = []] = node;
  const kids = [...children];
  const i = kids.findIndex((c) => c[0] === 'style');
  if (i >= 0) kids[i] = ['style', {}, String(kids[i][2] || '') + css];
  else kids.splice(kids.findIndex((c) => c[0] === 'title') + 1, 0, ['style', {}, css]);
  return [tag, { ...attrs, class: attrs.class ? `${attrs.class} ${className}` : className }, kids];
}

/** Props as the smart family renders them (direction, title="auto", state classes, contrast). */
export function smartProps(icon, props = {}) {
  let p = directionProps(icon, contrastProps(props));
  if (p.title === 'auto' || p.title === true) p = { ...p, title: (icon.smart && icon.smart.title) || undefined };
  const classes = icon.smart && icon.smart.classes ? icon.smart.classes.filter(Boolean) : [];
  if (classes.length) p = { ...p, class: [...classes, p.class].filter(Boolean).join(' ') };
  return p;
}

/** Renders icon data like renderIcon, with the smart behaviors. Returns ['svg', attrs, children]. */
export function renderSmart(icon, props = {}) {
  const p = smartProps(icon, props);
  const node = renderIcon(icon, p);
  if (contrastMode(p) !== 'auto') return node;
  const { className, css } = contrastCss(Number(node[1]['stroke-width']) || strokeWidth(p));
  return withStyle(node, className, css);
}
