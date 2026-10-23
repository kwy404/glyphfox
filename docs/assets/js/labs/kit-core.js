// Brand kit builder: themes the whole set with a seed color, weight,
// corners and style, and lists every file of the kit zip (themed SVG folder,
// sprite, CSS variables, favicon set, app icons and a package.json
// skeleton). No DOM here: rendering and PNG encoding are passed in, so the
// studio and the tests share the same code.

import { toDataUri } from '../../../vendor/glyphfox.js';

export const DEFAULTS = { seed: '#7c5cff', bg: '#14112b', weight: 2, corners: 'round', variant: 'outline', mark: 'star', name: '@acme/icons' };

/** Tile layouts: corner radius and padding as a share of the size. */
export const TILES = {
  favicon: { radius: 0.22, pad: 0.1 },
  touch: { radius: 0, pad: 0.18 },
  app: { radius: 0.22, pad: 0.18 },
  maskable: { radius: 0, pad: 0.26 },
  store: { radius: 0, pad: 0.2 },
  foreground: { radius: 0, pad: 0.3, transparent: true },
};

/** Every PNG of the kit: [path, tile, size]. */
export const PNGS = [
  ['favicon/favicon-16.png', 'favicon', 16],
  ['favicon/favicon-32.png', 'favicon', 32],
  ['favicon/apple-touch-icon.png', 'touch', 180],
  ['favicon/icon-192.png', 'app', 192],
  ['favicon/icon-512.png', 'app', 512],
  ['favicon/icon-maskable-192.png', 'maskable', 192],
  ['favicon/icon-maskable-512.png', 'maskable', 512],
  ['app/app-store-1024.png', 'store', 1024],
  ['app/play-store-512.png', 'store', 512],
  ['app/android-foreground-432.png', 'foreground', 432],
];

/** Sizes packed into favicon.ico. */
export const ICO_SIZES = [16, 32, 48];

const MIT = `MIT License

Copyright (c) 2026 Alexandre Kohler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

/** Mixes two #rrggbb colors (k = 0 keeps the first). */
export function mix(hex, other, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(other);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

/** Brand colors derived from the settings. */
export function palette(s) {
  return { color: s.seed, secondary: mix(s.seed, '#ffffff', 0.35), mark: mix(s.seed, '#ffffff', 0.15), surface: s.bg };
}

/** Render props of the theme. */
export function iconProps(s, extra = {}) {
  const p = palette(s);
  return { weight: s.weight, corners: s.corners, variant: s.variant, color: p.color, secondaryColor: p.secondary, ...extra };
}

/** Folder name of the package: "@acme/icons" becomes "icons". */
export function slug(name) {
  return (
    String(name)
      .replace(/^@[^/]+\//, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'icons'
  );
}

/** Prefix of the CSS variables and classes: the npm scope, else the name. */
export function cssPrefix(name) {
  const scope = /^@([^/]+)\//.exec(String(name));
  return (scope ? scope[1] : slug(name)).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'icons';
}

/** Export name of an icon in index.js: "arrow-up" becomes "iconArrowUp". */
export function ident(name) {
  return 'icon' + name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
}

/** Markup for a standalone file: no class or aria attributes on the root. */
export function standalone(markup) {
  return markup.replace(/^<svg([^>]*)>/, (m, a) => `<svg${a.replace(/\s(?:class|aria-hidden)="[^"]*"/g, '')}>`);
}

/** The mark on a tile of `size` px, as SVG (favicons and app icons). */
export function tileSvg(render, s, kind, size) {
  const tile = TILES[kind];
  const p = palette(s);
  const pad = Math.round(size * tile.pad * 100) / 100;
  const inner = Math.round((size - pad * 2) * 100) / 100;
  const mark = standalone(render(s.mark, iconProps(s, { size: inner, color: tile.transparent ? p.color : p.mark })));
  const back = tile.transparent ? '' : `<rect width="${size}" height="${size}" rx="${Math.round(size * tile.radius * 100) / 100}" fill="${p.surface}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${back}<g transform="translate(${pad} ${pad})">${mark}</g></svg>`;
}

/** ICO file holding PNG images ([{ size, data }]). */
export function ico(images) {
  const head = 6 + images.length * 16;
  const out = new Uint8Array(head + images.reduce((n, i) => n + i.data.length, 0));
  const v = new DataView(out.buffer);
  v.setUint16(2, 1, true);
  v.setUint16(4, images.length, true);
  let offset = head;
  images.forEach(({ size, data }, i) => {
    const o = 6 + i * 16;
    v.setUint8(o, size >= 256 ? 0 : size);
    v.setUint8(o + 1, size >= 256 ? 0 : size);
    v.setUint16(o + 4, 1, true);
    v.setUint16(o + 6, 32, true);
    v.setUint32(o + 8, data.length, true);
    v.setUint32(o + 12, offset, true);
    out.set(data, offset);
    offset += data.length;
  });
  return out;
}

/** Sprite of the themed set; colors read the CSS variables when they exist. */
export function spriteSvg(render, s, names) {
  const pre = cssPrefix(s.name);
  const p = palette(s);
  const symbols = names.map((name) => {
    const markup = standalone(render(name, iconProps(s)));
    const open = /^<svg([^>]*)>/.exec(markup)[1];
    const keep = ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']
      .map((k) => {
        const m = new RegExp(`\\s${k}="([^"]*)"`).exec(open);
        return m ? ` ${k}="${m[1]}"` : '';
      })
      .join('');
    const inner = markup
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, '')
      .replace(/(<g class="gf-secondary[^"]*"[^>]*?) color="([^"]*)"/, `$1 style="color:var(--${pre}-secondary,$2)"`);
    return `<symbol id="${name}"${keep} style="color:var(--${pre}-color,${p.color})">${inner}</symbol>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join('\n')}\n</svg>\n`;
}

/** CSS with the brand variables and one mask class per icon. */
export function cssText(render, s, names) {
  const pre = cssPrefix(s.name);
  const p = palette(s);
  const rules = names.map((name) => {
    const markup = standalone(render(name, iconProps(s, { color: '#000', secondaryColor: '#000' }))).replace(/\scolor="[^"]*"/g, '');
    return `.${pre}-icon-${name}{--${pre}-glyph:url("${toDataUri(markup)}")}`;
  });
  return `/* ${s.name}: ${names.length} icons themed with the glyphfox brand kit (weight ${s.weight}, ${s.corners} corners, ${s.variant}). */
:root {
  --${pre}-color: ${p.color};
  --${pre}-secondary: ${p.secondary};
  --${pre}-mark: ${p.mark};
  --${pre}-surface: ${p.surface};
  --${pre}-icon-size: 1em;
}
.${pre}-icon {
  display: inline-block;
  width: var(--${pre}-icon-size);
  height: var(--${pre}-icon-size);
  flex-shrink: 0;
  vertical-align: -0.125em;
  background-color: var(--${pre}-color);
  -webkit-mask: var(--${pre}-glyph) no-repeat center / 100% 100%;
  mask: var(--${pre}-glyph) no-repeat center / 100% 100%;
}
${rules.join('\n')}
`;
}

function manifest(s) {
  const p = palette(s);
  const icon = (src, size, purpose) => ({ src, sizes: `${size}x${size}`, type: 'image/png', ...(purpose ? { purpose } : {}) });
  return {
    name: s.name,
    icons: [icon('icon-192.png', 192), icon('icon-512.png', 512), icon('icon-maskable-192.png', 192, 'maskable'), icon('icon-maskable-512.png', 512, 'maskable')],
    theme_color: p.color,
    background_color: p.surface,
    display: 'standalone',
  };
}

function packageJson(s, count, version) {
  return {
    name: s.name,
    version: '0.1.0',
    description: `${count} brand icons themed with the glyphfox brand kit`,
    license: 'MIT',
    type: 'module',
    main: './index.js',
    types: './index.d.ts',
    exports: {
      '.': { types: './index.d.ts', default: './index.js' },
      './sprite.svg': './sprite.svg',
      './icons.css': './icons.css',
      './svg/*': './svg/*',
      './favicon/*': './favicon/*',
      './app/*': './app/*',
      './package.json': './package.json',
    },
    files: ['index.js', 'index.d.ts', 'sprite.svg', 'icons.css', 'svg', 'favicon', 'app'],
    sideEffects: ['*.css'],
    keywords: ['icons', 'svg', 'brand', 'glyphfox'],
    glyphfox: { version, seed: s.seed, background: s.bg, weight: s.weight, corners: s.corners, variant: s.variant, mark: s.mark },
  };
}

function readme(s, names) {
  const pre = cssPrefix(s.name);
  const first = names.includes('heart') ? 'heart' : names[0];
  return `# ${s.name}

${names.length} icons from [glyphfox](https://kwy404.github.io/glyphfox/) themed for the brand: color \`${s.seed}\`, weight ${s.weight}, ${s.corners} corners, ${s.variant} style.

## Files

- \`svg/\`: every icon as a themed SVG file
- \`sprite.svg\`: one symbol per icon, \`<svg><use href="sprite.svg#${first}"/></svg>\`
- \`icons.css\`: the brand variables and a mask class per icon
- \`favicon/\`: favicon.ico, favicon.svg, PNG favicons, the apple touch icon, app icons and the web manifest (see head.html)
- \`app/\`: store icons (1024 and 512) and an Android adaptive icon foreground

## Use

\`\`\`js
import { ${ident(first)} } from '${s.name}';

button.innerHTML = ${ident(first)};
\`\`\`

\`\`\`html
<link rel="stylesheet" href="node_modules/${s.name}/icons.css">
<span class="${pre}-icon ${pre}-icon-${first}"></span>
\`\`\`

Override \`--${pre}-color\`, \`--${pre}-secondary\` and \`--${pre}-icon-size\` to adjust the theme in CSS; the sprite reads the same variables.
`;
}

const HEAD = `<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
`;

/**
 * Every file of the kit as [{ name, data }] (data is a string or bytes), in
 * a folder named after the package. `render(name, props)` returns SVG markup
 * and `png(markup, size)` resolves to PNG bytes.
 */
export async function kitFiles({ names, settings, render, png, version = '' }) {
  if (!names.length) throw new Error('the brand kit needs at least one icon');
  const s = { ...DEFAULTS, ...settings };
  if (!names.includes(s.mark)) s.mark = names[0];
  const root = `${slug(s.name)}/`;
  const files = [];
  const add = (name, data) => files.push({ name: root + name, data });
  const themed = names.map((name) => [name, standalone(render(name, iconProps(s)))]);
  add('package.json', JSON.stringify(packageJson(s, names.length, version), null, 2) + '\n');
  add('README.md', readme(s, names));
  add('LICENSE', `The icons in this package come from glyphfox (https://github.com/kwy404/glyphfox) and are used under its license:\n\n${MIT}`);
  add('index.js', `// ${s.name}: brand icons as SVG strings.\n${themed.map(([name, markup]) => `export const ${ident(name)} = ${JSON.stringify(markup)};`).join('\n')}\n`);
  add('index.d.ts', themed.map(([name]) => `export declare const ${ident(name)}: string;`).join('\n') + '\n');
  add('sprite.svg', spriteSvg(render, s, names));
  add('icons.css', cssText(render, s, names));
  for (const [name, markup] of themed) add(`svg/${name}.svg`, markup + '\n');
  const bytes = new Map();
  for (const [path, kind, size] of PNGS) {
    const data = await png(tileSvg(render, s, kind, size), size);
    bytes.set(`${kind}:${size}`, data);
    add(path, data);
  }
  const icoImages = [];
  for (const size of ICO_SIZES) icoImages.push({ size, data: bytes.get(`favicon:${size}`) || (await png(tileSvg(render, s, 'favicon', size), size)) });
  add('favicon/favicon.ico', ico(icoImages));
  add('favicon/favicon.svg', tileSvg(render, s, 'favicon', 32) + '\n');
  add('favicon/manifest.webmanifest', JSON.stringify(manifest(s), null, 2) + '\n');
  add('favicon/head.html', HEAD);
  return files;
}
