// Custom elements of the smart icons:
//   <glyph-fox-smart kind="battery" value="0.4">   data icons and locale aware icons
//   <glyph-fox-status state="loading">            morphs between the states
//   <glyph-fox-group animate="pop" stagger="80">  staggers a preset across its children
// Every shared prop is an attribute in kebab-case, like <glyph-fox>.

import { ATTRIBUTES, propsFromAttributes } from '../core/attributes.js';
import { tween } from '../core/controller.js';
import { loadIcon, lookupIcon } from '../core/lookup.js';
import { nodesToString } from '../core/nodes.js';
import { bool } from '../core/render.js';
import { parseSpec } from '../core/spec.js';
import { groupProps } from './group.js';
import { nextChange, smartKind, smartNode } from './index.js';
import { renderSmart } from './render.js';
import { statusView } from './status.js';

const STYLE = ':host{display:inline-flex;vertical-align:middle;line-height:0;flex-shrink:0}:host([hidden]){display:none}svg{display:block}';
const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };
const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;
const raf = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 16));

/** Smart options and their attribute names. */
export const SMART_ATTRIBUTES = {
  kind: 'kind',
  name: 'name',
  icon: 'icon',
  value: 'value',
  min: 'min',
  max: 'max',
  charging: 'charging',
  muted: 'muted',
  label: 'label',
  unit: 'unit',
  date: 'date',
  time: 'time',
  seconds: 'seconds',
  tick: 'tick',
  ext: 'ext',
  filename: 'filename',
  count: 'count',
  dot: 'dot',
  badgeColor: 'badge-color',
  currency: 'currency',
  locale: 'locale',
  dir: 'dir',
  contrast: 'contrast',
  gap: 'gap',
};
const BOOLEAN = new Set(['charging', 'muted', 'seconds', 'tick', 'dot']);

/** Props of an element: the shared ones plus the smart options. */
export function smartPropsFromAttributes(get) {
  const props = propsFromAttributes(get);
  for (const [k, a] of Object.entries(SMART_ATTRIBUTES)) {
    const v = get(a);
    if (v === null || v === undefined) continue;
    props[k] = BOOLEAN.has(k) ? bool(v) : k === 'label' && (v === '' || v === 'true') ? true : v;
  }
  return props;
}

const namesOf = (spec) => {
  if (!spec || typeof spec !== 'string') return [];
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
};

class SmartElementBase extends Base {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._shadow.innerHTML = `<style>${STYLE}</style><svg></svg>`;
    this._queued = false;
  }

  connectedCallback() {
    this._update();
  }

  attributeChangedCallback() {
    this._update();
  }

  _props() {
    return smartPropsFromAttributes((a) => this.getAttribute(a));
  }

  _decorative(p) {
    if (p.decorative !== undefined) return p.decorative;
    return p.title ? false : !this.hasAttribute('aria-label');
  }

  _update() {
    if (this._queued) return;
    this._queued = true;
    Promise.resolve().then(() => {
      this._queued = false;
      this._draw();
    });
  }

  _paint(node) {
    const markup = nodesToString(node);
    const old = this._shadow.lastElementChild;
    if (old && old.tagName.toLowerCase() === 'svg' && old.outerHTML === markup) return;
    const tpl = this._shadow.ownerDocument.createElement('template');
    tpl.innerHTML = markup;
    const svg = tpl.content.firstElementChild;
    if (old && old.tagName.toLowerCase() === 'svg') old.replaceWith(svg);
    else this._shadow.appendChild(svg);
  }
}

/** <glyph-fox-smart>: a data icon (`kind`) or any icon (`name`) with the locale and contrast behaviors. */
export class GlyphFoxSmartElement extends SmartElementBase {
  static get observedAttributes() {
    return [...new Set([...Object.values(ATTRIBUTES), ...Object.values(SMART_ATTRIBUTES)])];
  }

  connectedCallback() {
    super.connectedCallback();
    this._plan();
  }

  disconnectedCallback() {
    clearTimeout(this._timer);
  }

  attributeChangedCallback(attr) {
    super.attributeChangedCallback();
    if (['tick', 'kind', 'seconds', 'time', 'date'].includes(attr)) this._plan();
  }

  _plan() {
    clearTimeout(this._timer);
    if (!this.isConnected) return;
    const p = this._props();
    const k = p.kind ? smartKind(p.kind) : null;
    if (!k || !p.tick) return;
    const ms = nextChange(k, p);
    if (ms === null) return;
    this._timer = setTimeout(() => {
      this._draw();
      this._plan();
    }, ms);
  }

  _draw() {
    const p = this._props();
    const k = p.kind && smartKind(p.kind) ? p.kind : null;
    const target = k ? null : p.icon || p.name;
    const missing = namesOf(k === 'badge' ? p.icon : target).filter((n) => !lookupIcon(n));
    if (missing.length) Promise.all(missing.map(loadIcon)).then(() => this._update());
    let node = null;
    if (!missing.length && (k || target)) {
      try {
        node = smartNode(k || target, { ...p, decorative: this._decorative(p) });
      } catch (err) {
        if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      }
    }
    this._paint(node || renderSmart(EMPTY, { decorative: true }));
  }
}

/** <glyph-fox-status state="idle|loading|success|error">: morphs on every state change. */
export class GlyphFoxStatusElement extends SmartElementBase {
  static get observedAttributes() {
    return [...new Set(['state', 'spin-duration', 'locale', 'dir', 'contrast', ...Object.values(ATTRIBUTES)])];
  }

  constructor() {
    super();
    this._view = null;
    this._cancel = () => {};
  }

  disconnectedCallback() {
    this._cancel();
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    if (attr === 'state') {
      const to = newValue || 'idle';
      if (!this._view) this._view = { from: null, to, p: 1 };
      else if (to !== this._view.to) {
        this._cancel();
        this._view = { from: this._view.to, to, p: 0 };
        const p = this._props();
        this._cancel = tween(0, 1, { duration: p.duration ?? 450, delay: p.delay ?? 0 }, (v) => {
          this._view = { ...this._view, p: v };
          this._draw();
        });
      }
    }
    super.attributeChangedCallback();
  }

  _draw() {
    if (!this._view) this._view = { from: null, to: this.getAttribute('state') || 'idle', p: 1 };
    const p = this._props();
    const spin = this.getAttribute('spin-duration');
    const { icon, props } = statusView(this._view.from, this._view.to, this._view.p, { ...p, spinDuration: spin === null ? undefined : Number(spin), decorative: this._decorative(p) });
    this._paint(renderSmart(icon, props));
  }
}

const GROUP_ATTRS = ['animate', 'trigger', 'delay', 'active', 'duration', 'loop'];

/**
 * <glyph-fox-group animate="pop" stagger="80" trigger="mount|hover|click|state">:
 * gives each child element (<glyph-fox>, <glyph-fox-smart>...) the preset,
 * a staggered delay and the trigger, unless the child sets them itself.
 */
export class GlyphFoxGroupElement extends Base {
  static get observedAttributes() {
    return ['animate', 'stagger', 'delay', 'from', 'trigger', 'active', 'duration', 'loop'];
  }

  constructor() {
    super();
    this._hovered = false;
    this._replay = false;
    this._observer = null;
    this._onEnter = () => {
      this._hovered = true;
      this._apply();
    };
    this._onLeave = () => {
      this._hovered = false;
      this._apply();
    };
    this._onClick = () => {
      if ((this.getAttribute('trigger') || 'mount') !== 'click') return;
      this._replay = false;
      this._apply();
      raf(() => {
        this._replay = true;
        this._apply();
      });
    };
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
    this.addEventListener('mouseenter', this._onEnter);
    this.addEventListener('mouseleave', this._onLeave);
    this.addEventListener('click', this._onClick);
    this._apply();
    if (typeof MutationObserver !== 'undefined' && !this._observer) {
      this._observer = new MutationObserver(() => this._apply());
      this._observer.observe(this, { childList: true });
    }
  }

  disconnectedCallback() {
    this.removeEventListener('mouseenter', this._onEnter);
    this.removeEventListener('mouseleave', this._onLeave);
    this.removeEventListener('click', this._onClick);
    if (this._observer) this._observer.disconnect();
    this._observer = null;
  }

  attributeChangedCallback() {
    if (this.isConnected) this._apply();
  }

  _apply() {
    const get = (a) => {
      const v = this.getAttribute(a);
      return v === null ? undefined : v;
    };
    const trigger = get('trigger') || 'mount';
    let mode = { trigger: 'mount' };
    if (trigger === 'hover') mode = { trigger: 'state', active: this._hovered };
    else if (trigger === 'state') mode = { trigger: 'state', active: this.hasAttribute('active') && bool(this.getAttribute('active')) };
    else if (trigger === 'click') mode = { trigger: 'state', active: this._replay };
    const kids = Array.from(this.children).filter((el) => el.tagName.toLowerCase() !== 'style' && el.tagName.toLowerCase() !== 'script');
    const loop = get('loop');
    const per = groupProps(kids.length, { animate: get('animate') || 'pop', stagger: get('stagger'), delay: get('delay'), from: get('from'), trigger: mode.trigger, active: mode.active, duration: get('duration'), loop });
    kids.forEach((el, i) => {
      const managed = (el.getAttribute('data-gf-group') || '').split(/\s+/).filter(Boolean);
      const p = per[i];
      for (const name of GROUP_ATTRS) {
        if (el.hasAttribute(name) && !managed.includes(name)) continue;
        const v = p[name];
        if (!managed.includes(name)) managed.push(name);
        const next = v === undefined || v === null || v === false ? null : v === true ? '' : String(v);
        if (next === null) {
          if (el.hasAttribute(name)) el.removeAttribute(name);
        } else if (el.getAttribute(name) !== next) el.setAttribute(name, next);
      }
      const list = managed.join(' ');
      if (el.getAttribute('data-gf-group') !== list) el.setAttribute('data-gf-group', list);
    });
  }
}

/** Defines the three elements (glyph-fox-smart, glyph-fox-status, glyph-fox-group). Safe to call more than once. */
export function defineSmartElements({ smart = 'glyph-fox-smart', status = 'glyph-fox-status', group = 'glyph-fox-group' } = {}) {
  if (typeof customElements === 'undefined') return null;
  const define = (tag, Cls) => {
    if (!customElements.get(tag)) customElements.define(tag, class extends Cls {});
    return customElements.get(tag);
  };
  return { smart: define(smart, GlyphFoxSmartElement), status: define(status, GlyphFoxStatusElement), group: define(group, GlyphFoxGroupElement) };
}
