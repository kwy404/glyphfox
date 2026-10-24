// Studio router: tabs with hash links (#editor, #foxify, #sketch, #motion,
// #fusion=cloud&lock, #brand, #3d, #collection) and the collection view.

import { $, $$, download, gf, loadIcons, siteRoot, t, toast } from './app.js';
import * as collection from './collection.js';
import { initEditor, openBody } from './editor.js';

const ready = {};
let data = null;
let hero3d = null;

function renderCollection() {
  const list = collection.load();
  $('[data-col-count]').textContent = String(list.length);
  const grid = $('[data-col-grid]');
  $('[data-col-empty]').hidden = list.length > 0;
  grid.innerHTML = list
    .map((i) => {
      const icon = { name: i.name, body: i.body, tags: i.tags, categories: i.categories };
      return `<div class="card col-card" data-id="${i.id}"><div class="tile">${gf.renderToString(icon, { size: 48 })}</div><b>${i.name}</b><div class="acts">
        <button class="icon-btn" type="button" data-col="edit" aria-label="${t('collection.edit')} ${i.name}" title="${t('collection.edit')}">${gf.lookupIcon('pencil') ? gf.renderToString(gf.lookupIcon('pencil'), { size: 16 }) : 'E'}</button>
        <button class="icon-btn" type="button" data-col="download" aria-label="${t('editor.download')} ${i.name}" title="${t('editor.download')}">${gf.lookupIcon('download') ? gf.renderToString(gf.lookupIcon('download'), { size: 16 }) : 'D'}</button>
        <button class="icon-btn" type="button" data-col="delete" aria-label="${t('collection.delete')} ${i.name}" title="${t('collection.delete')}">${gf.lookupIcon('trash') ? gf.renderToString(gf.lookupIcon('trash'), { size: 16 }) : 'X'}</button>
      </div></div>`;
    })
    .join('');
}

// Designed animations live in data/animations.json, loaded with the Motion tool.
async function loadAnimations() {
  try {
    const root = siteRoot();
    const list = await fetch(`${root}data/animations.json`).then((r) => r.json());
    for (const [name, animation] of Object.entries(list)) {
      const icon = gf.lookupIcon(name);
      if (icon && !icon.animation) icon.animation = animation;
    }
  } catch {
    // the editor still works without them
  }
}

// The share controls of the collection (links and live sessions) load in their own chunk.
let sharing = null;
const shareModule = () => (sharing ||= import('./share/index.js'));

function openInEditor(body, name) {
  show('editor');
  openBody(body, { name });
  history.replaceState(null, '', '#editor');
}

function openIn3d(icon, spec) {
  history.replaceState(null, '', `#3d=${encodeURIComponent(spec)}`);
  show('3d', { icon, name: spec });
}

async function show(tool, payload) {
  for (const b of $$('[data-studio-tabs] [data-tool]')) b.setAttribute('aria-selected', String(b.dataset.tool === tool));
  for (const p of $$('[data-panel]')) p.hidden = p.dataset.panel !== tool;
  if (tool === 'editor' && !ready.editor) {
    initEditor(data);
    ready.editor = true;
  }
  if (tool === 'editor' && payload) {
    if (payload.startsWith('col:')) {
      const item = collection.get(payload.slice(4));
      if (item) openBody(item.body, { name: item.name, tags: item.tags, category: item.categories[0], id: item.id });
    } else {
      try {
        const icon = gf.resolveSpec(payload, gf.lookupIcon).icon;
        openBody(icon.body, { name: `${icon.name.replace(/[^a-z0-9-]+/g, '-')}-remix`, tags: icon.tags, category: icon.categories[0] });
      } catch {
        // unknown icon
      }
    }
  }
  // The tools load when they are first opened.
  if (tool === 'foxify' && !ready.foxify) {
    ready.foxify = true;
    const { initFoxify } = await import('./foxify-ui.js');
    initFoxify({ openInEditor });
  }
  if (tool === 'fusion') {
    const fusion = await import('./fusion-ui.js');
    if (!ready.fusion) {
      ready.fusion = true;
      fusion.initFusion(data, { openInEditor, openIn3d });
    }
    if (payload) fusion.loadSpec(payload);
  }
  if (tool === 'sketch' && !ready.sketch) ready.sketch = import('./labs/sketch-ui.js').then((m) => m.initSketch(data, { openInEditor }));
  if (tool === 'motion' && !ready.motion) {
    ready.motion = true;
    const { initMotion } = await import('./motion.js');
    await loadAnimations();
    initMotion();
  }
  if (tool !== 'motion' && ready.motion) import('./motion.js').then((m) => m.stopMotion());
  if (tool === 'brand' && !ready.brand) {
    const { initBrand } = await import('./labs/brand-kit.js');
    initBrand(data);
    ready.brand = true;
  }
  if (tool === '3d') {
    hero3d = hero3d || import('./hero3d/panel.js');
    (await hero3d).show(payload);
  } else if (hero3d) (await hero3d).hide();
  if (tool === 'collection') renderCollection();
}

function route() {
  const raw = decodeURIComponent(location.hash.slice(1));
  const [tool, ...rest] = raw.split('=');
  // Share links (#share=...) and live session words (#live=...) open the collection.
  if (tool === 'share' || tool === 'live') {
    shareModule().then((share) => share.route(tool, rest.join('=')));
    return show('collection');
  }
  const known = ['editor', 'foxify', 'sketch', 'motion', 'fusion', 'brand', '3d', 'collection'];
  show(known.includes(tool) ? tool : 'editor', rest.join('=') || '');
}

loadIcons().then((d) => {
  data = d;
  shareModule().then((share) => share.init(d));
  $('[data-studio-tabs]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    history.replaceState(null, '', `#${b.dataset.tool}`);
    show(b.dataset.tool);
  });
  $('[data-studio-tabs]').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = $$('[data-studio-tabs] [data-tool]');
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    next.click();
  });
  window.addEventListener('hashchange', route);
  collection.onChange(() => {
    $('[data-col-count]').textContent = String(collection.load().length);
    if (!$('[data-panel="collection"]').hidden) renderCollection();
  });
  $('[data-col-grid]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-col]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const item = collection.get(id);
    if (!item) return;
    if (b.dataset.col === 'edit') {
      history.replaceState(null, '', `#editor=col:${id}`);
      show('editor', `col:${id}`);
    } else if (b.dataset.col === 'download') download(collection.svgOf(item), `${item.name}.svg`, 'image/svg+xml');
    else if (b.dataset.col === 'delete') {
      collection.remove(id);
      toast(t('collection.deleted'));
    }
  });
  for (const b of $$('[data-col-dl]')) {
    b.addEventListener('click', () => {
      const list = collection.load();
      if (!list.length) {
        toast(t('collection.empty.short'));
        return;
      }
      const kind = b.dataset.colDl;
      if (kind === 'svgs') download(collection.svgsZip(list), 'glyphfox-collection.zip', 'application/zip');
      else if (kind === 'sprite') download(collection.sprite(list), 'glyphfox-collection-sprite.svg', 'image/svg+xml');
      else download(collection.packageZip(list), 'my-glyphfox-icons.zip', 'application/zip');
      toast(t('toast.downloaded'));
    });
  }
  $('[data-col-count]').textContent = String(collection.load().length);
  route();
});
