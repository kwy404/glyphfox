// glyphfox for Solid: icon components with the shared props, Icon, Fusion,
// MorphIcon and the useMorph primitive. No JSX compiler needed: the same
// module renders on the server (solid-js/web resolves to its server build)
// and in the browser.

import { createComponent, createEffect, createMemo, createSignal, mergeProps, onCleanup, onMount, splitProps, untrack } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { fuse } from '../core/compose.js';
import { morphFrame, morphGoal, tween } from '../core/controller.js';
import { loadIcon, lookupIcon, registerIcons } from '../core/lookup.js';
import { nodesToString } from '../core/nodes.js';
import { PROPS, bool, renderIcon, strokeWidth } from '../core/render.js';
import { parseSpec, resolveSpec } from '../core/spec.js';

export { registerIcons };

const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };
const OWN = [...PROPS, 'class', 'className', 'style', 'onClick', 'onMouseEnter', 'onMouseLeave'];

function namesOf(spec) {
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
}

/** Accessor of resolved specs; loads unregistered names and updates. */
function resolvedList(getSpecs, getWeight, getGap) {
  const [version, setVersion] = createSignal(0);
  return createMemo(() => {
    version();
    const missing = [];
    const list = getSpecs().map((spec) => {
      if (!spec) return null;
      if (typeof spec === 'object') return { icon: spec };
      const lost = namesOf(spec).filter((n) => !lookupIcon(n));
      if (lost.length) {
        missing.push(...lost);
        return null;
      }
      try {
        return resolveSpec(spec, lookupIcon, { weight: getWeight(), gap: getGap ? getGap() : undefined });
      } catch (err) {
        if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
        return null;
      }
    });
    if (missing.length) Promise.all([...new Set(missing)].map(loadIcon)).then(() => setVersion((v) => v + 1));
    return list;
  });
}

const call = (fn, e) => {
  if (typeof fn === 'function') fn(e);
  else if (Array.isArray(fn) && typeof fn[0] === 'function') fn[0](fn[1], e);
};

/** Renders the icon from getIcon() with the shared props, triggers and morphTo. */
function Glyph(props, getIcon, getVariant) {
  const [own, rest] = splitProps(props, OWN);
  const glyph = createMemo(() => {
    const g = {};
    for (const k of PROPS) if (own[k] !== undefined) g[k] = own[k];
    return g;
  });
  const sw = createMemo(() => strokeWidth(glyph()));
  const trigger = () => glyph().trigger || 'mount';
  const target = resolvedList(
    () => [glyph().morphTo],
    () => sw(),
  );
  const [mounted, setMounted] = createSignal(false);
  const [hovered, setHovered] = createSignal(false);
  const [toggled, setToggled] = createSignal(false);
  const [run, setRun] = createSignal(null);
  const [p, setP] = createSignal(untrack(() => (glyph().morphTo && trigger() === 'state' && bool(glyph().active) ? 1 : 0)));
  let last = null;
  onMount(() => setMounted(true));
  const goal = createMemo(() => (target()[0] ? morphGoal(trigger(), { active: bool(glyph().active), hovered: hovered(), toggled: toggled(), mounted: mounted() }) : 0));
  let cancel = () => {};
  createEffect(() => {
    const g = goal();
    target();
    const { duration, delay } = glyph();
    cancel();
    cancel = tween(untrack(p), g, { duration: duration === undefined ? 450 : Number(duration), delay: delay === undefined ? 0 : Number(delay) }, setP);
  });
  onCleanup(() => cancel());

  const view = createMemo(() => {
    const g = glyph();
    const t = target()[0];
    if (t) last = t;
    const drawTarget = t || (p() > 0 ? last : null);
    const variant = g.variant ?? (getVariant ? getVariant() : undefined);
    const frame = morphFrame(getIcon(), drawTarget && drawTarget.icon, p(), { variant, targetVariant: drawTarget && drawTarget.variant });
    const labelled = rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined;
    const decorative = g.decorative !== undefined ? g.decorative : g.title ? false : !labelled;
    const cls = [own.class, own.className].filter(Boolean).join(' ') || undefined;
    const [, attrs, kids] = renderIcon(frame.icon, { ...g, variant: frame.variant, morphTo: undefined, class: cls, run: run(), decorative });
    return { attrs, inner: nodesToString(kids) };
  });

  const onClick = (e) => {
    call(own.onClick, e);
    if (trigger() === 'click' && (glyph().animate || glyph().morphTo)) {
      setToggled((v) => !v);
      setRun((r) => (r === '1' ? '2' : '1'));
    }
  };
  const onMouseEnter = (e) => {
    call(own.onMouseEnter, e);
    if (trigger() === 'hover' && glyph().morphTo) setHovered(true);
  };
  const onMouseLeave = (e) => {
    call(own.onMouseLeave, e);
    if (trigger() === 'hover' && glyph().morphTo) setHovered(false);
  };

  return createComponent(
    Dynamic,
    mergeProps(rest, () => {
      const v = view();
      const out = { ...v.attrs, component: 'svg', innerHTML: v.inner, onClick, onMouseEnter, onMouseLeave };
      if (own.style !== undefined) out.style = own.style;
      return out;
    }),
  );
}

/** Creates a component for icon data. */
export function createIcon(icon) {
  registerIcons([icon]);
  return (props) => Glyph(props, () => icon);
}

/** Renders icon data (`icon`) or any spec (`name`, such as "file+check@tr" or "cloud&lock"). */
export function Icon(props) {
  const [local, others] = splitProps(props, ['icon', 'name', 'gap']);
  const res = resolvedList(
    () => [local.icon || local.name],
    () => strokeWidth(others),
    () => local.gap,
  );
  return Glyph(
    others,
    () => (res()[0] ? res()[0].icon : EMPTY),
    () => res()[0] && res()[0].variant,
  );
}

/** Fuses 2 to 10 icons into one: <Fusion icons={['cloud', 'lock']} layout="overlap" />. */
export function Fusion(props) {
  const [local, others] = splitProps(props, ['icons', 'layout', 'gap', 'scale', 'offsets']);
  const sw = createMemo(() => strokeWidth(others));
  const parts = resolvedList(
    () => local.icons || [],
    () => sw(),
    () => local.gap,
  );
  const fused = createMemo(() => {
    const list = parts();
    if (list.length < 2 || !list.every(Boolean)) return EMPTY;
    try {
      return fuse(
        list.map((x) => x.icon),
        { layout: local.layout, gap: local.gap === undefined ? undefined : Number(local.gap), scale: local.scale, offsets: local.offsets, weight: sw() },
      );
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      return EMPTY;
    }
  });
  return Glyph(others, fused);
}

/**
 * Primitive: returns an accessor of { icon, variant } that morphs into the
 * new icon whenever the spec accessor changes. Options: duration, delay,
 * weight, size, gap.
 */
export function useMorph(spec, options = {}) {
  const getSpec = typeof spec === 'function' ? spec : () => spec;
  const res = resolvedList(
    () => [getSpec()],
    () => strokeWidth(options),
    () => options.gap,
  );
  const first = untrack(() => res()[0]);
  const [state, setState] = createSignal({ from: first, to: first, p: 1 });
  let cancel = () => {};
  createEffect(() => {
    const r = res()[0];
    if (!r) return;
    const cur = untrack(state);
    if (cur.to && cur.to.icon === r.icon && cur.to.variant === r.variant) return;
    cancel();
    const from = cur.to || r;
    setState({ from, to: r, p: from === r ? 1 : 0 });
    if (from !== r) {
      cancel = tween(0, 1, { duration: options.duration ?? 450, delay: options.delay ?? 0 }, (v) => setState((s) => ({ ...s, p: v })));
    }
  });
  onCleanup(() => cancel());
  return createMemo(() => {
    const { from, to, p } = state();
    if (!to) return null;
    return morphFrame(from ? from.icon : to.icon, to.icon, p, { variant: from && from.variant, targetVariant: to.variant });
  });
}

/** An icon that morphs whenever its name changes: <MorphIcon name={open() ? 'x' : 'menu'} />. */
export function MorphIcon(props) {
  const [local, others] = splitProps(props, ['icon', 'name']);
  const f = useMorph(() => local.icon || local.name, {
    get duration() {
      return others.duration;
    },
    get delay() {
      return others.delay;
    },
    get weight() {
      return others.weight;
    },
    get size() {
      return others.size;
    },
  });
  return Glyph(
    others,
    () => (f() ? f().icon : EMPTY),
    () => f() && f().variant,
  );
}
