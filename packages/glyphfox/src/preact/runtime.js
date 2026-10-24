// glyphfox for Preact: icon components with the shared props, Icon, Fusion,
// MorphIcon and the useMorph hook. No preact/compat needed; on Preact 11 a
// `ref` reaches the <svg> element.

import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { fuse } from '../core/compose.js';
import { morphFrame, morphGoal, splitProps, tween } from '../core/controller.js';
import { componentName } from '../core/formats.js';
import { loadIcon, lookupIcon, registerIcons } from '../core/lookup.js';
import { bool, renderIcon, strokeWidth } from '../core/render.js';
import { attachTriggers } from '../core/player.js';
import { parseSpec, resolveSpec } from '../core/spec.js';

export { registerIcons };

const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };

function clean(attrs, key) {
  const out = key === undefined ? {} : { key };
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    out[k] = v;
  }
  return out;
}

function toVNode(node, key) {
  const [tag, attrs, children] = node;
  const props = clean(attrs, key);
  if (tag === 'style') {
    props.dangerouslySetInnerHTML = { __html: children || '' };
    return h('style', props);
  }
  if (typeof children === 'string') return h(tag, props, children);
  return h(tag, props, ...(children || []).map((c, i) => toVNode(c, i)));
}

function namesOf(spec) {
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
}

/** Resolves specs to icon data; loads unregistered names and re-renders. */
function useResolvedList(specs, weight, gap) {
  const [, setVersion] = useState(0);
  const missing = [];
  const out = specs.map((spec) => {
    if (!spec) return null;
    if (typeof spec === 'object') return { icon: spec };
    const lost = namesOf(spec).filter((n) => !lookupIcon(n));
    if (lost.length) {
      missing.push(...lost);
      return null;
    }
    try {
      return resolveSpec(spec, lookupIcon, { weight, gap });
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      return null;
    }
  });
  const key = [...new Set(missing)].join(',');
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
  return out;
}

function useResolved(spec, weight, gap) {
  return useResolvedList([spec], weight, gap)[0];
}

/** Renders icon data with the shared props, handling triggers and morphTo. */
function useGlyph(icon, allProps) {
  const { glyph, rest } = splitProps(allProps);
  const { class: cls, className, style, onClick, onMouseEnter, onMouseLeave, children, ...svgRest } = rest;
  const sw = strokeWidth(glyph);
  const trigger = glyph.trigger || 'mount';
  const target = useResolved(glyph.morphTo, sw);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [run, setRun] = useState(null);
  const [p, setP] = useState(() => (glyph.morphTo && trigger === 'state' && bool(glyph.active) ? 1 : 0));
  const pRef = useRef(p);
  pRef.current = p;
  const lastTarget = useRef(null);
  if (target) lastTarget.current = target;
  useEffect(() => setMounted(true), []);
  const goal = target ? morphGoal(trigger, { active: bool(glyph.active), hovered, toggled, mounted }) : 0;
  const duration = glyph.duration === undefined ? 450 : Number(glyph.duration);
  const delay = glyph.delay === undefined ? 0 : Number(glyph.delay);
  useEffect(() => tween(pRef.current, goal, { duration, delay }, setP), [goal, target && target.icon, duration, delay]);

  const drawTarget = target || (p > 0 ? lastTarget.current : null);
  const frame = morphFrame(icon, drawTarget && drawTarget.icon, p, { variant: glyph.variant, targetVariant: drawTarget && drawTarget.variant });

  const handlers = {};
  if (trigger === 'click' && (glyph.animate || glyph.animation || glyph.morphTo)) {
    handlers.onClick = (e) => {
      if (onClick) onClick(e);
      setToggled((t) => !t);
      setRun((r) => (r === '1' ? '2' : '1'));
    };
  } else if (onClick) handlers.onClick = onClick;
  if (trigger === 'hover' && glyph.morphTo) {
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

  // Triggers that need a script run on the trigger engine, as in React;
  // hover, focus and press take the animation over from the CSS (gf-js).
  const own = useRef(null);
  const userRef = svgRest.ref;
  const setRef = useCallback(
    (node) => {
      own.current = node;
      if (typeof userRef === 'function') userRef(node);
      else if (userRef) userRef.current = node;
    },
    [userRef],
  );
  const animated = (glyph.animate || glyph.animation) && !bool(glyph.disabled);
  const takeover = animated && ['hover', 'focus', 'press'].includes(trigger);
  const engine = animated && (takeover || trigger === 'inView');
  const animKey = typeof glyph.animation === 'object' && glyph.animation ? JSON.stringify(glyph.animation) : glyph.animation;
  useEffect(() => {
    if (!engine || !own.current) return undefined;
    return attachTriggers(own.current, glyph, icon);
  }, [engine, trigger, animKey, glyph.animate, glyph.duration, glyph.delay, glyph.loop, glyph.triggerParent, icon]);

  const labelled = svgRest['aria-label'] !== undefined || svgRest['aria-labelledby'] !== undefined;
  const decorative = glyph.decorative !== undefined ? glyph.decorative : glyph.title ? false : !labelled;
  const extra = [cls, className, takeover ? 'gf-js' : ''].filter(Boolean).join(' ') || undefined;
  const [, attrs, kids] = renderIcon(frame.icon, { ...glyph, variant: frame.variant, morphTo: undefined, class: extra, run, decorative });
  const props = { ...clean(attrs), ...svgRest, ...handlers, ref: setRef };
  if (style !== undefined) props.style = style;
  return h('svg', props, ...kids.map((c, i) => toVNode(c, i)), children);
}

/** Creates a component for icon data. */
export function createIcon(icon) {
  registerIcons([icon]);
  function GlyphIcon(props) {
    return useGlyph(icon, props);
  }
  GlyphIcon.displayName = componentName(icon.name);
  return GlyphIcon;
}

/** Renders icon data (`icon`) or any spec (`name`, such as "file+check" or "cloud&lock"). */
export function Icon({ icon, name, ...props }) {
  const res = useResolved(icon || name, strokeWidth(props), props.gap);
  const { gap: _gap, ...rest } = props;
  return useGlyph(res ? res.icon : EMPTY, { ...rest, variant: rest.variant ?? (res && res.variant) });
}
Icon.displayName = 'Icon';

/** Fuses 2 to 10 icons into one: <Fusion icons={['cloud', 'lock']} layout="overlap" />. */
export function Fusion({ icons = [], layout, gap, scale, offsets, ...props }) {
  const sw = strokeWidth(props);
  const parts = useResolvedList(icons, sw, gap);
  const ready = parts.length >= 2 && parts.every(Boolean);
  const key = parts.map((p) => (p ? p.icon.name : '')).join('|');
  const fused = useMemo(() => {
    if (!ready) return null;
    try {
      return fuse(
        parts.map((p) => p.icon),
        { layout, gap, scale, offsets, weight: sw },
      );
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      return null;
    }
  }, [ready, key, layout, gap, JSON.stringify(scale), JSON.stringify(offsets), sw]);
  return useGlyph(fused || EMPTY, props);
}
Fusion.displayName = 'Fusion';

/**
 * Returns { icon, variant } that morphs into the new icon whenever `spec`
 * changes. Options: duration, delay, weight, size.
 */
export function useMorph(spec, options = {}) {
  const res = useResolved(spec, strokeWidth(options), options.gap);
  const [state, setState] = useState(() => ({ from: res, to: res, p: 1 }));
  const ref = useRef(state);
  ref.current = state;
  const icon = res && res.icon;
  const duration = options.duration === undefined ? 450 : Number(options.duration);
  const delay = options.delay === undefined ? 0 : Number(options.delay);
  useEffect(() => {
    if (!res) return undefined;
    const cur = ref.current;
    if (cur.to && cur.to.icon === res.icon && cur.to.variant === res.variant) return undefined;
    const from = cur.to || res;
    setState({ from, to: res, p: 0 });
    return tween(0, 1, { duration, delay }, (v) => setState((s) => ({ ...s, p: v })));
  }, [icon, res && res.variant]);
  const { from, to, p } = state;
  if (!to) return res ? { icon: res.icon, variant: res.variant } : null;
  return morphFrame(from ? from.icon : to.icon, to.icon, p, { variant: from && from.variant, targetVariant: to.variant });
}

/** An icon that morphs whenever its name changes: <MorphIcon name={open ? 'x' : 'menu'} />. */
export function MorphIcon({ icon, name, ...props }) {
  const f = useMorph(icon || name, props);
  return useGlyph(f ? f.icon : EMPTY, { ...props, variant: props.variant ?? (f && f.variant) });
}
MorphIcon.displayName = 'MorphIcon';
