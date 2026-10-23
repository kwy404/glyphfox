#!/usr/bin/env node
// glyphfox contact sheets: every icon of a collection, light and dark.
//
//   node tools/icons/sheet.mjs [--collection NAME] [--out sheet.html] [--png sheet.png]
//
// Options:
//   --collection NAME   base (default), display, animated or isometric
//   --out FILE          where to write the HTML (default: system temp folder)
//   --png FILE          also render a full page PNG with one headless browser
//   --review            review layout: large view on the grid, weights 1, 2 and 3
//   --only a,b,c        only these icons
//   --category NAME     only icons whose first category is NAME (comma list allowed)
//   --from N --count M  a slice of the sorted list (for review batches)
//   --scale N           device scale factor for the PNG (default 1)
//   --width N           page width in CSS pixels (default 1600)
//   --columns N         grid columns
//   --slices N          also write the PNG as bands of N CSS pixels (NAME-01.png, ...)
//   --animations        only icons with a designed animation, as frame strips
//
// Base and isometric icons show at 24 and 16 px, display icons at 96 and 48 px,
// and animated icons as a strip of frames sampled across one run (played with
// the Web Animations API from the timeline in the sidecar).
//
// The PNG is rendered with Playwright when it is installed, otherwise with a
// local Edge or Chrome driven over the DevTools protocol (Node 22 or newer).
// The browser is always closed and its temporary profile removed.

import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { CATEGORIES, COLLECTIONS, SECONDARY_CLASS } from './svg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const iconsRoot = resolve(here, '..', '..', 'icons');

function option(name, fallback) {
  const k = process.argv.indexOf(`--${name}`);
  return k >= 0 ? process.argv[k + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const collectionName = option('collection', 'base');
const collection = COLLECTIONS[collectionName];
if (!collection) {
  console.error(`unknown collection "${collectionName}" (use ${Object.keys(COLLECTIONS).join(', ')})`);
  process.exit(1);
}
const GRID = collection.grid;
const iconsDir = collection.dir ? join(iconsRoot, collection.dir) : iconsRoot;
const review = flag('review');
const animationsOnly = flag('animations');
const strips = collectionName === 'animated' || animationsOnly;
const outHtml = resolve(option('out', join(tmpdir(), 'glyphfox-sheet', `${collectionName}${review ? '-review' : ''}.html`)));
const outPng = option('png', null);
const scale = Number(option('scale', '1'));
const width = Number(option('width', '1600'));
const defaultColumns = { base: 10, isometric: 10, display: 4, animated: 4 }[collectionName];
const columns = Number(option('columns', review ? (collectionName === 'display' ? '3' : collectionName === 'animated' || flag('animations') ? '2' : '7') : String(flag('animations') ? 4 : defaultColumns)));
const sliceHeight = Number(option('slices', '0'));
const FRAMES = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];

function loadIcons() {
  const names = existsSync(iconsDir)
    ? readdirSync(iconsDir)
        .filter((f) => f.endsWith('.svg'))
        .map((f) => f.slice(0, -4))
        .sort()
    : [];
  return names.map((name) => {
    const svg = readFileSync(join(iconsDir, `${name}.svg`), 'utf8');
    let meta = { categories: ['symbols'], tags: [] };
    try {
      meta = JSON.parse(readFileSync(join(iconsDir, `${name}.json`), 'utf8'));
    } catch {
      // The lint reports missing or broken sidecars.
    }
    const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    return { name, body, meta, duotone: body.includes(SECONDARY_CLASS), animation: meta.animation || null };
  });
}

function icon(body, size, weight = 2, cls = '', extra = '') {
  return `<svg class="${cls}"${extra} xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${GRID} ${GRID}" fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function gridUnderlay(px) {
  const lines = [];
  const w = (GRID / px) * 0.6;
  for (let k = 1; k < GRID; k++) {
    const strong = k % 4 === 0;
    const c = strong ? '#cdd1db' : '#e4e7ee';
    lines.push(`<line x1="${k}" y1="0" x2="${k}" y2="${GRID}" stroke="${c}" stroke-width="${w}"/>`);
    lines.push(`<line x1="0" y1="${k}" x2="${GRID}" y2="${k}" stroke="${c}" stroke-width="${w}"/>`);
  }
  const p = collection.padding;
  const live = GRID - 2 * p;
  return `<svg class="underlay" viewBox="0 0 ${GRID} ${GRID}" width="${px}" height="${px}">${lines.join('')}<rect x="${p}" y="${p}" width="${live}" height="${live}" fill="none" stroke="#ee9a74" stroke-width="${w * 1.4}"/><circle cx="${GRID / 2}" cy="${GRID / 2}" r="${live / 2}" fill="none" stroke="#c8d6f5" stroke-width="${w}"/></svg>`;
}

function frames(ic, size, weight = 2) {
  return FRAMES.map((t) => icon(ic.body, size, weight, 'anim', ` data-anim="${ic.name}" data-t="${t.toFixed(4)}"`)).join('');
}

function cell(ic) {
  const tag = ic.duotone ? '<span class="duo">duo</span>' : '';
  const b = ic.body;
  if (strips) {
    const big = review ? 64 : 40;
    return `<figure class="cell"><div class="row light strip">${frames(ic, big)}</div><div class="row dark strip">${frames(ic, 24)}</div><figcaption>${ic.name}${tag}<span>${ic.animation ? `${ic.animation.name}, ${ic.animation.duration} ms` : ''}</span></figcaption></figure>`;
  }
  if (collectionName === 'display') {
    if (review) {
      return `<figure class="cell"><div class="big big-display"><div class="frame" style="width:192px;height:192px">${gridUnderlay(192)}${icon(b, 192, 2, 'top')}</div></div>
<div class="row light tall">${icon(b, 48, 1)}${icon(b, 48, 2)}${icon(b, 48, 3)}<i></i>${icon(b, 32, 2)}</div>
<div class="row dark tall">${icon(b, 48, 2)}${icon(b, 32, 2)}<i></i>${icon(b, 48, 2, 'accent')}</div>
<figcaption>${ic.name}${tag}</figcaption></figure>`;
    }
    return `<figure class="cell"><div class="tiles"><div class="tile light tall">${icon(b, 96)}${icon(b, 48)}</div><div class="tile dark tall">${icon(b, 96, 2, 'accent')}${icon(b, 48)}</div></div><figcaption>${ic.name}${tag}</figcaption></figure>`;
  }
  if (review) {
    return `<figure class="cell"><div class="big"><div class="frame">${gridUnderlay(96)}${icon(b, 96, 2, 'top')}</div></div>
<div class="row light">${icon(b, 24, 1)}${icon(b, 24, 2)}${icon(b, 24, 3)}<i></i>${icon(b, 16, 2)}${icon(b, 16, 3)}</div>
<div class="row dark">${icon(b, 24, 2)}${icon(b, 16, 2)}<i></i>${icon(b, 24, 2, 'accent')}</div>
<figcaption>${ic.name}${tag}</figcaption></figure>`;
  }
  return `<figure class="cell"><div class="tiles"><div class="tile light">${icon(b, 24)}${icon(b, 16)}</div><div class="tile dark">${icon(b, 24)}${icon(b, 16)}</div></div><figcaption>${ic.name}${tag}</figcaption></figure>`;
}

// Plays the sidecar timeline with the Web Animations API and freezes each
// frame at its sample time. Runs inside the sheet page.
const PLAYER = `
const data = JSON.parse(document.getElementById('anim-data').textContent);
const NS = 'http://www.w3.org/2000/svg';
for (const svg of document.querySelectorAll('svg[data-anim]')) {
  const a = data[svg.dataset.anim];
  if (!a) continue;
  const t = Math.min(parseFloat(svg.dataset.t), 0.9999) * a.duration;
  const kids = Array.from(svg.children);
  const secondary = kids.find((n) => n.getAttribute('class') === 'gf-secondary');
  const drawn = kids.filter((n) => n !== secondary);
  const o = a.origin || [12, 12];
  const tracks = new Map();
  for (const f of a.frames) {
    const key = f.element === undefined ? 'all' : String(f.element);
    if (!tracks.has(key)) tracks.set(key, []);
    tracks.get(key).push(f);
  }
  for (const [key, frames] of tracks) {
    let node;
    if (key === 'all') {
      node = document.createElementNS(NS, 'g');
      for (const n of kids) node.appendChild(n);
      svg.appendChild(node);
    } else if (key === 'secondary') node = secondary;
    else node = drawn[Number(key)];
    if (!node) continue;
    node.style.transformBox = 'view-box';
    node.style.transformOrigin = o[0] + 'px ' + o[1] + 'px';
    if (frames.some((f) => f.props.strokeDashoffset !== undefined)) {
      node.setAttribute('pathLength', '1');
      node.style.strokeDasharray = '1 1';
    }
    const kfs = frames.map((f) => {
      const k = { offset: f.at, easing: f.easing || a.easing || 'ease' };
      const p = f.props;
      if (p.transform !== undefined) k.transform = p.transform;
      if (p.opacity !== undefined) k.opacity = p.opacity;
      if (p.strokeDashoffset !== undefined) k.strokeDashoffset = p.strokeDashoffset;
      if (p.d !== undefined) k.d = 'path("' + p.d + '")';
      return k;
    });
    const anim = node.animate(kfs, { duration: a.duration, iterations: 1, fill: 'both' });
    anim.pause();
    anim.currentTime = t;
  }
}
`;

function buildHtml(all) {
  let list = animationsOnly ? all.filter((i) => i.animation) : all;
  const only = option('only', null);
  if (only) {
    const want = only.split(',').map((s) => s.trim());
    list = want.map((n) => all.find((i) => i.name === n)).filter(Boolean);
  }
  const category = option('category', null);
  if (category) {
    const cats = category.split(',');
    list = list.filter((i) => cats.includes(i.meta.categories[0]));
  }
  const from = option('from', null);
  if (from !== null) list = list.slice(Number(from), Number(from) + Number(option('count', '35')));

  const sections = [];
  if (review || only) {
    sections.push({ title: `${list.length} icons`, items: list });
  } else {
    for (const c of CATEGORIES) {
      const items = list.filter((i) => i.meta.categories[0] === c);
      if (items.length) sections.push({ title: `${c} (${items.length})`, items });
    }
    const duo = list.filter((i) => i.duotone);
    if (duo.length && collectionName !== 'display' && !strips) sections.push({ title: `duotone with a second color (${duo.length})`, items: duo, accent: true });
  }
  const duoCount = list.filter((i) => i.duotone).length;
  const sizes = strips ? 'six frames across one run of the designed animation' : { base: '24 and 16 px', isometric: '24 and 16 px', display: '96 and 48 px on the 48 grid' }[collectionName];
  const titles = { base: 'glyphfox', isometric: 'glyphfox isometric', display: 'glyphfox display', animated: 'glyphfox animated' };
  const css = `
:root{--bg:#f4f4f1;--card:#fff;--ink:#17171c;--muted:#70707b;--line:#e3e3de;--night:#141418;--night-ink:#ececf1;--accent:#e2632a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.4 "Segoe UI",system-ui,-apple-system,sans-serif;width:${width}px}
header{display:flex;align-items:baseline;gap:18px;padding:28px 36px 6px}
h1{font-size:22px;margin:0;letter-spacing:-.01em}
header p{margin:0;color:var(--muted)}
section{padding:6px 36px 18px}
h2{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:12px 0 10px}
.grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px}
.cell{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}
.tiles{display:grid;grid-template-columns:1fr 1fr}
.tile{display:flex;align-items:center;justify-content:center;gap:12px;height:54px}
.tile.tall{height:124px;gap:18px}
.light{background:#fff;color:var(--ink)}
.dark{background:var(--night);color:var(--night-ink)}
figcaption{font-size:11px;color:var(--muted);padding:4px 8px;border-top:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;justify-content:space-between;gap:6px}
.duo{color:var(--accent);font-weight:600}
.accent-on .gf-secondary,svg.accent .gf-secondary{fill:var(--accent);opacity:.85}
.big{display:flex;align-items:center;justify-content:center;height:112px;background:#fff}
.big-display{height:208px}
.frame{position:relative;width:96px;height:96px}
.frame svg{position:absolute;left:0;top:0}
.row{display:flex;align-items:center;justify-content:center;gap:9px;height:36px;border-top:1px solid var(--line)}
.row.tall{height:64px;gap:14px}
.row.strip{height:auto;padding:10px 6px;gap:6px}
.row i{width:1px;height:18px;background:#d0d0cc}
.row.dark i{background:#3a3a42}
`;
  const body = sections
    .map((s) => `<section class="${s.accent ? 'accent-on' : ''}"><h2>${s.title}</h2><div class="grid">${s.items.map(cell).join('\n')}</div></section>`)
    .join('\n');
  const animData = strips ? Object.fromEntries(list.filter((i) => i.animation).map((i) => [i.name, i.animation])) : null;
  const script = animData ? `<script type="application/json" id="anim-data">${JSON.stringify(animData)}</script><script>${PLAYER}</script>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${titles[collectionName]} icons</title><style>${css}</style></head><body><header><h1>${titles[collectionName]}</h1><p>${list.length} icons, ${duoCount} duotone, ${sizes}, light and dark${review ? ', review at weights 1, 2 and 3' : ''}</p></header>${body}${script}</body></html>`;
}

// ------------------------------------------------------------------ render

function findBrowser() {
  const env = process.env.GLYPHFOX_BROWSER || process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    join(local, 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/microsoft-edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((c) => existsSync(c)) || null;
}

async function renderWithPlaywright(htmlPath, pngPath) {
  let pw;
  try {
    pw = await import('playwright');
  } catch {
    try {
      pw = await import('playwright-core');
    } catch {
      return false;
    }
  }
  let browser;
  try {
    browser = await pw.chromium.launch({ channel: 'msedge' }).catch(() => pw.chromium.launch());
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale });
    await page.goto(pathToFileURL(htmlPath).href);
    await page.screenshot({ path: pngPath, fullPage: true });
    if (sliceHeight) {
      const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
      for (const [k, y, h] of slices(height)) {
        await page.screenshot({ path: slicePath(pngPath, k), clip: { x: 0, y, width, height: h }, fullPage: true });
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  return true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Horizontal bands of the page, for reviewing a tall sheet piece by piece.
function slices(height) {
  const out = [];
  for (let y = 0, k = 1; y < height; y += sliceHeight, k++) out.push([k, y, Math.min(sliceHeight, height - y)]);
  return out;
}

function slicePath(pngPath, k) {
  return pngPath.replace(/\.png$/i, '') + `-${String(k).padStart(2, '0')}.png`;
}

function killTree(child) {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGKILL');
}

async function renderWithDevTools(htmlPath, pngPath) {
  if (typeof WebSocket === 'undefined') throw new Error('rendering needs Node 22 or newer (built-in WebSocket) or the playwright package');
  const exe = findBrowser();
  if (!exe) throw new Error('no Edge or Chrome found; set GLYPHFOX_BROWSER to a Chromium based browser');
  const profile = mkdtempSync(join(tmpdir(), 'glyphfox-browser-'));
  const child = spawn(
    exe,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-sync',
      '--disable-background-networking',
      '--hide-scrollbars',
      '--mute-audio',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  let ws;
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    let lines = null;
    for (let t = 0; t < 200 && !lines; t++) {
      await sleep(100);
      if (existsSync(portFile)) {
        const text = readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
        if (text.length >= 2) lines = text;
      }
    }
    if (!lines) throw new Error('the browser did not start');
    ws = new WebSocket(`ws://127.0.0.1:${lines[0]}${lines[1]}`);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error('could not connect to the browser'));
    });
    let seq = 0;
    const pending = new Map();
    const waiters = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method) {
        for (const w of waiters.splice(0)) {
          if (w.method === msg.method) w.res(msg.params);
          else waiters.push(w);
        }
      }
    };
    const send = (method, params = {}, sessionId) =>
      new Promise((res, rej) => {
        const id = ++seq;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
      });
    const once = (method) => new Promise((res) => waiters.push({ method, res }));

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: scale, mobile: false }, sessionId);
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url: pathToFileURL(htmlPath).href }, sessionId);
    await loaded;
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 0)', awaitPromise: true }, sessionId);
    const { result } = await send('Runtime.evaluate', { expression: 'Math.ceil(document.documentElement.scrollHeight)', returnByValue: true }, sessionId);
    const height = result.value;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false }, sessionId);
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
    writeFileSync(pngPath, Buffer.from(shot.data, 'base64'));
    if (sliceHeight) {
      for (const [k, y, h] of slices(height)) {
        const part = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y, width, height: h, scale: 1 } }, sessionId);
        writeFileSync(slicePath(pngPath, k), Buffer.from(part.data, 'base64'));
      }
    }
    await send('Browser.close').catch(() => {});
  } finally {
    try {
      ws?.close();
    } catch {
      // ignore
    }
    for (let t = 0; t < 50 && child.exitCode === null; t++) await sleep(100);
    killTree(child);
    for (let t = 0; t < 20; t++) {
      try {
        rmSync(profile, { recursive: true, force: true });
        break;
      } catch {
        await sleep(150);
      }
    }
  }
}

const all = loadIcons();
mkdirSync(dirname(outHtml), { recursive: true });
writeFileSync(outHtml, buildHtml(all));
console.log(`sheet: ${outHtml}`);
if (outPng) {
  const png = resolve(outPng);
  mkdirSync(dirname(png), { recursive: true });
  const usedPlaywright = await renderWithPlaywright(outHtml, png);
  if (!usedPlaywright) await renderWithDevTools(outHtml, png);
  console.log(`png: ${png}`);
}
