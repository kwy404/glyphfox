// Labs router: tabs with hash links (#script, #favicon, #cursor, #plotter,
// #stl). The glyph script panel starts right away because the export panels
// can use its icon; the export panels load the first time they are shown.

import { $, $$, loadIcons } from '../app.js';
import { initScript } from './script-ui.js';

const PANELS = ['script', 'favicon', 'cursor', 'plotter', 'stl'];
const LOADERS = {
  favicon: () => import('./favicon-ui.js'),
  cursor: () => import('./cursor-ui.js'),
  plotter: () => import('./plotter-ui.js'),
  stl: () => import('./stl-ui.js'),
};
const modules = {};

async function show(tool) {
  for (const b of $$('[data-labs-tabs] [data-tool]')) b.setAttribute('aria-selected', String(b.dataset.tool === tool));
  for (const p of $$('[data-panel]')) p.hidden = p.dataset.panel !== tool;
  if (tool === 'script' || !LOADERS[tool]) return;
  if (!modules[tool]) {
    modules[tool] = await LOADERS[tool]();
    modules[tool].init();
  }
  if (modules[tool].shown) modules[tool].shown();
}

function route() {
  const tool = decodeURIComponent(location.hash.slice(1)).split('=')[0];
  show(PANELS.includes(tool) ? tool : 'script');
}

loadIcons().then((data) => {
  $('[data-lab-names]').innerHTML = data.icons.map((i) => `<option value="${i.name}"></option>`).join('');
  initScript();
  const tabs = $('[data-labs-tabs]');
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    history.replaceState(null, '', `#${b.dataset.tool}`);
    show(b.dataset.tool);
  });
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    const list = $$('[data-tool]', tabs);
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? list[0] : e.key === 'End' ? list[list.length - 1] : list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    next.focus();
    next.click();
  });
  window.addEventListener('hashchange', route);
  route();
});
