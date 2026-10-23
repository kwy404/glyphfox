// Plain HTML runtime: turns <i data-glyph="name"> into inline SVG.
// Props come from data attributes in kebab-case: data-size, data-weight,
// data-variant, data-modifier and so on.

import { propsFromAttributes } from './attributes.js';

/**
 * Replaces every element with a data-glyph attribute under `root`.
 * `render(spec, props)` returns SVG markup. Returns the number of icons.
 * With { observe: true } new elements are handled as they appear.
 */
export function replaceGlyphs(root, render, { observe = false } = {}) {
  const scope = root || (typeof document !== 'undefined' ? document : null);
  if (!scope || typeof scope.querySelectorAll !== 'function') return 0;
  let count = 0;
  const handle = (el) => {
    const spec = el.getAttribute('data-glyph');
    if (!spec) return;
    const props = propsFromAttributes((a) => el.getAttribute('data-' + a));
    if (props.title === undefined && el.getAttribute('aria-label')) props.title = el.getAttribute('aria-label');
    const cls = el.getAttribute('class');
    if (cls) props.class = cls;
    let markup;
    try {
      markup = render(spec, props);
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
      return;
    }
    const tpl = el.ownerDocument.createElement('template');
    tpl.innerHTML = markup;
    const svg = tpl.content.firstElementChild;
    if (!svg) return;
    svg.setAttribute('data-glyph-done', spec);
    el.replaceWith(svg);
    count++;
  };
  if (scope.getAttribute && scope.getAttribute('data-glyph') !== null) handle(scope);
  for (const el of Array.from(scope.querySelectorAll('[data-glyph]'))) handle(el);
  if (observe && typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.hasAttribute('data-glyph')) handle(n);
          for (const el of n.querySelectorAll ? Array.from(n.querySelectorAll('[data-glyph]')) : []) handle(el);
        }
      }
    });
    mo.observe(scope.documentElement || scope, { childList: true, subtree: true });
  }
  return count;
}
