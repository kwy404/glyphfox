// The local server of the studio site (npm run serve).
import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

function start(port) {
  const child = spawn(process.execPath, [resolve('scripts/serve.mjs'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((ok, fail) => {
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.stdout.on('data', (d) => {
      if (String(d).includes('studio on')) ok(child);
    });
    child.on('exit', (code) => fail(new Error(`serve exited with ${code}: ${err}`)));
  });
}

describe('npm run serve', () => {
  it('serves the site under / and /glyphfox/ with the 404 page for unknown paths', async () => {
    const port = 41000 + Math.floor(Math.random() * 2000);
    const child = await start(port);
    try {
      const get = (p) => fetch(`http://127.0.0.1:${port}${p}`);
      const home = await get('/');
      expect(home.status).toBe(200);
      expect(await home.text()).toContain('glyphfox');
      expect((await get('/glyphfox/icons.html')).status).toBe(200);
      expect((await get('/assets/site.css')).headers.get('content-type')).toContain('text/css');
      const missing = await get('/nope.html');
      expect(missing.status).toBe(404);
      expect(await missing.text()).toContain('404');
      expect((await get('/..%2Fpackage.json')).status).not.toBe(200);
    } finally {
      child.kill();
    }
  });
});
