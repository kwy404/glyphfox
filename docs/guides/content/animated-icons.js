export default {
  slug: 'animated-icons',
  group: 'topics',
  order: 20,
  icon: 'sparkles',
  short: 'Animated icons',
  related: ['react', 'accessibility', 'tailwind', 'web-components'],
  title: 'Animated SVG icons: morphs and living states in glyphfox',
  description: 'Animate glyphfox icons: draw, pop, spin and shake presets, hover, click and state triggers, morphs between icons, CSS only morphs and reduced motion.',
  h1: 'Animated icons',
  lead: 'glyphfox animates icons in two ways. Living states are presets such as draw, pop or shake that play on a trigger. Morphs reshape one icon into another. Both work in every package and both turn themselves off for people who ask for reduced motion.',
  sections: [
    {
      id: 'setup',
      h: 'Setup',
      blocks: [
        ['p', 'setup.p', 'There is nothing extra to install: animation is part of the shared props. The examples below use <code>glyphfox/react</code>; the props have the same names in <a href="vue.html">Vue</a>, <a href="svelte.html">Svelte</a>, <a href="angular.html">Angular</a> and the <a href="web-components.html">web component</a>, where they are attributes in kebab-case.'],
        ['code', 'sh', 'terminal', 'npm install glyphfox'],
        ['p', 'setup.p2', 'A living state is a few lines of CSS that travel inside the SVG itself, in a <code>&lt;style&gt;</code> element scoped to a class generated for that icon. That is why the same animation works in a component, in the string from <code>toSvg</code>, in a data URI or in an exported file, with no stylesheet to import.'],
      ],
    },
    {
      id: 'presets',
      h: 'The seven presets',
      blocks: [
        ['p', 'presets.p', 'Each preset is tuned for icons rather than generic elements. <code>draw</code> traces the strokes in the order they were drawn and fades in the fill layer at the end. <code>shake</code> swings from the top, like a bell on a hook. The others move the whole icon around its center.'],
        ['table', 'presets.table', ['Preset', 'Motion', 'Duration', 'Loops by default'], [
          ['<code>draw</code>', 'traces each stroke, one after another', '1100 ms', 'no'],
          ['<code>pop</code>', 'grows in from 55 percent with a little overshoot', '520 ms', 'no'],
          ['<code>wiggle</code>', 'rotates left and right, settling down', '720 ms', 'no'],
          ['<code>spin</code>', 'full turn at a constant speed', '1000 ms', 'yes'],
          ['<code>pulse</code>', 'shrinks and fades a little, then returns', '1500 ms', 'yes'],
          ['<code>bounce</code>', 'jumps up, then settles with two smaller bounces', '900 ms', 'no'],
          ['<code>shake</code>', 'swings from the top with decreasing amplitude', '950 ms', 'no'],
        ]],
        ['code', 'js', 'Presets.jsx', `import { LoaderCircleIcon, SparklesIcon, BellIcon, HeartIcon } from 'glyphfox/react';

export function Presets({ hasNews, liked }) {
  return (
    <>
      <LoaderCircleIcon animate="spin" />
      <SparklesIcon animate="draw" />
      <BellIcon animate="shake" trigger="state" active={hasNews} />
      <HeartIcon animate="pop" trigger="click" variant={liked ? 'solid' : 'outline'} />
    </>
  );
}`],
        ['p', 'presets.timing', '<code>duration</code> and <code>delay</code> take milliseconds. <code>loop</code> takes <code>true</code> for forever or a number of runs; spin and pulse loop unless you pass <code>loop={false}</code>. A looping <code>draw</code> alternates direction, so the icon draws itself and then erases itself instead of jumping back.'],
      ],
    },
    {
      id: 'triggers',
      h: 'Triggers',
      blocks: [
        ['p', 'triggers.p', 'The <code>trigger</code> prop decides when a preset plays:'],
        ['ul', 'triggers.list', [
          '<code>mount</code>, the default, plays when the icon first renders.',
          '<code>hover</code> plays while the pointer is over the icon or over its direct parent, so an icon inside a button animates when the button is hovered.',
          '<code>click</code> replays on every click on the icon.',
          '<code>state</code> plays while <code>active</code> is true. This is the trigger to use for anything your application decides: a new notification, a failed save, a finished upload.',
        ]],
        ['code', 'js', 'Notifications.jsx', `import { BellIcon } from 'glyphfox/react';

export function NotificationsButton({ unread }) {
  return (
    <button type="button" aria-label={\`Notifications, \${unread} unread\`}>
      <BellIcon animate="shake" trigger="state" active={unread > 0} loop={2} />
    </button>
  );
}`],
        ['p', 'triggers.static', 'In static markup the triggers map to plain CSS hooks. A <code>state</code> animation plays while the <code>svg</code> element has the class <code>gf-on</code>, so server rendered HTML and strings from <code>toSvg</code> can be driven with one line of script: <code>svg.classList.toggle(\'gf-on\', unread &gt; 0)</code>. <code>hover</code> needs no script at all.'],
      ],
    },
    {
      id: 'morph',
      h: 'Morph one icon into another',
      blocks: [
        ['p', 'morph.p', 'The morph engine flattens both icons into strands, matches them with an optimal assignment, resamples them to the same number of points and interpolates. Strands without a partner shrink and fade. Any two icons can morph; ten pairs are tuned by hand so they feel designed rather than computed:'],
        ['table', 'morph.pairs', ['From', 'To'], [
          ['<a href="../icons/menu.html">menu</a>', '<a href="../icons/x.html">x</a>'],
          ['<a href="../icons/play.html">play</a>', '<a href="../icons/pause.html">pause</a>'],
          ['<a href="../icons/plus.html">plus</a>', '<a href="../icons/check.html">check</a>'],
          ['<a href="../icons/sun.html">sun</a>', '<a href="../icons/moon.html">moon</a>'],
          ['<a href="../icons/eye.html">eye</a>', '<a href="../icons/eye-off.html">eye-off</a>'],
          ['<a href="../icons/bell.html">bell</a>', '<a href="../icons/bell-ring.html">bell-ring</a>'],
          ['<a href="../icons/heart.html">heart</a>', 'heart in the solid style'],
          ['<a href="../icons/copy.html">copy</a>', '<a href="../icons/check.html">check</a>'],
          ['<a href="../icons/lock.html">lock</a>', '<a href="../icons/unlock.html">unlock</a>'],
          ['<a href="../icons/wifi.html">wifi</a>', '<a href="../icons/wifi-off.html">wifi-off</a>'],
        ]],
        ['p', 'morph.ways', 'There are three ways to ask for a morph. <code>MorphIcon</code> morphs whenever its <code>name</code> changes. <code>morphTo</code> on any icon morphs toward a target when its trigger fires and back when it stops. Hooks and stores (<code>useMorph</code> in React and Vue, <code>morphStore</code> in Svelte) hand you the frames for your own rendering.'],
        ['code', 'js', 'CopyButton.jsx', `import { useState } from 'react';
import { MorphIcon, MenuIcon, registerIcons } from 'glyphfox/react';
import { iconCopy, iconCheck, iconX } from 'glyphfox';

// Morph targets are looked up by name: register their data once.
registerIcons([iconCopy, iconCheck, iconX]);

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" onClick={copy}>
      <MorphIcon name={copied ? 'check' : 'copy'} duration={300} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function MenuButton({ open, onToggle }) {
  return (
    <button type="button" aria-expanded={open} aria-label="Menu" onClick={onToggle}>
      <MenuIcon morphTo="x" trigger="state" active={open} />
    </button>
  );
}`],
        ['p', 'morph.duration', 'Morphs take 450 ms unless you pass <code>duration</code>. With <code>trigger="state"</code> the icon follows <code>active</code> in both directions, which suits toggles such as a menu, a password field (<code>eye</code> to <code>eye-off</code>) or a play button.'],
      ],
    },
    {
      id: 'frameworks',
      h: 'The same morphs in Vue, Svelte and the web component',
      blocks: [
        ['code', 'js', 'PlayButton.vue', `<script setup>
import { ref } from 'vue';
import { MorphIcon, registerIcons } from 'glyphfox/vue';
import { iconPlay, iconPause } from 'glyphfox';

registerIcons([iconPlay, iconPause]);
const playing = ref(false);
</script>

<template>
  <button type="button" :aria-label="playing ? 'Pause' : 'Play'" @click="playing = !playing">
    <MorphIcon :name="playing ? 'pause' : 'play'" />
  </button>
</template>`],
        ['code', 'js', 'ThemeToggle.svelte', `<script>
  import { Icon, morphStore, registerIcons } from 'glyphfox/svelte';
  import { iconSun, iconMoon } from 'glyphfox';

  registerIcons([iconSun, iconMoon]);
  const icon = morphStore('sun', { duration: 400 });
  let dark = $state(false);
</script>

<button type="button" aria-label="Dark theme" aria-pressed={dark}
  onclick={() => { dark = !dark; icon.set(dark ? 'moon' : 'sun'); }}>
  {#if $icon}<Icon icon={$icon.icon} variant={$icon.variant} />{/if}
</button>`],
        ['code', 'js', 'index.html', `<script src="https://cdn.jsdelivr.net/npm/glyphfox@1"></script>

<button type="button" id="menu" aria-expanded="false" aria-label="Menu">
  <glyph-fox name="menu" morph duration="300"></glyph-fox>
</button>

<script>
  const button = document.getElementById('menu');
  const icon = button.querySelector('glyph-fox');
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    icon.setAttribute('name', open ? 'x' : 'menu');
  });
</script>`],
        ['p', 'frameworks.p', 'The <code>morph</code> attribute makes <code>&lt;glyph-fox&gt;</code> animate every change of <code>name</code>. The CDN build already contains every icon, so no registration is needed there.'],
      ],
    },
    {
      id: 'css-only',
      h: 'Morphs without JavaScript',
      blocks: [
        ['p', 'css-only.p', '<code>toSvg</code> with <code>morphTo</code> returns an SVG whose paths carry the start shape and switch to the target with a CSS <code>d</code> transition. Browsers without CSS <code>d</code> support cross fade to the exact target instead. The result is a plain string, ready for server templates, static sites or a CMS.'],
        ['code', 'js', 'build-icons.js', `import { toSvg } from 'glyphfox';

// Morphs while the pointer is over the icon or its direct parent.
const menu = toSvg('menu', { morphTo: 'x', trigger: 'hover', duration: 300 });

// Morphs while the svg has the class gf-on: toggle it from any script.
const play = toSvg('play', { morphTo: 'pause', trigger: 'state' });`],
        ['p', 'css-only.cli', 'The CLI writes the same file: <code>npx glyphfox morph menu x --trigger hover --out menu.svg</code>. Only <code>toSvg</code> resolves a target given as a name; <code>renderToString</code> from <code>glyphfox/core</code> expects icon data for <code>morphTo</code>.'],
      ],
    },
    {
      id: 'css-classes',
      h: 'Tailwind CSS animation classes',
      blocks: [
        ['p', 'css-classes.p', 'Icons rendered with the <a href="tailwind.html">Tailwind CSS plugin</a> are masks, not SVG, so they take whole element animations: <code>gf-spin</code>, <code>gf-pulse</code>, <code>gf-pop</code>, <code>gf-wiggle</code>, <code>gf-bounce</code> and <code>gf-shake</code>, with the same timing as the presets. They work with variants such as <code>hover:gf-wiggle</code>. Draw and morphs need inline SVG.'],
      ],
    },
    {
      id: 'motion',
      h: 'Reduced motion',
      blocks: [
        ['p', 'motion.p', 'Every preset carries a <code>prefers-reduced-motion: reduce</code> rule that turns its animation off, the CSS only morph switches without a transition, and the JavaScript morphs of the components jump straight to the final shape. You do not need to check the setting yourself. People who set it still see the final state: the solid heart, the x of an open menu, the check after a copy.'],
        ['p', 'motion.p2', 'Reduced motion is not the only reason to keep animation short. Motion draws the eye, so reserve looping animations for things that are in progress, such as a <code>loader-circle</code> that spins while a request runs, and stop them when the work is done. The <a href="accessibility.html">accessibility guide</a> has more on motion and meaning.'],
      ],
    },
    {
      id: 'export',
      h: 'Export animated files',
      blocks: [
        ['p', 'export.p', 'The customizer in the <a href="../icons.html">icon browser</a> exports any icon with a preset as an animated SVG, a GIF or a WebM video, using the exact same motion: the GIF and WebM frames are sampled from the preset timing. Use the animated SVG wherever SVG is accepted, and GIF or WebM for slides, documentation tools and chat apps that strip SVG.'],
      ],
    },
    {
      id: 'performance',
      h: 'Performance',
      blocks: [
        ['ul', 'performance.list', [
          'Presets other than <code>draw</code> animate <code>transform</code> and <code>opacity</code> only, which browsers run without layout work. <code>draw</code> animates <code>stroke-dashoffset</code>, which repaints the icon on every frame: fine for a few icons, worth avoiding on long lists.',
          'Component morphs run on <code>requestAnimationFrame</code> and re-render the icon each frame for the length of the morph. A handful at once is cheap; hundreds starting together are not.',
          'The generated class names are hashes of the settings, so identical icons produce identical markup and the server and client output match.',
        ]],
      ],
    },
    {
      id: 'props',
      h: 'Animation props',
      blocks: [
        ['p', 'props.p', 'These are the props that control motion. Every other shared prop, such as <code>variant</code> or <code>weight</code>, can be combined with them.'],
        ['props', 'react', ['animate', 'trigger', 'active', 'duration', 'delay', 'loop', 'morphTo']],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Morph targets that render nothing', 'Morph targets, <code>MorphIcon</code> names and <code>morphStore</code> names are looked up by name. A name whose data was never imported or registered is loaded on demand, and in a Vite production build that load does not happen because Vite leaves the variable dynamic import inside <code>node_modules</code> untouched. The target stays empty. Register every name you morph to with <code>registerIcons</code>. Importing a component such as <code>CheckIcon</code> only for its side effect does not help, because tree shaking removes an import that is never used.'],
          ['Hover and click outside the icon', 'A hover preset on inline SVG also responds to the direct parent, through CSS. Everything driven by events does not: <code>trigger="click"</code> and the hover trigger of a morph listen on the icon itself, and <code>glyph-fox</code> only reacts to the pointer on the element itself. Clicking the padding of a button does not reach them. Keep the state in the button and pass it down with <code>trigger="state"</code> and <code>active</code>.'],
          ['Mount animations that replay', 'A <code>mount</code> animation plays every time the icon mounts: when a list re-renders with new keys, when a route changes, and on <code>glyph-fox</code> whenever one of its attributes changes. If an icon should animate once, use <code>trigger="state"</code> and decide in your code when it plays.'],
          ['State animations that never stop', 'A preset with <code>loop</code> keeps playing while <code>active</code> stays true. Set <code>active</code> back to false when the event is handled, or give <code>loop</code> a number.'],
          ['Static markup and clicks', 'In HTML from <code>toSvg</code> nothing listens for clicks. Use <code>trigger: \'state\'</code> and toggle the <code>gf-on</code> class from your own handler.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'no-js', q: 'Do animated icons need JavaScript?', a: 'Living states do not: the CSS is inside the SVG, so a server rendered or static icon animates on mount and on hover with no script. The CSS only morph from <code>toSvg</code> also runs without a framework. Component morphs such as <code>MorphIcon</code> use JavaScript to compute the frames.' },
    { id: 'combine', q: 'Can an icon morph and play a preset at the same time?', a: 'Yes. <code>animate</code> and <code>morphTo</code> are independent props, so a heart can pop on click while it morphs to the solid style: <code>&lt;HeartIcon animate="pop" morphTo="heart/solid" trigger="click" /&gt;</code>.' },
  ],
};
