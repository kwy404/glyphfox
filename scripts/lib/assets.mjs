// Fingerprinted assets of the studio site and its service worker.
//
// GitHub Pages sends a short cache header, so the build gives the site's
// CSS and JS content hashed names (cached forever by the service worker and
// the browser), bundles the page scripts with esbuild (shared chunks, the
// studio tools split into their own chunks and loaded when opened), rewrites
// the references in every page, writes docs/sw.js with the precache list and
// docs/assets/manifest.json with the SHA-256 of every precached file.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const CSS = ['assets/site.css', 'assets/landing.css', 'assets/scenes.css', 'assets/icons.css', 'assets/studio.css', 'assets/docs.css', 'assets/smart.css', 'assets/labs.css', 'assets/js/labs/labs.css'];
// Page scripts: bundle name and its source in docs/assets/js/.
export const ENTRIES = { landing: 'landing.js', scenes: 'scenes/index.js', browser: 'browser.js', studio: 'studio.js', docs: 'docs.js', app: 'app.js', smart: 'smart.js', labs: 'labs/main.js' };
export const PAGES = ['index.html', 'icons.html', 'studio.html', 'docs.html', 'changelog.html'];
const HASH_CSS = /\.[0-9a-f]{8}\.css$/;

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const posix = (p) => p.split('\\').join('/');

/** Builds the hashed CSS and the bundled page scripts. Returns { files, map, imports, outputs }. */
export async function buildAssets(root, { vendor, labs } = {}) {
  const docs = join(root, 'docs');
  // The engine bundles of this build are still in memory: serve them to esbuild.
  const vendorPlugin = {
    name: 'vendor',
    setup(b) {
      if (vendor) b.onLoad({ filter: /vendor[\\/]glyphfox\.js$/ }, () => ({ contents: vendor, loader: 'js' }));
      if (labs) b.onLoad({ filter: /vendor[\\/]glyphfox-labs\.js$/ }, () => ({ contents: labs, loader: 'js' }));
    },
  };
  const files = {};
  const map = {};
  const outputs = [];
  for (const rel of CSS) {
    const src = join(docs, rel);
    if (!existsSync(src)) continue;
    const text = readFileSync(src);
    const hashed = rel.replace(/\.css$/, `.${sha256(text).slice(0, 8)}.css`);
    files[join(docs, hashed)] = text.toString('utf8');
    map[rel] = hashed;
    outputs.push(hashed);
  }
  const esbuild = await import('esbuild');
  const result = await esbuild.build({
    entryPoints: Object.fromEntries(
      Object.entries(ENTRIES)
        .filter(([, file]) => existsSync(join(docs, 'assets', 'js', file)))
        .map(([name, file]) => [name, join(docs, 'assets', 'js', file)]),
    ),
    outdir: join(docs, 'assets', 'js', 'bundle'),
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    write: false,
    metafile: true,
    plugins: [vendorPlugin],
    entryNames: '[name].[hash]',
    chunkNames: 'chunk.[hash]',
    external: ['three', 'three/*', 'https://*'],
    legalComments: 'none',
    logLevel: 'error',
  });
  const imports = {};
  for (const f of result.outputFiles) {
    files[f.path] = f.text;
    outputs.push(posix(relative(docs, f.path)));
  }
  for (const [out, meta] of Object.entries(result.metafile.outputs)) {
    const rel = posix(relative(docs, join(root, out)));
    if (meta.entryPoint) {
      // Keyed by the source (assets/js/labs/main.js) and by the bundle name
      // (assets/js/labs.js), which is what a page built before refers to.
      const source = posix(relative(join(docs, 'assets', 'js'), join(root, meta.entryPoint)));
      map[`assets/js/${source}`] = rel;
      const name = Object.keys(ENTRIES).find((n) => ENTRIES[n] === source);
      if (name) map[`assets/js/${name}.js`] = rel;
    }
    imports[rel] = meta.imports.filter((i) => i.kind === 'import-statement' && !i.external).map((i) => posix(relative(docs, join(root, i.path))));
  }
  return { files, map, imports, outputs };
}

/** Rewrites the CSS and script references of a page to the hashed files and preloads the entries. */
export function withAssets(html, { map, imports }) {
  // Pages in subfolders and language folders refer to assets with ../ (any depth).
  let out = html.replace(/((?:href|src)=")((?:\.\.\/)*|\/glyphfox\/)(assets\/[\w/-]*?)(?:\.[0-9a-f]{8})?\.css"/g, (m, a, prefix, path) => {
    const hit = map[`${path}.css`];
    return hit ? `${a}${prefix}${hit}"` : m;
  });
  out = out.replace(/((?:href|src)=")((?:\.\.\/)*|\/glyphfox\/)assets\/js\/(?:bundle\/|dist\/)?((?:[\w-]+\/)?[\w-]+?)(?:\.[A-Za-z0-9]{8})?\.js"/g, (m, a, prefix, name) => {
    const hit = map[`assets/js/${name}.js`];
    return hit ? `${a}${prefix}${hit}"` : m;
  });
  // Preload the page modules and the chunks they import right away.
  out = out.replace(/\n?<link rel="modulepreload" href="[^"]*">/g, '');
  const list = [];
  let prefix = '';
  for (const entry of out.matchAll(/<script type="module" src="((?:\.\.\/)*|\/glyphfox\/)(assets\/js\/bundle\/[^"]+)"/g)) {
    prefix = entry[1];
    for (const p of [entry[2], ...(imports[entry[2]] || [])]) if (!list.includes(p)) list.push(p);
  }
  if (list.length) out = out.replace('</head>', `${list.map((p) => `<link rel="modulepreload" href="${prefix}${p}">`).join('\n')}\n</head>`);
  return out;
}

/** The service worker with its precache list; `version` changes with any precached file. */
export function serviceWorker(precache, version) {
  return `// glyphfox site service worker (generated by scripts/lib/assets.mjs).
// Hashed CSS and JS: cache first, forever. Pages and data: stale while
// revalidate. A new version waits and takes over on the next navigation.
const VERSION = 'gf-${version}';
const PRECACHE = ${JSON.stringify(precache)};
const HASHED = /\\.[0-9a-f]{8}\\.css$|\\/bundle\\/[^/]+\\.[A-Za-z0-9]{8}\\.js$/;
const SCOPE = new URL('./', self.location).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gf-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (HASHED.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((cache) => cache.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.includes('/data/') || url.pathname.endsWith('/')) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req, { ignoreSearch: true });
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      }),
    );
  }
});
`;
}

/** Lists the precache entries: main pages, hashed assets, data and icons. */
export function precacheList(docs, outputs, written = {}) {
  const exists = (p) => existsSync(join(docs, p)) || written[join(docs, p)] !== undefined;
  const fixed = [...PAGES, ...PAGES.map((p) => `pt-br/${p}`), 'data/icons.json', 'assets/favicon.svg'].filter(exists);
  return [...new Set(['./', ...fixed, ...outputs])];
}

/** Hashed files of earlier builds that are no longer referenced. */
export function staleAssets(docs, outputs) {
  const keep = new Set(outputs.map((p) => join(docs, p)));
  const stale = [];
  // Every folder that holds a hashed stylesheet (assets/, assets/js/labs/).
  for (const dir of new Set(CSS.map((rel) => join(docs, rel, '..')))) {
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (HASH_CSS.test(f) && !keep.has(join(dir, f))) stale.push(join(dir, f));
  }
  const dist = join(docs, 'assets', 'js', 'bundle');
  if (existsSync(dist)) for (const f of readdirSync(dist)) if (!keep.has(join(dist, f))) stale.push(join(dist, f));
  return stale;
}
