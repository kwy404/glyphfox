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

/**
 * Drawing context for the illustrations: poses are designed in their own
 * coordinates and placed with a scale, an offset and an optional mirror, so
 * one pose serves several scenes. Every stroke keeps the icon weight.
 */
function pen({ s = 1, ox = 0, oy = 0, flip = false, w = 0 } = {}) {
  const X = (x) => ox + s * (flip ? w - x : x);
  const Y = (y) => oy + s * y;
  const d = (pts, close) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(X(x))} ${r2(Y(y))}`).join('') + (close ? 'Z' : '');
  const m = [flip ? -s : s, 0, 0, s, ox + (flip ? s * w : 0), oy];
  const curve = (src) => G.serializePath(G.transformSegments(G.shapeToSegments(['path', { d: src }]), m), 2);
  return {
    X,
    Y,
    path: (src, extra = '') => `<path d="${curve(src)}"${extra}/>`,
    fill: (src, opacity) => `<path class="fill" d="${curve(src)}" fill="${ACCENT}" stroke="none" opacity="${opacity}"/>`,
    line: (pts, extra = '') => `<path d="${d(pts)}"${extra}/>`,
    shape: (pts, extra = '') => `<path d="${d(pts, true)}"${extra}/>`,
    facet: (pts, opacity) => `<path class="fill" d="${d(pts, true)}" fill="${ACCENT}" stroke="none" opacity="${opacity}"/>`,
    shadow: (cx, cy, rx, ry) => `<ellipse class="fill" cx="${r2(X(cx))}" cy="${r2(Y(cy))}" rx="${r2(rx * s)}" ry="${r2(ry * s)}" fill="${ACCENT}" stroke="none" opacity=".1"/>`,
    head: (cx, cy, scale, rot = 0) => headAt(X(cx), Y(cy), scale * s, flip ? -rot : rot),
  };
}

/** Fenn's head from the icon set, centered on (cx, cy), scaled and turned (baked). */
function headAt(cx, cy, k, rot = 0) {
  const a = (rot * Math.PI) / 180;
  const c = Math.cos(a) * k;
  const n = Math.sin(a) * k;
  const m = [c, n, -n, c, cx - (c * 12 - n * 12), cy - (n * 12 + c * 12)];
  let fill = '';
  let lines = '';
  for (const node of gf.parseBody(gf.getIcon('fenn').body)) {
    const d = G.serializePath(G.transformSegments(G.shapeToSegments(node), m), 2);
    if (node[1].class === 'gf-secondary') fill += `<path class="fill" d="${d}" fill="${ACCENT}" stroke="none" opacity=".3"/>`;
    else lines += `<path d="${d}"/>`;
  }
  return fill + lines;
}

/** Any icon of the set, centered on (cx, cy), scaled and turned (baked). */
function iconAt(name, cx, cy, k, rot = 0, extra = '') {
  const a = (rot * Math.PI) / 180;
  const c = Math.cos(a) * k;
  const n = Math.sin(a) * k;
  const m = [c, n, -n, c, cx - (c * 12 - n * 12), cy - (n * 12 + c * 12)];
  const nodes = gf.parseBody(gf.getIcon(name).body).filter((node) => node[1].class !== 'gf-secondary');
  return `<g${extra}>${nodes.map((node) => `<path d="${G.serializePath(G.transformSegments(G.shapeToSegments(node), m), 2)}"/>`).join('')}</g>`;
}

const LIGHT = ' stroke-opacity=".5"';

/**
 * Fenn sitting, facing left, in a 96 by 96 design box: one continuous
 * outline in the curves of the fox icon, a round haunch and the tail curled
 * up the back with a light tip. With `raised`, a front paw is lifted.
 */
function sittingPose(p, { raised = false } = {}) {
  const body = 'M23 25.5C19.5 31 16 42 18 53L19 88H56C68 88 74 78 72 66C70 50 60 36 45 24.6';
  const tail = 'M56 88C74 90 90 82 91 64C92 52 86 44 79 41C82 52 81 66 70 74';
  let out = p.shadow(54, 89.5, 40, 2.4);
  out += p.fill(body + 'L37.5 27.75 33 35.25 28.5 27.75Z', 0.16);
  out += p.fill('M42 88C40 77 46 67 58 63C66 60 70.5 61.5 72 66C74 78 68 88 56 88Z', 0.3);
  out += p.fill('M56 88C74 90 90 82 91 64L90.4 56.5L81.2 51.5C82 60 79 68 70 74C66 80 62 86 56 88Z', 0.3);
  out += p.path(tail);
  out += p.path('M90.4 56.5L81.2 51.5');
  out += p.path(body);
  out += p.path('M27 57V88');
  out += p.path('M42 88C40 77 46 67 58 63');
  out += p.path('M21.5 40l3.5 3 3.5-3', LIGHT);
  if (raised) out += p.path('M21 49C15 51 10 49 7 43');
  out += p.head(33, 21, 1.5);
  return out;
}

// Fenn sitting.
art.sitting = () => open(96, 96, 'Fenn the fox sitting') + sittingPose(pen()) + '</svg>\n';

// Fenn in a flying gallop to the right: the legs reach forward and back in
// pairs, the tail streams behind and the head leans into the run.
art.running = () => {
  const p = pen();
  const body = 'M99 27C96 37 89 45 78 46C69 47 62 44 54 44C45 44 38 43 35 37C32 30 38 23 50 22C63 21 78 22 92 15';
  const tail = 'M36 29C27 21 15 17 3 20C10 28 22 33 35 36';
  let out = open(128, 80, 'Fenn the fox running');
  out += p.shadow(64, 72, 44, 2.4);
  out += p.fill(body + 'Z', 0.16);
  out += p.fill('M36 29C29 23 20 19 12 18.5L9 25C15 30 24 33 35 36Z', 0.3);
  // Far legs behind the body, lighter; near legs in front, every joint drawn.
  out += p.line([[79, 45], [84, 54], [94, 58]], ' stroke-opacity=".5"');
  out += p.line([[50, 44], [43, 54], [31, 58]], ' stroke-opacity=".5"');
  out += p.path(tail);
  out += p.path('M12 18.5L9 25');
  out += p.path(body);
  out += p.path('M52 23.5C56.5 30 56 38 50 44', LIGHT);
  out += p.line([[84, 44], [92, 50.5], [104, 51]]);
  out += p.line([[44, 43.5], [34, 48.5], [22, 47.5]]);
  out += p.path('M0 38H8M3 46H15M1 54H9', ' stroke-opacity=".4"');
  out += p.head(104, 20, 1.5, 10);
  return out + '</svg>\n';
};

// Fenn drawing a heart on a 24 grid board with the pencil from the icon set.
art.drawing = () => {
  const p = pen({ flip: true, w: 96, ox: 0 });
  const bx = 88;
  const by = 12;
  const bw = 36;
  const bh = 46;
  let grid = '';
  for (let i = 1; i < 6; i++) grid += `<path d="M${r2(bx + (i * bw) / 6)} ${by}v${bh}" stroke-width=".6" stroke-opacity=".2"/>`;
  for (let i = 1; i < 8; i++) grid += `<path d="M${bx} ${r2(by + (i * bh) / 8)}h${bw}" stroke-width=".6" stroke-opacity=".2"/>`;
  let out = open(128, 96, 'Fenn the fox drawing an icon');
  out += `<path d="M${bx + 9} ${by + bh}L${bx + 5} 90M${bx + bw - 9} ${by + bh}L${bx + bw - 5} 90"/>`;
  out += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4"/>` + grid;
  out += iconAt('heart', bx + bw / 2, by + bh / 2 + 1, 1.05, 0, ` stroke="${ACCENT}" class="accent"`);
  out += sittingPose(p, { raised: true });
  out += iconAt('pencil', p.X(7) + 5.2, p.Y(43) - 5.2, 0.7, 180);
  return out + '</svg>\n';
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
    ring += `<circle cx="${r2(x)}" cy="${r2(y)}" r="9" stroke-width="1" stroke-opacity=".25"/>`;
    ring += iconAt(n, x, y, 0.5, 0, i % 3 === 0 ? ` stroke="${ACCENT}" class="accent" stroke-width="1.6"` : ' stroke-width="1.6"');
  });
  return (
    open(96, 96, 'Fenn the fox surrounded by orbiting icons') +
    `<circle cx="48" cy="48" r="38" stroke-width="1" stroke-dasharray="2 4" stroke-opacity=".45"/>` +
    `<circle cx="48" cy="48" r="24" fill="${ACCENT}" stroke="none" opacity=".08" class="fill"/>` +
    `<g stroke-width="2.2">${headAt(48, 48, 1.5)}</g>` +
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
