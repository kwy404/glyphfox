// glyphfox for Lit: icon elements with the shared props as reactive
// properties (kebab-case attributes, camelCase properties), plus Icon,
// Fusion and MorphIcon elements. Nothing is registered on import: call
// defineIcons([FileIcon, Icon]) to get <gf-file> and <gf-glyph>.

import { LitElement, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ATTRIBUTES, propsFromAttributes } from '../core/attributes.js';
import { fuse } from '../core/compose.js';
import { morphFrame, morphGoal, tween } from '../core/controller.js';
import { loadIcon, lookupIcon, registerIcons } from '../core/lookup.js';
import { bool, renderToString, strokeWidth } from '../core/render.js';
import { parseSpec, resolveSpec } from '../core/spec.js';

export { registerIcons };

const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };

function namesOf(spec) {
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
}

// animate is a method of every element (Web Animations), so the property is
// named animation; the attribute stays animate like everywhere else.
const keyOf = (prop) => (prop === 'animate' ? 'animation' : prop);
const glyphProperties = {};
for (const [prop, attr] of Object.entries(ATTRIBUTES)) {
  glyphProperties[keyOf(prop)] = {
    attribute: attr,
    converter: { fromAttribute: (value) => (value === null ? undefined : propsFromAttributes((a) => (a === attr ? value : null))[prop]) },
  };
}

const raf = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 16));

/** Base element: renders `icon` (data), the static icon of the class, or the `name` spec. */
export class GlyphElement extends LitElement {
  static get properties() {
    return { ...glyphProperties, name: { type: String }, icon: { attribute: false }, gap: { type: Number } };
  }

  static get styles() {
    return css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        line-height: 0;
        flex-shrink: 0;
      }
      :host([hidden]) {
        display: none;
      }
      svg {
        display: block;
      }
    `;
  }

  constructor() {
    super();
    this._p = null;
    this._goal = 0;
    this._hovered = false;
    this._toggled = false;
    this._run = null;
    this._mounted = false;
    this._last = null;
    this._cancel = () => {};
    this._onClick = () => {
      const p = this.glyphProps();
      if ((p.trigger || 'mount') === 'click' && (p.animate || p.morphTo)) {
        this._toggled = !this._toggled;
        this._run = this._run === '1' ? '2' : '1';
        this.requestUpdate();
      }
    };
    this._onEnter = () => {
      this._hovered = true;
      this.requestUpdate();
    };
    this._onLeave = () => {
      this._hovered = false;
      this.requestUpdate();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
    this.addEventListener('mouseenter', this._onEnter);
    this.addEventListener('mouseleave', this._onLeave);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('mouseenter', this._onEnter);
    this.removeEventListener('mouseleave', this._onLeave);
    this._cancel();
  }

  /** The shared props currently set on the element. */
  glyphProps() {
    const out = {};
    for (const k of Object.keys(ATTRIBUTES)) {
      const v = this[keyOf(k)];
      if (v !== undefined && v !== null) out[k] = v;
    }
    return out;
  }

  /** Resolves a spec or icon data; loads unregistered names and updates. */
  resolve(spec, weight) {
    if (!spec) return null;
    if (typeof spec === 'object') return { icon: spec };
    const missing = namesOf(spec).filter((n) => !lookupIcon(n));
    if (missing.length) {
      Promise.all(missing.map(loadIcon)).then(() => this.requestUpdate());
      return null;
    }
    try {
      return resolveSpec(spec, lookupIcon, { weight, gap: this.gap });
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      return null;
    }
  }

  /** The icon to draw before morphTo: { icon, variant } or null. */
  base(weight) {
    return this.resolve(this.icon || this.constructor.icon || this.name, weight);
  }

  firstUpdated() {
    raf(() => {
      this._mounted = true;
      this.requestUpdate();
    });
  }

  updated() {
    const p = this.glyphProps();
    const target = p.morphTo ? this.resolve(p.morphTo, strokeWidth(p)) : null;
    const goal = target ? morphGoal(p.trigger || 'mount', { active: bool(p.active), hovered: this._hovered, toggled: this._toggled, mounted: this._mounted }) : 0;
    if (goal === this._goal) return;
    this._goal = goal;
    this._cancel();
    this._cancel = tween(this._p || 0, goal, { duration: p.duration ?? 450, delay: p.delay ?? 0 }, (v) => {
      this._p = v;
      this.requestUpdate();
    });
  }

  render() {
    const p = this.glyphProps();
    const sw = strokeWidth(p);
    const res = this.base(sw);
    const target = p.morphTo ? this.resolve(p.morphTo, sw) : null;
    if (this._p === null) {
      this._p = target && p.trigger === 'state' && bool(p.active) ? 1 : 0;
      this._goal = this._p;
    }
    if (target) this._last = target;
    const drawTarget = target || (this._p > 0 ? this._last : null);
    const variant = p.variant ?? (res && res.variant);
    const frame = morphFrame(res ? res.icon : EMPTY, drawTarget && drawTarget.icon, this._p, { variant, targetVariant: drawTarget && drawTarget.variant });
    const decorative = p.decorative !== undefined ? p.decorative : !p.title;
    return unsafeHTML(renderToString(frame.icon, { ...p, variant: frame.variant, morphTo: undefined, run: this._run, decorative }));
  }
}

/** Generic element for any spec: <gf-glyph name="file+check@tr">. */
export class Icon extends GlyphElement {}
Icon.tagName = 'gf-glyph';

/** Creates an element class for icon data; its tag is gf-NAME. */
export function createIcon(icon) {
  registerIcons([icon]);
  const C = class extends GlyphElement {};
  C.icon = icon;
  C.tagName = `gf-${icon.name}`;
  return C;
}

function splitList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  return value
    .split(/[\s,&]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Fuses 2 to 10 icons: <gf-fusion icons="cloud,lock" layout="overlap">. */
export class Fusion extends GlyphElement {
  static get properties() {
    return { ...super.properties, icons: { converter: { fromAttribute: splitList } }, layout: { type: String }, scale: { attribute: false }, offsets: { attribute: false } };
  }

  base(weight) {
    const parts = splitList(this.icons).map((spec) => this.resolve(spec, weight));
    if (parts.length < 2 || !parts.every(Boolean)) return null;
    try {
      return {
        icon: fuse(
          parts.map((x) => x.icon),
          { layout: this.layout, gap: this.gap, scale: this.scale, offsets: this.offsets, weight },
        ),
      };
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      return null;
    }
  }
}
Fusion.tagName = 'gf-fusion';

/** An element that morphs whenever its name changes: <gf-morph name="menu">. */
export class MorphIcon extends GlyphElement {
  constructor() {
    super();
    this._from = null;
    this._to = null;
    this._q = 1;
    this._cancelName = () => {};
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelName();
  }

  base(weight) {
    const res = super.base(weight);
    if (!res) return this._to;
    if (!this._to) this._to = res;
    else if (res.icon !== this._to.icon || res.variant !== this._to.variant) {
      this._from = this._to;
      this._to = res;
      this._q = 0;
      this._cancelName();
      const p = this.glyphProps();
      this._cancelName = tween(0, 1, { duration: p.duration ?? 450, delay: p.delay ?? 0 }, (v) => {
        this._q = v;
        this.requestUpdate();
      });
    }
    if (!this._from || this._q >= 1) return this._to;
    const f = morphFrame(this._from.icon, this._to.icon, this._q, { variant: this._from.variant, targetVariant: this._to.variant });
    return { icon: f.icon, variant: f.variant };
  }
}
MorphIcon.tagName = 'gf-morph';

/**
 * Registers element classes as custom elements (tags gf-NAME, gf-glyph,
 * gf-fusion, gf-morph). With { prefix: 'my' } the tags become my-NAME.
 */
export function defineIcons(list, { prefix } = {}) {
  if (typeof customElements === 'undefined') return;
  for (const C of Array.isArray(list) ? list : [list]) {
    if (!C || !C.tagName) continue;
    const tag = prefix ? C.tagName.replace(/^gf-/, `${prefix}-`) : C.tagName;
    if (!customElements.get(tag)) customElements.define(tag, C);
  }
}
