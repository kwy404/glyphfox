// Shared logic of the Svelte smart components (plain JS, like ../../svelte/glyph.js).

import { tween } from '../../core/controller.js';
import { loadIcon, lookupIcon } from '../../core/lookup.js';
import { nodesToString } from '../../core/nodes.js';
import { PROPS, bool } from '../../core/render.js';
import { parseSpec } from '../../core/spec.js';
import { groupCss, groupProps, nextRun } from '../group.js';
import { SMART_OPTIONS, nextChange, smartKind, smartNode } from '../index.js';
import { renderSmart } from '../render.js';
import { statusView } from '../status.js';

export { bool, groupCss, nextChange, nextRun, tween };

const OPTIONS = new Set([...PROPS, ...SMART_OPTIONS, 'name', 'gap', 'spinDuration', 'run']);
const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };

function split(all) {
  const opts = {};
  const rest = {};
  for (const k in all) {
    if (all[k] === undefined) continue;
    if (OPTIONS.has(k)) opts[k] = all[k];
    else rest[k] = all[k];
  }
  return { opts, rest };
}

const namesOf = (spec) => {
  if (!spec || typeof spec !== 'string') return [];
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
};

function decorativeOf(opts, rest) {
  if (opts.decorative !== undefined) return opts.decorative;
  if (opts.title) return false;
  return rest['aria-label'] === undefined && rest['aria-labelledby'] === undefined;
}

const view = (node, rest) => ({ attrs: node[1], inner: nodesToString(node[2]), rest });

/** Names (of a regular icon or a badge base) that still have to be loaded. */
export function missingFor(props) {
  const k = props.kind && smartKind(props.kind) ? props.kind : null;
  const names = k ? namesOf(k === 'badge' ? props.icon : null) : namesOf(props.icon || props.name);
  return [...new Set(names.filter((n) => !lookupIcon(n)))];
}

export function loadAll(names) {
  return Promise.all(names.map(loadIcon));
}

/** { attrs, inner, rest } for SmartIcon props. */
export function smartMarkup(props, className) {
  const { opts, rest } = split(props);
  const k = opts.kind && smartKind(opts.kind) ? opts.kind : null;
  const target = k ? null : opts.icon || opts.name;
  if ((k || target) && !missingFor(opts).length) {
    try {
      return view(smartNode(k || target, { ...opts, class: className, decorative: decorativeOf(opts, rest) }), rest);
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
    }
  }
  return view(renderSmart(EMPTY, { ...opts, class: className, decorative: true }), rest);
}

/** { attrs, inner, rest } for StatusIcon at morph progress p. */
export function statusMarkup(from, to, p, props, className) {
  const { opts, rest } = split(props);
  const s = statusView(from, to, p, { ...opts, class: className, decorative: decorativeOf(opts, rest) });
  return view(renderSmart(s.icon, s.props), rest);
}

const isSmartItem = (x) => x && typeof x === 'object' && typeof x.body !== 'string' && typeof x.kind === 'string';

/** Markup of each icon of an IconGroup given by `icons`, with the group props. */
export function groupItems(icons, group, props) {
  const { opts: all } = split(props);
  const { title: _title, decorative: _decorative, ...opts } = all;
  const list = [].concat(icons || []).filter(Boolean);
  const per = groupProps(list.length, group);
  return list.map((item, i) => {
    const own = isSmartItem(item) ? item : typeof item === 'object' ? { icon: item } : { name: item };
    const v = smartMarkup({ ...opts, ...per[i], run: group.run, ...own });
    let attrs = '';
    for (const key in v.attrs) {
      const val = v.attrs[key];
      if (val === undefined || val === null || val === false) continue;
      attrs += ` ${key}="${String(val).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
    }
    return `<svg${attrs}>${v.inner}</svg>`;
  });
}

/** Ticks a live kind: calls onTick when it changes. Returns a stop function. */
export function startTick(kind, options, onTick) {
  let id = null;
  let stopped = false;
  const plan = () => {
    const ms = nextChange(kind, options);
    if (ms === null || stopped) return;
    id = setTimeout(() => {
      onTick();
      plan();
    }, ms);
  };
  plan();
  return () => {
    stopped = true;
    clearTimeout(id);
  };
}
