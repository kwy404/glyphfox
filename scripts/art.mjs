#!/usr/bin/env node
// Fenn illustrations and the brand banners, built from the icon geometry.
// Writes docs/assets/fenn/*.svg (inlined in the site by the docs build) and
// assets/*.svg, the sources of assets/banner-dark.png, banner-light.png,
// social-preview.png and docs/og.png. The PNGs are screenshots of these SVGs
// at 1x in any headless browser.
//
//   npm run build && npm run art

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gf = await import(pathToFileURL(join(root, 'packages', 'glyphfox', 'dist', 'index.js')).href);
const G = await import(pathToFileURL(join(root, 'packages', 'glyphfox', 'dist', 'core', 'geometry.js')).href);

const ACCENT = '#ff7a1a';
const r2 = (v) => Math.round(v * 100) / 100;

/** Path data of a node, moved and scaled (baked, no transforms). */
function bake(node, s, ox, oy) {
  return G.serializePath(G.transformSegments(G.shapeToSegments(node), [s, 0, 0, s, ox, oy]), 2);
}

/** Fenn's head from the icon set, placed with its top left grid corner at (ox, oy). */
function head(ox, oy, s = 1, { fill = true } = {}) {
  const icon = gf.getIcon('fenn');
  const nodes = gf.parseBody(icon.body);
  let out = '';
  for (const n of nodes) {
    const d = bake(n, s, ox, oy);
    if (n[1].class === 'gf-secondary') {
      if (fill) out += `<path class="fill" d="${d}" fill="${ACCENT}" stroke="none" opacity=".28"/>`;
    } else out += `<path d="${d}"/>`;
  }
  return out;
}

/** Any icon of the set, baked at a position and scale, with a matching stroke. */
function icon(name, ox, oy, s, { strokeWidth = 2, cls = '' } = {}) {
  const ic = gf.getIcon(name);
  if (!ic) return '';
  const nodes = gf.parseBody(ic.body).filter((n) => n[1].class !== 'gf-secondary');
  return `<g class="${cls}" stroke-width="${r2(strokeWidth)}">${nodes.map((n) => `<path d="${bake(n, s, ox, oy)}"/>`).join('')}</g>`;
}

const open = (w, h, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${label}">`;

const art = {};

// Fenn sitting: the icon head on a low poly body, tail curled to the front.
art.sitting = () =>
  open(64, 64, 'Fenn the fox sitting') +
  `<path class="fill" d="M27 17.5L36 24 44 35 46 47 42 60H21L19 44 21 30 24 22.5Z" fill="${ACCENT}" stroke="none" opacity=".16"/>` +
  `<path class="fill" d="M41 59L52 56 59 47 58 37 53 46 45 52Z" fill="${ACCENT}" stroke="none" opacity=".28"/>` +
  head(12, 1) +
  '<path d="M27 17.5L36 24 44 35 46 47 42 60H21L19 44 21 30 24 22.5"/>' +
  '<path d="M21 31l4.5 4 4.5-4"/>' +
  '<path d="M25 41v18.5M30 43v16.5"/>' +
  '<path d="M37 59.5l-1-8.5 7-6"/>' +
  '<path d="M41 59L52 56 59 47 58 37 53 46 45 52"/>' +
  '<path d="M55.5 41.5l3 1.5"/>' +
  '</svg>\n';

// Fenn running to the right with speed lines.
art.running = () =>
  open(96, 64, 'Fenn the fox running') +
  `<path class="fill" d="M64 19L50 21 33 21 25 27 31 36 56 37 66 27Z" fill="${ACCENT}" stroke="none" opacity=".16"/>` +
  `<path class="fill" d="M26 24L13 14 3 16 9 23 24 30Z" fill="${ACCENT}" stroke="none" opacity=".28"/>` +
  head(60, 6) +
  '<path d="M64 19L50 21 33 21 25 27 31 36 56 37 66 27"/>' +
  '<path d="M57 36.5l9 6.5h8"/>' +
  '<path d="M52 37l3 9 6 1"/>' +
  '<path d="M31 35.5l-9 6.5h-8"/>' +
  '<path d="M37 37l-2 9 5 4"/>' +
  '<path d="M26 24L13 14 3 16 9 23 24 30"/>' +
  '<path d="M6.5 15.5l3.5 4"/>' +
  '<path d="M3 30h8M1 37h12M6 44h7" stroke-opacity=".5"/>' +
  '</svg>\n';

// Fenn holding a pencil, drawing a heart on a 24 grid canvas.
art.drawing = () => {
  let grid = '';
  for (let i = 1; i < 8; i++) grid += `<path d="M${58 + i * 4} 14v40M58 ${14 + i * 5}h32" stroke-width=".5" stroke-opacity=".22"/>`;
  return (
    open(96, 64, 'Fenn the fox drawing an icon') +
    `<path class="fill" d="M27 17.5L36 24 44 35 46 47 42 60H21L19 44 21 30 24 22.5Z" fill="${ACCENT}" stroke="none" opacity=".16"/>` +
    head(12, 1) +
    '<path d="M27 17.5L36 24 44 35 46 47 42 60H21L19 44 21 30 24 22.5"/>' +
    '<path d="M21 31l4.5 4 4.5-4"/>' +
    '<path d="M25 41v18.5"/>' +
    '<path d="M26 34l9 2 7-6"/>' +
    '<path d="M37 59.5l-1-8.5 7-6"/>' +
    '<rect x="58" y="14" width="32" height="40" rx="3"/>' +
    grid +
    `<path d="M74 47.5L64.9 38.4A5.76 5.76 0 1 1 74 31.5A5.76 5.76 0 1 1 83.1 38.4" stroke="${ACCENT}" class="accent"/>` +
    `<path d="M83.1 38.4L79 42.5" stroke="${ACCENT}" stroke-dasharray="1 2.5" class="accent"/>` +
    '<path d="M42 30l10-11 4 4-10 11-5 1z"/>' +
    '<path d="M50 21l4 4"/>' +
    '</svg>\n'
  );
};

// Fenn surrounded by orbiting icons.
art.orbit = () => {
  const names = ['star', 'heart', 'bell', 'cloud', 'music', 'camera', 'sparkles', 'gift'].filter((n) => gf.getIcon(n));
  const cx = 48;
  const cy = 48;
  let ring = '';
  names.forEach((n, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / names.length;
    const x = cx + Math.cos(a) * 38;
    const y = cy + Math.sin(a) * 38;
    const s = 0.5;
    ring += `<circle cx="${r2(x)}" cy="${r2(y)}" r="9" stroke-width="1" stroke-opacity=".25"/>`;
    ring += icon(n, x - 12 * s, y - 12 * s, s, { strokeWidth: 1.6, cls: i % 3 === 0 ? 'accent' : '' }).replace('<g class="accent"', `<g class="accent" stroke="${ACCENT}"`);
  });
  return (
    open(96, 96, 'Fenn the fox surrounded by orbiting icons') +
    `<circle cx="48" cy="48" r="38" stroke-width="1" stroke-dasharray="2 4" stroke-opacity=".45"/>` +
    `<circle cx="48" cy="48" r="24" fill="${ACCENT}" stroke="none" opacity=".08" class="fill"/>` +
    `<g stroke-width="2.2">${head(48 - 12 * 1.5, 48 - 12 * 1.5, 1.5)}</g>` +
    ring +
    '</svg>\n'
  );
};

function write(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

for (const [name, fn] of Object.entries(art)) write(join(root, 'docs', 'assets', 'fenn', `${name}.svg`), fn());

// Banners: README (1280 x 400, dark and light), social preview (1280 x 640)
// and the site preview (1200 x 630).
const FIELD = ['home', 'search', 'heart', 'bell', 'camera', 'cloud', 'lock', 'folder', 'star', 'mail', 'user', 'settings', 'music', 'image', 'calendar', 'sun', 'moon', 'zap', 'gift', 'globe', 'compass', 'terminal', 'package', 'sparkles', 'map-pin', 'shopping-cart', 'message-circle', 'download', 'send', 'bookmark', 'shield', 'key', 'wifi', 'battery', 'code', 'database', 'cpu', 'headphones', 'video', 'mic'].filter((n) => gf.getIcon(n));

function banner(w, h, theme) {
  const dark = theme === 'dark';
  const bg = dark ? '#07070a' : '#fbfaf8';
  const fg = dark ? '#f5f5f6' : '#121014';
  const muted = dark ? '#b4b4bd' : '#4b4852';
  const line = dark ? 'rgba(255,255,255,.06)' : 'rgba(17,12,6,.07)';
  const tile = dark ? '#0e0e13' : '#ffffff';
  // The copy block keeps its proportions and the icon field takes the room
  // left on the right, so the text never runs under the tiles.
  const scale = h / 400;
  const ts = Math.min(scale, 1.3);
  const twoLines = scale > 1.2;
  const tx = 64 * ts;
  const textW = (twoLines ? 380 : 560) * ts;
  const cell = 64 * Math.min(scale, 1.5);
  const cols = Math.floor((w - tx - textW - 48 * ts) / cell + 0.05);
  const rows = Math.floor((h - 40 * scale) / cell);
  const gx = w - cols * cell - 40 * scale;
  const gy = (h - rows * cell) / 2;
  let field = '';
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const name = FIELD[k % FIELD.length];
      const accent = (r * 7 + c * 3) % 9 === 0;
      const fade = Math.min(1, 0.25 + c / cols + 0.15);
      const x = gx + c * cell;
      const y = gy + r * cell;
      const variant = ['outline', 'duotone', 'outline', 'solid'][(r + c) % 4];
      const s = (cell * 0.5) / 24;
      const markup = gf.toSvg(name, { variant, weight: 2, secondaryColor: accent ? ACCENT : undefined, color: accent ? ACCENT : fg }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      field += `<rect x="${r2(x + cell * 0.08)}" y="${r2(y + cell * 0.08)}" width="${r2(cell * 0.84)}" height="${r2(cell * 0.84)}" rx="${r2(cell * 0.2)}" fill="${tile}" stroke="${line}" opacity="${r2(fade)}"/>`;
      field += `<g transform="translate(${r2(x + cell * 0.25)} ${r2(y + cell * 0.25)}) scale(${r2(s)})" fill="none" stroke="${accent ? ACCENT : fg}" color="${accent ? ACCENT : fg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="${r2(fade)}">${markup}</g>`;
      k++;
    }
  }
  const lift = twoLines ? 13 * ts : 0;
  const cy = h / 2 - lift;
  const fennSize = 96 * ts;
  const fenn = `<g transform="translate(${r2(tx)} ${r2(cy - 118 * ts)}) scale(${r2(fennSize / 24)})" fill="none" stroke="${ACCENT}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${head(0, 0)}</g>`;
  const font = 'Segoe UI Variable Display, Segoe UI, Inter, system-ui, sans-serif';
  const subText = twoLines
    ? [`${gf.iconNames.length} original icons, variable axes, morph and fusion`, 'React, Vue, Svelte, Angular, web components, Tailwind, CLI']
    : [`${gf.iconNames.length} original icons / React, Vue, Svelte, Angular, web components, Tailwind, CLI`];
  const sub = subText
    .map((t, i) => `<text x="${r2(tx)}" y="${r2(cy + (110 + i * 26) * ts)}" font-family="Segoe UI, Inter, system-ui, sans-serif" font-size="${r2(15 * ts)}" fill="${muted}">${t}</text>`)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="glyphfox: icons that move, morph and fuse">
<defs>
<radialGradient id="glow" cx=".8" cy="0" r=".9"><stop offset="0" stop-color="${ACCENT}" stop-opacity="${dark ? 0.28 : 0.16}"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>
<linearGradient id="word" x1="0" x2="1"><stop offset="0" stop-color="${fg}"/><stop offset=".55" stop-color="${dark ? '#ffb35c' : '#e86a00'}"/><stop offset="1" stop-color="${ACCENT}"/></linearGradient>
<pattern id="grid" width="${r2(32 * scale)}" height="${r2(32 * scale)}" patternUnits="userSpaceOnUse"><path d="M${r2(32 * scale)} 0H0V${r2(32 * scale)}" fill="none" stroke="${line}"/></pattern>
</defs>
<rect width="${w}" height="${h}" fill="${bg}"/>
<rect width="${w}" height="${h}" fill="url(#grid)"/>
<rect width="${w}" height="${h}" fill="url(#glow)"/>
${fenn}
<text x="${r2(tx)}" y="${r2(cy + 30 * ts)}" font-family="${font}" font-size="${r2(76 * ts)}" font-weight="700" letter-spacing="${r2(-3.4 * ts)}" fill="${fg}">glyph<tspan fill="${ACCENT}">fox</tspan></text>
<text x="${r2(tx)}" y="${r2(cy + 76 * ts)}" font-family="${font}" font-size="${r2(26 * ts)}" font-weight="600" letter-spacing="${r2(-0.6 * ts)}" fill="url(#word)">Icons that move, morph and fuse.</text>
${sub}
${field}
</svg>
`;
}

write(join(root, 'assets', 'banner-dark.svg'), banner(1280, 400, 'dark'));
write(join(root, 'assets', 'banner-light.svg'), banner(1280, 400, 'light'));
write(join(root, 'assets', 'social-preview.svg'), banner(1280, 640, 'dark'));
write(join(root, 'assets', 'og.svg'), banner(1200, 630, 'dark'));
console.log(`wrote ${Object.keys(art).length} illustrations and 4 banners`);
