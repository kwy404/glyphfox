#!/usr/bin/env node
// Browser smoke test of the studio site: npm run e2e
//
// Serves docs/ the way GitHub Pages does (under /glyphfox/) and opens every
// main page in the five language folders with Playwright. A page fails on a
// console error, an uncaught error, a failed request to the site, a failed
// response from jsDelivr or a request to any other host. The home page must
// have the hero and the film, the Icons page must render icon cells, and
// picking a set (or opening icons.html?set=tabler) must render the icons of
// that set. Then the same pages load at phone size (390 by 844 pixels) and
// fail when the page scrolls sideways or the set picker does not fit.
//
// Locally it drives the installed Edge (channel msedge). In CI it uses the
// Chromium of playwright-core: npx playwright-core install chromium.
//
//   node scripts/e2e.mjs [--only=text,text] [--desktop | --phone]
//   --only=icons,studio  pages whose address contains one of the texts
//   E2E_CHANNEL=chrome   another installed browser, chromium for the bundled one
//   E2E_SHOTS=dir        save a screenshot of every phone page in dir
//   PLAYWRIGHT_CORE=dir  a playwright-core folder, when the package is not installed

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root as docs, studioServer } from './serve.mjs';

const PAGES = ['index.html', 'icons.html', 'icons.html?set=tabler', 'studio.html', 'docs.html', 'changelog.html', 'universe.html', 'labs.html', 'native.html', 'smart.html', 'guides/index.html'];
const SET = 'tabler';
const CDN = 'cdn.jsdelivr.net';
// On localhost the universe scripts look for a local copy of the package data
// (scripts/universe/serve.mjs) before they use jsDelivr: that 404 is expected.
const PROBE = /\/universe-data\/catalog\.json$/;
const WORKERS = 3;
const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) || '').slice('--only='.length).split(',').filter(Boolean);
const modes = args.includes('--phone') ? ['phone'] : args.includes('--desktop') ? ['desktop'] : ['desktop', 'phone'];
const shots = process.env.E2E_SHOTS || '';
const langs = JSON.parse(readFileSync(join(docs, 'i18n', 'languages.json'), 'utf8'));

async function loadPlaywright() {
  try {
    return await import('playwright-core');
  } catch (err) {
    const dir = process.env.PLAYWRIGHT_CORE;
    if (dir) return import(pathToFileURL(join(dir, 'index.mjs')).href);
    throw new Error(`playwright-core is not installed (${err.code || err.message}): run npm ci, or set PLAYWRIGHT_CORE to a playwright-core folder`);
  }
}

// Every page of the list in every language folder that has it. A page that is
// only in English (no data-i18n strings yet) is opened once, at the root.
function targets() {
  const out = [];
  const skipped = [];
  for (const lang of langs) {
    for (const page of PAGES) {
      const path = (lang.dir ? `${lang.dir}/` : '') + page;
      if (only.length && !only.some((o) => path.includes(o))) continue;
      if (!existsSync(join(docs, lang.dir, page.split('?')[0]))) {
        if (!lang.dir) throw new Error(`docs/${page} does not exist`);
        skipped.push(path);
        continue;
      }
      out.push({ path, page });
    }
  }
  return { out, skipped };
}

// Waits for a condition in the page, with a readable failure.
async function until(page, what, fn, arg, timeout = 20000) {
  try {
    await page.waitForFunction(fn, arg, { timeout });
  } catch {
    throw new Error(`${what} did not appear in ${timeout / 1000} s`);
  }
}

const setCells = (prefix) =>
  [...document.querySelectorAll('[data-slayer] .set-cell:not([hidden])')].filter((b) => (b.dataset.key || '').startsWith(`${prefix}:`) && b.querySelector('svg')).length > 0;

const CHECKS = {
  'index.html': async (page) => {
    if (!(await page.locator('section.hero h1').isVisible())) throw new Error('the hero is missing');
    if (!(await page.locator('section#film video source[src]').count())) throw new Error('the film section is missing');
  },
  'icons.html': async (page, mode) => {
    await until(page, 'glyphfox icon cells', () => document.querySelectorAll('[data-grid] .icon-cell svg').length > 20);
    await page.locator('[data-set-toggle]').click();
    const item = page.locator(`[data-set-list] [data-pick="${SET}"]`);
    await item.waitFor({ state: 'visible', timeout: 20000 });
    if (mode === 'phone') {
      const box = await page.locator('[data-set-panel]').boundingBox();
      const width = VIEWPORTS.phone.viewport.width;
      if (!box || box.x < 0 || box.x + box.width > width + 1) throw new Error(`the set picker does not fit the screen: ${box ? `${Math.round(box.x)} to ${Math.round(box.x + box.width)} px` : 'not shown'}`);
    }
    await item.click();
    await until(page, `the icons of the ${SET} set after picking it`, setCells, SET);
    if (!page.url().includes(`set=${SET}`)) throw new Error(`the address does not keep the set: ${page.url()}`);
  },
  'icons.html?set=tabler': async (page) => {
    await until(page, `the icons of the ${SET} set`, setCells, SET);
  },
  'universe.html': async (page, mode) => {
    await until(page, 'the universe icons', () => document.querySelectorAll('[data-layer] .uv-cell svg').length > 0);
    await page.locator('[data-view-link="gallery"]').first().click();
    await until(page, 'the sets gallery', () => document.querySelectorAll('[data-gx-grid] .gx-card').length > 0);
    if (mode !== 'phone') return;
    const wide = await page.evaluate(sideways);
    if (wide) throw new Error(`the sets gallery scrolls sideways: ${wide.out.join(', ')}`);
    await page.locator('[data-view-link="browse"]').first().click();
    // In one column the side and detail panels grow with their content.
    const cut = await page.evaluate(() => ['.uv-side', '.uv-detail'].filter((s) => {
      const el = document.querySelector(s);
      return el && el.scrollHeight > el.clientHeight + 1;
    }));
    if (cut.length) throw new Error(`cut at phone size: ${cut.join(', ')}`);
  },
};

// The elements that stick out of the screen on the right, outside boxes that
// scroll or clip their content: the cause of a page that scrolls sideways.
function sideways() {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  if (sw <= vw + 1) return null;
  const name = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + [...el.classList].slice(0, 3).map((c) => `.${c}`).join('');
  const out = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > vw + 1;
  };
  const found = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!out(el) || [...el.children].some(out)) continue;
    let clipped = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') {
        clipped = true;
        break;
      }
    }
    if (!clipped) found.push(`${name(el)} in ${el.parentElement ? name(el.parentElement) : 'body'} to ${Math.round(el.getBoundingClientRect().right)} px`);
  }
  return { sw, vw, out: found.slice(0, 5) };
}

async function check(context, base, { path, page: name }, mode) {
  const page = await context.newPage();
  const origin = new URL(base).origin;
  const problems = [];
  let live = true;
  const short = (u) => (u.startsWith(origin) ? u.slice(origin.length) : u);
  const note = (text) => live && problems.push(text);
  page.on('pageerror', (err) => note(`uncaught: ${err.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const at = m.location();
    if (at && PROBE.test(at.url || '')) return;
    note(`console: ${m.text()}${at && at.url ? ` (${short(at.url)}:${at.lineNumber})` : ''}`);
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (/^https?:$/.test(u.protocol) && u.origin !== origin && u.hostname !== CDN) note(`request to another host: ${r.url()}`);
  });
  page.on('requestfailed', (r) => {
    const u = new URL(r.url());
    if ((u.origin === origin || u.hostname === CDN) && !PROBE.test(u.pathname)) note(`request failed: ${short(r.url())} ${(r.failure() || {}).errorText || ''}`);
  });
  page.on('response', (r) => {
    const u = new URL(r.url());
    if ((u.origin === origin || u.hostname === CDN) && r.status() >= 400 && !PROBE.test(u.pathname)) note(`HTTP ${r.status()}: ${short(r.url())}`);
  });
  const started = Date.now();
  try {
    await page.goto(base + path, { waitUntil: 'load', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    if (CHECKS[name]) await CHECKS[name](page, mode);
    if (mode === 'phone') {
      const wide = await page.evaluate(sideways);
      if (wide) problems.push(`scrolls sideways: ${wide.sw} px wide on a ${wide.vw} px screen, ${wide.out.join(', ') || 'no single element'}`);
      if (shots) await page.screenshot({ path: join(shots, `${path.replace(/[^a-z0-9.-]+/gi, '_')}.png`) });
    }
    // Errors thrown late by timers and lazy chunks.
    await page.waitForTimeout(300);
  } catch (err) {
    problems.push(String(err.message || err).split('\n')[0]);
  } finally {
    live = false;
    await page.close().catch(() => {});
  }
  return { problems, ms: Date.now() - started };
}

async function pool(items, size, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

const t0 = Date.now();
const { out: pages, skipped } = targets();
if (!pages.length) {
  console.error(`e2e: no page matches --only=${only}`);
  process.exit(1);
}
if (shots) mkdirSync(shots, { recursive: true });

const server = studioServer();
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/glyphfox/`;
let browser;
const stop = async () => {
  if (browser) await browser.close().catch(() => {});
  browser = null;
  server.close();
};
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => stop().then(() => process.exit(130)));
const watchdog = setTimeout(() => {
  console.error('e2e: still running after 6 minutes, stopping');
  stop().then(() => process.exit(1));
}, 6 * 60 * 1000);

let failed = 0;
let flaky = 0;
try {
  const { chromium } = await loadPlaywright();
  const channel = process.env.E2E_CHANNEL || (process.env.CI ? 'chromium' : 'msedge');
  browser = await chromium.launch(channel === 'chromium' ? {} : { channel });
  console.log(`e2e: ${pages.length} pages, ${modes.join(' and ')}, ${channel} ${browser.version()}, ${base}`);
  if (skipped.length) console.log(`e2e: only in English, skipped in the language folders: ${[...new Set(skipped.map((p) => p.split('/').slice(1).join('/')))].join(', ')}`);
  for (const mode of modes) {
    const context = await browser.newContext({ ...VIEWPORTS[mode], locale: 'en-US', serviceWorkers: 'block' });
    context.setDefaultTimeout(15000);
    await pool(pages, WORKERS, async (target) => {
      let result = await check(context, base, target, mode);
      // One more try, so a slow answer from the CDN does not fail the run.
      if (result.problems.length) {
        const again = await check(context, base, target, mode);
        if (!again.problems.length) {
          flaky++;
          console.log(`flaky ${mode} ${target.path}: ${result.problems[0]}`);
        }
        result = again;
      }
      const secs = (result.ms / 1000).toFixed(1);
      if (!result.problems.length) {
        console.log(`ok    ${mode.padEnd(7)} ${target.path} (${secs} s)`);
        return;
      }
      failed++;
      console.log(`FAIL  ${mode.padEnd(7)} ${target.path} (${secs} s)`);
      for (const p of [...new Set(result.problems)].slice(0, 8)) console.log(`        ${p}`);
    });
    await context.close();
  }
} catch (err) {
  failed++;
  console.error(`e2e: ${err.message}`);
} finally {
  clearTimeout(watchdog);
  await stop();
}

const total = pages.length * modes.length;
console.log(`e2e: ${total - failed} of ${total} passed${flaky ? `, ${flaky} on the second try` : ''} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(failed ? 1 : 0);
