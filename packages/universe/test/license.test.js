// License policy and the license check that fails the build.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { licenseDecision, normalizeSpdx } from '../src/policy.js';
import { checkCatalog, licenseOf, attributionLine } from '../src/license.js';
import { fixtureCatalog } from './fixtures.js';

const lic = (spdx, title = spdx) => ({ name: 'Set', author: { name: 'Someone' }, license: { spdx, title } });

describe('license policy', () => {
  it('allows open licenses by kind', () => {
    expect(licenseDecision('a', lic('MIT'))).toMatchObject({ allowed: true, kind: 'permissive', attribution: false });
    expect(licenseDecision('a', lic('Apache-2.0'))).toMatchObject({ allowed: true, kind: 'permissive' });
    expect(licenseDecision('a', lic('CC0-1.0'))).toMatchObject({ allowed: true, kind: 'public-domain' });
    expect(licenseDecision('a', lic('CC-BY-4.0'))).toMatchObject({ allowed: true, kind: 'attribution', attribution: true });
    expect(licenseDecision('a', lic('CC-BY-SA-4.0'))).toMatchObject({ allowed: true, kind: 'share-alike', attribution: true });
    expect(licenseDecision('a', lic('OFL-1.1'))).toMatchObject({ allowed: true, kind: 'share-alike', attribution: false });
    expect(licenseDecision('a', lic('GPL-3.0'))).toMatchObject({ allowed: true, spdx: 'GPL-3.0-only' });
    expect(normalizeSpdx('GPL-2.0+')).toBe('GPL-2.0-or-later');
  });

  it('denies non commercial, no derivatives, unknown, missing and proprietary sets', () => {
    expect(licenseDecision('a', lic('CC-BY-NC-4.0')).allowed).toBe(false);
    expect(licenseDecision('a', lic('CC-BY-NC-SA-4.0')).allowed).toBe(false);
    expect(licenseDecision('a', lic('CC-BY-ND-4.0')).allowed).toBe(false);
    expect(licenseDecision('a', lic('LicenseRef-Custom')).allowed).toBe(false);
    expect(licenseDecision('a', lic('', 'Free for personal use')).reason).toMatch(/no SPDX id/);
    expect(licenseDecision('a', { name: 'x' }).reason).toMatch(/no license/);
    expect(licenseDecision('sf-symbols', lic('MIT')).allowed).toBe(false);
    expect(licenseDecision('x', { name: 'SF Symbols', author: { name: 'Apple' }, license: { spdx: 'MIT' } }).allowed).toBe(false);
  });
});

describe('license check', () => {
  it('passes a valid catalog and reports every kind of problem', () => {
    const files = new Set(['LICENSES/tst.license', 'LICENSES/fil.license']);
    expect(checkCatalog(fixtureCatalog(), { files })).toEqual([]);
    const bad = fixtureCatalog();
    bad.list[0].license.spdx = 'CC-BY-NC-4.0';
    bad.list[1].license.file = 'LICENSES/missing.license';
    bad.list.push({ prefix: 'nolic', name: 'No license', author: { name: 'x' }, license: {} });
    const problems = checkCatalog(bad, { files });
    expect(problems).toContain('tst: CC-BY-NC-4.0 does not allow commercial use or modification');
    expect(problems).toContain('fil: LICENSES/missing.license is missing');
    expect(problems).toContain('nolic: missing license');
    expect(checkCatalog({})).toEqual(['the catalog has no set list']);
  });

  it('attaches the license record and the attribution line', () => {
    const set = fixtureCatalog().list[1];
    expect(licenseOf(set)).toMatchObject({ spdx: 'CC-BY-4.0', attribution: true, set: 'fil', author: 'Fill Brands Authors' });
    expect(attributionLine(set, { modified: true })).toMatch(/licensed under CC-BY-4.0 \(https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/\), modified\.$/);
  });
});

const root = fileURLToPath(new URL('../../../', import.meta.url));
const catalogFile = new URL('../dist/catalog.json', import.meta.url);
describe.skipIf(!existsSync(catalogFile))('the shipped catalog', () => {
  it('has only redistributable sets, every license text and the notice', () => {
    const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
    const files = new Set(readdirSync(new URL('LICENSES/', `file:///${root.replace(/\\/g, '/')}`)).map((f) => `LICENSES/${f}`));
    expect(checkCatalog(catalog, { files })).toEqual([]);
    expect(catalog.total).toBeGreaterThan(200000);
    expect(catalog.list.map((s) => s.prefix)).not.toContain('cbi');
    const r = spawnSync(process.execPath, ['scripts/universe/check-licenses.mjs'], { cwd: root, encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });
});
