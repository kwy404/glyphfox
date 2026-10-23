// glyphfox for React Native (react-native-svg): icon components with the
// shared props, Icon, Fusion, MorphIcon and the useMorph hook. There is no
// CSS on native, so living states are sampled frame by frame from the same
// presets, morphs are tweened, and both follow the reduce motion setting.

import { createElement, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Circle, ClipPath, Defs, Ellipse, G, Line, Mask, Path, Polygon, Polyline, Rect, Svg } from 'react-native-svg';
import { ANIMATIONS, animationLength } from '../core/animate.js';
import { fuse } from '../core/compose.js';
import { morphFrame, morphGoal, splitProps, tween } from '../core/controller.js';
import { componentName } from '../core/formats.js';
import { flattenNode, polylineLength } from '../core/geometry.js';
import { loadIcon, lookupIcon, registerIcons } from '../core/lookup.js';
import { bool, renderIcon, strokeWidth } from '../core/render.js';
import { parseSpec, resolveSpec } from '../core/spec.js';

export { registerIcons };

const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };
const TAGS = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline, polygon: Polygon, ellipse: Ellipse, g: G, defs: Defs, mask: Mask, clipPath: ClipPath };
const DROP = new Set(['class', 'xmlns', 'style', 'pathLength', 'role', 'aria-hidden', 'aria-label', 'data-gf-run']);
const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const round3 = (v) => Math.round(v * 1000) / 1000;

function nodeLength(node) {
  try {
    return flattenNode(node).reduce((sum, sp) => sum + polylineLength(sp.points), 0);
  } catch {
    return 0;
  }
}

function nativeAttrs(attrs) {
  const out = {};
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false || DROP.has(k)) continue;
    out[camel(k)] = v;
  }
  return out;
}

function toNative(node, key) {
  const [tag, attrs, children] = node;
  const C = TAGS[tag];
  if (!C) return null;
  const props = nativeAttrs(attrs);
  props.key = key;
  if (attrs.pathLength === '1' && attrs['stroke-dasharray'] === '1 1') {
    // Frames of the draw preset: dashes in path length units become absolute.
    const len = round3(nodeLength(node));
    props.strokeDasharray = `${len} ${len}`;
    props.strokeDashoffset = String(round3(Number(attrs['stroke-dashoffset'] || 0) * len));
  }
  const kids = Array.isArray(children) ? children.map((c, i) => toNative(c, i)).filter(Boolean) : [];
  return createElement(C, props, ...kids);
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

/** True while the reduce motion setting is on. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  const current = useRef(false);
  useEffect(() => {
    let alive = true;
    const set = (v) => {
      if (!alive || Boolean(v) === current.current) return;
      current.current = Boolean(v);
      setReduced(Boolean(v));
    };
    const api = AccessibilityInfo;
    if (!api) return undefined;
    if (typeof api.isReduceMotionEnabled === 'function') {
      Promise.resolve(api.isReduceMotionEnabled()).then(set, () => {});
    }
    const sub = typeof api.addEventListener === 'function' ? api.addEventListener('reduceMotionChanged', set) : null;
    return () => {
      alive = false;
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }, []);
  return reduced;
}

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const raf = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(() => cb(now()), 16));
const caf = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

/** Time in ms of the running living state, or null when it is at rest. */
function useClock(spec, running, runKey) {
  const [t, setT] = useState(null);
  const { animate, duration, delay, loop } = spec;
  useEffect(() => {
    if (!running || !animate) {
      setT(null);
      return undefined;
    }
    const end = animationLength({ animate, duration, delay, loop });
    const start = now();
    let id = 0;
    const tick = () => {
      const e = now() - start;
      if (e >= end) {
        setT(null);
        return;
      }
      setT(e);
      id = raf(tick);
    };
    setT(0);
    id = raf(tick);
    return () => caf(id);
  }, [running, runKey, animate, duration, delay, String(loop)]);
  return t;
}

/** Renders icon data with the shared props, handling triggers, morphTo and living states. */
function useGlyph(icon, allProps, ref) {
  const { glyph, rest } = splitProps(allProps);
  const { style, onPress, onPressIn, onPressOut, children, className: _className, class: _class, ...svgRest } = rest;
  const reduced = useReducedMotion();
  const sw = strokeWidth(glyph);
  const trigger = glyph.trigger || 'mount';
  const target = useResolved(glyph.morphTo, sw);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [run, setRun] = useState(0);
  const [p, setP] = useState(() => (glyph.morphTo && trigger === 'state' && bool(glyph.active) ? 1 : 0));
  const pRef = useRef(p);
  pRef.current = p;
  const lastTarget = useRef(null);
  if (target) lastTarget.current = target;
  useEffect(() => setMounted(true), []);
  const goal = target ? morphGoal(trigger, { active: bool(glyph.active), hovered, toggled, mounted }) : 0;
  const duration = reduced ? 0 : glyph.duration === undefined ? 450 : Number(glyph.duration);
  const delay = glyph.delay === undefined ? 0 : Number(glyph.delay);
  useEffect(() => tween(pRef.current, goal, { duration, delay }, setP), [goal, target && target.icon, duration, delay]);

  const anim = glyph.animate && ANIMATIONS[glyph.animate] && !reduced ? glyph.animate : null;
  const running = Boolean(anim) && (trigger === 'mount' ? mounted : trigger === 'click' ? run > 0 : trigger === 'hover' ? hovered : bool(glyph.active));
  const t = useClock({ animate: anim, duration: glyph.duration, delay: glyph.delay, loop: glyph.loop }, running, run);

  const drawTarget = target || (p > 0 ? lastTarget.current : null);
  const frame = morphFrame(icon, drawTarget && drawTarget.icon, p, { variant: glyph.variant, targetVariant: drawTarget && drawTarget.variant });

  const handlers = {};
  if (trigger === 'click' && (glyph.animate || glyph.morphTo)) {
    handlers.onPress = (e) => {
      if (onPress) onPress(e);
      setToggled((v) => !v);
      setRun((r) => r + 1);
    };
  } else if (onPress) handlers.onPress = onPress;
  if (trigger === 'hover' && (glyph.animate || glyph.morphTo)) {
    handlers.onPressIn = (e) => {
      if (onPressIn) onPressIn(e);
      setHovered(true);
    };
    handlers.onPressOut = (e) => {
      if (onPressOut) onPressOut(e);
      setHovered(false);
    };
  } else {
    if (onPressIn) handlers.onPressIn = onPressIn;
    if (onPressOut) handlers.onPressOut = onPressOut;
  }

  const labelled = svgRest.accessibilityLabel !== undefined || svgRest['aria-label'] !== undefined;
  const decorative = glyph.decorative !== undefined ? bool(glyph.decorative) : glyph.title ? false : !labelled;
  const [, attrs, kids] = renderIcon(frame.icon, { ...glyph, animate: anim || undefined, variant: frame.variant, morphTo: undefined, decorative, frame: t === null ? undefined : t });
  const a11y = decorative
    ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' }
    : { accessible: true, accessibilityRole: 'image', ...(glyph.title ? { accessibilityLabel: String(glyph.title) } : {}) };
  const props = { ...nativeAttrs(attrs), ...a11y, ...svgRest, ...handlers, ref };
  if (style !== undefined) props.style = style;
  const nodes = kids.map((c, i) => toNative(c, i)).filter(Boolean);
  return createElement(Svg, props, ...nodes, children);
}

/** Creates a forwardRef component for icon data. */
export function createIcon(icon) {
  registerIcons([icon]);
  const Component = forwardRef(function GlyphIcon(props, ref) {
    return useGlyph(icon, props, ref);
  });
  Component.displayName = componentName(icon.name);
  return Component;
}

/** Renders icon data (`icon`) or any spec (`name`, such as "file+check@tr" or "cloud&lock"). */
export const Icon = forwardRef(function Icon({ icon, name, ...props }, ref) {
  const res = useResolved(icon || name, strokeWidth(props), props.gap);
  const { gap: _gap, ...rest } = props;
  return useGlyph(res ? res.icon : EMPTY, { ...rest, variant: rest.variant ?? (res && res.variant) }, ref);
});
Icon.displayName = 'Icon';

/** Fuses 2 to 10 icons into one: <Fusion icons={['cloud', 'lock']} layout="overlap" />. */
export const Fusion = forwardRef(function Fusion({ icons = [], layout, gap, scale, offsets, ...props }, ref) {
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
  return useGlyph(fused || EMPTY, props, ref);
});
Fusion.displayName = 'Fusion';

/**
 * Returns { icon, variant } that morphs into the new icon whenever `spec`
 * changes. Options: duration, delay, weight, size.
 */
export function useMorph(spec, options = {}) {
  const res = useResolved(spec, strokeWidth(options), options.gap);
  const reduced = useReducedMotion();
  const [state, setState] = useState(() => ({ from: res, to: res, p: 1 }));
  const ref = useRef(state);
  ref.current = state;
  const icon = res && res.icon;
  const duration = reduced ? 0 : options.duration === undefined ? 450 : Number(options.duration);
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
export const MorphIcon = forwardRef(function MorphIcon({ icon, name, ...props }, ref) {
  const f = useMorph(icon || name, props);
  return useGlyph(f ? f.icon : EMPTY, { ...props, variant: props.variant ?? (f && f.variant) }, ref);
});
MorphIcon.displayName = 'MorphIcon';
