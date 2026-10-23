// <glyph-fox> custom element. Every shared prop is an attribute in
// kebab-case; `name` takes the full spec syntax (file+check@tr, cloud&lock,
// heart/solid); `layout` and `gap` tune fusions; `morph` animates name changes.

import { ATTRIBUTES, propsFromAttributes } from '../core/attributes.js';
import { morphFrame, morphGoal, tween } from '../core/controller.js';
import { loadIcon, lookupIcon } from '../core/lookup.js';
import { nodesToString } from '../core/nodes.js';
import { bool, renderIcon, strokeWidth } from '../core/render.js';
import { parseSpec, resolveSpec } from '../core/spec.js';

const STYLE = ':host{display:inline-flex;vertical-align:middle;line-height:0;flex-shrink:0}:host([hidden]){display:none}svg{display:block}';
const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };
const OBSERVED = ['name', 'layout', 'gap', 'morph', ...Object.values(ATTRIBUTES)];

const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

function namesOf(spec) {
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
}

export class GlyphFoxElement extends Base {
  static get observedAttributes() {
    return OBSERVED;
  }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._shadow.innerHTML = `<style>${STYLE}</style><svg></svg>`;
    this._p = 0;
    this._q = 1;
    this._from = null;
    this._hovered = false;
    this._toggled = false;
    this._run = null;
    this._mounted = false;
    this._cancel = () => {};
    this._cancelName = () => {};
    this._lastTarget = null;
    this._queued = false;
    this._onClick = () => {
      const p = this._props();
      if ((p.trigger || 'mount') === 'click' && (p.animate || p.morphTo)) {
        this._toggled = !this._toggled;
        this._run = this._run === '1' ? '2' : '1';
        this._update();
      }
    };
    this._onEnter = () => {
      this._hovered = true;
      this._update();
    };
    this._onLeave = () => {
      this._hovered = false;
      this._update();
    };
  }

  connectedCallback() {
    this.addEventListener('click', this._onClick);
    this.addEventListener('mouseenter', this._onEnter);
    this.addEventListener('mouseleave', this._onLeave);
    this._draw();
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
    raf(() => {
      this._mounted = true;
      this._update();
    });
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('mouseenter', this._onEnter);
    this.removeEventListener('mouseleave', this._onLeave);
    this._cancel();
    this._cancelName();
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    if (attr === 'name' && oldValue && newValue && oldValue !== newValue && this.isConnected && this.hasAttribute('morph') && bool(this.getAttribute('morph'))) {
      const from = this._resolve(this._spec(oldValue));
      if (from) {
        this._cancelName();
        this._from = from;
        this._q = 0;
        const p = this._props();
        this._cancelName = tween(0, 1, { duration: p.duration ?? 450, delay: p.delay ?? 0 }, (v) => {
          this._q = v;
          this._draw();
        });
      }
    }
    this._update();
  }

  /** The current props read from the attributes. */
  _props() {
    return propsFromAttributes((a) => this.getAttribute(a));
  }

  _spec(name) {
    let spec = name || '';
    const layout = this.getAttribute('layout');
    if (layout && spec.includes('&') && !/:[a-z]/.test(spec)) {
      const i = spec.search(/[+@/]/);
      spec = i < 0 ? `${spec}:${layout}` : `${spec.slice(0, i)}:${layout}${spec.slice(i)}`;
    }
    return spec;
  }

  _resolve(spec, weight) {
    if (!spec) return null;
    const missing = namesOf(spec).filter((n) => !lookupIcon(n));
    if (missing.length) {
      Promise.all(missing.map(loadIcon)).then(() => this._update());
      return null;
    }
    try {
      const gap = this.getAttribute('gap');
      return resolveSpec(spec, lookupIcon, { weight: weight ?? 2, gap: gap === null ? undefined : Number(gap) });
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      return null;
    }
  }

  _update() {
    if (this._queued) return;
    this._queued = true;
    Promise.resolve().then(() => {
      this._queued = false;
      const p = this._props();
      const sw = strokeWidth(p);
      const target = p.morphTo ? this._resolve(p.morphTo, sw) : null;
      const goal = target ? morphGoal(p.trigger || 'mount', { active: bool(p.active), hovered: this._hovered, toggled: this._toggled, mounted: this._mounted }) : 0;
      if (goal !== this._goal) {
        this._goal = goal;
        this._cancel();
        this._cancel = tween(this._p, goal, { duration: p.duration ?? 450, delay: p.delay ?? 0 }, (v) => {
          this._p = v;
          this._draw();
        });
      }
      this._draw();
    });
  }

  _draw() {
    const p = this._props();
    const sw = strokeWidth(p);
    const base = this._resolve(this._spec(this.getAttribute('name')), sw);
    let icon = base ? base.icon : EMPTY;
    let variant = p.variant ?? (base && base.variant);
    if (this._from && this._q < 1 && base) {
      const f = morphFrame(this._from.icon, base.icon, this._q, { variant: this._from.variant ?? p.variant, targetVariant: variant });
      icon = f.icon;
      variant = f.variant;
    }
    const target = p.morphTo ? this._resolve(p.morphTo, sw) : null;
    if (target) this._lastTarget = target;
    const drawTarget = target || (this._p > 0 ? this._lastTarget : null);
    if (drawTarget && this._p > 0) {
      const f = morphFrame(icon, drawTarget.icon, this._p, { variant, targetVariant: drawTarget.variant });
      icon = f.icon;
      variant = f.variant;
    }
    const labelled = this.hasAttribute('aria-label');
    const decorative = p.decorative !== undefined ? p.decorative : p.title ? false : !labelled;
    const node = renderIcon(icon, { ...p, variant, morphTo: undefined, run: this._run, decorative });
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

/** Defines the element (default tag glyph-fox). Safe to call more than once. */
export function defineGlyphFox(tag = 'glyph-fox') {
  if (typeof customElements === 'undefined') return null;
  const existing = customElements.get(tag);
  if (existing) return existing;
  const El = class extends GlyphFoxElement {};
  customElements.define(tag, El);
  return El;
}
