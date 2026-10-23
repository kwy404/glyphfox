export default {
  slug: 'ssr',
  group: 'topics',
  order: 60,
  icon: 'server',
  short: 'Server rendering',
  related: ['nextjs', 'nuxt', 'sveltekit', 'astro'],
  title: 'Server side rendering of SVG icons with glyphfox',
  description: 'Render glyphfox icons on the server: what each package outputs, registering icons used by name, toSvg strings, hydration, motion and the web component.',
  h1: 'Server rendering',
  lead: 'glyphfox icons are plain SVG, so they render on the server like any other markup. The details that matter are where the icon data comes from, what happens at hydration, and which ways of rendering need JavaScript in the browser.',
  sections: [
    {
      id: 'overview',
      h: 'What each package renders on the server',
      blocks: [
        ['p', 'overview.p', 'Every package uses the same renderer, so an icon looks identical whether it was rendered by React on a server, by Vue in the browser or by <code>toSvg</code> in a build script. What differs is whether the server can produce the markup at all.'],
        ['table', 'overview.table', ['Way of rendering', 'Server output', 'JavaScript in the browser'], [
          ['React, Vue, Svelte and Angular components', 'complete <code>svg</code> markup', 'only for morphs and for click and state triggers'],
          ['<code>toSvg</code> and <code>renderToString</code>', 'a complete <code>svg</code> string', 'none'],
          ['The <code>glyph-fox</code> element', 'an empty element', 'required: the icon appears when the element upgrades'],
          ['The <code>data-glyph</code> runtime', 'an empty <code>&lt;i&gt;</code>', 'required: the runtime replaces it'],
          ['Tailwind CSS classes', 'an empty element styled by your CSS', 'none'],
          ['SVG sprite', 'an <code>svg</code> with a <code>use</code> reference', 'none'],
        ]],
        ['p', 'overview.frameworks', 'Framework specifics live in their own guides: the client boundary of the <a href="nextjs.html">Next.js</a> App Router, plugins in <a href="nuxt.html">Nuxt</a>, layouts in <a href="sveltekit.html">SvelteKit</a>, zero JavaScript icons in <a href="astro.html">Astro</a> and <a href="qwik.html">Qwik</a>, and <a href="solid.html">SolidStart</a>. This page covers what they have in common.'],
      ],
    },
    {
      id: 'registry',
      h: 'Icon data on the server',
      blocks: [
        ['p', 'registry.p', 'A component such as <code>HomeIcon</code> carries its own data and registers it when its module runs, so it always renders on the server. Everything that refers to an icon by name looks the name up in a registry instead: <code>Icon name</code>, <code>morphTo</code>, the parts of <code>Fusion</code>, <code>MorphIcon</code>, <code>useMorph</code>, <code>morphStore</code> and the <code>name</code> input of the Angular component.'],
        ['p', 'registry.empty', 'A name that is not registered is loaded on demand with a dynamic import. That load only starts in the browser, after mount, so the server renders a placeholder of the right size and nothing else:'],
        ['code', 'js', 'server output', `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  class="glyphfox glyphfox-empty" aria-hidden="true"></svg>`],
        ['p', 'registry.fix', 'Register the names you use in a module that both the server entry and the client entry import. The data exports such as <code>iconSettings</code> are small and tree shaken like the components.'],
        ['code', 'js', 'icons.js', `import { registerIcons } from 'glyphfox/react'; // or glyphfox/vue, glyphfox/svelte
import { iconSettings, iconFile, iconCloud, iconLock, iconX } from 'glyphfox';

// Names used through Icon, morphTo, Fusion and MorphIcon.
registerIcons([iconSettings, iconFile, iconCloud, iconLock, iconX]);`],
        ['p', 'registry.angular', 'In Angular the same list goes to <code>provideGlyphFox({ icons })</code>, which runs on the server and in the browser; see the <a href="angular.html">Angular guide</a>.'],
      ],
    },
    {
      id: 'mismatch',
      h: 'When the server knows more than the client',
      blocks: [
        ['p', 'mismatch.p', 'The opposite problem is just as real. When the server runs the package without bundling it, as Node does for dependencies that stay external, importing anything from <code>glyphfox/react</code> or <code>glyphfox/vue</code> evaluates the whole entry point, and every one of the 419 icon modules registers itself. <code>&lt;Icon name="settings" /&gt;</code> then renders fully on the server.'],
        ['p', 'mismatch.p2', 'The browser bundle is tree shaken, so <code>settings</code> is not registered there. The first client render produces the empty placeholder, the markup no longer matches the server HTML, and the framework reports a hydration mismatch before the icon loads again. Registering the names explicitly, as above, makes both sides agree.'],
      ],
    },
    {
      id: 'strings',
      h: 'SVG strings with toSvg',
      blocks: [
        ['p', 'strings.p', 'Outside a component framework, <code>toSvg(spec, props)</code> returns the markup as a string. It accepts the full name syntax and every shared prop, has no browser dependencies and does no I/O, so it works in server templates, static site generators, serverless functions and build scripts.'],
        ['code', 'js', 'server.js', `import express from 'express';
import { toSvg } from 'glyphfox';

const app = express();

app.get('/', (req, res) => {
  res.send(\`<!doctype html>
<title>Files</title>
<ul>
  <li>\${toSvg('file+check', { size: 18 })} report.pdf</li>
  <li>\${toSvg('cloud&lock:overlap', { size: 18, title: 'Encrypted backup' })} backup.zip</li>
</ul>\`);
});

app.listen(3000);`],
        ['p', 'strings.cache', 'Rendering is fast, but modifiers, fusions and the solid style do real geometry work. For icons that repeat on every request, cache the strings; the output depends only on the spec and the props.'],
        ['code', 'js', 'icon.js', `import { toSvg } from 'glyphfox';

const cache = new Map();

export function icon(spec, props = {}) {
  const key = spec + JSON.stringify(props);
  let svg = cache.get(key);
  if (svg === undefined) {
    svg = toSvg(spec, props);
    cache.set(key, svg);
  }
  return svg;
}`],
        ['p', 'strings.size', '<code>toSvg</code> from the main entry loads every icon, which is fine for a server process. Where code size matters, such as edge functions with a size limit, use <code>renderToString</code> from <code>glyphfox/core</code> with the data of each icon from <code>glyphfox/icons/NAME</code>; the <a href="tree-shaking.html">tree shaking guide</a> has the numbers.'],
        ['code', 'js', 'edge.js', `import { renderToString } from 'glyphfox/core';
import download from 'glyphfox/icons/download';

export const downloadIcon = renderToString(download, { size: 18 });`],
      ],
    },
    {
      id: 'hydration',
      h: 'Hydration, morphs and living states',
      blocks: [
        ['p', 'hydration.p', 'The server renders the state an icon has at render time. Morphs are computed in the browser: <code>MorphIcon</code>, <code>morphTo</code> and the hooks start animating after hydration, because effects do not run on the server. An icon with <code>morphTo</code>, <code>trigger="state"</code> and <code>active</code> already true renders its target on the server, so a menu that starts open shows the <code>x</code> in the HTML.'],
        ['p', 'hydration.css', 'Living states need no hydration at all. Their CSS is inside the SVG, so a <code>mount</code> animation plays as soon as the browser parses the HTML and a <code>hover</code> animation works before any script loads. A <code>state</code> animation that is already active renders with its <code>gf-on</code> class and plays from the HTML as well. Clicks and later changes of state need the framework, because it toggles the attribute and the class that start them. The <code>prefers-reduced-motion</code> rule travels in the same stylesheet and applies to server markup too.'],
        ['p', 'hydration.ids', 'The markup is deterministic. Animation classes, mask ids and morph classes are hashes of their content, not counters or random values, so the server and the browser produce the same attributes and ids never cause a hydration mismatch.'],
      ],
    },
    {
      id: 'element',
      h: 'The web component on server rendered pages',
      blocks: [
        ['p', 'element.p', 'The <code>glyph-fox</code> element draws into a shadow root when its script runs. It does not use declarative shadow DOM, so server HTML contains an empty element with no size, and the line around it moves when the icon appears. Reserve the space until the element is defined:'],
        ['code', 'css', 'app.css', `glyph-fox:not(:defined) {
  display: inline-block;
  width: 24px;
  height: 24px;
  vertical-align: middle;
}`],
        ['p', 'element.p2', 'For icons above the fold, server render inline SVG with a component or <code>toSvg</code> and keep the element for parts of the page that change on the client. The <a href="web-components.html">web components guide</a> covers the element in detail.'],
      ],
    },
    {
      id: 'email',
      h: 'Emails',
      blocks: [
        ['p', 'email.p', 'Server rendering often ends in an email template, and that is the one place where SVG strings do not help: many email clients do not display inline SVG or SVG images. Use PNG files there. The <a href="../icons.html">icon browser</a> downloads any icon as a PNG at the size you need, with your color and weight.'],
      ],
    },
    {
      id: 'props',
      h: 'toSvg options',
      blocks: [
        ['p', 'props.p', '<code>toSvg</code> and <code>renderToString</code> take the same props as the components, as plain options.'],
        ['props', 'tosvg'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Empty icons in the server HTML', 'An icon rendered by name that was never registered is an empty <code>svg</code> with the class <code>glyphfox-empty</code> on the server. Register the names, or import the component for that icon.'],
          ['Hydration mismatch warnings', 'If the server renders a name the browser does not have yet, the markup differs on the first client render. The usual causes are an unbundled server import of a whole entry point and names that come from data. Register the names in shared code.'],
          ['Icons that depend on the browser', 'An icon chosen from <code>localStorage</code>, the color scheme or the window size cannot match on the server. Render a neutral icon on the server and switch after mount, or read the value from a cookie the server can see.'],
          ['Layout shift from the element', 'An undefined <code>glyph-fox</code> has no size. Reserve the space with <code>:not(:defined)</code> or render inline SVG on the server.'],
          ['Morph targets in production builds', 'In a Vite production build, names that are neither imported nor registered stay empty in the browser, because the on demand loader inside <code>node_modules</code> is not transformed. Server rendering does not hide this; registering the names fixes both sides.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'rsc', q: 'Do the React components work in React Server Components?', a: 'Not directly: they use hooks, so they need a client boundary. In a Server Component you can render <code>toSvg</code> or <code>renderToString</code> output with <code>dangerouslySetInnerHTML</code> and ship no JavaScript for the icon. The <a href="nextjs.html">Next.js guide</a> shows both.' },
    { id: 'empty', q: 'Why is my icon empty in the server HTML?', a: 'It is rendered by name, through <code>Icon</code>, <code>morphTo</code>, <code>Fusion</code> or <code>MorphIcon</code>, and its data was not registered when the server rendered. Call <code>registerIcons</code> with the data exports in a module both entries import.' },
  ],
};
