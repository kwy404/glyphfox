// glyphfox smart icons for Vue 3: SmartIcon, StatusIcon and IconGroup.

import { Comment, Fragment, cloneVNode, defineComponent, h, isVNode, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { tween } from '../core/controller.js';
import { loadIcon, lookupIcon } from '../core/lookup.js';
import { bool } from '../core/render.js';
import { parseSpec } from '../core/spec.js';
import { glyphProps } from '../vue/runtime.js';
import { groupProps } from './group.js';
import { nextChange, smartKind, smartNode } from './index.js';
import { renderSmart } from './render.js';
import { statusView } from './status.js';

const B = { type: Boolean, default: undefined };
const N = { type: [Number, String], default: undefined };
const S = { type: String, default: undefined };
const ANY = { type: null, default: undefined };

/** Props of SmartIcon on top of the shared ones. */
export const smartIconProps = {
  ...glyphProps,
  kind: S,
  name: S,
  icon: { type: [String, Object], default: undefined },
  value: N,
  min: N,
  max: N,
  charging: B,
  muted: B,
  label: { type: [Boolean, String], default: undefined },
  unit: S,
  date: ANY,
  time: ANY,
  seconds: B,
  tick: B,
  ext: S,
  filename: S,
  count: N,
  dot: B,
  badgeColor: S,
  currency: S,
  locale: S,
  dir: S,
  contrast: { type: [String, Boolean], default: undefined },
  gap: N,
};

const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };

function toVNode(node) {
  const [tag, attrs, children] = node;
  const props = {};
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) props[k] = attrs[k];
  if (tag === 'style') return h('style', { ...props, innerHTML: children || '' });
  if (typeof children === 'string') return h(tag, props, children);
  return h(tag, props, (children || []).map(toVNode));
}

const defined = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
};

const namesOf = (spec) => {
  if (!spec || typeof spec !== 'string') return [];
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
};

function decorativeOf(opts, attrs) {
  if (opts.decorative !== undefined) return opts.decorative;
  if (opts.title) return false;
  return attrs['aria-label'] === undefined && attrs['aria-labelledby'] === undefined;
}

function svgVNode(node, slots) {
  const [, attrs, kids] = node;
  return h('svg', { ...attrs }, [...kids.map(toVNode), ...(slots && slots.default ? slots.default() : [])]);
}

const SMART_KEYS = Object.keys(smartIconProps);

/** A smart data icon (`kind`) or any icon (`name`, `icon`) with the locale and contrast behaviors. */
export const SmartIcon = defineComponent({
  name: 'SmartIcon',
  props: smartIconProps,
  setup(props, { attrs, slots }) {
    const version = ref(0);
    const now = ref(0);
    const kindOf = () => (props.kind && smartKind(props.kind) ? props.kind : null);
    watch(
      () => {
        const k = kindOf();
        const names = k ? namesOf(k === 'badge' ? props.icon : null) : namesOf(props.icon || props.name);
        return [...new Set(names.filter((n) => !lookupIcon(n)))].join(',');
      },
      (key) => {
        if (key) Promise.all(key.split(',').map(loadIcon)).then(() => version.value++);
      },
      { immediate: true },
    );
    let timer = null;
    const plan = () => {
      clearTimeout(timer);
      const k = kindOf();
      if (!k || !bool(props.tick)) return;
      const ms = nextChange(k, props);
      if (ms === null) return;
      timer = setTimeout(() => {
        now.value++;
        plan();
      }, ms);
    };
    onMounted(plan);
    watch(() => [props.tick, props.kind, props.seconds, props.time, props.date], plan);
    onBeforeUnmount(() => clearTimeout(timer));
    return () => {
      void version.value;
      void now.value;
      const opts = defined(props, SMART_KEYS);
      const k = kindOf();
      const target = k ? null : props.icon || props.name;
      let node = null;
      if (k || target) {
        try {
          node = smartNode(k || target, { ...opts, decorative: decorativeOf(opts, attrs) });
        } catch (err) {
          if (typeof console !== 'undefined' && !String(err.message).startsWith('unknown icon')) console.warn(`glyphfox: ${err.message}`);
        }
      }
      return svgVNode(node || renderSmart(EMPTY, { ...opts, decorative: true }), slots);
    };
  },
});

/** A status icon that morphs between idle, loading, success and error. */
export const StatusIcon = defineComponent({
  name: 'StatusIcon',
  props: { ...glyphProps, state: { type: String, default: 'idle' }, spinDuration: N, locale: S, dir: S, contrast: { type: [String, Boolean], default: undefined } },
  setup(props, { attrs }) {
    const view = shallowRef({ from: null, to: props.state, p: 1 });
    let cancel = () => {};
    watch(
      () => props.state,
      (state) => {
        const v = view.value;
        if (v.to === state) return;
        cancel();
        view.value = { from: v.to, to: state, p: 0 };
        cancel = tween(0, 1, { duration: props.duration === undefined ? 450 : Number(props.duration), delay: props.delay === undefined ? 0 : Number(props.delay) }, (p) => {
          view.value = { ...view.value, p };
        });
      },
    );
    onBeforeUnmount(() => cancel());
    const keys = Object.keys(glyphProps).concat(['spinDuration', 'locale', 'dir', 'contrast']);
    return () => {
      const opts = defined(props, keys);
      const v = view.value;
      const { icon, props: p } = statusView(v.from, v.to, v.p, { ...opts, decorative: decorativeOf(opts, attrs) });
      return svgVNode(renderSmart(icon, p));
    };
  },
});

const GROUP_OWN = ['animate', 'trigger', 'active', 'duration', 'delay', 'loop'];
const ITEM_KEYS = SMART_KEYS.filter((k) => !GROUP_OWN.includes(k) && !['kind', 'name', 'icon', 'title', 'decorative'].includes(k));
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

function flatten(nodes, out = []) {
  for (const n of nodes) {
    if (Array.isArray(n)) flatten(n, out);
    else if (isVNode(n) && n.type === Fragment) flatten(Array.isArray(n.children) ? n.children : [], out);
    else if (isVNode(n) && n.type === Comment) continue;
    else out.push(n);
  }
  return out;
}

const isSmartItem = (x) => x && typeof x === 'object' && !isVNode(x) && typeof x.body !== 'string' && typeof x.kind === 'string';

/** Plays one preset across its icons with a stagger: <IconGroup animate="pop" :stagger="80">. */
export const IconGroup = defineComponent({
  name: 'IconGroup',
  props: {
    ...defined(smartIconProps, ITEM_KEYS),
    animate: { type: String, default: 'pop' },
    stagger: { type: [Number, String], default: 60 },
    delay: { type: [Number, String], default: 0 },
    from: S,
    trigger: { type: String, default: 'mount' },
    active: B,
    duration: N,
    loop: { type: [Boolean, Number], default: undefined },
    icons: { type: Array, default: undefined },
    as: { type: String, default: 'span' },
  },
  setup(props, { slots }) {
    const hovered = ref(false);
    const round = ref(0);
    return () => {
      let mode = { trigger: 'mount' };
      if (props.trigger === 'hover') mode = { trigger: 'state', active: hovered.value };
      else if (props.trigger === 'state') mode = { trigger: 'state', active: bool(props.active) };
      else if (props.trigger === 'click') mode = round.value ? { trigger: 'mount' } : { trigger: 'state', active: false };
      const items = props.icons ? props.icons.filter(Boolean) : flatten(slots.default ? slots.default() : []);
      const per = groupProps(items.length, { animate: props.animate, stagger: props.stagger, delay: props.delay, from: props.from, trigger: mode.trigger, active: mode.active, duration: props.duration, loop: props.loop });
      const shared = defined(props, ITEM_KEYS);
      const kids = items.map((item, i) => {
        const key = `${i}-${round.value}`;
        if (props.icons) {
          const own = isSmartItem(item) ? item : typeof item === 'object' ? { icon: item } : { name: item };
          return h(SmartIcon, { key, ...shared, ...per[i], ...own });
        }
        if (isVNode(item) && item.type && typeof item.type !== 'string' && typeof item.type !== 'symbol') {
          const given = item.props || {};
          const extra = { key };
          const all = { ...shared, ...per[i] };
          for (const k in all) if (given[k] === undefined && given[kebab(k)] === undefined) extra[k] = all[k];
          return cloneVNode(item, extra);
        }
        return item;
      });
      const on = {};
      if (props.trigger === 'hover') {
        on.onMouseenter = () => {
          hovered.value = true;
        };
        on.onMouseleave = () => {
          hovered.value = false;
        };
      } else if (props.trigger === 'click') {
        on.onClick = () => {
          round.value++;
        };
      }
      return h(props.as, { class: 'glyphfox-group', role: 'group', ...on }, kids);
    };
  },
});
