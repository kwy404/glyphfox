export default {
  slug: 'preact',
  group: 'frameworks',
  order: 90,
  icon: 'sparkle',
  short: 'Preact',
  related: ['react', 'web-components', 'tree-shaking'],
  title: 'Preact icons with glyphfox through preact/compat',
  description: 'Use glyphfox icons in Preact: the React components through preact/compat with Vite, webpack, esbuild and TypeScript, or the glyph-fox element without compat.',
  h1: 'Icons in Preact',
  lead: 'Preact runs the glyphfox React components through preact/compat without code changes. If your app does not load compat, the glyph-fox web component works in plain Preact.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'Install glyphfox next to Preact. <code>preact/compat</code> is part of the <code>preact</code> package, so there is no second dependency to add.'],
        ['code', 'sh', 'terminal', 'npm install glyphfox'],
        ['p', 'install.p2', 'You have two ways to render icons, and they share the same rendering engine and the same props:'],
        ['ul', 'install.list', [
          '<strong>The components</strong> from <code>glyphfox/react</code>, run by Preact through compat. Best when your app already aliases React or uses other React packages.',
          '<strong>The web component</strong> <code>&lt;glyph-fox&gt;</code>, which needs no compat at all. Best when you keep Preact lean and only need icons.',
        ]],
      ],
    },
    {
      id: 'how',
      h: 'How the components run on Preact',
      blocks: [
        ['p', 'how.p', 'The React entry point imports exactly six things from <code>react</code>: <code>createElement</code>, <code>forwardRef</code>, <code>useState</code>, <code>useEffect</code>, <code>useMemo</code> and <code>useRef</code>. compat implements all of them, so once the bundler resolves <code>react</code> to <code>preact/compat</code> the components render with Preact\'s own renderer, in the same tree and with the same hooks as the rest of your app.'],
        ['p', 'how.p2', 'The SVG attributes are created with React names such as <code>strokeWidth</code> and <code>strokeLinecap</code>, and compat turns them back into <code>stroke-width</code> and <code>stroke-linecap</code> on the element. The living state animations are a <code>&lt;style&gt;</code> element inside the SVG, set through <code>dangerouslySetInnerHTML</code>, which Preact supports as well.'],
      ],
    },
    {
      id: 'vite',
      h: 'Vite',
      blocks: [
        ['p', 'vite.p', 'The official Preact preset for Vite already aliases <code>react</code>, <code>react-dom</code> and the JSX runtime to compat. Nothing else is needed:'],
        ['code', 'js', 'vite.config.js', `import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
});`],
      ],
    },
    {
      id: 'bundlers',
      h: 'webpack and esbuild',
      blocks: [
        ['p', 'bundlers.p', 'With webpack, add the aliases to <code>resolve.alias</code>. glyphfox only needs <code>react</code>, but aliasing the whole set keeps any other React package in your app on the same Preact instance:'],
        ['code', 'js', 'webpack.config.js', `module.exports = {
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
};`],
        ['p', 'bundlers.p2', 'esbuild has the same option. Turn on code splitting at the same time, otherwise esbuild inlines every icon module that the on demand loader can reach (the <a href="tree-shaking.html">tree shaking guide</a> explains why):'],
        ['code', 'js', 'build.mjs', `import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: 'dist',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { react: 'preact/compat', 'react-dom': 'preact/compat' },
});`],
      ],
    },
    {
      id: 'typescript',
      h: 'TypeScript',
      blocks: [
        ['p', 'typescript.p', 'The declarations of <code>glyphfox/react</code> are written against the React types (<code>ForwardRefExoticComponent</code>, <code>SVGProps</code>). Map <code>react</code> to compat in <code>paths</code> so they resolve to Preact\'s types. If the checker still reports problems inside the declaration files of dependencies, keep <code>skipLibCheck</code> on, as most Preact templates do:'],
        ['code', 'js', 'tsconfig.json', `{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "skipLibCheck": true,
    "paths": {
      "react": ["./node_modules/preact/compat/"],
      "react-dom": ["./node_modules/preact/compat/"]
    }
  }
}`],
      ],
    },
    {
      id: 'usage',
      h: 'Use the components',
      blocks: [
        ['p', 'usage.p', 'Import icons by name and use Preact hooks around them as usual. Everything from the <a href="react.html">React guide</a> applies: <code>Icon</code> with the name syntax, <code>Fusion</code>, <code>MorphIcon</code>, <code>useMorph</code>, modifiers and refs.'],
        ['code', 'js', 'Card.jsx', `import { useState } from 'preact/hooks';
import { HeartIcon, MorphIcon, Fusion } from 'glyphfox/react';

export function Card() {
  const [liked, setLiked] = useState(false);
  return (
    <article className="card">
      <button type="button" onClick={() => setLiked(!liked)} aria-pressed={liked}>
        <HeartIcon animate="pop" trigger="state" active={liked} variant={liked ? 'solid' : 'outline'} />
        Like
      </button>
      <MorphIcon name={liked ? 'check' : 'plus'} duration={250} />
      <Fusion icons={['user', 'shield']} layout="badge" />
    </article>
  );
}`],
        ['p', 'usage.p1', 'Refs go through the <code>forwardRef</code> of compat, so <code>ref</code> on an icon points at the rendered <code>&lt;svg&gt;</code> element, ready for <code>getBoundingClientRect()</code> or the Web Animations API. Event handlers such as <code>onClick</code> and attributes such as <code>data-*</code> pass straight through to the element, exactly as in React.'],
        ['p', 'usage.p2', 'With signals, pass the value rather than the signal. Preact unwraps signals bound to DOM attributes, but an icon component receives the signal object itself and reads its props as plain values, so it would neither read the right value nor update when the signal changes:'],
        ['code', 'js', 'Status.jsx', `import { signal } from '@preact/signals';
import { CloudIcon } from 'glyphfox/react';

const syncing = signal(false);

export function Status() {
  return <CloudIcon modifier={syncing.value ? 'sync' : undefined} />;
}`],
      ],
    },
    {
      id: 'element',
      h: 'Without compat: the web component',
      blocks: [
        ['p', 'element.p', 'The <code>&lt;glyph-fox&gt;</code> custom element renders the same icons with the same props as attributes in kebab-case. Import <code>glyphfox/web</code> once to define it with every icon, or define it yourself and register only the icons you use:'],
        ['code', 'js', 'icons.js', `import { defineGlyphFox } from 'glyphfox/web/element';
import { registerIcons } from 'glyphfox/core';
import { iconHome, iconSearch, iconMenu, iconX } from 'glyphfox';

registerIcons([iconHome, iconSearch, iconMenu, iconX]);
defineGlyphFox();`],
        ['code', 'js', 'Header.jsx', `import { useState } from 'preact/hooks';
import './icons.js';

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header>
      <glyph-fox name="home" size="20"></glyph-fox>
      <glyph-fox name="search" weight="1.5" title="Search"></glyph-fox>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
        <glyph-fox name={open ? 'x' : 'menu'} morph></glyph-fox>
      </button>
    </header>
  );
}`],
        ['p', 'element.p2', 'Preact sets unknown props on custom elements as attributes, which is what the element listens to, so dynamic values such as <code>name={open ? \'x\' : \'menu\'}</code> work and the <code>morph</code> attribute animates every change. In TypeScript, add <code>glyph-fox</code> to Preact\'s <code>JSX.IntrinsicElements</code> in a declaration file, the way the Preact documentation describes for any custom element.'],
        ['p', 'element.p3', 'Attributes, sizing inside shadow DOM and server rendering of the element are covered in the <a href="web-components.html">web components guide</a>.'],
      ],
    },
    {
      id: 'size',
      h: 'Which path is lighter',
      blocks: [
        ['p', 'size.p', 'Both paths ship the same engine (rendering, axes, modifiers, fusion and morph), so the icons cost about the same either way. The real difference is compat: if your app already loads it for other packages, the components add nothing new; if it does not, the web component avoids it. In both cases import only the icons you use, as shown above.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'The components take these props. On <code>&lt;glyph-fox&gt;</code> the same props are attributes in kebab-case (<code>secondary-color</code>, <code>flip-x</code>, <code>morph-to</code>), plus <code>name</code>, <code>layout</code>, <code>gap</code> and <code>morph</code>.'],
        ['props', 'react'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['A missing alias', 'Without the alias the bundler resolves <code>react</code> to the real React package (or fails to find it). The icons then call hooks from a different renderer, which shows up as invalid hook call errors or icons that never update. Check that <code>react</code> resolves to <code>preact/compat</code>.'],
          ['<code>class</code> instead of <code>className</code>', 'The components merge <code>className</code> into their own <code>glyphfox glyphfox-NAME</code> classes. A <code>class</code> prop is not merged and can be replaced by them, so use <code>className</code> on icon components.'],
          ['Two copies of Preact', 'compat must resolve to the same <code>preact</code> as your app. A duplicate copy in <code>node_modules</code> breaks hooks in the same way as a missing alias; deduplicate it in your package manager.'],
          ['Signals as props', 'Pass <code>signal.value</code> to icon components. The signal object itself is not unwrapped for components.'],
          ['Empty elements before definition', '<code>&lt;glyph-fox&gt;</code> draws only after <code>defineGlyphFox()</code> has run in the browser. With prerendered HTML, give the element a size in CSS so the layout does not shift while the script loads.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'compat', q: 'Do I need preact/compat to use glyphfox?', a: 'Only for the components from <code>glyphfox/react</code>. The <code>&lt;glyph-fox&gt;</code> element and <code>toSvg</code> from <code>glyphfox</code> work in plain Preact without it.' },
    { id: 'ssr', q: 'Do the components render with preact-render-to-string?', a: 'Yes. Through compat they render on the server like any React component, and the SVG is in the HTML. Icons rendered by name with <code>Icon</code> need their data registered first, as described in the <a href="ssr.html">server rendering guide</a>.' },
  ],
};
