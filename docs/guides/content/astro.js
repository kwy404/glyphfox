export default {
  slug: 'astro',
  group: 'frameworks',
  order: 110,
  icon: 'planet',
  short: 'Astro',
  related: ['ssr', 'tailwind', 'web-components'],
  title: 'Astro icons with zero JavaScript: glyphfox',
  description: 'Render glyphfox icons in Astro at build time with no client JavaScript, wrap them in an Icon.astro component, and add islands or the element for motion.',
  h1: 'Icons in Astro',
  lead: 'Astro renders components to HTML on the server or at build time, which suits SVG icons: call the renderer in the frontmatter and the page receives plain inline SVG with no client JavaScript. Islands and the custom element cover the icons that need to react.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'Install the package. Static icons need no Astro integration, because glyphfox is plain ES modules that run in the frontmatter. Islands built with <code>glyphfox/react</code>, <code>glyphfox/vue</code> or <code>glyphfox/svelte</code> need the matching Astro integration.'],
        ['code', 'sh', 'terminal', `npm install glyphfox
# only for islands
npx astro add react`],
      ],
    },
    {
      id: 'frontmatter',
      h: 'Icons in the frontmatter',
      blocks: [
        ['p', 'frontmatter.p', 'Code in the frontmatter runs on the server, or at build time for static pages. <code>toSvg</code> returns the SVG string for any icon name, and <code>set:html</code> writes it into the page without escaping it:'],
        ['code', 'js', 'src/pages/index.astro', `---
import { toSvg } from 'glyphfox';

const search = toSvg('search', { size: 20 });
---
<label class="search">
  <Fragment set:html={search} />
  <input type="search" name="q" aria-label="Search the docs" />
</label>`],
        ['p', 'frontmatter.syntax', '<code>toSvg</code> takes the full name syntax, so badges, fusions and styles fit in one string: <code>toSvg(\'file+check@tr\')</code>, <code>toSvg(\'cloud&amp;lock:overlap\')</code>, <code>toSvg(\'heart/solid\')</code>.'],
        ['p', 'frontmatter.cost', 'Importing <code>glyphfox</code> loads every icon, but only on the server or in the build. None of it reaches the browser, because the frontmatter never runs there.'],
      ],
    },
    {
      id: 'component',
      h: 'An Icon.astro component',
      blocks: [
        ['p', 'component.p', 'Wrap the call in a component so pages pass props instead of options. The SVG goes straight into the parent, without a wrapper element:'],
        ['code', 'js', 'src/components/Icon.astro', `---
import { toSvg, type SvgOptions } from 'glyphfox';

interface Props extends SvgOptions {
  name: string;
}

const { name, ...options } = Astro.props;
const svg = toSvg(name, options);
---
<Fragment set:html={svg} />`],
        ['code', 'js', 'src/components/Nav.astro', `---
import Icon from './Icon.astro';
---
<nav class="nav">
  <a href="/"><Icon name="home" size={20} /> Home</a>
  <a href="/docs/"><Icon name="book-open" size={20} weight={1.5} /> Docs</a>
  <a href="/new/"><Icon name="file+plus" size={20} title="New file" /></a>
</nav>

<style>
  .nav :global(.glyphfox) { color: #6b7280; }
  .nav a:hover :global(.glyphfox) { color: #111827; }
</style>`],
        ['p', 'component.styles', 'Every svg carries the classes <code>glyphfox</code> and <code>glyphfox-NAME</code>. Markup inserted with <code>set:html</code> does not receive the attributes Astro uses to scope component styles, so select it with <code>:global()</code> inside a scoped parent selector, as above, or let it inherit <code>color</code> through <code>currentColor</code>.'],
        ['p', 'component.title', 'The icon link above has no text, so its icon gets a <code>title</code>: that adds <code>role="img"</code>, <code>aria-label</code> and a <code>&lt;title&gt;</code>, and the link takes its name from it. Icons next to visible text stay decorative. More patterns are in the <a href="accessibility.html">accessibility guide</a>.'],
      ],
    },
    {
      id: 'motion',
      h: 'Motion without JavaScript',
      blocks: [
        ['p', 'motion.p', 'The SVG can carry its own CSS, so living states and hover morphs play in static HTML with no script: <code>animate</code> with the default <code>trigger="mount"</code> or with <code>"hover"</code>, and <code>morphTo</code> with <code>trigger="hover"</code>, which reacts to the svg and to its direct parent.'],
        ['code', 'js', 'src/components/Chapter.astro', `---
import Icon from './Icon.astro';
---
<a class="next" href="/chapter-2/">
  Next chapter <Icon name="arrow-right" morphTo="chevron-right" trigger="hover" />
</a>

<p class="status">
  <Icon name="loader" animate="spin" title="Building" /> Building the preview
</p>`],
        ['p', 'motion.parent', 'Because Icon.astro adds no wrapper, the svg is a direct child of the link, and hovering anywhere on the link morphs the arrow. Every preset stops under <code>prefers-reduced-motion</code>; the presets and triggers are listed in <a href="animated-icons.html">animated icons</a>.'],
      ],
    },
    {
      id: 'islands',
      h: 'Islands for state',
      blocks: [
        ['p', 'islands.p', 'Icons that follow state, such as a menu button that morphs into a close icon, belong in an island. Use the framework package of the island and hydrate it with a client directive:'],
        ['code', 'js', 'src/components/MenuButton.jsx', `import { useState } from 'react';
import { MorphIcon, registerIcons } from 'glyphfox/react';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';

// Names passed to MorphIcon load on demand; registering them
// puts the icon in the server rendered HTML.
registerIcons([menu, x]);

export default function MenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={open ? 'Close menu' : 'Open menu'}
      onClick={() => setOpen(!open)}
    >
      <MorphIcon name={open ? 'x' : 'menu'} duration={300} />
    </button>
  );
}`],
        ['code', 'js', 'src/layouts/Base.astro', `---
import MenuButton from '../components/MenuButton.jsx';
---
<header>
  <MenuButton client:load />
</header>`],
        ['p', 'islands.ssr', 'Astro renders islands on the server first. Icon components such as <code>MenuIcon</code> register their icon when your code uses them, but names passed to <code>MorphIcon</code>, <code>Icon</code> or <code>morphTo</code> are loaded on demand, so without <code>registerIcons</code> the server HTML holds an empty svg until the island hydrates.'],
        ['p', 'islands.other', 'The same works with <code>glyphfox/vue</code> and with <code>glyphfox/svelte</code>, which needs Svelte 5. For islands below the fold, <code>client:visible</code> or <code>client:idle</code> delays the download until it is needed. The framework details are in the <a href="react.html">React</a>, <a href="vue.html">Vue</a> and <a href="svelte.html">Svelte</a> guides.'],
      ],
    },
    {
      id: 'element',
      h: 'The custom element',
      blocks: [
        ['p', 'element.p', 'Without a framework, the <code>&lt;glyph-fox&gt;</code> element covers clicks, hover and name changes. Astro processes and bundles the <code>&lt;script&gt;</code> tags of components, and includes each script once per page, even when the component appears many times:'],
        ['code', 'js', 'src/components/LikeButton.astro', `<button type="button" class="like" aria-pressed="false" aria-label="Like">
  <glyph-fox name="heart" morph-to="heart/solid" trigger="state"></glyph-fox>
</button>

<script>
  import { defineGlyphFox } from 'glyphfox/web/element';
  import { registerIcons } from 'glyphfox/core';
  import heart from 'glyphfox/icons/heart';

  registerIcons([heart]);
  defineGlyphFox();

  for (const button of document.querySelectorAll('button.like')) {
    const icon = button.querySelector('glyph-fox');
    button.addEventListener('click', () => {
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      icon.toggleAttribute('active', on);
    });
  }
</script>`],
        ['p', 'element.state', 'The button drives the icon through <code>trigger="state"</code> and the <code>active</code> attribute. With <code>trigger="click"</code> the element would listen on itself, and a click on the padding of the button would toggle <code>aria-pressed</code> without morphing the icon.'],
        ['p', 'element.navigation', 'Custom elements stay defined across client side navigation with the Astro view transitions router, so icons on new pages upgrade on their own. Code that attaches listeners, like the loop above, runs once; with the router, run it again on the <code>astro:page-load</code> event.'],
      ],
    },
    {
      id: 'tailwind',
      h: 'Tailwind classes',
      blocks: [
        ['p', 'tailwind.p', 'With Tailwind CSS in the project, the glyphfox plugin draws icons as CSS masks, another option with no JavaScript, handy in content heavy templates. Setup and class syntax are in the <a href="tailwind.html">Tailwind guide</a>.'],
        ['code', 'js', 'src/components/Hero.astro', `<h1 class="flex items-center gap-3">
  <span class="gf-rocket text-4xl text-orange-500" aria-hidden="true"></span>
  Launch faster
</h1>`],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'Icon.astro passes its props to <code>toSvg</code>, so it takes the shared options with their camelCase names, plus <code>class</code> and <code>style</code> as strings for the svg. Unlike in the core renderer, <code>morphTo</code> can be a name here, because <code>toSvg</code> resolves it.'],
        ['props', 'tosvg'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Scoped styles and set:html', 'Rules in a component style block do not match markup inserted with <code>set:html</code>, because it lacks the scoping attributes. Use <code>:global(.glyphfox)</code> inside a scoped selector, or inherit <code>color</code>.'],
          ['Names in islands', '<code>MorphIcon</code>, <code>Icon</code> and <code>morphTo</code> load names on demand. Register their data with <code>registerIcons</code> so the server HTML is complete.'],
          ['Click triggers inside buttons', '<code>trigger="click"</code> on <code>glyph-fox</code> listens on the icon, and clicks on the padding of the button do not reach it. Use <code>trigger="state"</code> and set <code>active</code> from the button.'],
          ['Unknown names stop the build', '<code>toSvg</code> throws for a name that does not exist, which fails a static build and returns an error in server mode. Check names from content against the icon list, or catch the error where they come from user data.'],
          ['Server bundles on edge runtimes', '<code>toSvg</code> from the main entry puts every icon in the server bundle, about 154 KB minified. Where function size is limited, use <code>renderToString</code> from <code>glyphfox/core</code> with per icon imports, and pass icon data to <code>morphTo</code>.'],
          ['Wrappers and hover morphs', 'A hover morph reacts to the svg and to its direct parent. Wrapping the icon in an extra element makes that element the parent, so hovering the link around it no longer starts the morph.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'client-js', q: 'Do icons rendered in the frontmatter ship any JavaScript?', a: 'No. The frontmatter runs on the server or at build time, and the page receives plain SVG. Presets and hover morphs are CSS inside that SVG. Only islands and the custom element add client code.' },
    { id: 'mdx', q: 'Can I use icons in Markdown or MDX content?', a: 'In MDX, import <code>Icon.astro</code> and use it like in any component. Plain Markdown cannot import components, so render the icons in the layout around the content, or use the Tailwind classes in raw HTML where your Markdown allows it.' },
  ],
};
