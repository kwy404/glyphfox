export default {
  slug: 'svg-sprite',
  group: 'topics',
  order: 50,
  icon: 'grid',
  short: 'SVG sprites',
  related: ['tree-shaking', 'html-cdn', 'accessibility', 'tailwind'],
  title: 'SVG sprite icons with glyphfox: use, symbols and subsets',
  description: 'Use glyphfox icons from an SVG sprite: symbol ids, use references, the same origin rule, inline sprites, CLI subsets, styling limits and caching.',
  h1: 'SVG sprites',
  lead: 'A sprite is one SVG file with a symbol per icon. Pages reference the symbols with <code>&lt;use&gt;</code>, the browser downloads and caches the file once, and no JavaScript runs at all.',
  sections: [
    {
      id: 'install',
      h: 'Get the sprite',
      blocks: [
        ['p', 'install.p', 'The package ships a sprite with every icon at <code>glyphfox/sprite.svg</code>. Each icon is a <code>&lt;symbol&gt;</code> with the id <code>gf-</code> plus the icon name, its own <code>viewBox</code> and the stroke settings of the set.'],
        ['code', 'sh', 'terminal', `npm install glyphfox
cp node_modules/glyphfox/dist/sprite.svg public/icons/sprite.svg`],
        ['code', 'js', 'sprite.svg', `<svg xmlns="http://www.w3.org/2000/svg">
<symbol id="gf-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">...</symbol>
<symbol id="gf-search" viewBox="0 0 24 24" ...>...</symbol>
...
</svg>`],
        ['p', 'install.bundler', 'With a bundler you can let it copy and fingerprint the file instead. In Vite, the <code>?url</code> suffix returns the final URL of the asset:'],
        ['code', 'js', 'icons.js', `import spriteUrl from 'glyphfox/sprite.svg?url';

export const icon = (name) =>
  \`<svg class="icon" width="24" height="24" aria-hidden="true"><use href="\${spriteUrl}#gf-\${name}"></use></svg>\`;`],
        ['p', 'install.size', 'The full sprite holds all 419 icons in 117.9 KB, or 15.7 KB with gzip. A sprite with the 30 icons a typical app shell uses is 7.5 KB, 1.3 KB with gzip; the CLI builds one for you, as shown below.'],
      ],
    },
    {
      id: 'use',
      h: 'Reference a symbol',
      blocks: [
        ['p', 'use.p', 'Write an outer <code>svg</code> with the size you want and a <code>use</code> element that points at the symbol. The symbol brings its own <code>viewBox</code>, so the outer element needs only width and height.'],
        ['code', 'js', 'index.html', `<button type="button" class="btn">
  <svg class="icon" width="20" height="20" aria-hidden="true">
    <use href="/icons/sprite.svg#gf-download"></use>
  </svg>
  Download
</button>`],
        ['code', 'css', 'app.css', `.icon {
  width: 1.25em;
  height: 1.25em;
  flex-shrink: 0;
  vertical-align: -0.2em;
}
.btn:hover .icon {
  color: #ff7a1a;
}`],
        ['p', 'use.color', 'The symbols draw with <code>stroke="currentColor"</code>, and <code>color</code> inherits into the <code>use</code> content, so the icon follows the text color of its parent and any <code>color</code> you set on the outer <code>svg</code>. Width and height in CSS override the attributes, which lets the size follow the font size.'],
      ],
    },
    {
      id: 'origin',
      h: 'Same origin only',
      blocks: [
        ['p', 'origin.p', 'Browsers only follow a <code>use</code> reference to a file on the same origin as the page. A sprite on a CDN such as jsDelivr, or on another subdomain of your site, renders nothing, and CORS headers do not change that. Serve the sprite from your own origin, or fetch it once and put it in the page:'],
        ['code', 'js', 'inline-sprite.js', `// jsDelivr sends CORS headers, so fetch works where <use> across origins does not.
const res = await fetch('https://cdn.jsdelivr.net/npm/glyphfox@1/dist/sprite.svg');
const holder = document.createElement('div');
holder.setAttribute('aria-hidden', 'true');
holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
holder.innerHTML = await res.text();
document.body.prepend(holder);

// now <use href="#gf-home"></use> works anywhere on the page`],
      ],
    },
    {
      id: 'inline',
      h: 'Inline the sprite in the page',
      blocks: [
        ['p', 'inline.p', 'An inline sprite is the same symbols placed once in the HTML, usually right after <code>&lt;body&gt;</code>. References then use only the fragment, <code>#gf-home</code>, there is no extra request and the icons render with the first paint. The cost is that every page carries the symbols again, so inline a small subset rather than the full set.'],
        ['code', 'js', 'layout.html', `<body>
  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
       style="position:absolute;width:0;height:0;overflow:hidden">
    <symbol id="gf-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">...</symbol>
    <symbol id="gf-search" viewBox="0 0 24 24" ...>...</symbol>
  </svg>

  <a href="/"><svg class="icon" aria-hidden="true"><use href="#gf-home"></use></svg> Home</a>
</body>`],
        ['p', 'inline.hide', 'Hide the sprite with zero size and absolute positioning, not with <code>display:none</code>. Some browsers stop rendering masks that live inside a hidden SVG, and the solid style uses masks to cut its inner lines.'],
      ],
    },
    {
      id: 'subset',
      h: 'Build a subset with the CLI',
      blocks: [
        ['p', 'subset.p', '<code>glyphfox build</code> writes a sprite with only the icons you list, rendered with the props you pass. Names can come from the command line or from a file with one name per line; spaces, commas and <code>#</code> comments are allowed in the file.'],
        ['code', 'sh', 'terminal', `npx glyphfox build home search settings bell user --type sprite --out public/icons
npx glyphfox build --from icons.txt --type sprite --weight 1.5 --out public/icons
npx glyphfox build --from icons.txt --type sprite --variant solid --out public/icons/solid`],
        ['code', 'sh', 'icons.txt', `# app shell
home, search, settings, bell, user
menu x chevron-down

# badges and fusions work too
file+check
cloud&lock:overlap`],
        ['p', 'subset.ids', 'Plain names keep their id: <code>home</code> becomes <code>gf-home</code>. Specs with a badge or a fusion get an id with the symbols replaced: <code>file+check</code> becomes <code>gf-file_check</code> and <code>cloud&amp;lock:overlap</code> becomes <code>gf-cloud__lock-overlap</code>. Open the generated file once to copy the ids you need.'],
        ['p', 'subset.size', 'Building at the size you display also gets you the optical compensation of the components: <code>--size 16</code> writes the slightly heavier stroke that glyphfox uses for 16 pixel icons, so a sprite for dense tables looks as strong as the rest of the interface.'],
        ['p', 'subset.css', 'The same command with <code>--type css</code> writes a stylesheet of mask classes instead (<code>&lt;span class="gf gf-home"&gt;</code>), for sites that want icon classes without Tailwind CSS. The <a href="tailwind.html">Tailwind CSS guide</a> explains how mask icons behave.'],
      ],
    },
    {
      id: 'props',
      h: 'Build options',
      blocks: [
        ['p', 'props.p', 'A sprite is static, so the shared props become build flags. These are the ones that matter for a sprite; every flag has the same meaning as the prop with that name in the <a href="../docs.html#props">props table</a>.'],
        ['table', 'props.table', ['Flag', 'Effect on the symbols'], [
          ['<code>--type sprite</code>', 'writes <code>sprite.svg</code> (the default type); <code>css</code> and <code>package</code> are the other types'],
          ['<code>--out DIR</code>', 'output directory, the current directory by default'],
          ['<code>--from FILE</code>', 'reads names from a file'],
          ['<code>--weight N</code>', 'stroke weight from 1 to 3, written into each symbol'],
          ['<code>--size N</code>', 'the pixel size you display, for the optical stroke compensation below 24'],
          ['<code>--corners sharp</code>', 'sharp joins and caps'],
          ['<code>--variant duotone</code>, <code>--variant solid</code>', 'the style of every symbol'],
          ['<code>--color C</code>, <code>--secondary-color C</code>', 'fixed colors instead of <code>currentColor</code>'],
          ['<code>--secondary-opacity N</code>', 'opacity of the duotone layer or the solid fill'],
          ['<code>--rotate DEG</code>, <code>--flip-x</code>, <code>--flip-y</code>', 'bakes a rotation or a mirror into the symbols'],
        ]],
      ],
    },
    {
      id: 'styling',
      h: 'What CSS can and cannot change',
      blocks: [
        ['p', 'styling.p', 'What <code>use</code> draws is a copy of the symbol. CSS on the outer <code>svg</code> or on the <code>use</code> element reaches that copy only through inheritance, which is why <code>color</code> works. Properties that the symbol sets itself do not: each symbol carries <code>stroke-width</code>, <code>stroke-linecap</code> and <code>stroke-linejoin</code> as attributes, and those win over any value inherited from outside. Setting <code>stroke-width</code> on <code>.icon</code> has no effect.'],
        ['p', 'styling.p2', 'Decide weight, corners and style when you build the sprite, and build two sprites if you need two weights. When you need per instance control over weight, a second color or motion, render inline SVG with a component or <code>toSvg</code> instead.'],
        ['p', 'styling.motion', 'Whole icon animations still work, because they act on the outer element: <code>.icon.spin { animation: spin 1s linear infinite }</code> rotates a sprite icon like any other element.'],
      ],
    },
    {
      id: 'a11y',
      h: 'Accessibility',
      blocks: [
        ['p', 'a11y.p', 'A sprite icon is an outer <code>svg</code> that you write, so its semantics are yours to set. Hide decorative icons with <code>aria-hidden="true"</code>. For an icon that carries meaning on its own, make the outer element an image with a name:'],
        ['code', 'js', 'status.html', `<svg class="icon" role="img" aria-label="Payment failed">
  <use href="/icons/sprite.svg#gf-circle-alert"></use>
</svg>`],
        ['p', 'a11y.more', 'Icon only buttons need the label on the button, as in the <a href="accessibility.html">accessibility guide</a>.'],
      ],
    },
    {
      id: 'caching',
      h: 'Caching',
      blocks: [
        ['p', 'caching.p', 'An external sprite is one request that every page shares. Serve it with a long cache lifetime and a fingerprint in the file name, such as <code>sprite.3f9a1c.svg</code>, so a new build changes the URL instead of waiting for caches to expire. Bundlers do this for you when you import the file. Each distinct sprite URL is downloaded once per page, no matter how many icons reference it.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['A sprite on another origin', 'An external <code>use</code> pointing at a CDN or another subdomain renders an empty box; the browser only reports the blocked request in the console. Host the file on the page origin or inline it.'],
          ['Duotone layers in the full sprite', 'The 42 icons that have a hand drawn duotone layer keep it in <code>glyphfox/sprite.svg</code>, as a translucent fill in the current color. If you want pure outlines, build a subset: the default <code>outline</code> style leaves the layer out, and <code>--variant duotone</code> keeps it.'],
          ['Masks in hidden or external sprites', 'Solid symbols use a <code>mask</code> to cut their inner lines. Masks can fail to render when the sprite is hidden with <code>display:none</code>, and support for masks inside an external sprite file differs between browsers. Test the solid style in your target browsers, or inline that sprite.'],
          ['Living states in a sprite', 'Presets such as <code>spin</code> or <code>draw</code> are scoped to a class on the root <code>svg</code>, which a symbol does not keep, so <code>--animate</code> has no visible effect in a sprite. Animate the outer element with your own CSS, or use inline SVG.'],
          ['Ids that clash', 'An inline sprite puts ids such as <code>gf-home</code> into the page. Two inline sprites with the same icon, or your own element with the same id, make references ambiguous. Inline one sprite per page.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'when', q: 'When is a sprite better than components?', a: 'On server rendered or static sites without a JavaScript framework, and on pages that repeat many icons: the symbols are downloaded once and every use is a few bytes of markup. Components win when icons change with state, morph, animate or need a second color, because a sprite is fixed at build time.' },
    { id: 'cdn', q: 'Can I reference the sprite on jsDelivr directly?', a: 'Not with <code>use</code>, because browsers block external references to other origins. Fetch the file and insert it into the page, as shown above, or copy it to your own server.' },
  ],
};
