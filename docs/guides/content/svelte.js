export default {
  slug: 'svelte',
  group: 'frameworks',
  order: 60,
  icon: 'flame',
  short: 'Svelte',
  related: ['sveltekit', 'animated-icons', 'tree-shaking'],
  title: 'Svelte 5 icon components with glyphfox and runes',
  description: 'Use glyphfox icons in Svelte 5: install, import components, pass props with runes, morph with MorphIcon and morphStore, fuse icons and keep bundles small.',
  h1: 'Icons in Svelte 5',
  lead: '<code>glyphfox/svelte</code> ships one Svelte 5 component per icon, plus <code>Icon</code>, <code>Fusion</code> and <code>MorphIcon</code>, with the same props as every other glyphfox package.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['code', 'sh', 'terminal', `npm install glyphfox`],
        ['p', 'install.p', 'The components are <code>.svelte</code> source files that your app compiles, so the build needs Svelte 5 and its compiler, usually through vite-plugin-svelte, which every SvelteKit project already has. They are written with runes such as <code>$props</code> and <code>$state</code>, so Svelte 4 cannot compile them.'],
        ['p', 'install.peer', '<code>svelte</code> 5 is an optional peer dependency of <code>glyphfox</code>: you only need it when you import <code>glyphfox/svelte</code>. The package exposes it under the <code>svelte</code> export condition, which vite-plugin-svelte uses to recognize a Svelte library and compile its components for the browser and the server.'],
      ],
    },
    {
      id: 'components',
      h: 'Use the components',
      blocks: [
        ['code', 'js', 'Toolbar.svelte', `<script>
  import { HomeIcon, SearchIcon, BellIcon } from 'glyphfox/svelte';

  let { unread = 0 } = $props();
</script>

<nav class="toolbar">
  <a href="/" aria-label="Home"><HomeIcon /></a>
  <SearchIcon size={20} weight={1.5} class="muted" />
  <BellIcon variant="duotone" secondaryColor="#ff7a1a" modifier={unread ? 'dot' : undefined} />
</nav>`],
        ['p', 'components.names', 'Each icon is a component named after the icon in PascalCase with an <code>Icon</code> suffix: <code>arrow-right</code> becomes <code>ArrowRightIcon</code>, <code>loader-circle</code> becomes <code>LoaderCircleIcon</code>. Props use the camelCase names, exactly as in JavaScript, because Svelte passes props to components as written.'],
        ['p', 'components.rest', '<code>class</code> and <code>style</code> are applied to the svg, and any other attribute, such as <code>aria-*</code>, <code>data-*</code> or <code>id</code>, is spread onto it. Event handlers are props in Svelte 5: <code>onclick</code>, <code>onmouseenter</code> and <code>onmouseleave</code> are forwarded, and they still run when a click or hover trigger is set on the icon.'],
        ['p', 'components.color', 'Strokes use <code>currentColor</code>, so the icon follows the CSS <code>color</code> of its parent. The <code>color</code> prop sets a fixed color on the svg.'],
      ],
    },
    {
      id: 'axes',
      h: 'Weight, corners and style',
      blocks: [
        ['p', 'axes.p', '<code>weight</code> sets the stroke from 1 to 3, <code>corners</code> switches between round and sharp joins, and <code>variant</code> picks outline, duotone or solid. Below 24 px the stroke is thickened slightly so small icons keep their presence; <code>absoluteWeight</code> keeps the exact value.'],
        ['code', 'js', 'Axes.svelte', `<script>
  import { FolderIcon } from 'glyphfox/svelte';
</script>

<FolderIcon weight={1} />
<FolderIcon weight={3} corners="sharp" />
<FolderIcon variant="duotone" secondaryColor="#ff7a1a" />
<FolderIcon variant="solid" />
<FolderIcon size={16} weight={1.5} absoluteWeight />`],
      ],
    },
    {
      id: 'by-name',
      h: 'Icon, modifiers and fusion',
      blocks: [
        ['p', 'byname.p', '<code>Icon</code> renders any spec of the name syntax: a name, a modifier badge (<code>file+check</code>, with <code>@tl</code>, <code>@tr</code>, <code>@bl</code> or <code>@br</code> for the corner), a fusion (<code>cloud&amp;lock:overlap</code>) or a style (<code>heart/solid</code>). <code>Fusion</code> takes a list of names and a layout: overlap, side, stack, grid, orbit, badge or inside.'],
        ['p', 'byname.register', 'Icon components carry their own data: each one registers its icon in a <code>&lt;script module&gt;</code> block. A name inside a string has no import behind it, so register those once with <code>registerIcons</code>. Modifier badges are drawn by the engine and need no registration.'],
        ['code', 'js', 'src/lib/icons.js', `import { registerIcons } from 'glyphfox/svelte';
import file from 'glyphfox/icons/file';
import cloud from 'glyphfox/icons/cloud';
import lock from 'glyphfox/icons/lock';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';
import play from 'glyphfox/icons/play';
import pause from 'glyphfox/icons/pause';

// Every name used in a string: Icon, Fusion, MorphIcon, morphStore and morphTo.
registerIcons([file, cloud, lock, menu, x, play, pause]);`],
        ['code', 'js', 'FileStatus.svelte', `<script>
  import './lib/icons.js';
  import { Icon, Fusion } from 'glyphfox/svelte';

  let { saved = false } = $props();
</script>

<Icon name={saved ? 'file+check' : 'file'} />
<Icon name="file+alert@tr" variant="duotone" />
<Fusion icons={['cloud', 'lock']} layout="overlap" gap={1} />`],
        ['p', 'byname.module', 'Import the registration module from your entry file or root component. A component can also register in its own <code>&lt;script module&gt;</code> block, which runs once when the module loads rather than once per instance.'],
      ],
    },
    {
      id: 'morph',
      h: 'MorphIcon, morphTo and morphStore',
      blocks: [
        ['p', 'morph.p', '<code>MorphIcon</code> animates whenever its <code>name</code> changes, which pairs naturally with <code>$state</code>:'],
        ['code', 'js', 'MenuButton.svelte', `<script>
  import { MorphIcon } from 'glyphfox/svelte';

  let open = $state(false);
</script>

<button type="button" aria-label="Menu" aria-expanded={open} onclick={() => (open = !open)}>
  <MorphIcon name={open ? 'x' : 'menu'} duration={300} />
</button>`],
        ['p', 'morph.to', 'Any icon component also takes <code>morphTo</code> with a trigger: <code>click</code> toggles on every click, <code>hover</code> follows the pointer, <code>state</code> follows <code>active</code>, and the default <code>mount</code> morphs once after mounting.'],
        ['code', 'js', 'Triggers.svelte', `<script>
  import { HeartIcon, PlayIcon } from 'glyphfox/svelte';

  let { playing = false } = $props();
</script>

<HeartIcon morphTo="heart/solid" trigger="click" />
<PlayIcon morphTo="pause" trigger="state" active={playing} />`],
        ['p', 'morph.store', '<code>morphStore(initial, options)</code> is a store for custom rendering. Call <code>set(name)</code> to start a morph and read <code>$store</code>, a frame with <code>icon</code> and <code>variant</code> that you can pass to <code>Icon</code>.'],
        ['code', 'js', 'PlayToggle.svelte', `<script>
  import './lib/icons.js';
  import { Icon, morphStore } from 'glyphfox/svelte';

  const frame = morphStore('play', { duration: 250 });
  let playing = $state(false);

  function toggle() {
    playing = !playing;
    frame.set(playing ? 'pause' : 'play');
  }
</script>

<button type="button" aria-label="Play" aria-pressed={playing} onclick={toggle}>
  {#if $frame}<Icon icon={$frame.icon} variant={$frame.variant} />{/if}
</button>`],
        ['p', 'morph.pairs', 'Hand tuned pairs cover menu to x, play to pause, plus to check, sun to moon, eye to eye-off, bell to bell-ring, heart to heart/solid, copy to check, lock to unlock and wifi to wifi-off. Other pairs morph with an automatic match.'],
      ],
    },
    {
      id: 'living',
      h: 'State driven animations',
      blocks: [
        ['p', 'living.p', 'Living states are presets that understand the icon: draw traces the strokes in drawing order, shake swings from the top, and pop, wiggle, spin, pulse and bounce complete the set. With <code>trigger="state"</code> an animation plays while <code>active</code> is true, so it follows your runes directly.'],
        ['code', 'js', 'Inbox.svelte', `<script>
  import { BellIcon, LoaderCircleIcon, SparklesIcon } from 'glyphfox/svelte';

  let { hasNews = false, loading = false } = $props();
</script>

<BellIcon animate="shake" trigger="state" active={hasNews} />
{#if loading}<LoaderCircleIcon animate="spin" />{/if}
<SparklesIcon animate="draw" trigger="hover" />`],
        ['p', 'living.css', 'Each preset is a small stylesheet inside the svg, so it needs no CSS import and stops for visitors who prefer reduced motion. The <a href="animated-icons.html">animated icons guide</a> covers durations, delays and loops.'],
      ],
    },
    {
      id: 'imports',
      h: 'Deep imports and types',
      blocks: [
        ['p', 'imports.p', '<code>glyphfox/svelte</code> re-exports every component, and production builds drop the ones you do not import. A deep import resolves to a single <code>.svelte</code> file, which keeps the code your compiler and dev server see down to what you use:'],
        ['code', 'js', 'Logo.svelte', `<script>
  import FoxIcon from 'glyphfox/svelte/icons/fox';
</script>

<FoxIcon size={32} variant="duotone" title="glyphfox" />`],
        ['p', 'imports.types', 'Types ship with the package. Every component is a <code>Component&lt;GlyphProps&gt;</code>, where <code>GlyphProps</code> is the shared props plus any SVG attribute, so a typed wrapper can forward everything:'],
        ['code', 'js', 'AppIcon.svelte', `<script lang="ts">
  import { Icon, type GlyphProps } from 'glyphfox/svelte';
  import type { IconName } from 'glyphfox';

  let { name, ...rest }: GlyphProps & { name: IconName } = $props();
</script>

<Icon {name} weight={1.75} {...rest} />`],
        ['p', 'imports.more', 'Names typed as <code>IconName</code> are checked at compile time, but they still need to be registered to render: see the pitfalls below and the <a href="tree-shaking.html">tree shaking guide</a>.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'Every icon component, <code>Icon</code>, <code>Fusion</code> and <code>MorphIcon</code> takes the shared props, in camelCase.'],
        ['props', 'svelte'],
        ['p', 'props.extra', '<code>Icon</code> adds <code>name</code>, <code>icon</code> (icon data) and <code>gap</code>. <code>Fusion</code> adds <code>icons</code>, <code>layout</code>, <code>gap</code>, <code>scale</code> and <code>offsets</code>. <code>MorphIcon</code> adds <code>name</code> and <code>icon</code>. Children render inside the svg.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Kebab-case props do nothing', '<code>secondary-color="#ff7a1a"</code> is not the <code>secondaryColor</code> prop in Svelte: it is spread onto the svg as a plain attribute, and the icon keeps its default. Use the camelCase names everywhere.'],
          ['Names that work in development and vanish in production', 'During development Vite pre-bundles the package and every name resolves. A production build keeps only what you import, and Vite does not bundle the on demand loader inside <code>node_modules</code>, so unregistered names in <code>Icon</code>, <code>Fusion</code>, <code>MorphIcon</code>, <code>morphTo</code> and <code>morphStore</code> render an empty svg. Register them.'],
          ['morphStore created before registration', '<code>morphStore</code> resolves a name when you call <code>set</code>. If the name is not registered at that moment, it waits for the loader instead. Import the registration module before you create the store, as in the example above.'],
          ['Star imports and dynamic lookups', '<code>import * as icons from \'glyphfox/svelte\'</code> with <code>icons[name]</code> keeps every component in the bundle. Map the components you need, or use <code>Icon</code> with registered names.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'svelte4', q: 'Can I use glyphfox in a Svelte 4 project?', a: 'Not with <code>glyphfox/svelte</code>, which needs the Svelte 5 compiler. In a Svelte 4 app the <code>&lt;glyph-fox&gt;</code> web component works with the same props as attributes; see the <a href="web-components.html">web components guide</a>.' },
    { id: 'no-kit', q: 'Do the components need SvelteKit?', a: 'No. Any Svelte 5 setup that compiles <code>.svelte</code> files works, such as plain Vite with vite-plugin-svelte. SvelteKit adds server rendering and prerendering, covered in the <a href="sveltekit.html">SvelteKit guide</a>.' },
  ],
};
