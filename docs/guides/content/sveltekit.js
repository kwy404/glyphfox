export default {
  slug: 'sveltekit',
  group: 'frameworks',
  order: 70,
  icon: 'rocket',
  short: 'SvelteKit',
  related: ['svelte', 'ssr', 'tree-shaking'],
  title: 'Icons in SvelteKit with glyphfox: SSR and prerendering',
  description: 'Server render and prerender glyphfox icons in SvelteKit: setup, a root layout for icon names, SVG endpoints, adapter-static, hydration and common pitfalls.',
  h1: 'Icons in SvelteKit',
  lead: '<code>glyphfox/svelte</code> renders on the server, so SvelteKit pages ship real SVG in the HTML, whether a page is rendered per request or prerendered at build time.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['code', 'sh', 'terminal', `npm install glyphfox`],
        ['p', 'install.p', 'There is nothing to configure. <code>glyphfox/svelte</code> is exposed under the <code>svelte</code> export condition, so vite-plugin-svelte, which every SvelteKit project uses, recognizes it as a Svelte library and compiles its components for the server and the browser. The components need Svelte 5; the <a href="svelte.html">Svelte guide</a> covers the components and props in detail.'],
      ],
    },
    {
      id: 'layout',
      h: 'Register icon names in the root layout',
      blocks: [
        ['p', 'layout.p', 'Components such as <code>HomeIcon</code> register their own data. Names that only appear in strings, in <code>Icon</code>, <code>Fusion</code>, <code>MorphIcon</code> or <code>morphTo</code>, need <code>registerIcons</code>, and the best place is a module the root layout imports: it runs on the server before the first render and in the browser before hydration.'],
        ['code', 'js', 'src/lib/icons.js', `import { registerIcons } from 'glyphfox/svelte';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';
import moon from 'glyphfox/icons/moon';
import file from 'glyphfox/icons/file';

registerIcons([menu, x, moon, file]);`],
        ['code', 'js', 'src/routes/+layout.svelte', `<script>
  import '$lib/icons.js';
  import { MorphIcon } from 'glyphfox/svelte';

  let { children } = $props();
  let open = $state(false);
</script>

<header>
  <button type="button" aria-label="Menu" aria-expanded={open} onclick={() => (open = !open)}>
    <MorphIcon name={open ? 'x' : 'menu'} />
  </button>
</header>

{@render children()}`],
        ['p', 'layout.shared', 'The registry is module state. On the server it is shared by every request, which is safe because icon data never changes, and it is filled once when the module first loads.'],
      ],
    },
    {
      id: 'ssr',
      h: 'What the server renders',
      blocks: [
        ['p', 'ssr.p', 'Icon components produce their full svg during server rendering. Living state animations are a stylesheet inside the svg, so a spinner already turns in the server HTML unless the visitor prefers reduced motion. Morphs and the click and hover triggers start after hydration, because <code>$effect</code> does not run on the server.'],
        ['p', 'ssr.state', 'For a morph whose end depends on data, use <code>trigger="state"</code> with <code>active</code>. The server renders the right end of the morph, and the animation only plays when the value changes in the browser. With the default trigger (mount) the server renders the starting icon and the morph plays on every page load.'],
        ['code', 'js', 'src/routes/+layout.server.js', `export function load({ cookies }) {
  return { theme: cookies.get('theme') ?? 'light' };
}`],
        ['code', 'js', 'src/lib/ThemeToggle.svelte', `<script>
  import { SunIcon } from 'glyphfox/svelte';

  let { theme } = $props();
  let dark = $state(theme === 'dark');

  function toggle() {
    dark = !dark;
    document.cookie = \`theme=\${dark ? 'dark' : 'light'}; path=/; max-age=31536000\`;
  }
</script>

<button type="button" aria-label="Dark theme" aria-pressed={dark} onclick={toggle}>
  <SunIcon morphTo="moon" trigger="state" active={dark} />
</button>`],
        ['p', 'ssr.cookie', 'Reading the theme from a cookie in a server load function gives the server and the browser the same starting value. Render it from the root layout with <code>&lt;ThemeToggle theme={data.theme} /&gt;</code>; <code>moon</code> is registered in <code>src/lib/icons.js</code>.'],
      ],
    },
    {
      id: 'endpoint',
      h: 'SVG files from an endpoint',
      blocks: [
        ['p', 'endpoint.p', '<code>toSvg</code> from the main <code>glyphfox</code> entry renders any spec to a string, which makes a <code>+server.js</code> route that serves icons as files: a favicon, an image for an email template, or a link preview. With <code>entries</code>, the files are prerendered at build time.'],
        ['code', 'js', 'src/routes/icons/[name].svg/+server.js', `import { error } from '@sveltejs/kit';
import { iconNames, toSvg } from 'glyphfox';

export const prerender = true;

export function entries() {
  return ['fox', 'home', 'search'].map((name) => ({ name }));
}

export function GET({ params }) {
  if (!iconNames.includes(params.name)) error(404, 'Unknown icon');
  const svg = toSvg(params.name, { size: 32, color: '#ff7a1a', variant: 'duotone' });
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml' } });
}`],
        ['code', 'js', 'src/app.html', `<link rel="icon" href="/icons/fox.svg" type="image/svg+xml" />`],
        ['p', 'endpoint.color', 'A standalone SVG file has no parent to inherit a color from, so pass <code>color</code>: it is written on the svg and the <code>currentColor</code> strokes pick it up. Return <code>iconNames.map((name) => ({ name }))</code> from <code>entries</code> to prerender every icon.'],
        ['p', 'endpoint.server', 'The main entry includes the data of every icon. That is fine in <code>+server.js</code> and <code>+page.server.js</code> files, which never reach the browser; imported into a component, <code>toSvg</code> would ship the whole set to the client.'],
      ],
    },
    {
      id: 'html',
      h: 'Server only markup with {@html}',
      blocks: [
        ['p', 'html.p', 'A load function in <code>+page.server.js</code> can return rendered strings that the page inserts with <code>{@html}</code>. The browser receives the markup in the HTML and in the serialized page data, but no icon code.'],
        ['code', 'js', 'src/routes/+page.server.js', `import { toSvg } from 'glyphfox';

const features = [
  { icon: 'zap', title: 'Fast' },
  { icon: 'shield-check', title: 'Safe' },
  { icon: 'accessibility', title: 'Accessible' },
];

export function load() {
  return {
    features: features.map((f) => ({ ...f, svg: toSvg(f.icon, { size: 28, weight: 1.5 }) })),
  };
}`],
        ['code', 'js', 'src/routes/+page.svelte', `<script>
  let { data } = $props();
</script>

<ul class="features">
  {#each data.features as feature (feature.icon)}
    <li>{@html feature.svg} {feature.title}</li>
  {/each}
</ul>`],
        ['p', 'html.safe', '<code>{@html}</code> is safe here because the strings come from your own server code, never from user input. Without a <code>title</code> the icons are rendered with <code>aria-hidden</code>, which is right next to a visible label.'],
      ],
    },
    {
      id: 'static',
      h: 'adapter-static and prerendering',
      blocks: [
        ['p', 'static.p', 'With adapter-static, or <code>export const prerender = true</code> on any route, pages are rendered at build time and the icons are written into the HTML files. The rules of server rendering apply at build time too: a name the build cannot resolve is written as an empty svg.'],
        ['code', 'js', 'svelte.config.js', `import adapter from '@sveltejs/adapter-static';

export default {
  kit: { adapter: adapter() },
};`],
        ['code', 'js', 'src/routes/+layout.js', `export const prerender = true;`],
        ['p', 'static.csr', 'For pages that need no JavaScript, add <code>export const csr = false</code>: the icons stay static SVG and no component code is sent. CSS animations still play, while morphs and click or hover triggers, which need JavaScript, do nothing.'],
      ],
    },
    {
      id: 'production',
      h: 'Names in production builds',
      blocks: [
        ['p', 'production.p', 'In development Vite pre-bundles the package, so any name seems to work. In a production build Vite does not bundle the on demand loader that glyphfox keeps in <code>node_modules</code>, because it skips dynamic imports with variables in dependencies, and unregistered names stay empty. Register them, or let Vite bundle the loader, which then emits one small chunk per icon:'],
        ['code', 'js', 'vite.config.js', `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    dynamicImportVarsOptions: { exclude: [/node_modules\\/(?!glyphfox\\/)/] },
  },
});`],
        ['p', 'production.server', 'Those chunks only help in the browser after hydration. The server render does not wait for them, so registration remains the way to get an icon into the HTML.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'SvelteKit uses the components of <code>glyphfox/svelte</code>, so the props are the shared ones, in camelCase.'],
        ['props', 'svelte'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Registering in onMount or in browser only code', 'Code in <code>onMount</code>, in <code>$effect</code> or behind <code>if (browser)</code> runs after the server has rendered. The HTML then has empty icons that pop in after hydration. Register in a module that the root layout imports.'],
          ['A different icon on the server and in the browser', 'The svg body is inserted with <code>{@html}</code>, and Svelte keeps the server markup of an <code>{@html}</code> block when the first client render differs (it warns with <code>hydration_html_changed</code> in development). An icon chosen from <code>localStorage</code> or <code>window</code> can therefore stay wrong until the next change. Derive the first value from data the server also has, such as a cookie read in a load function.'],
          ['toSvg in a shared component', 'Importing <code>toSvg</code> from <code>glyphfox</code> in a <code>.svelte</code> file pulls the data of every icon into the client bundle. Keep it in server files, or use the components.'],
          ['A prerendered morph in the wrong state', 'With the mount trigger, prerendered HTML shows the starting icon and the morph plays after hydration. Use <code>trigger="state"</code> for anything that should be prerendered in its end state.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'all-svg', q: 'Can I prerender every icon as an SVG file?', a: 'Yes. Return <code>iconNames.map((name) => ({ name }))</code> from <code>entries</code> in the endpoint above, and the build writes one file per icon under <code>/icons/</code>. Each file is a few hundred bytes.' },
    { id: 'csr-false', q: 'Do icons work on pages with csr = false?', a: 'Yes. The server writes the svg into the HTML, and living state animations still play because they are CSS inside the svg. Morphs and the click and hover triggers need JavaScript, so they stay on their first frame.' },
  ],
};
