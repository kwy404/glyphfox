// glyphfox smart icons for React: SmartIcon (data icons and locale aware
// icons), StatusIcon (morphs between idle, loading, success and error) and
// IconGroup (one preset staggered across icons).

import { Children, cloneElement, createElement, forwardRef, isValidElement, useEffect, useRef, useState } from 'react';
import { tween } from '../core/controller.js';
import { loadIcon, lookupIcon } from '../core/lookup.js';
import { PROPS, bool } from '../core/render.js';
import { parseSpec } from '../core/spec.js';
import { groupProps } from './group.js';
import { SMART_OPTIONS, nextChange, smartKind, smartNode } from './index.js';
import { renderSmart } from './render.js';
import { statusView } from './status.js';

const OPTIONS = new Set([...PROPS, ...SMART_OPTIONS, 'name', 'gap', 'spinDuration']);
const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };

const ATTR = {
  class: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'font-family': 'fontFamily',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'letter-spacing': 'letterSpacing',
};

function mapAttrs(attrs, key) {
  const out = key === undefined ? {} : { key };
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    out[ATTR[k] || k] = v;
  }
  return out;
}

function toElement(node, key) {
  const [tag, attrs, children] = node;
  const props = mapAttrs(attrs, key);
  if (tag === 'style') {
    props.dangerouslySetInnerHTML = { __html: children || '' };
    return createElement('style', props);
  }
  if (typeof children === 'string') return createElement(tag, props, children);
  return createElement(tag, props, ...(children || []).map((c, i) => toElement(c, i)));
}

/** Splits props into smart options (shared props included) and svg attributes. */
function split(all) {
  const opts = {};
  const rest = {};
  for (const k in all) {
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

/** True when every name is registered; loads the missing ones and re-renders. */
function useNames(names) {
  const [, setVersion] = useState(0);
  const key = [...new Set(names.filter((n) => !lookupIcon(n)))].join(',');
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    Promise.all(key.split(',').map(loadIcon)).then(() => {
      if (alive) setVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, [key]);
  return !key;
}

/** Re-renders a live kind (clock, calendar without a given time or date) when it changes. */
function useTick(kind, opts) {
  const [, setNow] = useState(0);
  const live = Boolean(kind) && bool(opts.tick);
  useEffect(() => {
    if (!live) return undefined;
    let id;
    const plan = () => {
      const ms = nextChange(kind, opts);
      if (ms === null) return;
      id = setTimeout(() => {
        setNow((n) => n + 1);
        plan();
      }, ms);
    };
    plan();
    return () => clearTimeout(id);
  }, [live, kind, opts.seconds, opts.time, opts.date]);
}

function svgElement(node, rest, ref) {
  const { style, children, ...svgRest } = rest;
  const [, attrs, kids] = node;
  const props = { ...mapAttrs(attrs), ...svgRest, ref };
  if (style !== undefined) props.style = style;
  return createElement('svg', props, ...kids.map((c, i) => toElement(c, i)), children);
}

function decorativeOf(opts, rest) {
  if (opts.decorative !== undefined) return opts.decorative;
  if (opts.title) return false;
  return rest['aria-label'] === undefined && rest['aria-labelledby'] === undefined;
}

/**
 * A smart data icon (`kind`: battery, signal, wifi, volume, progress,
 * thermometer, calendar, clock, file, badge, currency) or any icon (`name`
 * or `icon`) with the locale and contrast behaviors.
 */
export const SmartIcon = forwardRef(function SmartIcon(props, ref) {
  const { opts, rest } = split(props);
  const { className, ...other } = rest;
  const kind = opts.kind && smartKind(opts.kind) ? opts.kind : null;
  const target = kind ? null : opts.icon || opts.name;
  const ready = useNames([...namesOf(target), ...namesOf(kind === 'badge' ? opts.icon : null)]);
  useTick(kind, opts);
  let node = null;
  if (ready && (kind || target)) {
    try {
      node = smartNode(kind || target, { ...opts, class: className, decorative: decorativeOf(opts, other) });
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
    }
  }
  if (!node) node = renderSmart(EMPTY, { ...opts, class: className, decorative: true });
  return svgElement(node, other, ref);
});
SmartIcon.displayName = 'SmartIcon';

/** A status icon that morphs between idle, loading, success and error: <StatusIcon state={state} />. */
export const StatusIcon = forwardRef(function StatusIcon({ state = 'idle', ...props }, ref) {
  const { opts, rest } = split(props);
  const { className, ...other } = rest;
  const [view, setView] = useState(() => ({ from: null, to: state, p: 1 }));
  const current = useRef(view);
  current.current = view;
  const duration = opts.duration === undefined ? 450 : Number(opts.duration);
  const delay = opts.delay === undefined ? 0 : Number(opts.delay);
  useEffect(() => {
    const v = current.current;
    if (v.to === state && v.p >= 1) return undefined;
    const from = v.to === state ? v.from : v.to;
    setView({ from, to: state, p: 0 });
    return tween(0, 1, { duration, delay }, (p) => setView((s) => ({ ...s, p })));
  }, [state]);
  const { icon, props: p } = statusView(view.from, view.to, view.p, { ...opts, class: className, decorative: decorativeOf(opts, other) });
  return svgElement(renderSmart(icon, p), other, ref);
});
StatusIcon.displayName = 'StatusIcon';

const isSmartItem = (x) => x && typeof x === 'object' && !isValidElement(x) && typeof x.body !== 'string' && typeof x.kind === 'string';

/**
 * Plays one preset across its icons with a stagger:
 * <IconGroup animate="pop" stagger={80} trigger="hover">...</IconGroup>.
 * Children that are components get animate, trigger, active and delay unless
 * they set them; `icons` renders names, icon data or smart items instead.
 */
export const IconGroup = forwardRef(function IconGroup(
  { animate = 'pop', stagger = 60, delay = 0, from, trigger = 'mount', active, duration, loop, icons, as = 'span', children, className, onMouseEnter, onMouseLeave, onClick, ...props },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [round, setRound] = useState(0);
  const { opts: all, rest } = split(props);
  const { title, decorative: _decorative, ...opts } = all;
  if (title && rest['aria-label'] === undefined) rest['aria-label'] = title;
  const items = icons ? [].concat(icons).filter(Boolean) : Children.toArray(children);
  let mode = { trigger: 'mount' };
  if (trigger === 'hover') mode = { trigger: 'state', active: hovered };
  else if (trigger === 'state') mode = { trigger: 'state', active: bool(active) };
  else if (trigger === 'click') mode = round ? { trigger: 'mount' } : { trigger: 'state', active: false };
  const per = groupProps(items.length, { animate, stagger, delay, from, trigger: mode.trigger, active: mode.active, duration, loop });
  const kids = items.map((item, i) => {
    const key = `${i}-${round}`;
    if (icons) {
      const own = isSmartItem(item) ? item : typeof item === 'object' ? { icon: item } : { name: item };
      return createElement(SmartIcon, { key, ...opts, ...per[i], ...own });
    }
    if (isValidElement(item) && typeof item.type !== 'string') {
      const extra = { key };
      const all = { ...opts, ...per[i] };
      for (const k in all) if (item.props[k] === undefined) extra[k] = all[k];
      return cloneElement(item, extra);
    }
    return item;
  });
  const handlers = {};
  if (trigger === 'hover') {
    handlers.onMouseEnter = (e) => {
      if (onMouseEnter) onMouseEnter(e);
      setHovered(true);
    };
    handlers.onMouseLeave = (e) => {
      if (onMouseLeave) onMouseLeave(e);
      setHovered(false);
    };
  } else {
    if (onMouseEnter) handlers.onMouseEnter = onMouseEnter;
    if (onMouseLeave) handlers.onMouseLeave = onMouseLeave;
  }
  if (trigger === 'click') {
    handlers.onClick = (e) => {
      if (onClick) onClick(e);
      setRound((r) => r + 1);
    };
  } else if (onClick) handlers.onClick = onClick;
  return createElement(as, { ref, role: 'group', ...rest, className: ['glyphfox-group', className].filter(Boolean).join(' '), ...handlers }, ...kids);
});
IconGroup.displayName = 'IconGroup';
