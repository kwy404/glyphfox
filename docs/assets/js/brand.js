// Brand kit: theme the whole set with a seed color, weight, corners and
// style, and export a package, a sprite, CSS, a favicon and app icons.

import { $, $$, download, gf, has, svg, t, toast } from './app.js';
import { svgToCanvas, zip } from './exporters.js';

const state = { seed: '#7c5cff', bg: '#14112b', weight: 2, corners: 'round', variant: 'outline', mark: 'star', name: '@acme/icons' };
let icons = [];

function mix(hex, other, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(other);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

function props(extra = {}) {
  return { weight: state.weight, corners: state.corners, variant: state.variant, color: state.seed, secondaryColor: mix(state.seed, '#ffffff', 0.35), ...extra };
}

function themed(name, extra) {
  return svg(name, props(extra));
}

function markName() {
  return has(state.mark) ? state.mark : icons[0].name;
}

function appIconSvg(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.24 : size * 0.18;
  const inner = themed(markName(), { size: size - pad * 2, color: mix(state.seed, '#ffffff', 0.15) });
  const r = maskable ? 0 : size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${state.bg}"/><g transform="translate(${pad} ${pad})">${inner}</g></svg>`;
}

function render() {
  const grid = $('[data-br-grid]');
  grid.innerHTML = icons
    .slice(0, 96)
    .map((i) => `<div title="${i.name}">${themed(i.name, { size: 28 })}</div>`)
    .join('');
  $('[data-br-marks]').innerHTML = [
    [t('brand.favicon16'), appIconSvg(16).replace(/rx="[^"]*"/, 'rx="3"')],
    ['32', appIconSvg(32)],
    ['180', appIconSvg(96)],
    [t('brand.maskable'), appIconSvg(96, { maskable: true }).replace('<rect ', '<rect rx="48" ')],
  ]
    .map(([label, s]) => `<figure>${s}<figcaption>${label}</figcaption></figure>`)
    .join('');
}

async function pngBytes(markup, size) {
  const c = await svgToCanvas(markup, size, size);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

/** ICO file holding PNG images. */
function ico(images) {
  const head = new DataView(new ArrayBuffer(6 + images.length * 16));
  head.setUint16(2, 1, true);
  head.setUint16(4, images.length, true);
  let offset = 6 + images.length * 16;
  images.forEach(({ size, data }, i) => {
    const o = 6 + i * 16;
    head.setUint8(o, size >= 256 ? 0 : size);
    head.setUint8(o + 1, size >= 256 ? 0 : size);
    head.setUint16(o + 4, 1, true);
    head.setUint16(o + 6, 32, true);
    head.setUint32(o + 8, data.length, true);
    head.setUint32(o + 12, offset, true);
    offset += data.length;
  });
  return new Blob([new Uint8Array(head.buffer), ...images.map((x) => x.data)], { type: 'image/x-icon' });
}

function css() {
  const rules = icons.map((i) => `.icon-${i.name}{--icon:url("${gf.toDataUri(themed(i.name, { color: undefined, secondaryColor: undefined }).replace(/ class="[^"]*"/, '').replace(/ aria-hidden="true"/, ''))}")}`);
  return `/* ${state.name} icons, built with the glyphfox brand kit */\n:root{--brand:${state.seed}}\n.icon{display:inline-block;width:1em;height:1em;flex-shrink:0;vertical-align:-.125em;background-color:var(--brand,currentColor);-webkit-mask:var(--icon) no-repeat center/100% 100%;mask:var(--icon) no-repeat center/100% 100%}\n${rules.join('\n')}\n`;
}

function sprite() {
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${icons
    .map((i) => {
      const s = themed(i.name);
      const inner = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      const attrs = ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'color'].map((k) => {
        const m = new RegExp(`\\s${k}="([^"]*)"`).exec(s.slice(0, s.indexOf('>')));
        return m ? ` ${k}="${m[1]}"` : '';
      });
      return `<symbol id="${i.name}"${attrs.join('')}>${inner}</symbol>`;
    })
    .join('\n')}\n</svg>\n`;
}

async function exportKind(kind) {
  const base = state.name.replace(/^@[^/]+\//, '').replace(/[^a-z0-9-]+/gi, '-') || 'icons';
  if (kind === 'sprite') return download(sprite(), `${base}-sprite.svg`, 'image/svg+xml');
  if (kind === 'css') return download(css(), `${base}.css`, 'text/css');
  if (kind === 'favicon') {
    const s16 = appIconSvg(16).replace(/rx="[^"]*"/, 'rx="3"');
    const data = ico([
      { size: 16, data: await pngBytes(s16, 16) },
      { size: 32, data: await pngBytes(appIconSvg(32), 32) },
      { size: 48, data: await pngBytes(appIconSvg(48), 48) },
    ]);
    const files = [
      { name: 'favicon.svg', data: appIconSvg(32) },
      { name: 'favicon.ico', data: new Uint8Array(await data.arrayBuffer()) },
      { name: 'README.txt', data: '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' },
    ];
    return download(zip(files), `${base}-favicon.zip`, 'application/zip');
  }
  if (kind === 'app') {
    const files = [
      { name: 'apple-touch-icon.png', data: await pngBytes(appIconSvg(180).replace(/rx="[^"]*"/, 'rx="0"'), 180) },
      { name: 'icon-192.png', data: await pngBytes(appIconSvg(192), 192) },
      { name: 'icon-512.png', data: await pngBytes(appIconSvg(512), 512) },
      { name: 'icon-maskable-512.png', data: await pngBytes(appIconSvg(512, { maskable: true }), 512) },
      {
        name: 'manifest.webmanifest',
        data:
          JSON.stringify(
            {
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
              theme_color: state.bg,
              background_color: state.bg,
            },
            null,
            2,
          ) + '\n',
      },
    ];
    return download(zip(files), `${base}-app-icons.zip`, 'application/zip');
  }
  // Package.
  const ident = (n) => 'icon' + n.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  const files = [
    {
      name: 'package.json',
      data:
        JSON.stringify(
          {
            name: state.name,
            version: '1.0.0',
            description: `${icons.length} brand icons themed with the glyphfox brand kit`,
            type: 'module',
            main: './index.js',
            types: './index.d.ts',
            exports: { '.': { types: './index.d.ts', default: './index.js' }, './sprite.svg': './sprite.svg', './icons.css': './icons.css', './icons/*': './icons/*' },
            files: ['index.js', 'index.d.ts', 'sprite.svg', 'icons.css', 'icons'],
            license: 'MIT',
            keywords: ['icons', 'svg', 'glyphfox'],
          },
          null,
          2,
        ) + '\n',
    },
    { name: 'index.js', data: `// Brand icons as SVG strings (color ${state.seed}, weight ${state.weight}, ${state.corners} corners, ${state.variant}).\n${icons.map((i) => `export const ${ident(i.name)} = ${JSON.stringify(themed(i.name))};`).join('\n')}\n` },
    { name: 'index.d.ts', data: icons.map((i) => `export declare const ${ident(i.name)}: string;`).join('\n') + '\n' },
    { name: 'sprite.svg', data: sprite() },
    { name: 'icons.css', data: css() },
    { name: 'README.md', data: `# ${state.name}\n\n${icons.length} icons from [glyphfox](https://kwy404.github.io/glyphfox/) themed for the brand: color \`${state.seed}\`, weight ${state.weight}, ${state.corners} corners, ${state.variant} style.\n\n\`\`\`js\nimport { ${ident(icons[0].name)} } from '${state.name}';\n\nbutton.innerHTML = ${ident(icons[0].name)};\n\`\`\`\n\n\`\`\`html\n<link rel="stylesheet" href="node_modules/${state.name}/icons.css">\n<span class="icon icon-${icons[0].name}"></span>\n\`\`\`\n` },
    ...icons.map((i) => ({ name: `icons/${i.name}.svg`, data: themed(i.name) + '\n' })),
  ];
  download(zip(files), `${base}-brand-kit.zip`, 'application/zip');
}

export function initBrand(data) {
  icons = data.icons;
  if (!has(state.mark)) state.mark = has('heart') ? 'heart' : icons[0].name;
  $('[data-br="mark"]').value = state.mark;
  for (const input of $$('[data-br]')) {
    input.addEventListener('input', () => {
      const k = input.dataset.br;
      state[k] = input.type === 'range' ? Number(input.value) : input.value;
      const o = $(`[data-br-o="${k}"]`);
      if (o) o.textContent = input.value;
      render();
    });
  }
  for (const seg of $$('[data-br-seg]')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
      state[seg.dataset.brSeg] = b.value;
      render();
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
