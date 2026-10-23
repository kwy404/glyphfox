// glyphfox for Vue 3: icon components with the shared props, Icon, Fusion,
// MorphIcon and the useMorph composable.

import { computed, defineComponent, h, isRef, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { fuse } from '../core/compose.js';
import { morphFrame, morphGoal, tween } from '../core/controller.js';
import { componentName } from '../core/formats.js';
import { loadIcon, lookupIcon, registerIcons } from '../core/lookup.js';
import { bool, renderIcon, strokeWidth } from '../core/render.js';
import { parseSpec, resolveSpec } from '../core/spec.js';

export { registerIcons };

const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };
const B = { type: Boolean, default: undefined };
const N = { type: [Number, String], default: undefined };
const S = { type: String, default: undefined };

/** Prop definitions shared by every component. */
export const glyphProps = {
  size: N,
  color: S,
  secondaryColor: S,
  secondaryOpacity: N,
  weight: N,
  absoluteWeight: B,
  corners: S,
  variant: S,
  rotate: N,
  flipX: B,
  flipY: B,
  mirrorRtl: B,
  animate: S,
  trigger: S,
  active: B,
  duration: N,
  delay: N,
  loop: { type: [Boolean, Number], default: undefined },
  modifier: S,
  modifierCorner: S,
  morphTo: { type: [String, Object], default: undefined },
  title: S,
  decorative: B,
};

const GLYPH_KEYS = Object.keys(glyphProps);

function toVNode(node) {
  const [tag, attrs, children] = node;
  const props = {};
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) props[k] = attrs[k];
  if (tag === 'style') return h('style', { ...props, innerHTML: children || '' });
  if (typeof children === 'string') return h(tag, props, children);
  return h(tag, props, (children || []).map(toVNode));
}

function namesOf(spec) {
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
}

/** Reactive resolution of a list of specs; loads unregistered names. */
function useResolvedList(getSpecs, getWeight, getGap) {
  const version = ref(0);
  const result = computed(() => {
    void version.value;
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
    return { list, missing: [...new Set(missing)] };
  });
  watch(
    () => result.value.missing.join(','),
    (key) => {
      if (!key) return;
      Promise.all(key.split(',').map(loadIcon)).then(() => {
        version.value++;
      });
    },
    { immediate: true },
  );
  return computed(() => result.value.list);
}

function glyphOf(props) {
  const out = {};
  for (const k of GLYPH_KEYS) if (props[k] !== undefined) out[k] = props[k];
  return out;
}

/** Shared setup: returns a render function for icon data from getIcon(). */
function useGlyph(props, attrs, slots, getIcon) {
  const glyph = computed(() => glyphOf(props));
  const sw = computed(() => strokeWidth(glyph.value));
  const trigger = computed(() => glyph.value.trigger || 'mount');
  const target = useResolvedList(
    () => [glyph.value.morphTo],
    () => sw.value,
  );
  const mounted = ref(false);
  const hovered = ref(false);
  const toggled = ref(false);
  const run = ref(null);
  const p = ref(glyph.value.morphTo && trigger.value === 'state' && bool(glyph.value.active) ? 1 : 0);
  let last = null;
  let cancel = () => {};
  onMounted(() => {
    mounted.value = true;
  });
  onBeforeUnmount(() => cancel());
  const goal = computed(() => (target.value[0] ? morphGoal(trigger.value, { active: bool(glyph.value.active), hovered: hovered.value, toggled: toggled.value, mounted: mounted.value }) : 0));
  watch([goal, () => target.value[0] && target.value[0].icon], () => {
    cancel();
    const g = glyph.value;
    cancel = tween(p.value, goal.value, { duration: g.duration === undefined ? 450 : Number(g.duration), delay: g.delay === undefined ? 0 : Number(g.delay) }, (v) => {
      p.value = v;
    });
  });
  const onClick = (e) => {
    toggled.value = !toggled.value;
    run.value = run.value === '1' ? '2' : '1';
    void e;
  };
  return () => {
    const g = glyph.value;
    const t = target.value[0];
    if (t) last = t;
    const drawTarget = t || (p.value > 0 ? last : null);
    const frame = morphFrame(getIcon(), drawTarget && drawTarget.icon, p.value, { variant: g.variant, targetVariant: drawTarget && drawTarget.variant });
    const labelled = attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined;
    const decorative = g.decorative !== undefined ? g.decorative : g.title ? false : !labelled;
    const [, rootAttrs, kids] = renderIcon(frame.icon, { ...g, variant: frame.variant, morphTo: undefined, run: run.value, decorative });
    const data = { ...rootAttrs };
    if (trigger.value === 'click' && (g.animate || g.morphTo)) data.onClick = onClick;
    if (trigger.value === 'hover' && g.morphTo) {
      data.onMouseenter = () => {
        hovered.value = true;
      };
      data.onMouseleave = () => {
        hovered.value = false;
      };
    }
    return h('svg', data, [...kids.map(toVNode), ...(slots.default ? slots.default() : [])]);
  };
}

/** Creates a component for icon data. */
export function createIcon(icon) {
  registerIcons([icon]);
  return defineComponent({
    name: componentName(icon.name),
    props: glyphProps,
    setup(props, { attrs, slots }) {
      return useGlyph(props, attrs, slots, () => icon);
    },
  });
}

/** Renders icon data (`icon`) or any spec (`name`, such as "file+check"). */
export const Icon = defineComponent({
  name: 'Icon',
  props: { ...glyphProps, icon: { type: Object, default: undefined }, name: S, gap: N },
  setup(props, { attrs, slots }) {
    const res = useResolvedList(
      () => [props.icon || props.name],
      () => strokeWidth(glyphOf(props)),
      () => props.gap,
    );
    const view = useGlyph(
      new Proxy(props, { get: (t, k) => (k === 'variant' ? (t.variant ?? (res.value[0] && res.value[0].variant)) : t[k]) }),
      attrs,
      slots,
      () => (res.value[0] ? res.value[0].icon : EMPTY),
    );
    return view;
  },
});

/** Fuses 2 to 10 icons: <Fusion :icons="['cloud', 'lock']" layout="overlap" />. */
export const Fusion = defineComponent({
  name: 'Fusion',
  props: { ...glyphProps, icons: { type: Array, default: () => [] }, layout: S, gap: N, scale: { type: [Number, Array], default: undefined }, offsets: { type: Array, default: undefined } },
  setup(props, { attrs, slots }) {
    const sw = computed(() => strokeWidth(glyphOf(props)));
    const parts = useResolvedList(
      () => props.icons,
      () => sw.value,
      () => props.gap,
    );
    const fused = computed(() => {
      const list = parts.value;
      if (list.length < 2 || !list.every(Boolean)) return EMPTY;
      try {
        return fuse(
          list.map((x) => x.icon),
          { layout: props.layout, gap: props.gap === undefined ? undefined : Number(props.gap), scale: props.scale, offsets: props.offsets, weight: sw.value },
        );
      } catch (err) {
        if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
        return EMPTY;
      }
    });
    return useGlyph(props, attrs, slots, () => fused.value);
  },
});

/**
 * Composable: returns a computed { icon, variant } that morphs whenever the
 * spec (a ref, a getter or a value) changes.
 */
export function useMorph(spec, options = {}) {
  const getSpec = () => (isRef(spec) ? spec.value : typeof spec === 'function' ? spec() : spec);
  const res = useResolvedList(
    () => [getSpec()],
    () => strokeWidth(options),
  );
  const from = shallowRef(null);
  const to = shallowRef(null);
  const p = ref(1);
  let cancel = () => {};
  watch(
    () => res.value[0],
    (r) => {
      if (!r) return;
      if (to.value && to.value.icon === r.icon && to.value.variant === r.variant) return;
      cancel();
      from.value = to.value || r;
      to.value = r;
      p.value = from.value === r ? 1 : 0;
      cancel = tween(p.value, 1, { duration: options.duration ?? 450, delay: options.delay ?? 0 }, (v) => {
        p.value = v;
      });
    },
    { immediate: true },
  );
  onBeforeUnmount(() => cancel());
  return computed(() => {
    if (!to.value) return null;
    return morphFrame(from.value ? from.value.icon : to.value.icon, to.value.icon, p.value, { variant: from.value && from.value.variant, targetVariant: to.value.variant });
  });
}

/** An icon that morphs whenever its name changes. */
export const MorphIcon = defineComponent({
  name: 'MorphIcon',
  props: { ...glyphProps, icon: { type: Object, default: undefined }, name: S },
  setup(props, { attrs, slots }) {
    const f = useMorph(() => props.icon || props.name, { get duration() { return props.duration; }, get delay() { return props.delay; }, get weight() { return props.weight; }, get size() { return props.size; } });
    return useGlyph(
      new Proxy(props, { get: (t, k) => (k === 'variant' ? (t.variant ?? (f.value && f.value.variant)) : t[k]) }),
      attrs,
      slots,
      () => (f.value ? f.value.icon : EMPTY),
    );
  },
});
