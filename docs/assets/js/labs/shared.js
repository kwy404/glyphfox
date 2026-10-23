// Shared parts of the Labs page: the last glyph script that compiled (the
// export panels can use it as their icon), the icon source control of each
// export panel and a few small helpers.

import { $, $$, gf, t } from '../app.js';

const listeners = new Set();
let scriptIcon = null;

/** Stores the icon of the last glyph script that compiled and tells the panels. */
export function setScriptIcon(icon) {
  scriptIcon = icon;
  for (const fn of listeners) fn(icon);
}

export function getScriptIcon() {
  return scriptIcon;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A safe file name from an icon name or spec. */
export function fileName(s) {
  return (
    String(s || 'icon')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'icon'
  );
}

/** SVG markup as an image URL. */
export function svgUri(markup) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
}

/** Keeps the filled part of a range track in sync (site.css reads --p). */
export function rangeFill(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  input.style.setProperty('--p', `${((Number(input.value) - min) / (max - min || 1)) * 100}%`);
}

/** Bytes as a short size label. */
export function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Runs fn at most once per animation frame. */
export function frameThrottle(fn) {
  let id = 0;
  return () => {
    if (id) return;
    id = requestAnimationFrame(() => {
      id = 0;
      fn();
    });
  };
}

/** Resolves a spec to icon data, or null when a name is unknown. */
export function resolveIcon(spec, weight = 2) {
  try {
    return gf.resolveSpec(String(spec || '').trim(), gf.lookupIcon, { weight }).icon;
  } catch {
    return null;
  }
}

/** Definition list items for the stats boxes: [[label, value, note?]]. */
export function statsHtml(rows) {
  return rows.map(([k, v, note]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}${note ? `<small>${esc(note)}</small>` : ''}</dd></div>`).join('');
}

/** Zip entries from a { name: data } map. */
export function entries(files) {
  return Object.entries(files).map(([name, data]) => ({ name, data }));
}

/**
 * Wires the source switch (an icon or my glyph script) and the icon input of
 * an export panel. onChange runs when either changes or when the script
 * compiles again while the panel uses it. Returns { icon(), name() }.
 */
export function sourceControl(panel, onChange) {
  const seg = $(`[data-src-seg="${panel}"]`);
  const input = $(`[data-src-name="${panel}"]`);
  const note = $(`[data-src-note="${panel}"]`);
  let mode = 'icon';
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    mode = b.value;
    for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
    onChange();
  });
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 220);
  });
  input.addEventListener('change', () => {
    clearTimeout(timer);
    onChange();
  });
  listeners.add(() => {
    if (mode === 'script') onChange();
  });
  const usesScript = () => mode === 'script' && scriptIcon;
  return {
    icon(weight = 2) {
      note.textContent = '';
      note.classList.remove('bad');
      if (mode === 'script') {
        if (scriptIcon) return scriptIcon;
        note.textContent = t('labs.source.missing');
      }
      const spec = input.value.trim() || 'heart';
      const icon = resolveIcon(spec, weight);
      if (!icon) {
        note.textContent = t('labs.source.unknown', { name: spec });
        note.classList.add('bad');
      }
      return icon;
    },
    name() {
      return fileName(usesScript() ? scriptIcon.name : input.value.trim() || 'heart');
    },
  };
}
