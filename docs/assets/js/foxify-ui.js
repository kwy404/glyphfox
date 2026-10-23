// Fox-ify: any SVG in, the glyphfox style out, with a before and after view.

import { $, $$, download, fennArt, gf, t, toast } from './app.js';
import * as collection from './collection.js';

const SAMPLES = [
  // A filled shape on a 512 grid.
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#222" d="M256 40l62 126 140 20-101 98 24 139-125-66-125 66 24-139L54 186l140-20z"/></svg>',
  // Nested groups with transforms, a symbol and use.
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100"><defs><symbol id="d"><circle cx="6" cy="6" r="6"/></symbol></defs><g transform="translate(14 22) scale(1.2)"><rect width="60" height="44" rx="6" fill="none" stroke="#000" stroke-width="6"/><path d="M0 12h60" stroke="#000" stroke-width="6"/></g><use xlink:href="#d" x="70" y="70"/></svg>',
  // A stroke icon from another 24 grid set with odd numbers.
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.13 11.02 12.01 3.4l8.92 7.63M5.07 9.5v10.41h13.86V9.5"/><path d="M9.9 19.9v-5.2h4.2v5.2"/></svg>',
];

let result = null;
let sample = 0;

function sanitize(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '');
}

function run() {
  const text = $('[data-fox-text]').value.trim();
  const before = $('[data-fox-before]');
  const after = $('[data-fox-after]');
  const lint = $('[data-fox-lint]');
  if (!text) {
    before.innerHTML = '';
    after.innerHTML = fennArt('drawing');
    lint.innerHTML = `<li>${t('foxify.waiting')}</li>`;
    result = null;
    return;
  }
  const img = new Image();
  img.alt = t('foxify.before');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sanitize(text));
  before.replaceChildren(img);
  try {
    result = gf.foxify(text, { snap: Number($('[data-fox-snap]').value), fit: $('[data-fox-fit]').value });
  } catch (err) {
    result = null;
    after.innerHTML = '';
    lint.innerHTML = `<li class="bad"><b>xml</b> ${err.message}</li>`;
    return;
  }
  if (!result.body) {
    after.innerHTML = '';
    lint.innerHTML = result.problems.map((p) => `<li class="bad"><b>${p.rule}</b> ${p.message}</li>`).join('');
    return;
  }
  const icon = { name: 'foxified', body: result.body, tags: [], categories: [] };
  after.innerHTML = gf.renderToString(icon, { size: 200, weight: 2 });
  $('[data-fox-sizes]').innerHTML = [16, 24, 32, 48].map((s) => gf.renderToString(icon, { size: s })).join('') + gf.renderToString(icon, { size: 48, variant: 'solid' });
  const items = result.problems.length ? result.problems.map((p) => `<li class="bad"><b>${p.rule}</b> ${p.message}</li>`) : [`<li class="ok">${t('editor.lint.ok')}</li>`];
  for (const n of result.notes) items.push(`<li>${n}</li>`);
  lint.innerHTML = items.join('');
}

export function initFoxify({ openInEditor }) {
  const text = $('[data-fox-text]');
  const drop = $('[data-fox-drop]');
  const file = $('[data-fox-file]');
  let timer = 0;
  text.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
  for (const sel of $$('[data-fox-snap], [data-fox-fit]')) sel.addEventListener('change', run);
  const read = async (f) => {
    if (!f) return;
    text.value = await f.text();
    $('[data-fox-name]').value = collection.slug(f.name.replace(/\.svg$/i, ''));
    run();
  };
  file.addEventListener('change', () => read(file.files[0]));
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      file.click();
    }
  });
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    read(e.dataTransfer.files[0]);
  });
  $('[data-fox-sample]').addEventListener('click', () => {
    text.value = SAMPLES[sample % SAMPLES.length];
    $('[data-fox-name]').value = ['star', 'card', 'house'][sample % SAMPLES.length];
    sample++;
    run();
  });
  for (const b of $$('[data-fox]')) {
    b.addEventListener('click', () => {
      if (!result || !result.body) return;
      const name = $('[data-fox-name]').value || 'foxified';
      if (b.dataset.fox === 'save') {
        collection.save({ name, body: result.body, tags: ['foxified'], categories: ['shapes'], source: 'foxify' });
        toast(t('toast.saved'));
      } else if (b.dataset.fox === 'edit') openInEditor(result.body, name);
      else if (b.dataset.fox === 'download') download(result.svg, `${collection.slug(name)}.svg`, 'image/svg+xml');
    });
  }
  run();
}
