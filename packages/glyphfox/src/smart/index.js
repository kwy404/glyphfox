// glyphfox smart icons: data icons (battery, signal, wifi, volume, progress,
// thermometer, calendar, clock, file, badge, currency), locale aware
// rendering, StatusIcon and IconGroup. Framework neutral: the React, Vue,
// Svelte and web component entry points build on these functions.

import { lookupIcon } from '../core/lookup.js';
import { nodesToString } from '../core/nodes.js';
import { strokeWidth } from '../core/render.js';
import { resolveSpec } from '../core/spec.js';
import { SMART_KINDS, drawSmart, smartKind } from './draw.js';
import { groupProps } from './group.js';
import { contrastProps, renderSmart } from './render.js';

export * from './locale.js';
export { CURRENCY_PATHS, SMART_KINDS, drawSmart, fraction, labelWeight, nextChange, smartKind, toDate, toTime } from './draw.js';
export { STATUS_ICONS, STATUS_STATES, STATUS_TITLES, statusIcon, statusState, statusSvg, statusView } from './status.js';
export { GROUP_TRIGGERS, groupCss, groupProps, nextRun, staggerDelays } from './group.js';
export { contrastCss, contrastMode, contrastProps, renderSmart, smartProps } from './render.js';

/** Options read by the smart icons on top of the shared props. */
export const SMART_OPTIONS = ['kind', 'value', 'min', 'max', 'charging', 'muted', 'label', 'unit', 'date', 'time', 'seconds', 'tick', 'ext', 'filename', 'count', 'dot', 'icon', 'badgeColor', 'currency', 'locale', 'dir', 'contrast'];

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const isSmartItem = (x) => x && typeof x === 'object' && typeof x.body !== 'string' && typeof x.kind === 'string';

/**
 * Builds the smart functions on top of an icon lookup (name to icon data),
 * so names resolve from registered icons (glyphfox/core) or from the full
 * set (glyphfox).
 */
export function createSmart(lookup = lookupIcon) {
  const resolveIcon = (spec, props = {}) => {
    if (spec && typeof spec === 'object') return { icon: spec };
    return resolveSpec(spec, lookup, { weight: strokeWidth(props), gap: props.gap });
  };

  /** Icon data of a smart kind for the options (value, date, count, locale...). */
  function smartIcon(kind, options = {}) {
    const k = smartKind(kind);
    if (!k) throw new RangeError(`unknown smart icon "${kind}" (use ${SMART_KINDS.join(', ')})`);
    const o = contrastProps(options);
    const base = k === 'badge' && options.icon ? resolveIcon(options.icon, o).icon : null;
    return drawSmart(k, o, base);
  }

  /** Node tree of a smart kind, or of any icon spec rendered with the smart behaviors. */
  function smartNode(kindOrSpec, options = {}) {
    const o = contrastProps(options);
    if (typeof kindOrSpec === 'string' && smartKind(kindOrSpec)) return renderSmart(smartIcon(kindOrSpec, o), o);
    const { icon, variant } = resolveIcon(kindOrSpec, o);
    return renderSmart(icon, { ...o, variant: o.variant ?? variant });
  }

  /** SVG markup of a smart kind (or any spec): smartSvg('battery', { value: 0.4 }). */
  function smartSvg(kindOrSpec, options = {}) {
    return nodesToString(smartNode(kindOrSpec, options));
  }

  /**
   * SVG markup of a group of icons that share a preset with a stagger:
   * groupSvg(['home', 'file', { kind: 'battery', value: 0.5 }], { animate: 'pop', stagger: 80 }).
   * Hovering the group plays every icon with trigger "hover".
   */
  function groupSvg(items, options = {}) {
    const list = [].concat(items || []).filter((x) => x !== null && x !== undefined && x !== '');
    const { animate = 'pop', stagger, delay, from, trigger = 'mount', active, duration, loop, class: cls, style, title, decorative: _decorative, ...props } = options;
    const per = groupProps(list.length, { animate, stagger, delay, from, trigger, active, duration, loop });
    const svgs = list.map((item, i) => {
      if (isSmartItem(item)) {
        const { kind, ...o } = item;
        return smartSvg(kind, { ...props, ...per[i], ...o });
      }
      return smartSvg(item, { ...props, ...per[i] });
    });
    return `<span class="glyphfox-group${cls ? ' ' + esc(cls) : ''}" role="group"${title ? ` aria-label="${esc(title)}"` : ''}${style ? ` style="${esc(style)}"` : ''}>${svgs.join('')}</span>`;
  }

  return { smartIcon, smartNode, smartSvg, groupSvg, resolveIcon };
}

const bound = createSmart(lookupIcon);

/** Icon data of a smart kind. Badge icons given by name resolve from registered icons. */
export const smartIcon = bound.smartIcon;
/** Node tree of a smart kind or of any registered spec. */
export const smartNode = bound.smartNode;
/** SVG markup of a smart kind or of any registered spec. */
export const smartSvg = bound.smartSvg;
/** SVG markup of a staggered group of icons. */
export const groupSvg = bound.groupSvg;
