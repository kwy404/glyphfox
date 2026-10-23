#!/usr/bin/env node
// glyphfox contact sheet: every icon at 24 and 16 px, light and dark.
//
//   node tools/icons/sheet.mjs [--out sheet.html] [--png sheet.png]
//
// Options:
//   --out FILE        where to write the HTML (default: system temp folder)
//   --png FILE        also render a full page PNG with one headless browser
//   --review          review layout: 4x view on the grid, weights 1, 2 and 3
//   --only a,b,c      only these icons
//   --category NAME   only icons whose first category is NAME
//   --from N --count M  a slice of the sorted list (for review batches)
//   --scale N         device scale factor for the PNG (default 1)
//   --width N         page width in CSS pixels (default 1600)
//   --columns N       grid columns (default 10, review 7)
//
// The PNG is rendered with Playwright when it is installed, otherwise with a
// local Edge or Chrome driven over the DevTools protocol (Node 22 or newer).
// The browser is always closed and its temporary profile removed.

import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { CATEGORIES, SECONDARY_CLASS } from './svg.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(here, '..', '..', 'icons');

function option(name, fallback) {
  const k = process.argv.indexOf(`--${name}`);
  return k >= 0 ? process.argv[k + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const review = flag('review');
const outHtml = resolve(option('out', join(tmpdir(), 'glyphfox-sheet', review ? 'review.html' : 'sheet.html')));
const outPng = option('png', null);
const scale = Number(option('scale', '1'));
const width = Number(option('width', '1600'));
const columns = Number(option('columns', review ? '7' : '10'));

function loadIcons() {
  const names = readdirSync(iconsDir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4))
    .sort();
  return names.map((name) => {
    const svg = readFileSync(join(iconsDir, `${name}.svg`), 'utf8');
    let meta = { categories: ['symbols'], tags: [] };
    try {
      meta = JSON.parse(readFileSync(join(iconsDir, `${name}.json`), 'utf8'));
    } catch {
      // The lint reports missing or broken sidecars.
    }
    const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    return { name, body, meta, duotone: body.includes(SECONDARY_CLASS) };
  });
}

function icon(body, size, weight = 2, cls = '') {
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function gridUnderlay() {
  const lines = [];
  for (let k = 1; k < 24; k++) {
    const strong = k % 4 === 0;
    const c = strong ? '#cdd1db' : '#e4e7ee';
    lines.push(`<line x1="${k}" y1="0" x2="${k}" y2="24" stroke="${c}" stroke-width="0.06"/>`);
    lines.push(`<line x1="0" y1="${k}" x2="24" y2="${k}" stroke="${c}" stroke-width="0.06"/>`);
  }
  return `<svg class="underlay" viewBox="0 0 24 24" width="96" height="96">${lines.join('')}<rect x="2" y="2" width="20" height="20" fill="none" stroke="#ee9a74" stroke-width="0.08"/><circle cx="12" cy="12" r="10" fill="none" stroke="#c8d6f5" stroke-width="0.06"/><rect x="3" y="3" width="18" height="18" fill="none" stroke="#c8d6f5" stroke-width="0.06"/></svg>`;
}

function cell(ic) {
  const tag = ic.duotone ? '<span class="duo">duo</span>' : '';
  if (review) {
    const b = ic.body;
    return `<figure class="cell"><div class="big"><div class="frame">${gridUnderlay()}${icon(b, 96, 2, 'top')}</div></div>
<div class="row light">${icon(b, 24, 1)}${icon(b, 24, 2)}${icon(b, 24, 3)}<i></i>${icon(b, 16, 2)}${icon(b, 16, 3)}</div>
<div class="row dark">${icon(b, 24, 2)}${icon(b, 16, 2)}<i></i>${icon(b, 24, 2, 'accent')}</div>
<figcaption>${ic.name}${tag}</figcaption></figure>`;
  }
  return `<figure class="cell"><div class="tiles"><div class="tile light">${icon(ic.body, 24)}${icon(ic.body, 16)}</div><div class="tile dark">${icon(ic.body, 24)}${icon(ic.body, 16)}</div></div><figcaption>${ic.name}${tag}</figcaption></figure>`;
}

function buildHtml(all) {
  let list = all;
  const only = option('only', null);
  if (only) {
    const want = only.split(',').map((s) => s.trim());
    list = want.map((n) => all.find((i) => i.name === n)).filter(Boolean);
  }
  const category = option('category', null);
  if (category) list = list.filter((i) => i.meta.categories[0] === category);
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
    if (duo.length) sections.push({ title: `duotone with a second color (${duo.length})`, items: duo, accent: true });
  }
  const duoCount = all.filter((i) => i.duotone).length;
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
.light{background:#fff;color:var(--ink)}
.dark{background:var(--night);color:var(--night-ink)}
figcaption{font-size:11px;color:var(--muted);padding:4px 8px;border-top:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;justify-content:space-between;gap:6px}
.duo{color:var(--accent);font-weight:600}
.accent-on .gf-secondary,svg.accent .gf-secondary{fill:var(--accent);opacity:.85}
.big{display:flex;align-items:center;justify-content:center;height:112px;background:#fff}
.frame{position:relative;width:96px;height:96px}
.frame svg{position:absolute;left:0;top:0}
.row{display:flex;align-items:center;justify-content:center;gap:9px;height:36px;border-top:1px solid var(--line)}
.row i{width:1px;height:18px;background:#d0d0cc}
.row.dark i{background:#3a3a42}
`;
  const body = sections
    .map((s) => `<section class="${s.accent ? 'accent-on' : ''}"><h2>${s.title}</h2><div class="grid">${s.items.map(cell).join('\n')}</div></section>`)
    .join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>glyphfox icons</title><style>${css}</style></head><body><header><h1>glyphfox</h1><p>${all.length} icons, ${duoCount} duotone, 24 and 16 px, light and dark${review ? ', review at weights 1, 2 and 3' : ''}</p></header>${body}</body></html>`;
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
  } finally {
    if (browser) await browser.close();
  }
  return true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
