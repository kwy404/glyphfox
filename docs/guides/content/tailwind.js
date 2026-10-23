export default {
  slug: 'tailwind',
  group: 'topics',
  order: 10,
  icon: 'wind',
  short: 'Tailwind CSS',
  related: ['accessibility', 'animated-icons', 'astro', 'html-cdn'],
  title: 'Tailwind CSS icons as utility classes with glyphfox',
  description: 'Use glyphfox icons as Tailwind CSS v3 and v4 classes: setup, the gf class syntax, styles and weights after the slash, badges, fusions, animations and options.',
  h1: 'Tailwind CSS icons',
  lead: 'The glyphfox Tailwind plugin turns every icon into a utility class. Icons render as a CSS mask filled with <code>currentColor</code>, so the text color, font size and opacity utilities you already use style them too.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'The plugin ships inside the main package as <code>glyphfox/tailwind</code>. Tailwind CSS is an optional peer dependency, and the same plugin works with Tailwind CSS v3 and v4.'],
        ['code', 'sh', 'terminal', 'npm install glyphfox'],
        ['p', 'install.v4', 'With Tailwind CSS v4, register the plugin in the stylesheet that imports Tailwind:'],
        ['code', 'css', 'app.css', `@import "tailwindcss";
@plugin "glyphfox/tailwind";`],
        ['p', 'install.v3', 'With Tailwind CSS v3, add it to the <code>plugins</code> array of your config file:'],
        ['code', 'js', 'tailwind.config.js', `module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx,vue,svelte}'],
  plugins: [require('glyphfox/tailwind')],
};`],
        ['p', 'install.p2', 'Nothing else is needed: no font files, no sprite and no JavaScript in the browser. The plugin reads the icon data at build time and writes one CSS rule for every icon class it finds in your source files.'],
      ],
    },
    {
      id: 'first',
      h: 'Your first icon classes',
      blocks: [
        ['p', 'first.p', 'An icon class is the prefix <code>gf-</code> followed by the icon name. Put it on an empty inline element, usually a <code>span</code>. The class makes the element an inline block of <code>1em</code> by <code>1em</code>, aligns it with the text baseline and paints it with the current text color.'],
        ['code', 'js', 'index.html', `<button class="inline-flex items-center gap-2 text-sm text-zinc-200">
  <span class="gf-download" aria-hidden="true"></span>
  Download
</button>

<span class="gf-home text-2xl text-orange-500" aria-hidden="true"></span>
<span class="gf-heart text-4xl text-rose-500 opacity-80" aria-hidden="true"></span>`],
        ['p', 'first.size', 'Because the box is <code>1em</code> square, text size utilities size the icon: <code>text-sm</code> gives a 14 pixel icon, <code>text-2xl</code> a 24 pixel one. Inside a button the icon follows the button text with no extra classes, which keeps icon and label in proportion at every breakpoint.'],
        ['p', 'first.color', 'Color comes from <code>color</code>, so <code>text-*</code> utilities, <code>hover:</code> and <code>dark:</code> variants and inherited colors all apply. Under the hood the icon is the background color of the element, set to <code>currentColor</code> and seen through a mask of the icon shape. That is why text color utilities color it and <code>opacity-*</code> fades it like any other element.'],
        ['p', 'first.names', 'Every name from the <a href="../icons.html">icon browser</a> works, for example <a href="../icons/arrow-right.html">arrow-right</a>, <a href="../icons/settings.html">settings</a> or <a href="../icons/bell-ring.html">bell-ring</a>. A class with a name that does not exist produces no CSS at all, so a typo shows up as an empty space rather than a broken style.'],
      ],
    },
    {
      id: 'axes',
      h: 'Styles, corners and weight after the slash',
      blocks: [
        ['p', 'axes.p', 'The three axes every glyphfox icon has are written after a slash, joined with dashes. Each combination is its own mask, rendered from the same geometry the components use.'],
        ['code', 'js', 'axes.html', `<span class="gf-folder/solid"></span>
<span class="gf-folder/duotone"></span>
<span class="gf-search/sharp"></span>
<span class="gf-search/w1.5"></span>
<span class="gf-heart/duotone-sharp-w2.5"></span>`],
        ['ul', 'axes.list', [
          '<code>solid</code> fills the closed shapes and cuts the inner lines out as negative space. <code>duotone</code> keeps the outline and adds the second layer at its own opacity. <code>outline</code> is the default.',
          '<code>sharp</code> switches to miter joins and square caps; <code>round</code> is the default.',
          '<code>w1</code> to <code>w3</code> set the stroke weight on the 24 grid, in steps as fine as you like: <code>w1.5</code>, <code>w2.25</code>.',
        ]],
        ['p', 'axes.note', 'A mask carries shape and transparency, not color. The duotone layer therefore shows as a lighter area of the same color, not as a second color. When you need two colors, render the icon as inline SVG with a component or <code>toSvg</code> and set <code>secondaryColor</code>.'],
      ],
    },
    {
      id: 'compose',
      h: 'Badges and fusions',
      blocks: [
        ['p', 'compose.p', 'The name syntax shared by every glyphfox package also works in classes: <code>file+check</code> adds a modifier badge, <code>@tl</code>, <code>@tr</code>, <code>@bl</code> or <code>@br</code> moves it to a corner, and <code>cloud&amp;lock</code> fuses two or more icons into one. Tailwind CSS v4 only accepts <code>+</code> and <code>&amp;</code> inside square brackets, so write these specs as arbitrary values:'],
        ['code', 'js', 'compose.html', `<!-- Tailwind CSS v4 and v3 -->
<span class="gf-[file+check]"></span>
<span class="gf-[file+check]/tr"></span>
<span class="gf-[cloud&lock]"></span>
<span class="gf-[cloud&lock]/side"></span>
<span class="gf-[shield&heart]/inside"></span>

<!-- Tailwind CSS v4 also accepts the layout inside the brackets -->
<span class="gf-[cloud&lock:side]"></span>

<!-- Tailwind CSS v3 also accepts the short form -->
<span class="gf-file+check"></span>
<span class="gf-file+check/tr"></span>`],
        ['p', 'compose.tokens', 'After the slash, a corner token (<code>tl</code>, <code>tr</code>, <code>bl</code>, <code>br</code>) places the badge and a layout token (<code>overlap</code>, <code>side</code>, <code>stack</code>, <code>grid</code>, <code>orbit</code>, <code>badge</code>, <code>inside</code>) arranges a fusion. They combine with the axes: <code>gf-[cloud&amp;lock]/side-solid</code> is a side by side fusion in the solid style.'],
        ['p', 'compose.combos', 'In v3 every <code>name+modifier</code> pair is available in the short form out of the box. Fusions in the short form need to be listed with the <code>combos</code> option shown below; the bracket form needs no configuration in either version.'],
      ],
    },
    {
      id: 'animate',
      h: 'Animation classes',
      blocks: [
        ['p', 'animate.p', 'The plugin also adds six animation utilities: <code>gf-spin</code>, <code>gf-pulse</code>, <code>gf-pop</code>, <code>gf-wiggle</code>, <code>gf-bounce</code> and <code>gf-shake</code>. They use the same timing as the living states of the components. Spin and pulse loop; the others play once when the class is applied.'],
        ['code', 'js', 'animate.html', `<span class="gf-loader-circle gf-spin text-xl" aria-hidden="true"></span>
<span class="gf-bell gf-shake text-xl" aria-hidden="true"></span>

<!-- replay on hover with a variant -->
<span class="gf-heart text-xl hover:gf-pop" aria-hidden="true"></span>`],
        ['p', 'animate.scope', 'These classes move the whole element with <code>transform</code> and <code>opacity</code>. They cannot trace strokes one by one, so there is no <code>draw</code> class, and they cannot morph one icon into another. For those, use inline SVG: the <a href="animated-icons.html">animated icons guide</a> covers both. Every animation class switches itself off under <code>prefers-reduced-motion: reduce</code>.'],
      ],
    },
    {
      id: 'options',
      h: 'Plugin options',
      blocks: [
        ['p', 'options.p', 'The plugin takes six options. In Tailwind CSS v4 pass them in a block after <code>@plugin</code>; in v3 call the plugin as a function.'],
        ['code', 'css', 'app.css', `@import "tailwindcss";
@plugin "glyphfox/tailwind" {
  prefix: icon;
  variant: duotone;
  weight: 1.5;
}`],
        ['code', 'js', 'tailwind.config.js', `const glyphfox = require('glyphfox/tailwind');

module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
  plugins: [
    glyphfox({
      prefix: 'icon',            // icon-home, icon-spin
      size: '1.25em',            // box size, 1em by default
      corners: 'sharp',          // default axes for every class
      weight: 1.75,
      combos: ['cloud&lock', 'file+check@tr'],
    }),
  ],
};`],
        ['table', 'options.table', ['Option', 'Default', 'Effect'], [
          ['<code>prefix</code>', '<code>gf</code>', 'Prefix of the icon classes and of the animation classes.'],
          ['<code>size</code>', '<code>1em</code>', 'Width and height of every icon box. Keep a relative unit so text utilities keep working.'],
          ['<code>variant</code>', '<code>outline</code>', 'Default style; a token after the slash still overrides it.'],
          ['<code>corners</code>', '<code>round</code>', 'Default corners.'],
          ['<code>weight</code>', '<code>2</code>', 'Default stroke weight.'],
          ['<code>combos</code>', 'none', 'Extra specs exposed as short classes, such as <code>cloud&amp;lock</code>; mostly useful in v3.'],
        ]],
      ],
    },
    {
      id: 'props',
      h: 'Class reference',
      blocks: [
        ['p', 'props.p', 'Classes replace props here. This is every token the plugin understands; the full name syntax is described in the <a href="../docs.html#syntax">docs</a>.'],
        ['table', 'props.table', ['Class or token', 'Meaning', 'Example'], [
          ['<code>gf-NAME</code>', 'an icon', '<code>gf-search</code>'],
          ['<code>gf-[NAME+MODIFIER]</code>', 'a modifier badge: plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down, dot', '<code>gf-[user+plus]</code>'],
          ['<code>gf-[A&amp;B]</code>', 'a fusion of 2 to 10 icons', '<code>gf-[cloud&amp;lock]</code>'],
          ['<code>/outline</code>, <code>/duotone</code>, <code>/solid</code>', 'style axis', '<code>gf-star/solid</code>'],
          ['<code>/round</code>, <code>/sharp</code>', 'corners axis', '<code>gf-square/sharp</code>'],
          ['<code>/w1</code> to <code>/w3</code>', 'weight axis', '<code>gf-search/w1.5</code>'],
          ['<code>/tl</code>, <code>/tr</code>, <code>/bl</code>, <code>/br</code>', 'badge corner', '<code>gf-[file+check]/tl</code>'],
          ['<code>/overlap</code>, <code>/side</code>, <code>/stack</code>, <code>/grid</code>, <code>/orbit</code>, <code>/badge</code>, <code>/inside</code>', 'fusion layout', '<code>gf-[cloud&amp;lock]/side</code>'],
          ['<code>gf-spin</code>, <code>gf-pulse</code>, <code>gf-pop</code>, <code>gf-wiggle</code>, <code>gf-bounce</code>, <code>gf-shake</code>', 'animation', '<code>gf-loader gf-spin</code>'],
        ]],
      ],
    },
    {
      id: 'a11y',
      h: 'Accessibility',
      blocks: [
        ['p', 'a11y.p', 'A mask icon is an empty element with a background. Assistive technology sees nothing, which is right for a decorative icon next to a label: add <code>aria-hidden="true"</code> so the empty element is skipped. When the icon is the only content of a control, the control needs a name of its own:'],
        ['code', 'js', 'a11y.html', `<button type="button" class="p-2 text-zinc-300 hover:text-white">
  <span class="gf-settings text-xl" aria-hidden="true"></span>
  <span class="sr-only">Settings</span>
</button>`],
        ['p', 'a11y.forced', 'In Windows high contrast mode the browser replaces background colors with system colors, and a mask icon can disappear into the page. Give your icon spans a shared class and restore the color in that mode:'],
        ['code', 'css', 'app.css', `@media (forced-colors: active) {
  .icon {
    forced-color-adjust: none;
    background-color: CanvasText;
  }
}`],
        ['p', 'a11y.more', 'The <a href="accessibility.html">accessibility guide</a> covers labels, contrast and motion for every way of rendering glyphfox icons.'],
      ],
    },
    {
      id: 'size',
      h: 'What it adds to your CSS',
      blocks: [
        ['p', 'size.p', 'Tailwind generates rules only for the classes it finds in your files, and the plugin follows the same rule: an icon you never write costs nothing. Each icon class you do use embeds its mask as a small data URI, around 300 bytes for a simple shape such as <code>home</code> or <code>file</code> and close to 1 KB for a detailed one such as <code>settings</code>, before compression. Every style, weight or corner variant of the same icon is a separate rule with its own data URI.'],
        ['p', 'size.p2', 'For a page with a few dozen icons that is a few kilobytes of CSS and no requests at all. If you use hundreds of icons on every page, or many variants of each, compare with an <a href="svg-sprite.html">SVG sprite</a>, which the browser caches as one file.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Class names built from pieces', 'Tailwind finds classes by scanning your files for complete strings. <code>`gf-${name}`</code> never appears in full, so no CSS is generated. Map values to complete class names, such as <code>{ saved: \'gf-[file+check]\', error: \'gf-[file+alert]\' }</code>, or add the names you need to a safelist.'],
          ['Plus and ampersand without brackets in v4', 'In Tailwind CSS v4, <code>gf-file+check</code> and <code>gf-cloud&amp;lock</code> are not valid class candidates and produce nothing. Use <code>gf-[file+check]</code> and <code>gf-[cloud&amp;lock]</code>, which work in both versions.'],
          ['Width utilities fighting the icon size', 'The icon class sets <code>width</code> and <code>height</code> to the <code>size</code> option. A <code>size-6</code> or <code>w-6</code> on the same element sets the same properties, and which one wins depends on the order of the rules in the generated CSS. Size icons with text utilities, or change the <code>size</code> option once.'],
          ['Two colors', 'A mask paints a single color. <code>/duotone</code> gives a translucent second layer of the same color; for a real second color, render inline SVG with <code>secondaryColor</code>.'],
          ['Content inside the element', 'The icon is the background of the element. Text or children inside it render on top of the icon, and a <code>bg-*</code> utility replaces the icon color. Keep icon elements empty.'],
          ['Animations on hidden elements', 'A <code>gf-pop</code> or <code>gf-shake</code> class plays once when the element is rendered. If it is rendered while hidden, the animation finishes before anyone sees it. Add the class when the change happens, or use a component with <code>trigger="state"</code>.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'versions', q: 'Does the plugin work with Tailwind CSS v3 and v4?', a: 'Yes, it is the same plugin. In v4 register it with <code>@plugin "glyphfox/tailwind"</code> in your CSS and write badges and fusions in brackets; in v3 add <code>require(\'glyphfox/tailwind\')</code> to <code>plugins</code>, where the short forms also work.' },
    { id: 'frameworks', q: 'Can I use the icon classes in React, Vue or Svelte?', a: 'Yes. The classes are plain CSS, so they work in any template, including server rendered and static pages. Use the framework components instead when you need two colors, the <code>draw</code> animation, morphing or an accessible name on the icon itself.' },
  ],
};
