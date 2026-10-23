// Glyph script playground: an editor with a line gutter, examples, a live
// compile with errors and warnings at their line and column, previews on
// the grid and at real sizes, the canonical SVG and the collection.

import { $, codeBlock, copy, download, gf, t, toast } from '../app.js';
import * as collection from '../collection.js';
import { EXAMPLES, compileScript } from '../../../vendor/glyphfox-labs.js';
import { esc, fileName, setScriptIcon } from './shared.js';

const KEY = 'gf-labs-script';
const LINE = 13.5 * 1.6;
let text;
let gutter;
let current = null;
let good = null;
let timer = 0;
let lastMarks = '';

function stored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function persist(source) {
  try {
    localStorage.setItem(KEY, source);
  } catch {
    // storage blocked: the playground keeps working
  }
}

function exampleTitle(ex) {
  const key = `labs.example.${ex.id}`;
  const tr = t(`labs.example.${ex.id}`);
  return tr === key ? ex.title : tr;
}

function paintGutter(marks) {
  const lines = text.value.split('\n').length;
  const sig = `${lines}|${[...marks].join(',')}`;
  if (sig === lastMarks) return;
  lastMarks = sig;
  let s = '';
  for (let i = 1; i <= lines; i++) s += marks.has(i) ? `<span class="${marks.get(i)}">${i}</span>` : `<span>${i}</span>`;
  gutter.innerHTML = s;
  gutter.scrollTop = text.scrollTop;
}

/** Moves the caret to a 1 based line and column and selects `length` characters. */
function focusAt(line, column, length = 0) {
  const lines = text.value.split('\n');
  const l = Math.max(1, Math.min(line || 1, lines.length));
  let off = 0;
  for (let i = 0; i < l - 1; i++) off += lines[i].length + 1;
  const col = Math.max(0, Math.min((column || 1) - 1, lines[l - 1].length));
  text.focus();
  text.setSelectionRange(off + col, Math.min(off + col + (length || 0), off + lines[l - 1].length));
  text.scrollTop = Math.max(0, (l - 4) * LINE);
}

function problemItem(p, kind) {
  const where = `${p.line || 1}:${p.column || 1}`;
  const label = t('labs.script.jump', { line: p.line || 1, column: p.column || 1 });
  return `<li class="${kind}"><button type="button" data-line="${p.line || 1}" data-col="${p.column || 1}" data-len="${p.length || 0}" aria-label="${esc(label)}: ${esc(p.message)}"><b>${where}</b><span>${esc(p.message)}</span></button></li>`;
}

function render() {
  const source = text.value;
  persist(source);
  let r;
  try {
    r = compileScript(source, { name: 'my-script' });
  } catch (err) {
    r = { ok: false, errors: [{ message: err && err.message ? err.message : String(err), line: 1, column: 1, length: 0 }], warnings: [] };
  }
  current = r;
  const errors = r.errors || [];
  const warnings = r.warnings || [];
  const marks = new Map();
  for (const w of warnings) marks.set(w.line || 1, 'warn');
  for (const e of errors) marks.set(e.line || 1, 'err');
  paintGutter(marks);
  if (r.ok) {
    good = r;
    setScriptIcon(r.icon);
  }
  const show = r.ok ? r : good;
  const stage = $('[data-gs-stage]');
  const status = $('[data-gs-status]');
  stage.classList.toggle('stale', !r.ok && Boolean(good));
  if (show) {
    stage.innerHTML = gf.renderToString(show.icon, { size: 240, decorative: true });
    $('[data-gs-sizes]').innerHTML = [24, 48, 96].map((s) => gf.renderToString(show.icon, { size: s })).join('') + gf.renderToString(show.icon, { size: 48, variant: 'duotone' }) + gf.renderToString(show.icon, { size: 48, variant: 'solid' });
    $('[data-gs-code]').replaceChildren(codeBlock(show.svg, 'js', `${fileName(show.icon.name)}.svg`));
  } else {
    stage.innerHTML = '';
    $('[data-gs-sizes]').innerHTML = '';
    $('[data-gs-code]').replaceChildren();
  }
  if (r.ok) {
    const shapes = gf.parseBody(r.body).length;
    status.textContent = t('labs.script.status.ok', { lines: source.split('\n').length, shapes });
    status.className = 'gs-status ok';
  } else {
    status.textContent = t('labs.script.status.bad', { n: errors.length || 1 }) + (good ? ` ${t('labs.script.stale')}` : '');
    status.className = 'gs-status bad';
  }
  const items = [...errors.map((p) => problemItem(p, 'bad')), ...warnings.map((p) => problemItem(p, 'warn'))];
  $('[data-gs-lint]').innerHTML = items.length ? items.join('') : `<li class="ok">${esc(t('labs.script.ok'))}</li>`;
  const sel = $('[data-gs-example]');
  const match = EXAMPLES.find((ex) => ex.source === source);
  sel.value = match ? match.id : 'custom';
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(render, 140);
}

function result() {
  return current && current.ok ? current : good;
}

export function initScript() {
  text = $('[data-gs-text]');
  gutter = $('[data-gs-gutter]');
  const sel = $('[data-gs-example]');
  sel.innerHTML = EXAMPLES.map((ex) => `<option value="${esc(ex.id)}">${esc(exampleTitle(ex))}</option>`).join('') + `<option value="custom">${esc(t('labs.example.custom'))}</option>`;
  const saved = stored();
  text.value = saved && saved.trim() ? saved : EXAMPLES.length ? EXAMPLES[0].source : '';
  sel.addEventListener('change', () => {
    const ex = EXAMPLES.find((x) => x.id === sel.value);
    if (!ex) return;
    text.value = ex.source;
    text.scrollTop = 0;
    render();
  });
  text.addEventListener('input', schedule);
  text.addEventListener('scroll', () => {
    gutter.scrollTop = text.scrollTop;
  });
  $('[data-gs-lint]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-line]');
    if (b) focusAt(Number(b.dataset.line), Number(b.dataset.col), Number(b.dataset.len));
  });
  for (const b of document.querySelectorAll('[data-gs]')) {
    b.addEventListener('click', () => {
      const r = result();
      if (!r) {
        toast(t('labs.script.status.bad', { n: (current && current.errors && current.errors.length) || 1 }));
        return;
      }
      const name = fileName(r.icon.name);
      if (b.dataset.gs === 'copy') copy(r.svg);
      else if (b.dataset.gs === 'download') {
        download(r.svg, `${name}.svg`, 'image/svg+xml');
        toast(t('toast.downloaded'));
      } else if (b.dataset.gs === 'save') {
        collection.save({
          name,
          body: r.body,
          tags: r.icon.tags || [],
          categories: r.icon.categories && r.icon.categories.length ? r.icon.categories : ['shapes'],
          source: 'script',
        });
        toast(t('toast.saved'));
      }
    });
  }
  render();
}
