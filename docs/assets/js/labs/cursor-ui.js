// Cursor panel: hotspot presets or a custom point on the grid, color and
// halo, a live try area, zoomed PNG previews with the hotspot marked, the
// cursor CSS and the download (PNG at 32 and 64 px plus the CSS).

import { $, $$, codeBlock, download, t, toast } from '../app.js';
import { zip } from '../exporters.js';
import { HOTSPOTS, cursorKit, dataUri } from '../../../vendor/glyphfox-labs.js';
import { entries, esc, rangeFill, sourceControl } from './shared.js';

const LABELS = { center: 'center', 'top-left': 'topLeft', 'top-right': 'topRight', 'bottom-left': 'bottomLeft', 'bottom-right': 'bottomRight', custom: 'custom' };
const state = { hotspot: 'custom', x: 3.5, y: 3.5, color: '#111111', outline: '#ffffff', outlineWidth: 1.5 };
let src;

function options(inline) {
  const custom = state.hotspot === 'custom';
  return {
    name: src.name(),
    hotspot: custom ? [state.x, state.y] : state.hotspot,
    color: state.color,
    outline: state.outlineWidth > 0 ? state.outline : null,
    outlineWidth: state.outlineWidth,
    inline,
  };
}

function pngOf(files, size) {
  const key = Object.keys(files).find((k) => k.endsWith(`-${size}.png`));
  return key ? files[key] : null;
}

function render() {
  const icon = src.icon();
  const area = $('[data-cu-try]');
  if (!icon) {
    area.style.cursor = '';
    $('[data-cu-pngs]').innerHTML = '';
    return;
  }
  let kit;
  try {
    kit = cursorKit(icon, options(false));
  } catch (err) {
    $('[data-cu-hot]').textContent = t('labs.error', { message: err.message });
    return;
  }
  const [hx, hy] = kit.hotspot;
  const u32 = dataUri(pngOf(kit.files, 32));
  const u64 = dataUri(pngOf(kit.files, 64));
  // The url() form first; browsers that know image-set take the sharper one.
  area.style.cursor = `url("${u32}") ${hx} ${hy}, auto`;
  area.style.cursor = `-webkit-image-set(url("${u32}") 1x, url("${u64}") 2x) ${hx} ${hy}, auto`;
  area.style.cursor = `image-set(url("${u32}") 1x, url("${u64}") 2x) ${hx} ${hy}, auto`;
  const marker = () => `<i style="left:${((hx + 0.5) / 32) * 100}%;top:${((hy + 0.5) / 32) * 100}%"></i>`;
  $('[data-cu-pngs]').innerHTML = [
    `<figure><div class="cu-zoom"><img src="${u32}" alt="" width="128" height="128">${marker()}</div><figcaption>32 px, 4x</figcaption></figure>`,
    `<figure><div class="cu-zoom"><img src="${u64}" alt="" width="128" height="128">${marker()}</div><figcaption>64 px, 2x</figcaption></figure>`,
    `<figure><div class="cu-zoom"><img src="${u32}" alt="" width="32" height="32"></div><figcaption>1x</figcaption></figure>`,
  ].join('');
  $('[data-cu-hot]').textContent = t('labs.cursor.hotspotAt', { x: hx, y: hy });
  $('[data-cu-code]').replaceChildren(codeBlock(kit.css, 'css', `${src.name()}.css`));
}

export function init() {
  src = sourceControl('cursor', render);
  const seg = $('[data-cu-hotspot]');
  seg.innerHTML = [...HOTSPOTS, 'custom'].map((h) => `<button type="button" value="${esc(h)}" aria-pressed="${h === state.hotspot}">${esc(t(`labs.hotspot.${LABELS[h] || 'custom'}`))}</button>`).join('');
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.hotspot = b.value;
    for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
    $('[data-cu-custom]').hidden = state.hotspot !== 'custom';
    render();
  });
  for (const key of ['x', 'y']) {
    const input = $(`[data-cu="${key}"]`);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      if (!Number.isFinite(v)) return;
      state[key] = Math.max(0, Math.min(24, v));
      render();
    });
  }
  for (const key of ['color', 'outline']) {
    const input = $(`[data-cu="${key}"]`);
    input.addEventListener('input', () => {
      state[key] = input.value;
      render();
    });
  }
  const width = $('[data-cu="outlineWidth"]');
  rangeFill(width);
  width.addEventListener('input', () => {
    state.outlineWidth = Number(width.value);
    $('[data-cu-o="outlineWidth"]').textContent = width.value;
    rangeFill(width);
    render();
  });
  $('[data-cu-act="download"]').addEventListener('click', () => {
    const icon = src.icon();
    if (!icon) return;
    try {
      const kit = cursorKit(icon, options(false));
      download(zip(entries(kit.files)), `${src.name()}-cursor.zip`, 'application/zip');
      toast(t('toast.downloaded'));
    } catch (err) {
      toast(t('labs.error', { message: err.message }));
    }
  });
  render();
}
