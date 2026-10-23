#!/usr/bin/env node
// Local preview of the universe page: serves docs/ like scripts/serve.mjs
// and the built package data (packages/universe/dist) at /universe-data/,
// which the page uses on localhost instead of jsDelivr.
//
//   node scripts/universe/serve.mjs [port]

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docs = join(root, 'docs');
const data = join(root, 'packages', 'universe', 'dist');
const port = Number(process.argv[2] || process.env.PORT || 4175);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8' };

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  if (path.startsWith('glyphfox')) path = path.slice('glyphfox'.length).replace(/^[/\\]+/, '');
  let base = docs;
  if (path.startsWith('universe-data')) {
    base = data;
    path = path.slice('universe-data'.length).replace(/^[/\\]+/, '');
  }
  let file = join(base, path);
  if (!file.startsWith(base)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`universe preview on http://localhost:${port}/universe.html`));
