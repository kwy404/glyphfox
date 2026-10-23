export default {
  slug: 'nextjs',
  group: 'frameworks',
  order: 20,
  icon: 'route',
  short: 'Next.js',
  related: ['react', 'ssr', 'tree-shaking', 'accessibility'],
  title: 'Next.js icons with glyphfox: App Router and Server Components',
  description: 'Use glyphfox in Next.js: a client boundary for the App Router, zero JavaScript SVG in Server Components, the Pages Router and icons by name on the server.',
  h1: 'Icons in Next.js',
  lead: 'glyphfox works in both routers. In the App Router the React components need a one file client boundary, and Server Components can print the same icons as plain SVG that ships no JavaScript at all.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'Install the package. It ships compiled ESM and CommonJS with type declarations, so there is nothing to add to <code>next.config.js</code>: no <code>transpilePackages</code>, no loader and no stylesheet.'],
        ['code', 'sh', 'terminal', 'npm install glyphfox'],
        ['p', 'install.p2', 'The React components come from <code>glyphfox/react</code> and are covered in depth in the <a href="react.html">React guide</a>. This page is about what changes in Next.js: where components may run, how to keep icons out of the client bundle, and what the server renders.'],
      ],
    },
    {
      id: 'why',
      h: 'Why the App Router needs a client boundary',
      blocks: [
        ['p', 'why.p', 'In the App Router every module is a Server Component unless a file marks itself with <code>"use client"</code>. The glyphfox components keep hover, click and morph state with <code>useState</code>, <code>useEffect</code> and <code>useRef</code>, and the package does not carry a <code>"use client"</code> directive. Rendering <code>&lt;HomeIcon /&gt;</code> straight from <code>app/page.tsx</code> therefore fails with an error about hooks that only work in Client Components.'],
        ['p', 'why.p2', 'The fix is not to turn whole pages into Client Components. Mark one small file as the boundary and import your icons through it. Server Components can render Client Components; the icons are still rendered to HTML on the server and then hydrated in the browser.'],
      ],
    },
    {
      id: 'boundary',
      h: 'One client file for your icons',
      blocks: [
        ['code', 'js', 'components/icons.ts', `'use client';

export { HomeIcon, SearchIcon, BellIcon, MenuIcon, Icon, MorphIcon, Fusion } from 'glyphfox/react';`],
        ['code', 'js', 'app/page.tsx', `import { HomeIcon, SearchIcon, Fusion } from '@/components/icons';

export default function Page() {
  return (
    <header className="bar">
      <a href="/"><HomeIcon size={20} /> Home</a>
      <SearchIcon title="Search" />
      <Fusion icons={['cloud', 'lock']} layout="overlap" />
    </header>
  );
}`],
        ['p', 'boundary.p', 'Re-export names one by one. Next.js does not support <code>export *</code> in a client boundary, and named exports keep tree shaking intact: only the icons listed in the file, and only the ones a page actually uses, end up in the client chunks.'],
        ['p', 'boundary.p2', 'Inside a file that already starts with <code>"use client"</code> you can import from <code>glyphfox/react</code> directly. The boundary file only exists for icons that you render from server files.'],
      ],
    },
    {
      id: 'interactive',
      h: 'Interactive icons in Client Components',
      blocks: [
        ['p', 'interactive.p', 'Event handlers and refs cannot cross from a Server Component into a Client Component, because props on that edge must be serializable. Anything that reacts to the user, such as a toggle with a morph, belongs in its own Client Component:'],
        ['code', 'js', 'components/theme-toggle.tsx', `'use client';

import { useState } from 'react';
import { MorphIcon } from 'glyphfox/react';

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? 'Switch to the light theme' : 'Switch to the dark theme'}
    >
      <MorphIcon name={dark ? 'moon' : 'sun'} duration={300} />
    </button>
  );
}`],
        ['p', 'interactive.p2', 'The server renders the starting icon, and the morph plays in the browser once the component has hydrated. Keep the first state identical on both sides: reading <code>localStorage</code> or the time during render makes the server and the client disagree and React reports a hydration mismatch.'],
      ],
    },
    {
      id: 'server',
      h: 'Zero JavaScript icons in Server Components',
      blocks: [
        ['p', 'server.p', 'Most icons never change after the page loads. For those, a Server Component can turn icon data into an SVG string with <code>renderToString</code> from <code>glyphfox/core</code>. The code runs only on the server, so the icons arrive as markup and add nothing to the client bundle.'],
        ['code', 'js', 'components/server-icon.tsx', `import { renderToString } from 'glyphfox/core';
import type { IconData, SvgOptions } from 'glyphfox';

type Props = SvgOptions & { icon: IconData };

export function ServerIcon({ icon, ...options }: Props) {
  return <span className="icon" dangerouslySetInnerHTML={{ __html: renderToString(icon, options) }} />;
}`],
        ['code', 'js', 'app/docs/page.tsx', `import fileText from 'glyphfox/icons/file-text';
import externalLink from 'glyphfox/icons/external-link';
import { ServerIcon } from '@/components/server-icon';

export default function Docs() {
  return (
    <a href="https://example.com/handbook">
      <ServerIcon icon={fileText} size={18} /> Handbook
      <ServerIcon icon={externalLink} size={14} title="opens in a new tab" />
    </a>
  );
}`],
        ['p', 'server.p2', 'Each <code>glyphfox/icons/NAME</code> import is one small data module. When you want names and the full name syntax (<code>file+check</code>, <code>cloud&amp;lock:side</code>, <code>heart/solid</code>), use <code>toSvg</code> from the main entry instead. It brings the whole icon registry, but in a Server Component that only weighs on the server:'],
        ['code', 'js', 'app/status/page.tsx', `import { toSvg } from 'glyphfox';

export default function Status() {
  return <span className="icon" dangerouslySetInnerHTML={{ __html: toSvg('file+check', { size: 20 }) }} />;
}`],
        ['p', 'server.p3', 'Options use the core names: <code>class</code> instead of <code>className</code>, and <code>style</code> as a string. A wrapper element is needed for <code>dangerouslySetInnerHTML</code>; make it behave like the icon itself so it adds no line height:'],
        ['code', 'css', 'app/globals.css', `.icon {
  display: inline-flex;
  line-height: 0;
  vertical-align: middle;
}`],
        ['p', 'server.p4', 'Living states still work without JavaScript, because the animation is a small stylesheet inside the SVG: <code>renderToString(loader, { animate: \'spin\' })</code> spins, and <code>renderToString(menu, { morphTo: x, trigger: \'hover\' })</code> morphs on hover with a CSS transition. Click and state triggers need a Client Component.'],
      ],
    },
    {
      id: 'names',
      h: 'Icons by name on the server',
      blocks: [
        ['p', 'names.p', '<code>Icon</code>, <code>morphTo</code> and <code>Fusion</code> look names up in a registry that each imported icon component fills. A name nobody imported is fetched with a dynamic import after the page loads, which means the server sends an empty SVG for it and the icon pops in after hydration. Register the data of every name you render from strings in the boundary file; it runs on the server during rendering and again in the browser:'],
        ['code', 'js', 'components/icons.ts', `'use client';

import { registerIcons } from 'glyphfox/react';
import { iconSettings, iconUsers, iconChartBar } from 'glyphfox';

registerIcons([iconSettings, iconUsers, iconChartBar]);

export { Icon, HomeIcon } from 'glyphfox/react';`],
        ['p', 'names.p2', 'The data exports are tree shaken like the components. Watch out for a difference between environments: development builds may evaluate every icon module, so a missing registration can look fine with <code>next dev</code> and render empty only after <code>next build</code>, where unused modules are dropped.'],
      ],
    },
    {
      id: 'pages',
      h: 'Pages Router',
      blocks: [
        ['p', 'pages.p', 'The Pages Router has no Server Components, so the components work as is in pages, layouts and <code>_app</code>. Every page is rendered on the server and hydrated, which makes the registration above just as useful: put <code>registerIcons</code> in <code>pages/_app.tsx</code> if you render icons by name.'],
        ['code', 'js', 'pages/_app.tsx', `import type { AppProps } from 'next/app';
import { registerIcons } from 'glyphfox/react';
import { iconSettings, iconUsers } from 'glyphfox';

registerIcons([iconSettings, iconUsers]);

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}`],
      ],
    },
    {
      id: 'favicon',
      h: 'An icon as the favicon',
      blocks: [
        ['p', 'favicon.p', 'The App Router picks up <code>app/icon.svg</code> as the site icon. The CLI writes any icon there with an explicit color, since a favicon has no surrounding text color for <code>currentColor</code> to follow:'],
        ['code', 'sh', 'terminal', 'npx glyphfox copy fox --color "#ff7a1a" --weight 2.5 --out app/icon.svg'],
        ['p', 'favicon.p2', 'For PNG app icons in several sizes, the brand kit in the <a href="../studio.html">studio</a> exports a favicon set themed with your color, weight and style.'],
      ],
    },
    {
      id: 'output',
      h: 'What the build output contains',
      blocks: [
        ['p', 'output.p', 'With webpack, <code>next build</code> emits many tiny client chunks, roughly one per icon in the set. They come from the on demand loader behind <code>Icon</code> and <code>morphTo</code>: its dynamic import points at the icon folder, so the bundler prepares a chunk for every icon that could be requested by name. They are a few hundred bytes each and are only downloaded when a page renders a name that was not imported. Whatever the bundler, registering the names you render from strings (above) means they are never requested. The icons you import directly live in your regular chunks. Measurements are in the <a href="tree-shaking.html">tree shaking guide</a>.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'The components take the same props as in any React app. When a Server Component renders them through the boundary, every prop below is a plain value and can cross it; only callbacks such as <code>onClick</code> and <code>ref</code> must be set inside a Client Component. The core options of <code>renderToString</code> and <code>toSvg</code> use the same names.'],
        ['props', 'react'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Hook errors in Server Components', 'Importing from <code>glyphfox/react</code> in a server file fails because the components use hooks. Import through a <code>"use client"</code> file, or render static SVG with <code>renderToString</code>.'],
          ['<code>export *</code> in the boundary', 'Next.js rejects <code>export *</code> in a client boundary. List the icons with named exports.'],
          ['Functions as props from the server', '<code>onClick</code>, <code>onMouseEnter</code> and refs are not serializable. Move interactive icons into a Client Component and pass only data down.'],
          ['Empty icons after <code>next build</code>', 'An <code>Icon</code> name that was never imported renders empty on the server. Register its data with <code>registerIcons</code> in the boundary file or in <code>_app</code>.'],
          ['Unknown names throw', '<code>toSvg</code> throws on a name that does not exist, which turns into a server error. Check user supplied names against <code>iconNames</code> from <code>glyphfox</code> before rendering them.'],
          ['Extra space around server icons', 'The wrapper of <code>dangerouslySetInnerHTML</code> is an inline element with its own line box. Give it <code>display: inline-flex</code> and <code>line-height: 0</code>.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'transpile', q: 'Do I need transpilePackages for glyphfox?', a: 'No. The package ships plain JavaScript in ESM and CommonJS with type declarations, so Next.js resolves and bundles it like any compiled dependency.' },
    { id: 'web', q: 'Can I use the glyph-fox web component in Next.js?', a: 'Yes, import <code>glyphfox/web</code> from a Client Component. The module is safe to evaluate during server rendering, but a custom element only draws once the browser upgrades it, so the server HTML has an empty element where the icon will be. In a React app the components are the better fit because their SVG is in the server HTML; the <a href="web-components.html">web components guide</a> covers the element.' },
  ],
};
