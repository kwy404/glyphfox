export default {
  slug: 'vue',
  group: 'frameworks',
  order: 30,
  icon: 'layers',
  short: 'Vue',
  related: ['nuxt', 'tree-shaking', 'animated-icons', 'accessibility'],
  title: 'Vue 3 icon components with glyphfox: setup and examples',
  description: 'Use glyphfox icons in Vue 3: install, import tree shakable components, set props in templates, morph with useMorph, fuse icons and avoid empty icons.',
  h1: 'Icons in Vue 3',
  lead: 'Every glyphfox icon is a Vue 3 component with the same props as every other glyphfox package. This guide covers the install, props in templates, icons by name, morphing, global registration, TypeScript and the mistakes that leave an icon empty.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['code', 'sh', 'terminal', `npm install glyphfox`],
        ['p', 'install.p', 'glyphfox has no dependencies. Vue 3.2 or newer is an optional peer dependency, only needed when you import <code>glyphfox/vue</code>. The same package also holds the React, Svelte and web component builds, so there is nothing else to install.'],
        ['p', 'install.names', 'Each icon is a component named after the icon in PascalCase with an <code>Icon</code> suffix: <code>arrow-right</code> becomes <code>ArrowRightIcon</code>, <code>x</code> becomes <code>XIcon</code>. The <a href="../icons.html">icon browser</a> shows the name of every icon and copies the Vue snippet for you.'],
      ],
    },
    {
      id: 'components',
      h: 'Use the components',
      blocks: [
        ['code', 'js', 'Toolbar.vue', `<script setup>
import { HomeIcon, SearchIcon, BellIcon } from 'glyphfox/vue';

defineProps({ unread: { type: Number, default: 0 } });
</script>

<template>
  <nav class="toolbar">
    <a href="/" aria-label="Home"><HomeIcon /></a>
    <SearchIcon :size="20" :weight="1.5" class="muted" />
    <BellIcon variant="duotone" secondary-color="#ff7a1a" :modifier="unread ? 'dot' : undefined" />
  </nav>
</template>`],
        ['p', 'components.case', 'Props are declared in camelCase, and Vue accepts both spellings in templates: <code>secondary-color</code> and <code>secondaryColor</code> reach the same prop. Bind numbers with <code>:size="20"</code>; a plain <code>size="20"</code> also works, because size, weight, rotate, duration and the other numeric props accept strings.'],
        ['p', 'components.fallthrough', 'The components do not declare <code>class</code>, <code>style</code> or listeners, so Vue passes them through to the root <code>&lt;svg&gt;</code>. Your classes are merged with the built in <code>glyphfox glyphfox-NAME</code> classes, and <code>@click</code>, <code>aria-*</code>, <code>data-*</code> and <code>id</code> land on the svg itself.'],
        ['p', 'components.color', 'Strokes use <code>currentColor</code>, so an icon takes the CSS <code>color</code> of its parent and follows hover states and themes for free. The <code>color</code> prop sets the color on the svg when you need a fixed one. The svg gets <code>width</code> and <code>height</code> attributes from <code>size</code> (24 by default); CSS width and height on a class override them.'],
      ],
    },
    {
      id: 'axes',
      h: 'Weight, corners and style',
      blocks: [
        ['p', 'axes.p', 'Three props change the drawing itself rather than the box around it: <code>weight</code> sets the stroke from 1 to 3, <code>corners</code> switches between round and sharp joins, and <code>variant</code> picks outline, duotone or solid. Below 24 px the stroke is thickened slightly so small icons do not look faint; <code>absolute-weight</code> keeps the exact stroke you asked for.'],
        ['code', 'js', 'Axes.vue', `<script setup>
import { FolderIcon } from 'glyphfox/vue';
</script>

<template>
  <FolderIcon :weight="1" />
  <FolderIcon :weight="3" corners="sharp" />
  <FolderIcon variant="duotone" secondary-color="#ff7a1a" />
  <FolderIcon variant="solid" />
  <FolderIcon :size="16" :weight="1.5" absolute-weight />
</template>`],
        ['p', 'axes.solid', 'The solid style is generated at build time from the closed shapes of each icon, with inner lines cut out as negative space. Icons without closed shapes keep their outline when you ask for solid.'],
      ],
    },
    {
      id: 'by-name',
      h: 'Icons by name, modifiers and fusion',
      blocks: [
        ['p', 'byname.p', '<code>Icon</code> renders any spec of the name syntax: a plain name, a modifier badge (<code>file+check</code>, with <code>@tl</code>, <code>@tr</code>, <code>@bl</code> or <code>@br</code> for the corner), a fusion (<code>cloud&amp;lock:overlap</code>) or a style (<code>heart/solid</code>). <code>Fusion</code> takes a list of names and a layout. Both are useful when the icon comes from data, such as a menu definition, a status field or a CMS.'],
        ['p', 'byname.register', 'Components such as <code>FileIcon</code> bring their own data. A name inside a string has no import behind it, so register the data once with <code>registerIcons</code>. The registry is shared by <code>Icon</code>, <code>Fusion</code>, <code>MorphIcon</code> and every <code>morph-to</code> prop, so one module covers the whole app. Modifier badges are drawn by the engine and need no registration.'],
        ['code', 'js', 'src/icons.js', `import { registerIcons } from 'glyphfox/vue';
import file from 'glyphfox/icons/file';
import cloud from 'glyphfox/icons/cloud';
import lock from 'glyphfox/icons/lock';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';
import pause from 'glyphfox/icons/pause';

// Every name used in a string: Icon, Fusion, MorphIcon and morph-to.
registerIcons([file, cloud, lock, menu, x, pause]);`],
        ['code', 'js', 'src/main.js', `import { createApp } from 'vue';
import App from './App.vue';
import './icons.js';

createApp(App).mount('#app');`],
        ['code', 'js', 'FileStatus.vue', `<script setup>
import { Icon, Fusion } from 'glyphfox/vue';

defineProps({ saved: Boolean });
</script>

<template>
  <Icon :name="saved ? 'file+check' : 'file'" />
  <Icon name="file+alert@tr" variant="duotone" />
  <Fusion :icons="['cloud', 'lock']" layout="overlap" :gap="1" />
</template>`],
        ['p', 'byname.fusion', 'A fusion is a real icon: it follows <code>weight</code>, <code>variant</code> and every other prop, and where the parts overlap the part behind is cut around the part in front. Layouts are overlap, side, stack, grid, orbit, badge and inside; <code>scale</code> and <code>offsets</code> fine tune the parts.'],
      ],
    },
    {
      id: 'morph',
      h: 'Morph between icons',
      blocks: [
        ['p', 'morph.p', 'There are three ways to morph. <code>MorphIcon</code> animates whenever its <code>name</code> changes. Any icon component takes <code>morph-to</code> with a trigger (mount, hover, click or state). And the <code>useMorph</code> composable returns the animated frames for your own rendering.'],
        ['code', 'js', 'MenuButton.vue', `<script setup>
import { ref } from 'vue';
import { MorphIcon } from 'glyphfox/vue';

const open = ref(false);
</script>

<template>
  <button type="button" aria-label="Menu" :aria-expanded="open" @click="open = !open">
    <MorphIcon :name="open ? 'x' : 'menu'" :duration="300" />
  </button>
</template>`],
        ['code', 'js', 'Triggers.vue', `<script setup>
import { HeartIcon, PlayIcon } from 'glyphfox/vue';

defineProps({ playing: Boolean });
</script>

<template>
  <!-- toggles on every click -->
  <HeartIcon morph-to="heart/solid" trigger="click" />
  <!-- shows pause while playing is true -->
  <PlayIcon morph-to="pause" trigger="state" :active="playing" />
</template>`],
        ['p', 'morph.composable', '<code>useMorph</code> accepts a ref, a getter or a plain value and returns a computed <code>{ icon, variant }</code> frame that animates whenever the spec changes. Pass the frame to <code>Icon</code> through its <code>icon</code> prop, or hand it to your own renderer.'],
        ['code', 'js', 'PlayToggle.vue', `<script setup>
import { ref } from 'vue';
import { Icon, useMorph } from 'glyphfox/vue';

const playing = ref(false);
const frame = useMorph(() => (playing.value ? 'pause' : 'play'), { duration: 250 });
</script>

<template>
  <button type="button" aria-label="Play" :aria-pressed="playing" @click="playing = !playing">
    <Icon v-if="frame" :icon="frame.icon" :variant="frame.variant" />
  </button>
</template>`],
        ['p', 'morph.pairs', 'Hand tuned pairs make common transitions feel designed: menu to x, play to pause, plus to check, sun to moon, eye to eye-off, bell to bell-ring, heart to heart/solid, copy to check, lock to unlock and wifi to wifi-off. Any other pair still morphs with an automatic match. The <a href="animated-icons.html">animated icons guide</a> covers durations, delays and reduced motion.'],
      ],
    },
    {
      id: 'living',
      h: 'Living states',
      blocks: [
        ['p', 'living.p', 'The <code>animate</code> prop adds a preset that understands the icon: draw traces the strokes in drawing order, shake swings from the top, and pop, wiggle, spin, pulse and bounce do what they say. The animation is a small stylesheet inside the svg, so it needs no CSS import and it stops for visitors who prefer reduced motion.'],
        ['code', 'js', 'Inbox.vue', `<script setup>
import { BellIcon, LoaderCircleIcon, SparklesIcon } from 'glyphfox/vue';

defineProps({ hasNews: Boolean, loading: Boolean });
</script>

<template>
  <BellIcon animate="shake" trigger="state" :active="hasNews" />
  <LoaderCircleIcon v-if="loading" animate="spin" />
  <SparklesIcon animate="draw" trigger="hover" />
</template>`],
      ],
    },
    {
      id: 'global',
      h: 'Global registration',
      blocks: [
        ['p', 'global.p', 'Importing icons where you use them keeps each bundle small. When a design system needs a fixed set in every template, register those components once with <code>app.component</code>. Give <code>Icon</code> a distinct name such as <code>GfIcon</code>, so it cannot collide with another global component.'],
        ['code', 'js', 'src/main.js', `import { createApp } from 'vue';
import { HomeIcon, SearchIcon, SettingsIcon, Icon } from 'glyphfox/vue';
import App from './App.vue';
import './icons.js';

const app = createApp(App);
app.component('HomeIcon', HomeIcon);
app.component('SearchIcon', SearchIcon);
app.component('SettingsIcon', SettingsIcon);
app.component('GfIcon', Icon);
app.mount('#app');`],
        ['p', 'global.ts', 'With TypeScript, declare the global components so templates are checked:'],
        ['code', 'js', 'src/glyphfox.d.ts', `import type { HomeIcon, SearchIcon, SettingsIcon, Icon } from 'glyphfox/vue';

declare module 'vue' {
  interface GlobalComponents {
    HomeIcon: typeof HomeIcon;
    SearchIcon: typeof SearchIcon;
    SettingsIcon: typeof SettingsIcon;
    GfIcon: typeof Icon;
  }
}

export {};`],
      ],
    },
    {
      id: 'typescript',
      h: 'TypeScript',
      blocks: [
        ['p', 'ts.p', 'Every component is typed as <code>GlyphComponent</code> with the shared props, so editors complete <code>variant</code>, <code>modifier</code>, <code>animate</code> and the rest. Icon specs are plain strings in the Vue types, because Vue prop inference cannot expand the full union of icon names. When you keep names in your own code, type them with <code>IconName</code> from <code>glyphfox</code> to catch typos at compile time.'],
        ['code', 'js', 'src/nav.ts', `import type { IconName } from 'glyphfox';

export const nav: { label: string; to: string; icon: IconName }[] = [
  { label: 'Home', to: '/', icon: 'home' },
  { label: 'Search', to: '/search', icon: 'search' },
  { label: 'Settings', to: '/settings', icon: 'settings' },
];`],
      ],
    },
    {
      id: 'bundle',
      h: 'Deep imports and bundle size',
      blocks: [
        ['p', 'bundle.p', 'Named imports from <code>glyphfox/vue</code> are tree shaken: the icon modules are marked free of side effects and each component is created with a pure call. In a Vite 8 production build (with Vue itself excluded), one icon component and the shared runtime come to about 53 KB minified, 20 KB gzip, and nine more icons add less than 1 KB gzip. The runtime carries the renderer, morph, fusion and modifier engines and is paid once.'],
        ['code', 'js', 'Logo.vue', `<script setup>
// One module, for tools that do not tree shake.
import { FoxIcon } from 'glyphfox/vue/icons/fox';
</script>

<template>
  <FoxIcon :size="32" variant="duotone" title="glyphfox" />
</template>`],
        ['p', 'bundle.more', 'The <a href="tree-shaking.html">tree shaking guide</a> explains what keeps the set out of your bundle and what pulls it back in.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'Every icon component, <code>Icon</code>, <code>Fusion</code> and <code>MorphIcon</code> takes the shared props. In templates you can write the kebab-case attribute from the second column.'],
        ['props', 'vue'],
        ['p', 'props.extra', '<code>Icon</code> adds <code>name</code>, <code>icon</code> (icon data) and <code>gap</code>. <code>Fusion</code> adds <code>icons</code>, <code>layout</code>, <code>gap</code>, <code>scale</code> and <code>offsets</code>. <code>MorphIcon</code> adds <code>name</code> and <code>icon</code>. A default slot renders inside the svg.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['An icon used by name is empty in production', 'The dev server pre-bundles the whole package, so every name resolves while you develop. A production build keeps only what you import, and Vite does not bundle the on demand loader that sits in node_modules: unregistered names in <code>Icon</code>, <code>Fusion</code>, <code>MorphIcon</code> or <code>morph-to</code> render an empty svg. Register them with <code>registerIcons</code>, as in <code>src/icons.js</code> above.'],
          ['Icon only buttons without a name', 'Icons are decorative by default and get <code>aria-hidden="true"</code>. A button that contains only an icon therefore has no accessible name. Put <code>aria-label</code> on the button, or give the icon a <code>title</code>. More patterns in the <a href="accessibility.html">accessibility guide</a>.'],
          ['morph-to plays as soon as the page loads', 'The default trigger is mount: the icon morphs to its target right after mounting. When the target is the state you want to show immediately, use <code>trigger="state"</code> with <code>:active</code>, which starts at the right end without an animation.'],
          ['Boolean props written as strings', '<code>active="false"</code> passes the string "false". glyphfox reads it as false, but Vue warns about the prop type. Write boolean props bare (<code>flip-x</code>) or bind them (<code>:active="playing"</code>).'],
          ['Star imports', '<code>import * as icons from \'glyphfox/vue\'</code> followed by <code>icons[name]</code> keeps every icon in the bundle, because the bundler cannot know which names you read. Build a small map of the components you need instead.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'vue2', q: 'Does glyphfox work with Vue 2?', a: 'The components need Vue 3.2 or newer. In a Vue 2 app, use the <code>&lt;glyph-fox&gt;</code> web component, which takes the same props as attributes; add <code>glyph-fox</code> to <code>Vue.config.ignoredElements</code> so Vue leaves the tag alone. See the <a href="web-components.html">web components guide</a>.' },
    { id: 'options-api', q: 'Can I use the components with the Options API?', a: 'Yes. They are regular components: list them in <code>components: { HomeIcon }</code> and use them in the template. <code>useMorph</code> is a composable, so it belongs in <code>setup()</code>.' },
    { id: 'own-icons', q: 'Can my own SVG icons get the same props?', a: 'Yes. <code>createIcon({ name, body, tags, categories })</code> from <code>glyphfox/vue</code> turns icon data into a component, where <code>body</code> is the inner markup of a 24 by 24 stroke icon. Run your SVG through Fox-ify in the <a href="../studio.html">studio</a> first, so it follows the grid, stroke and padding rules that weight and the other axes rely on.' },
  ],
};
