#!/usr/bin/env node
// Static server for docs/ (the studio site): node scripts/serve.mjs [port]
// Addresses under /glyphfox/ work too, as on GitHub Pages. scripts/e2e.mjs
// imports studioServer() to serve the site to the browser smoke test.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webm': 'video/webm', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.webp': 'image/webp', '.gif': 'image/gif' };

export function studioServer() {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path;
    try {
      path = normalize(decodeURIComponent(url.pathname)).replace(/^[\\/]+/, '');
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (/^glyphfox(?:[\\/]|$)/.test(path)) path = path.slice('glyphfox'.length).replace(/^[\\/]+/, '');
    let file = join(root, path);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      createReadStream(join(root, '404.html')).on('error', () => res.end('not found')).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || process.env.PORT || 4173);
  studioServer().listen(port, '127.0.0.1', () => console.log(`studio on http://localhost:${port}/`));
}
