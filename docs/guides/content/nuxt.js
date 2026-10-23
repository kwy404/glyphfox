export default {
  slug: 'nuxt',
  group: 'frameworks',
  order: 40,
  icon: 'mountain',
  short: 'Nuxt',
  related: ['vue', 'ssr', 'tree-shaking'],
  title: 'Icons in Nuxt 3 and Nuxt 4 with glyphfox and SSR',
  description: 'Server render glyphfox icons in Nuxt: import components, register names in a plugin, wrap icons for auto import, keep morphs in sync and avoid empty icons.',
  h1: 'Icons in Nuxt',
  lead: 'glyphfox/vue renders on the server, so Nuxt pages arrive with real SVG in the HTML. This guide shows the setup, a plugin for shared icons, an auto imported wrapper, and how registration and morphs behave across the server and the browser.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['code', 'sh', 'terminal', `npm install glyphfox`],
        ['p', 'install.p', 'There is no Nuxt module to add. The Vue components live in <code>glyphfox/vue</code>, which ships as plain ES modules with a CommonJS build for <code>require</code>, so Nuxt imports it on the server and in the browser like any other dependency. Everything in the <a href="vue.html">Vue guide</a> applies; this page covers what changes when the same components render on the server first.'],
      ],
    },
    {
      id: 'pages',
      h: 'Use icons in pages and components',
      blocks: [
        ['code', 'js', 'pages/index.vue', `<script setup lang="ts">
import { SearchIcon, ArrowRightIcon } from 'glyphfox/vue';
</script>

<template>
  <form class="search" action="/search">
    <SearchIcon :size="18" />
    <input name="q" type="search" placeholder="Search the docs" aria-label="Search the docs">
    <button type="submit">
      Search <ArrowRightIcon :size="16" mirror-rtl />
    </button>
  </form>
</template>`],
        ['p', 'pages.p', 'The svg is part of the server HTML, so icons are visible before any JavaScript runs and they never shift the layout when the page hydrates. After hydration the same components handle triggers, morphs and state changes. <code>mirror-rtl</code> flips directional icons such as arrows when the page or a parent has <code>dir="rtl"</code>.'],
        ['p', 'pages.import', 'Importing the components in each file is the most explicit setup and the one that keeps every route chunk small: a page only carries the icons it uses.'],
      ],
    },
    {
      id: 'plugin',
      h: 'A plugin for shared icons',
      blocks: [
        ['p', 'plugin.p', 'A plugin is the place for two things: components that every template should see, and the data of names that only appear as strings, in <code>Icon</code>, <code>Fusion</code>, <code>MorphIcon</code> or <code>morph-to</code>.'],
        ['code', 'js', 'plugins/glyphfox.ts', `import { HomeIcon, SettingsIcon, Icon, registerIcons } from 'glyphfox/vue';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';
import moon from 'glyphfox/icons/moon';
import cloud from 'glyphfox/icons/cloud';
import lock from 'glyphfox/icons/lock';

// Runs once per process on the server and once in the browser.
registerIcons([menu, x, moon, cloud, lock]);

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('HomeIcon', HomeIcon);
  nuxtApp.vueApp.component('SettingsIcon', SettingsIcon);
  nuxtApp.vueApp.component('GfIcon', Icon);
});`],
        ['p', 'plugin.both', 'Keep this plugin universal, without a <code>.client</code> or <code>.server</code> suffix: the server needs the data to write the HTML and the browser needs the same data to hydrate it. On the server the registry is module state shared by every request, which is safe because icon data never changes.'],
      ],
    },
    {
      id: 'wrapper',
      h: 'An auto imported wrapper',
      blocks: [
        ['p', 'wrapper.p', 'Nuxt auto imports components from <code>components/</code>. A small wrapper gives the app one icon component with your defaults and a fixed list of names, so a typo fails type checking instead of rendering an empty svg.'],
        ['code', 'js', 'components/AppIcon.vue', `<script setup lang="ts">
import { Icon } from 'glyphfox/vue';
import home from 'glyphfox/icons/home';
import search from 'glyphfox/icons/search';
import settings from 'glyphfox/icons/settings';
import bell from 'glyphfox/icons/bell';

const icons = { home, search, settings, bell };

const props = withDefaults(defineProps<{ name: keyof typeof icons; label?: string; size?: number }>(), { size: 20 });
</script>

<template>
  <Icon :icon="icons[props.name]" :size="props.size" :weight="1.75" :title="props.label" />
</template>`],
        ['code', 'js', 'components/NotificationsButton.vue', `<template>
  <button type="button" aria-label="Notifications">
    <AppIcon name="bell" />
  </button>
</template>`],
        ['p', 'wrapper.data', 'Passing icon data through the <code>icon</code> prop skips the name registry entirely, so the wrapper renders the same markup on the server and in the browser no matter what was registered where. Without a <code>label</code> the icon stays decorative, which is right inside a labelled button.'],
      ],
    },
    {
      id: 'hydration',
      h: 'Morphs, animations and hydration',
      blocks: [
        ['p', 'hydration.p', 'The server renders a still frame. Living state animations are CSS inside the svg, so a spinner with <code>animate="spin"</code> already turns in the server HTML, unless the visitor prefers reduced motion. Morphs and the hover and click triggers need the component to hydrate first.'],
        ['p', 'hydration.mount', '<code>morph-to</code> with the default trigger (mount) renders the starting icon on the server and plays the morph right after hydration, which looks like a flicker on every page load. When the page should open in the target state, use <code>trigger="state"</code> with <code>:active</code> bound to shared state: the server renders the target, and the morph only plays when the state changes.'],
        ['code', 'js', 'components/ThemeToggle.vue', `<script setup lang="ts">
import { SunIcon } from 'glyphfox/vue';

const dark = useState('dark', () => false);
</script>

<template>
  <button type="button" aria-label="Dark theme" :aria-pressed="dark" @click="dark = !dark">
    <SunIcon morph-to="moon" trigger="state" :active="dark" />
  </button>
</template>`],
        ['p', 'hydration.state', '<code>useState</code> is serialized into the page payload, so the server and the browser start from the same value and the icon hydrates without a mismatch. The morph target <code>moon</code> is registered in the plugin above.'],
      ],
    },
    {
      id: 'bundle',
      h: 'Bundle and payload',
      blocks: [
        ['p', 'bundle.p', 'In a server rendered app an icon costs twice: the svg markup in the HTML, and the component code that hydrates it. The markup is small, a few paths per icon. Measured in a Vite 8 production build, the shared Vue runtime of glyphfox is about 20 KB gzip and each icon component adds roughly 0.1 KB gzip, so the runtime dominates and extra icons are cheap.'],
        ['p', 'bundle.payload', 'Keep icon data out of <code>useState</code> and <code>useAsyncData</code>. Everything stored there is serialized into the HTML of every page that uses it. Import the icon modules instead; they are cached with the rest of your JavaScript.'],
        ['p', 'bundle.islands', 'For icons that never change, such as a footer or a static marketing section, a server component renders the markup without shipping any icon code. Enable component islands and name the component with a <code>.server.vue</code> suffix:'],
        ['code', 'js', 'nuxt.config.ts', `export default defineNuxtConfig({
  experimental: { componentIslands: true },
});`],
        ['code', 'js', 'components/FooterLinks.server.vue', `<script setup lang="ts">
import { GitBranchIcon, RssIcon, MailIcon } from 'glyphfox/vue';
</script>

<template>
  <ul class="footer-links">
    <li><a href="https://github.com/kwy404/glyphfox"><GitBranchIcon :size="18" /> Source</a></li>
    <li><a href="/feed.xml"><RssIcon :size="18" /> Feed</a></li>
    <li><a href="mailto:hello@example.com"><MailIcon :size="18" /> Contact</a></li>
  </ul>
</template>`],
      ],
    },
    {
      id: 'on-demand',
      h: 'Names that are not registered',
      blocks: [
        ['p', 'ondemand.p', 'A name that nobody registered is fetched by a dynamic import inside the package. Nuxt builds with Vite, and Vite skips dynamic imports with variables when they live in <code>node_modules</code>, so in a production build those names never load. If you truly need any name at runtime, for example in an icon picker, let Vite bundle the loader. It then emits one small chunk per icon, fetched only when that name is used:'],
        ['code', 'js', 'nuxt.config.ts', `export default defineNuxtConfig({
  vite: {
    build: {
      dynamicImportVarsOptions: { exclude: [/node_modules\\/(?!glyphfox\\/)/] },
    },
  },
});`],
        ['p', 'ondemand.server', 'This only helps after hydration. The server render does not wait for a dynamic import, so an icon that must be in the HTML still needs to be registered or imported as a component.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'The components are the ones from <code>glyphfox/vue</code>, with the same props. In templates you can use the kebab-case attribute names.'],
        ['props', 'vue'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Works in development, empty in production', 'The dev server pre-bundles the whole package, so every name resolves locally. The production build keeps only your imports and leaves the on demand loader out, so names used only in strings render an empty svg. Register them in the universal plugin.'],
          ['An icon renders on the server, then disappears', 'When the server loads glyphfox without tree shaking, importing <code>glyphfox/vue</code> there registers every icon, while the browser bundle registers only what you import. A name used only as a string can then appear in the server HTML and go empty after hydration, with a hydration warning in the console. Registering every such name explicitly removes the difference.'],
          ['Registering in a client only plugin', 'A <code>plugins/glyphfox.client.ts</code> runs after the server has already rendered the page, so the HTML contains empty icons that pop in later. Use a plugin without a suffix.'],
          ['A morph that plays on every page load', '<code>morph-to</code> with the default mount trigger animates right after hydration. Use <code>trigger="state"</code> with state from <code>useState</code>, as in the theme toggle above.'],
          ['Different names on the server and in the browser', 'Choosing an icon from <code>window</code>, <code>localStorage</code> or the current time gives the browser a different first render than the server, and Vue reports a hydration mismatch. Read such values in <code>onMounted</code>, or store them in a cookie the server can read.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'module', q: 'Do I need a Nuxt module for glyphfox?', a: 'No. Import components from <code>glyphfox/vue</code> where you use them, or register a shared set in a plugin. A module would only add global registration, which a ten line plugin already gives you without hiding which icons end up in the bundle.' },
    { id: 'generate', q: 'Does it work with nuxt generate and prerendered routes?', a: 'Yes. Prerendering runs the same server render at build time, so the generated HTML files contain the svg markup. The registration rule is the same: a name the build cannot resolve is written as an empty svg.' },
  ],
};
