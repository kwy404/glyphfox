// The site's service worker: every precached file exists, its hash matches
// the manifest, hashed names match their content, and every page uses the
// hashed assets.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const docs = resolve('docs');
const sw = readFileSync(join(docs, 'sw.js'), 'utf8');
const precache = JSON.parse(/const PRECACHE = (\[[^\n]*\]);/.exec(sw)[1]);
const version = /const VERSION = 'gf-([0-9a-f]+)';/.exec(sw)[1];
const manifest = JSON.parse(readFileSync(join(docs, 'assets', 'manifest.json'), 'utf8'));
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

describe('service worker', () => {
  it('precaches files that exist, with the hashes of the manifest', () => {
    expect(precache).toContain('./');
    expect(precache).toContain('index.html');
    expect(precache).toContain('data/icons.json');
    for (const p of precache) {
      if (p === './') continue;
      const file = join(docs, p);
      expect(existsSync(file), p).toBe(true);
      expect(sha(readFileSync(file)), p).toBe(manifest.files[p]);
    }
    expect(Object.keys(manifest.files).sort()).toEqual(precache.filter((p) => p !== './').sort());
    expect(version).toBe(manifest.version);
    expect(sha(JSON.stringify(manifest.files)).slice(0, 12)).toBe(version);
  });

  it('names hashed CSS after its content and precaches every bundle', () => {
    for (const p of precache.filter((x) => /\.[0-9a-f]{8}\.css$/.test(x))) {
      const hash = /\.([0-9a-f]{8})\.css$/.exec(p)[1];
      expect(sha(readFileSync(join(docs, p))).slice(0, 8), p).toBe(hash);
    }
    const bundle = readdirSync(join(docs, 'assets', 'js', 'bundle'));
    expect(bundle.length).toBeGreaterThan(3);
    for (const f of bundle) expect(precache, f).toContain(`assets/js/bundle/${f}`);
  });

  it('serves every page from the hashed assets and registers the worker', () => {
    for (const page of ['index.html', 'icons.html', 'studio.html', 'docs.html', 'changelog.html', 'pt-br/index.html']) {
      const html = readFileSync(join(docs, page), 'utf8');
      for (const m of html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) {
        if (m[1].includes('universe/')) continue;
        expect(m[1], `${page} ${m[1]}`).toMatch(/\.[0-9a-f]{8}\.css$/);
      }
      const entry = /<script type="module" src="([^"]+)"/.exec(html);
      expect(entry && entry[1], page).toMatch(/assets\/js\/bundle\/[\w-]+\.[A-Za-z0-9]{8}\.js$/);
      expect(html, page).toContain(`<link rel="modulepreload" href="${entry[1]}">`);
      expect(html, page).toContain("navigator.serviceWorker.register(gfBase+'sw.js'");
    }
  });

  it('caches hashed files first and pages with stale while revalidate, and waits to take over', () => {
    expect(sw).toContain("event.data === 'skip-waiting'");
    expect(sw).toContain('self.skipWaiting()');
    expect(sw).toContain("k.startsWith('gf-') && k !== VERSION");
    expect(sw).not.toMatch(/addEventListener\('install'[^}]*skipWaiting/);
  });
});
