// Sets gallery of the universe page: a card per set with its license,
// count, styles and a strip of 12 previews (the same concepts in every set),
// global preview controls (color, size, weight, corners and the glyphfox
// style, which renders through the glyphfox engine where the drawing allows),
// hover motion, and a compare view of 2 to 4 sets side by side.

import { gf } from '../assets/js/app.js';
import * as U from './runtime.js';

const KIND = { 'public-domain': 'Public domain', permissive: 'Permissive', attribution: 'Attribution', 'share-alike': 'Share alike' };
const KIND_ORDER = ['public-domain', 'permissive', 'attribution', 'share-alike'];
const STYLE_NAMES = ['outline', 'solid', 'duotone', 'color'];
const COMPARE = 10;
const MAX_PICK = 4;
const fmt = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const DRAWABLE = /<(path|line|polyline|polygon|circle|ellipse|rect)\b(?![^>]*pathLength)/g;

export function createGallery({ catalog, onOpen }) {
  const root = $('[data-gallery]');
  const grid = $('[data-gx-grid]');
  const panel = $('[data-gx-compare-panel]');
  const note = $('[data-gx-note]');
  const info = new Map(catalog.list.map((s) => [s.prefix, s]));
  const opts = { color: '', size: 24, weight: null, corners: '', glyphfox: false };
  const filters = { text: '', sort: 'size', styles: new Set(), kinds: new Set() };
  const picked = [];
  let compare = false;
  let previews = null;
  let version = 0;
  let built = false;
  const cards = new Map();

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        e.target.dataset.seen = e.isIntersecting ? '1' : '';
        if (e.isIntersecting) paintCard(e.target);
      }
    },
    { rootMargin: '400px 0px' },
  );

  function hasStyle(s, style) {
    if (style === 'brand') return s.brand >= Math.max(5, s.total * 0.05);
    if (style === 'stroke') return Boolean(s.strokeWidth);
    return s.styles[style] >= Math.max(5, s.total * 0.05);
  }

  /** One preview icon as SVG markup, native or through the glyphfox engine. */
  function iconSvg(prefix, entry, box, size) {
    const [name, body, flagDigit, , own] = entry;
    const [left, top, width, height] = own || box;
    const v = parseInt(flagDigit, 16) || 0;
    const style = STYLE_NAMES[v & 3];
    const stroke = Boolean(v & 8);
    let svg = '';
    if (opts.glyphfox && style !== 'color') {
      try {
        const icon = gf.normalizeIcon({ body, viewBox: `${left} ${top} ${width} ${height}`, mode: stroke ? undefined : 'fill' }, `${prefix}-${name}`);
        if (icon) svg = gf.renderToString(icon, { size, weight: opts.weight ?? 2, corners: opts.corners || 'round', color: opts.color || undefined });
      } catch {
        svg = '';
      }
    }
    if (!svg) {
      svg = U.iconToSvg(
        { prefix, body, left, top, width, height, stroke },
        { size, color: opts.color || undefined, weight: stroke && opts.weight != null ? opts.weight : undefined, corners: stroke && opts.corners ? opts.corners : undefined },
      );
    }
    if (stroke) svg = svg.replace(DRAWABLE, '<$1 pathLength="1"');
    return { svg, stroke, name };
  }

  function strip(prefix) {
    const p = previews && previews.sets[prefix];
    if (!p) return '';
    return p.icons
      .map((entry, i) => {
        const { svg, stroke, name } = iconSvg(prefix, entry, p.box, opts.size);
        return `<span class="gx-ic ${stroke ? 's' : 'f'}" style="--i:${i}" title="${esc(`${prefix}:${name}`)}">${svg}</span>`;
      })
      .join('');
  }

  function paintCard(card) {
    if (!previews || card.dataset.v === String(version)) return;
    card.dataset.v = String(version);
    $('.gx-strip', card).innerHTML = strip(card.dataset.prefix);
  }

  function cardHtml(s) {
    const tags = ['outline', 'solid', 'duotone', 'color', 'brand'].filter((k) => hasStyle(s, k));
    return `<div class="gx-top"><h3><a href="#set=${esc(s.prefix)}">${esc(s.name)}</a></h3><span class="gx-n">${fmt(s.total)}</span></div>
      <p class="gx-by">${esc(s.author.name)} <span aria-hidden="true">/</span> <code>${esc(s.prefix)}</code></p>
      <div class="gx-badges"><span class="uv-badge lic" title="${esc(KIND[s.license.kind])}">${esc(s.license.title)}</span>${tags.map((t) => `<span class="uv-badge">${t}</span>`).join('')}${
        s.strokeWidth ? '<span class="uv-badge draw" title="Stroke based: the weight axis and the draw animation apply">weight and draw</span>' : ''
      }</div>
      <div class="gx-strip" aria-hidden="true"></div>
      <label class="gx-pick"${compare ? '' : ' hidden'}><input type="checkbox" data-pick="${esc(s.prefix)}"${picked.includes(s.prefix) ? ' checked' : ''}> Compare</label>`;
  }

  function visibleSets() {
    const t = filters.text.toLowerCase();
    let list = catalog.list.filter((s) => s.cdn !== false && previews && previews.sets[s.prefix] && previews.sets[s.prefix].icons.length);
    if (t) list = list.filter((s) => s.name.toLowerCase().includes(t) || s.prefix.includes(t) || s.author.name.toLowerCase().includes(t));
    if (filters.styles.size) list = list.filter((s) => [...filters.styles].some((st) => hasStyle(s, st)));
    if (filters.kinds.size) list = list.filter((s) => filters.kinds.has(s.license.kind));
    const bySize = (a, b) => b.total - a.total || a.name.localeCompare(b.name);
    if (filters.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (filters.sort === 'license') list.sort((a, b) => KIND_ORDER.indexOf(a.license.kind) - KIND_ORDER.indexOf(b.license.kind) || bySize(a, b));
    else list.sort(bySize);
    return list;
  }

  function renderGrid() {
    const list = visibleSets();
    $('[data-gx-count]').textContent = `${fmt(list.length)} sets, ${fmt(list.reduce((n, s) => n + s.total, 0))} icons`;
    const keep = new Set(list.map((s) => s.prefix));
    for (const [prefix, card] of cards) {
      if (!keep.has(prefix)) {
        io.unobserve(card);
        card.remove();
        cards.delete(prefix);
      }
    }
    const frag = document.createDocumentFragment();
    for (const s of list) {
      let card = cards.get(s.prefix);
      if (!card) {
        card = document.createElement('article');
        card.className = 'gx-card';
        card.dataset.prefix = s.prefix;
        card.innerHTML = cardHtml(s);
        cards.set(s.prefix, card);
        io.observe(card);
      }
      card.classList.toggle('picked', picked.includes(s.prefix));
      frag.appendChild(card);
    }
    grid.appendChild(frag);
    // The first rows paint at once; the observer paints the rest as they scroll in.
    for (const s of list.slice(0, 18)) {
      const card = cards.get(s.prefix);
      card.dataset.seen = '1';
      paintCard(card);
    }
    note.hidden = list.length > 0;
    note.textContent = list.length ? '' : 'No set matches these filters.';
  }

  function repaint() {
    version++;
    for (const card of cards.values()) if (card.dataset.seen) paintCard(card);
    if (compare) renderCompare();
  }

  function renderCompare() {
    panel.hidden = !compare;
    if (!compare) return;
    if (picked.length < 2) {
      panel.innerHTML = `<div class="gx-cmp"><div class="gx-cmp-head"><p>Pick 2 to ${MAX_PICK} sets below to see the same concepts side by side${picked.length ? ` (${picked.length} picked)` : ''}.</p></div></div>`;
      return;
    }
    const concepts = previews.concepts.slice(0, COMPARE);
    const head = picked.map((p) => `<th scope="col">${esc(info.get(p).name)}<br><small>${esc(info.get(p).license.title)}</small></th>`).join('');
    const rows = concepts
      .map((c, k) => {
        const cells = picked
          .map((p) => {
            const set = previews.sets[p];
            const entry = set && set.icons.find((e) => e[3] === k);
            if (!entry) return '<td><span class="gx-ic none" title="no match"></span><small>none</small></td>';
            const { svg, stroke } = iconSvg(p, entry, set.box, Math.max(32, opts.size + 8));
            return `<td><span class="gx-ic ${stroke ? 's' : 'f'}">${svg}</span><small>${esc(entry[0])}</small></td>`;
          })
          .join('');
        return `<tr><th scope="row">${esc(c)}</th>${cells}</tr>`;
      })
      .join('');
    panel.innerHTML = `<div class="gx-cmp"><div class="gx-cmp-head"><p>The same concepts in ${picked.length} sets, matched by name, alias and tag synonyms.</p><button class="btn small ghost" type="button" data-gx-clear>Clear</button></div><table><thead><tr><th scope="col">Concept</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function syncHash() {
    const hash = compare ? `#compare${picked.length ? `=${picked.join(',')}` : ''}` : '#gallery';
    if (location.hash !== hash) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  }

  function setCompare(on) {
    compare = on;
    $('[data-gx-compare]').setAttribute('aria-pressed', String(on));
    for (const l of $('.gx-pick', grid)) l.hidden = !on;
    for (const a of $$('[data-view-link]')) a.setAttribute('aria-current', String(a.dataset.viewLink === (on ? 'compare' : 'gallery')));
    renderCompare();
  }

  function setupControls() {
    $('[data-gx-filter]').addEventListener('input', (e) => {
      filters.text = e.target.value.trim();
      renderGrid();
    });
    $('[data-gx-sort]').addEventListener('change', (e) => {
      filters.sort = e.target.value;
      renderGrid();
    });
    for (const [sel, set] of [
      ['[data-gx-styles] button', filters.styles],
      ['[data-gx-licenses] button', filters.kinds],
    ]) {
      for (const b of $$(sel)) {
        b.addEventListener('click', () => {
          if (set.has(b.value)) set.delete(b.value);
          else set.add(b.value);
          b.setAttribute('aria-pressed', String(set.has(b.value)));
          renderGrid();
        });
      }
    }
    const form = $('[data-gx-controls]');
    form.addEventListener('input', (e) => {
      const t = e.target;
      if (t.name === 'color') opts.color = t.value;
      if (t.name === 'size') opts.size = Number(t.value);
      if (t.name === 'weight') opts.weight = Number(t.value);
      $('[data-gx-o="size"]').textContent = String(opts.size);
      $('[data-gx-o="weight"]').textContent = opts.weight == null ? 'native' : String(opts.weight);
      repaint();
    });
    for (const b of $$('[data-gx-corners] button')) {
      b.addEventListener('click', () => {
        opts.corners = b.value;
        for (const x of $$('[data-gx-corners] button')) x.setAttribute('aria-pressed', String(x === b));
        repaint();
      });
    }
    const sw = $('[data-gx-glyphfox]');
    sw.addEventListener('click', () => {
      opts.glyphfox = !opts.glyphfox;
      sw.setAttribute('aria-checked', String(opts.glyphfox));
      $('span', sw).textContent = opts.glyphfox ? 'On' : 'Off';
      repaint();
    });
    $('[data-gx-reset]').addEventListener('click', () => {
      Object.assign(opts, { color: '', size: 24, weight: null, corners: '', glyphfox: false });
      form.reset();
      $('[data-gx-o="size"]').textContent = '24';
      $('[data-gx-o="weight"]').textContent = 'native';
      for (const x of $$('[data-gx-corners] button')) x.setAttribute('aria-pressed', String(x.value === ''));
      sw.setAttribute('aria-checked', 'false');
      $('span', sw).textContent = 'Off';
      repaint();
    });
    $('[data-gx-compare]').addEventListener('click', () => {
      setCompare(!compare);
      syncHash();
    });
    panel.addEventListener('click', (e) => {
      if (!e.target.closest('[data-gx-clear]')) return;
      picked.length = 0;
      for (const box of $$('[data-pick]', grid)) box.checked = false;
      for (const card of cards.values()) card.classList.remove('picked');
      renderCompare();
      syncHash();
    });
    grid.addEventListener('change', (e) => {
      const box = e.target.closest('[data-pick]');
      if (!box) return;
      const p = box.dataset.pick;
      const i = picked.indexOf(p);
      if (box.checked && i === -1) {
        if (picked.length >= MAX_PICK) {
          box.checked = false;
          return;
        }
        picked.push(p);
      } else if (!box.checked && i !== -1) picked.splice(i, 1);
      cards.get(p).classList.toggle('picked', box.checked);
      renderCompare();
      syncHash();
    });
    grid.addEventListener('click', (e) => {
      if (e.target.closest('.gx-pick')) return;
      const card = e.target.closest('.gx-card');
      if (!card) return;
      e.preventDefault();
      onOpen(card.dataset.prefix);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const card = e.target.closest('.gx-card');
      if (card && !e.target.closest('.gx-pick')) onOpen(card.dataset.prefix);
    });
  }

  let setup = false;

  /** Shows the gallery; `pick` (a list of prefixes) opens the compare view with them. */
  async function show(pick) {
    root.hidden = false;
    if (!setup) {
      setup = true;
      setupControls();
    }
    if (!previews) {
      grid.innerHTML = '<p class="uv-note">Loading the previews</p>';
      try {
        previews = await U.loadPreviews();
      } catch {
        grid.innerHTML = '';
        note.hidden = false;
        note.textContent = 'The previews load from jsDelivr, from the published glyphfox-universe package.';
        return;
      }
      grid.innerHTML = '';
    }
    if (pick) {
      picked.length = 0;
      for (const p of pick) if (info.has(p) && previews.sets[p] && picked.length < MAX_PICK && !picked.includes(p)) picked.push(p);
    }
    if (!built) {
      built = true;
      renderGrid();
    }
    for (const box of $$('[data-pick]', grid)) box.checked = picked.includes(box.dataset.pick);
    for (const card of cards.values()) card.classList.toggle('picked', picked.includes(card.dataset.prefix));
    setCompare(Boolean(pick));
  }

  function hide() {
    root.hidden = true;
  }

  return { show, hide };
}
