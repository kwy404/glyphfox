// glyphfox/lit elements rendered on the server with @lit-labs/ssr.
import { describe, expect, it } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import * as L from 'glyphfox/lit';
import { iconNames } from 'glyphfox';
import { ATTRIBUTES } from '../packages/glyphfox/dist/core/attributes.js';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

const comp = (name) => L[componentName(name)];
L.defineIcons([L.Icon, L.Fusion, L.MorphIcon, ...iconNames.map(comp)]);

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/** Attributes in kebab-case, as written in HTML. */
function attrs(props) {
  return Object.entries(props)
    .map(([k, v]) => {
      const a = ATTRIBUTES[k] || k;
      return v === true ? a : `${a}="${esc(v)}"`;
    })
    .join(' ');
}
async function ssr(tag, props = {}) {
  const out = await collectResult(render(staticHtml`<${unsafeStatic(tag)} ${unsafeStatic(attrs(props))}></${unsafeStatic(tag)}>`));
  return out.replace(/<!--[^>]*-->/g, '');
}
const shadow = (h) => {
  const m = /<svg[\s\S]*<\/svg>/.exec(h);
  return m ? m[0] : '';
};

describe('glyphfox/lit', () => {
  it('exports one element class per icon, named NameIcon, with a gf-name tag', () => {
    for (const n of iconNames) {
      const C = comp(n);
      expect(C.prototype).toBeInstanceOf(L.GlyphElement);
      expect(C.tagName).toBe(`gf-${n}`);
      expect(customElements.get(`gf-${n}`)).toBe(C);
    }
  });

  it('keeps the plain use simple', async () => {
    const out = await ssr('gf-file');
    expect(out).toContain('<template shadowroot="open" shadowrootmode="open">');
    checkDefault(shadow(out).replace(/<style[\s\S]*?<\/style>/, ''));
  });

  for (const c of PROP_CASES) {
    it(`supports the ${c.prop} prop`, async () => c.check(shadow(await ssr(`gf-${c.icon}`, c.props))));
  }

  it('keeps class and style on the host element', async () => {
    const out = await ssr('gf-file', { class: 'extra', style: 'color: red', id: 'x1' });
    expect(out).toMatch(/<gf-file[^>]*class="extra"/);
    expect(out).toMatch(/<gf-file[^>]*style="color: red"/);
    expect(out).toMatch(/<gf-file[^>]*id="x1"/);
  });

  it('renders specs with gf-glyph, fusions with gf-fusion and morphs with gf-morph', async () => {
    expect(await ssr('gf-glyph', { name: 'file+check@tr' })).toContain('glyphfox-file-check-tr');
    expect(await ssr('gf-glyph', { name: 'heart/solid' })).toContain('class="gf-fill"');
    expect(await ssr('gf-fusion', { icons: 'cloud,lock', layout: 'side' })).toContain('glyphfox-cloud-lock-side');
    expect(await ssr('gf-morph', { name: 'menu' })).toContain('glyphfox-menu');
  });

  it('defines elements with a custom prefix', () => {
    const Dot = L.createIcon({ name: 'my-dot', body: '<circle cx="12" cy="12" r="4"/>', tags: [], categories: [] });
    L.defineIcons(Dot, { prefix: 'acme' });
    expect(customElements.get('acme-my-dot')).toBe(Dot);
  });
});
