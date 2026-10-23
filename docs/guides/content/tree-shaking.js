export default {
  slug: 'tree-shaking',
  group: 'topics',
  order: 40,
  icon: 'tree-pine',
  short: 'Tree shaking',
  related: ['react', 'svg-sprite', 'ssr', 'html-cdn'],
  title: 'Tree shaking icons with glyphfox: what ships and why',
  description: 'How glyphfox icons tree shake in Vite, webpack, Rollup and esbuild: measured bundle sizes, what defeats tree shaking, icons loaded by name and fixed subsets.',
  h1: 'Tree shaking icons',
  lead: 'Import the icons you use and the rest of the set stays out of your bundle. This guide shows what makes that work, what quietly breaks it, and what the numbers look like in a real build.',
  sections: [
    {
      id: 'setup',
      h: 'What you need',
      blocks: [
        ['p', 'setup.p', 'Any bundler that tree shakes ES modules: Vite, Rollup, webpack 5 or Rspack in production mode, Parcel, or esbuild with bundling and code splitting turned on. There is nothing to configure. Use named imports from the ESM entry points:'],
        ['code', 'js', 'App.jsx', `import { HomeIcon, SearchIcon } from 'glyphfox/react';
import { iconHome } from 'glyphfox';            // icon data, also tree shaken
import { renderToString } from 'glyphfox/core'; // the engine without icon data`],
        ['p', 'setup.p2', 'The same applies to <code>glyphfox/vue</code>, which is built exactly like the React entry, and to the Svelte components, which are one file per icon as well. Development servers do not tree shake, so judge size only on production builds.'],
      ],
    },
    {
      id: 'how',
      h: 'How it works',
      blocks: [
        ['p', 'how.p', 'Three properties of the package let a bundler drop every icon you do not import.'],
        ['ol', 'how.list', [
          '<strong>One module per icon.</strong> The build writes each icon as its own file, and the index of every entry point only re-exports them. A bundler can follow the one re-export you use and ignore the others.',
          '<strong>Pure calls.</strong> Each component is created with <code>/*#__PURE__*/ createIcon(icon)</code>, which tells the minifier that the call has no effect worth keeping when its result is unused.',
          '<strong>Declared side effects.</strong> The <code>sideEffects</code> field of <code>package.json</code> lists the only files that do something on import. Every other module may be skipped entirely when none of its exports are used.',
        ]],
        ['code', 'js', 'glyphfox/dist/react/icons/home.js', `import { createIcon } from '../runtime.js';
import icon from '../../icons/home.js';

export const HomeIcon = /*#__PURE__*/ createIcon(icon);
export default HomeIcon;`],
        ['code', 'js', 'glyphfox/package.json', `"sideEffects": [
  "./dist/web/index.js",
  "./dist/web/glyphfox.min.js",
  "./dist/runtime/auto.js",
  "*.css"
]`],
        ['p', 'how.p2', 'The files with side effects are the ones meant to do work on import: <code>glyphfox/web</code> defines the custom element with every icon, the CDN file sets up everything for a page without a build, and <code>glyphfox/runtime</code> replaces <code>data-glyph</code> elements.'],
      ],
    },
    {
      id: 'sizes',
      h: 'Measured sizes',
      blocks: [
        ['p', 'sizes.p', 'An example measurement of the current build, made with esbuild 0.28: minified ESM with code splitting, counting only the chunks loaded up front, with React marked as external. Treat it as a guide to proportions, not as a promise; your bundler and your own code will move the numbers.'],
        ['table', 'sizes.table', ['What the app imports', 'Minified', 'Gzip'], [
          ['One React icon plus the shared runtime', '76.0 KB', '27.6 KB'],
          ['10 React icons', '79.3 KB', '29.7 KB'],
          ['50 React icons', '90.9 KB', '37.9 KB'],
          ['<code>import * as Icons</code> with a dynamic key (every icon)', '214.7 KB', 'not measured'],
          ['<code>renderToString</code> from <code>glyphfox/core</code> plus one icon', '37.4 KB', '15.2 KB'],
          ['<code>toSvg</code> from the main <code>glyphfox</code> entry', '153.8 KB', '45.0 KB'],
          ['The CDN file <code>glyphfox.min.js</code>, no build step', '216.4 KB', '62.4 KB'],
          ['<code>sprite.svg</code> with every icon', '117.9 KB', '15.7 KB'],
        ]],
        ['p', 'sizes.p2', 'Two things stand out. The runtime is the fixed part: rendering, the three axes, modifiers, fusion, morph and the animation presets are shared by every icon and cost the same for one icon or fifty. Each extra icon is cheap, about 0.2 KB gzip on average between the 10 and 50 icon builds. A Vite 8.3.5 test build agreed: the entry chunk with <code>HomeIcon</code> came to 81.5 KB minified and 27.7 KB gzip.'],
      ],
    },
    {
      id: 'chunks',
      h: 'Icons requested by name',
      blocks: [
        ['p', 'chunks.p', '<code>Icon</code> with a name, <code>morphTo</code> and <code>Fusion</code> accept names as strings. When a name has not been imported anywhere, the engine loads it on demand from the icon folder:'],
        ['code', 'js', 'glyphfox/dist/core/lookup.js', `let loader = (name) => import(\`../icons/\${name}.js\`).then((m) => m.default);`],
        ['p', 'chunks.p2', 'What happens to that import depends on the bundler. webpack (and so Next.js) and esbuild cannot know which names will be asked for, so they prepare a chunk for every file that matches: one per icon, a few hundred bytes each, downloaded only when a page renders a name that was not imported. Vite does not transform dynamic imports inside <code>node_modules</code>: its production build emits no icon chunks and keeps the import as written, so a name that was neither imported nor registered stays empty in production, while it works in development, where the dependency is pre-bundled.'],
        ['p', 'chunks.vite', 'If an app really needs any name at runtime, such as an icon picker, opt glyphfox back into the transform. Vite then emits the per icon chunks and prints an <code>INEFFECTIVE_DYNAMIC_IMPORT</code> warning for each icon that is also imported directly, which is harmless:'],
        ['code', 'js', 'vite.config.js', `export default {
  build: {
    dynamicImportVarsOptions: { exclude: [/node_modules\\/(?!glyphfox\\/)/] },
  },
};`],
        ['p', 'chunks.p3', 'When you know the names in advance, register their data and nothing is fetched at runtime, with any bundler. If you serve icon data yourself, replace the loader; the default one stays in the code, so webpack still emits the chunks, but the app will not request them:'],
        ['code', 'js', 'icons.js', `import { registerIcons, setIconLoader } from 'glyphfox/core';
import { iconSettings, iconUsers } from 'glyphfox';

registerIcons([iconSettings, iconUsers]);

// optional: load other names from one JSON file you host (a copy of glyphfox/icons.json)
let all;
setIconLoader(async (name) => {
  all ??= await fetch('/icons.json').then((r) => r.json());
  return all[name] ?? null;
});`],
      ],
    },
    {
      id: 'subset',
      h: 'Shipping a fixed subset',
      blocks: [
        ['p', 'subset.p', 'Pages without a bundler, design system packages and native apps often want a fixed list of icons with fixed props. The CLI builds exactly that, from names on the command line or from a file with one name per line:'],
        ['code', 'sh', 'terminal', `# a sprite with only these icons
npx glyphfox build home search file+check --type sprite --out public/icons

# a CSS file with one mask class per icon
npx glyphfox build home search bell --type css --out public/icons

# a small package of SVG strings, with the props baked in
npx glyphfox build --from icons.txt --type package --name @acme/icons --weight 1.5 --out acme-icons`],
        ['p', 'subset.p2', 'A subset sprite or CSS file contains no engine at all, which beats any bundle when the icons never change. For pages that load the CDN file, a subset is usually the biggest single saving: the full file carries every icon for convenience. The <a href="svg-sprite.html">SVG sprite guide</a> and the <a href="html-cdn.html">HTML and CDN guide</a> cover both setups.'],
      ],
    },
    {
      id: 'check',
      h: 'Check your own bundle',
      blocks: [
        ['p', 'check.p', 'Icon data keeps its <code>name</code> and <code>body</code> keys after minification, which makes a quick count possible without any analyzer. In a Vite build the icons you import directly sit in the entry chunk, next to the placeholder named <code>empty</code> that the runtime draws while a name loads:'],
        ['code', 'sh', 'terminal', `npx vite build
grep -ohE 'name:["\`][a-z0-9-]+["\`],body' dist/assets/index-*.js | grep -v empty | sort -u | wc -l`],
        ['p', 'check.p2', 'The number should match the icons you import. If it is close to the size of the whole set, one of the patterns below is pulling everything in. Other bundlers may move shared modules into separate chunks, so with them run the same count over every file the page loads up front, and leave out the lazy icon chunks.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['<code>import *</code> with a dynamic key', '<code>Icons[name]</code> on a namespace import forces the bundler to keep every icon. Render <code>&lt;Icon name={name} /&gt;</code> instead, which loads only the names it meets.'],
          ['CommonJS <code>require</code>', '<code>require(\'glyphfox/react\')</code> resolves to the bundled <code>index.cjs</code>, one file with every icon that no bundler can split. Make sure your app code uses <code>import</code> so the ESM build is picked.'],
          ['<code>toSvg</code> on the client', '<code>toSvg</code> takes names, so it needs the full registry and brings every icon along. In browser code, use <code>renderToString</code> from <code>glyphfox/core</code> with imported icon data. On the server the size does not matter.'],
          ['esbuild without splitting', 'Without <code>splitting: true</code> esbuild inlines every module the dynamic loader can reach: one icon came to 201 KB minified in a single file instead of 76 KB. The same happens with any output that inlines dynamic imports, such as an IIFE or UMD library build.'],
          ['<code>glyphfox/web</code> for a few icons', 'That entry defines the element with the whole set on purpose. For a subset, use <code>defineGlyphFox</code> from <code>glyphfox/web/element</code> and <code>registerIcons</code>.'],
          ['Judging size in development', 'Dev servers load every module of a barrel file. Deep imports such as <code>glyphfox/react/icons/home</code> make development faster, but the production build is what counts for size.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'files', q: 'Why does my build output contain hundreds of tiny files?', a: 'With webpack or esbuild, they are the lazy chunks of the on demand loader, one per icon, prepared because a name could be requested as a string at runtime. They stay on the server unless a page renders a name that was not imported, so they cost nothing for users. Registering your names with <code>registerIcons</code> means they are never requested. A Vite production build does not create them, as explained in <a href="#chunks">icons requested by name</a>.' },
    { id: 'cost', q: 'How much does each extra icon cost?', a: 'In the measurement above, about 0.2 KB gzip per icon on top of the shared runtime of roughly 28 KB gzip. The runtime is paid once, so the second icon is much cheaper than the first.' },
  ],
};
