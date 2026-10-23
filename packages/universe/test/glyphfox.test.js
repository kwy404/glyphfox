// The contract with the glyphfox packages: universe prefixes registered as
// glyphfox icon sources render through the glyphfox components, stroke
// icons keep the weight axis and filled icons are normalized onto the grid.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerIconSource, loadIcon } from 'glyphfox';
import { Icon } from 'glyphfox/react';
import * as U from '../src/node.js';
import { registerUniverse, PREFIXES } from '../src/glyphfox.js';
import { fixtureCatalog, strokeSet, fillSet } from './fixtures.js';

beforeAll(() => {
  U.reset();
  U.configure({ offline: true });
  U.setCatalog(fixtureCatalog());
  U.addSetData('tst', strokeSet);
  U.addSetData('fil', fillSet);
  registerUniverse(registerIconSource, ['tst', 'fil']);
});

describe('glyphfox components', () => {
  it('registers every shipped prefix on import', () => {
    expect(PREFIXES.length).toBeGreaterThan(200);
    expect(PREFIXES).toContain('mdi');
    expect(PREFIXES).toContain('lucide');
  });

  it('renders a stroke icon with the glyphfox weight', async () => {
    expect(await loadIcon('tst:home')).not.toBeNull();
    const html = renderToStaticMarkup(createElement(Icon, { name: 'tst:home', weight: 1.5 }));
    expect(html).toContain('M3 10l9-7l9 7v10H3z');
    expect(html).toContain('stroke-width="1.5"');
  });

  it('renders a filled icon from a 16 unit set on the 24 grid', async () => {
    expect(await loadIcon('fil:star')).not.toBeNull();
    const html = renderToStaticMarkup(createElement(Icon, { name: 'fil:star' }));
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('fill="currentColor"');
  });

  it('resolves to nothing for unknown names', async () => {
    expect(await loadIcon('tst:missing')).toBeNull();
  });
});
