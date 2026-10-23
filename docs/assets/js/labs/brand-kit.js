// Brand kit tool of the studio: pick a seed color, weight, corners and
// style, preview the whole set themed, and download one zip built in the
// browser (see kit-core.js for what goes inside).

import { $, $$, download, has, svg, t, toast } from '../app.js';
import { svgToCanvas, zip } from '../exporters.js';
import { DEFAULTS, cssText, iconProps, kitFiles, slug, spriteSvg, tileSvg } from './kit-core.js';

const state = { ...DEFAULTS };
let names = [];
let version = '';
let frame = 0;

const settings = () => ({ ...state, mark: has(state.mark) ? state.mark : names[0] });

/** PNG bytes of SVG markup rendered at size x size. */
export async function pngBytes(markup, size) {
  const canvas = await svgToCanvas(markup, size, size);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode a PNG'))), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

function render() {
  frame = 0;
  const s = settings();
  $('[data-br-grid]').innerHTML = names.map((n) => `<div title="${n}">${svg(n, iconProps(s, { size: 28 }))}</div>`).join('');
  $('[data-br-count]').textContent = t('brand.count', { n: names.length });
  const tiles = [
    [t('brand.favicon16'), tileSvg(svg, s, 'favicon', 16)],
    ['32', tileSvg(svg, s, 'favicon', 32)],
    ['180', tileSvg(svg, s, 'touch', 180).replace(/width="180" height="180"/, 'width="72" height="72"')],
    ['192', tileSvg(svg, s, 'app', 192).replace(/width="192" height="192"/, 'width="72" height="72"')],
    [t('brand.maskable'), tileSvg(svg, s, 'maskable', 192).replace(/width="192" height="192"/, 'width="72" height="72" class="br-maskable"')],
  ];
  $('[data-br-marks]').innerHTML = tiles.map(([label, markup]) => `<figure>${markup}<figcaption>${label}</figcaption></figure>`).join('');
}

const schedule = () => {
  if (!frame) frame = requestAnimationFrame(render);
};

async function exportKind(kind) {
  const s = settings();
  const base = slug(s.name);
  if (kind === 'sprite') return download(spriteSvg(svg, s, names), `${base}-sprite.svg`, 'image/svg+xml');
  if (kind === 'css') return download(cssText(svg, s, names), `${base}.css`, 'text/css');
  toast(t('brand.building'));
  const files = await kitFiles({ names, settings: s, render: svg, png: pngBytes, version });
  download(zip(files), `${base}-brand-kit.zip`, 'application/zip');
}

export function initBrand(data) {
  names = data.icons.map((i) => i.name);
  version = data.version || '';
  if (!has(state.mark)) state.mark = has('heart') ? 'heart' : names[0];
  $('[data-br="mark"]').value = state.mark;
  for (const input of $$('[data-br]')) {
    input.addEventListener('input', () => {
      const k = input.dataset.br;
      state[k] = input.type === 'range' ? Number(input.value) : input.value;
      const o = $(`[data-br-o="${k}"]`);
      if (o) o.textContent = input.value;
      schedule();
    });
  }
  for (const seg of $$('[data-br-seg]')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
      state[seg.dataset.brSeg] = b.value;
      schedule();
    });
  }
  for (const b of $$('[data-br-dl]')) {
    b.addEventListener('click', async () => {
      try {
        b.disabled = true;
        await exportKind(b.dataset.brDl);
        toast(t('toast.downloaded'));
      } catch (err) {
        toast(err.message);
      } finally {
        b.disabled = false;
      }
    });
  }
  render();
}
