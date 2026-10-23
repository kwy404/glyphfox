export default {
  slug: 'html-cdn',
  group: 'frameworks',
  order: 140,
  icon: 'globe',
  short: 'HTML and CDN',
  related: ['web-components', 'svg-sprite', 'tree-shaking', 'accessibility'],
  title: 'SVG icons from a CDN in plain HTML: glyphfox',
  description: 'Add glyphfox to any HTML page with one script tag: the glyph-fox element, data-glyph placeholders, the global API, version pinning and when to build a subset.',
  h1: 'Icons in plain HTML from a CDN',
  lead: 'One script tag gives a page every glyphfox icon, the <code>&lt;glyph-fox&gt;</code> element and a runtime that turns <code>&lt;i data-glyph&gt;</code> placeholders into inline SVG. No build step and no framework.',
  sections: [
    {
      id: 'install',
      h: 'Add the script',
      blocks: [
        ['p', 'install.p', 'The single file build carries every icon, the element, the placeholder runtime and the engine. jsDelivr and unpkg both resolve the bare package URL to it, <code>dist/web/glyphfox.min.js</code>.'],
        ['code', 'js', 'index.html', `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My page</title>
  <script defer src="https://cdn.jsdelivr.net/npm/glyphfox@1"></script>
  <!-- or https://unpkg.com/glyphfox@1 -->
</head>
<body>
  <glyph-fox name="home"></glyph-fox>
  <i data-glyph="search" data-size="20"></i>
</body>
</html>`],
        ['p', 'install.defer', 'With <code>defer</code> the download does not block parsing. The script runs once the document is parsed, defines the element, upgrades every <code>&lt;glyph-fox&gt;</code> on the page and replaces the placeholders.'],
      ],
    },
    {
      id: 'pin',
      h: 'Pin the version',
      blocks: [
        ['p', 'pin.p', '<code>glyphfox@1</code> follows the latest 1.x release, which is convenient while you prototype. In production, pin the exact version and file, so the page never changes under you and the CDN can cache the file for good.'],
        ['code', 'js', 'index.html', `<script defer src="https://cdn.jsdelivr.net/npm/glyphfox@1.0.0/dist/web/glyphfox.min.js"></script>`],
        ['p', 'pin.sri', 'An exact version can also carry Subresource Integrity: take the hash of that file, which jsDelivr lists for every file, and add <code>integrity</code> and <code>crossorigin="anonymous"</code> to the tag. A range such as <code>@1</code> cannot carry a hash, because the file behind it changes with each release.'],
        ['p', 'pin.self', 'You can also self host it. Copy <code>node_modules/glyphfox/dist/web/glyphfox.min.js</code> into your public folder and point the tag at it: the file is self contained and makes no further requests.'],
      ],
    },
    {
      id: 'element',
      h: 'The glyph-fox element',
      blocks: [
        ['p', 'element.p', 'Use the element for icons that change: a name that switches, a morph, a hover or click trigger, a state. It reads every prop from its attributes and redraws when one of them changes.'],
        ['code', 'js', 'menu.html', `<button type="button" class="menu" aria-label="Open menu" aria-expanded="false">
  <glyph-fox name="menu" morph duration="300"></glyph-fox>
</button>

<script type="module">
  const button = document.querySelector('.menu');
  const icon = button.querySelector('glyph-fox');
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    icon.setAttribute('name', open ? 'x' : 'menu');
  });
</script>`],
        ['p', 'element.more', 'The <code>morph</code> attribute animates the change from <code>menu</code> to <code>x</code>, one of the hand tuned pairs. Shadow DOM styling, custom tag names and triggers are covered in the <a href="web-components.html">web components guide</a>.'],
      ],
    },
    {
      id: 'runtime',
      h: 'Placeholders with data-glyph',
      blocks: [
        ['p', 'runtime.p', 'For icons that never change, a placeholder is lighter than a live element. The runtime replaces every element that has a <code>data-glyph</code> attribute with inline SVG, copies its <code>class</code> to the svg, and keeps watching the page, so placeholders added later by your scripts are replaced too.'],
        ['code', 'js', 'index.html', `<i data-glyph="search" data-size="20"></i>
<i data-glyph="file+check@tr" data-weight="1.5"></i>
<i data-glyph="folder" data-variant="duotone" data-secondary-color="#ff7a1a"></i>
<i data-glyph="trash" class="danger" aria-label="Delete"></i>`],
        ['p', 'runtime.props', 'Props are data attributes in kebab-case: <code>data-size</code>, <code>data-weight</code>, <code>data-variant</code>, <code>data-modifier</code>, <code>data-animate</code> and the rest of the table below. An <code>aria-label</code> on the placeholder becomes the title of the icon, so the svg gets an accessible name.'],
        ['p', 'runtime.once', 'The replacement happens once. The placeholder is gone afterwards, so changing its data attributes later does nothing, and listeners attached to the <code>&lt;i&gt;</code> are lost with it. Attach listeners to a parent, or use the element when the icon has to change.'],
        ['p', 'runtime.module', 'With a bundler, import <code>glyphfox/runtime</code> instead of the CDN file. It exports <code>replaceGlyphs</code> and runs it on load, and it includes every icon, since a page can ask for any name. Do not load that module straight from a CDN: it imports the package as separate ES modules, one file per icon, which costs hundreds of requests. The single file build already contains the same runtime.'],
      ],
    },
    {
      id: 'api',
      h: 'The global API',
      blocks: [
        ['p', 'api.p', 'The CDN build also sets <code>window.glyphfox</code> with the core API: <code>toSvg</code>, <code>fuse</code>, <code>search</code>, <code>getIcon</code>, <code>iconNames</code>, <code>categories</code>, <code>createMorph</code>, <code>toDataUri</code>, <code>replaceGlyphs</code> and more. It exists once the script has run, so call it from a module script placed after the tag, or after <code>DOMContentLoaded</code>.'],
        ['code', 'js', 'icon-search.html', `<input type="search" id="q" placeholder="Search icons" aria-label="Search icons">
<div id="results"></div>

<script type="module">
  const { search, toSvg } = window.glyphfox;
  const q = document.getElementById('q');
  const results = document.getElementById('results');
  q.addEventListener('input', () => {
    results.innerHTML = search(q.value, { limit: 24 })
      .map((icon) => \`<button type="button" aria-label="\${icon.name}">\${toSvg(icon.name, { size: 28 })}</button>\`)
      .join('');
  });
</script>`],
        ['p', 'api.datauri', '<code>toDataUri</code> turns an SVG string into a URL for CSS backgrounds or an <code>&lt;img&gt;</code>. An image cannot inherit <code>currentColor</code> from the page, so pass an explicit color.'],
        ['code', 'js', 'checklist.js', `const { toDataUri, toSvg } = window.glyphfox;
const check = toDataUri(toSvg('check', { size: 16, color: '#16a34a' }));
document.documentElement.style.setProperty('--icon-check', \`url("\${check}")\`);`],
        ['code', 'css', 'checklist.css', `.done::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 6px;
  background: var(--icon-check) no-repeat center / contain;
}`],
        ['p', 'api.esm', '<code>dist/web/glyphfox.esm.js</code> is the same build as an ES module. Its default export is the API object, and like the classic file it defines the element and runs the placeholder runtime.'],
        ['code', 'js', 'logo.html', `<div id="logo"></div>

<script type="module">
  import glyphfox from 'https://cdn.jsdelivr.net/npm/glyphfox@1/dist/web/glyphfox.esm.js';

  document.getElementById('logo').innerHTML = glyphfox.toSvg('fox', { size: 48, variant: 'duotone' });
</script>`],
      ],
    },
    {
      id: 'size',
      h: 'File size, and when to build instead',
      blocks: [
        ['p', 'size.p', 'The single file holds every icon: 216.4 KB minified, 62.4 KB with gzip. Served from a CDN with long caching, that is a fair price for a prototype, a documentation site or a page that shows many different icons. It is a poor deal for a landing page that shows six.'],
        ['table', 'size.table', ['Approach', 'What ships', 'Good for'], [
          ['One CDN script', 'Every icon, the element, the runtime and the API.', 'Prototypes, docs, pages with many icons.'],
          ['A bundler with <code>glyphfox/web/element</code>', 'The element and the icons you register.', 'Apps that already have a build step, see <a href="tree-shaking.html">tree shaking</a>.'],
          ['CLI subset as CSS', 'One stylesheet with a mask class per icon and no JavaScript.', 'Static sites and icons that never change.'],
          ['CLI subset as a sprite', 'One SVG file with a symbol per icon.', 'Server rendered HTML that repeats the same icons, see <a href="svg-sprite.html">SVG sprites</a>.'],
        ]],
        ['code', 'sh', 'terminal', `npx glyphfox build home search menu loader --type css --out public
npx glyphfox build home search menu loader --type sprite --out public/icons`],
        ['code', 'js', 'index.html', `<link rel="stylesheet" href="/glyphfox.css">

<span class="gf gf-home" aria-hidden="true"></span>
<span class="gf gf-loader gf-spin" aria-hidden="true"></span>`],
        ['p', 'size.css', 'The CSS build draws each icon as a mask filled with <code>currentColor</code>, so it takes the text color and the font size, and it includes the <code>gf-spin</code> and <code>gf-pulse</code> animations. Every command takes the shared props as flags, such as <code>--weight 1.5</code> or <code>--variant duotone</code>.'],
      ],
    },
    {
      id: 'props',
      h: 'Attributes',
      blocks: [
        ['p', 'props.p', 'The element and the placeholders read the same props, both in kebab-case: as plain attributes on <code>&lt;glyph-fox&gt;</code>, such as <code>size</code> and <code>secondary-color</code>, and with a <code>data-</code> prefix on placeholders, such as <code>data-size</code> and <code>data-secondary-color</code>. The element also takes <code>layout</code>, <code>gap</code> and <code>morph</code>.'],
        ['props', 'web'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Scripts that run too early', 'An inline classic script runs during parsing, before a deferred CDN script, so <code>window.glyphfox</code> is still undefined there. Use <code>type="module"</code>, since module scripts run after deferred scripts in document order, or wait for <code>DOMContentLoaded</code>.'],
          ['The runtime module from a CDN', '<code>dist/runtime/auto.js</code> is meant for bundlers. Loaded directly in the browser it pulls the package one module at a time, a file per icon. Use the single file build on plain pages.'],
          ['Placeholders are replaced once', 'Changing <code>data-*</code> attributes after the replacement has no effect, and listeners on the placeholder are dropped. Use <code>&lt;glyph-fox&gt;</code> for icons that change.'],
          ['Self closing elements', '<code>&lt;glyph-fox name="home" /&gt;</code> is an open tag in HTML, so the content after it disappears inside the element. Always write the closing tag.'],
          ['currentColor in images', 'SVG used as an <code>&lt;img&gt;</code> source or a CSS background cannot see the page color. Pass a color to <code>toSvg</code>, or use the CSS subset, which works with masks.'],
          ['Click triggers on placeholders', 'Placeholders become static SVG. Hover morphs and animations still play, because they are CSS inside the SVG, but click and state triggers need the element, which switches the states for you.'],
          ['Floating versions in production', '<code>glyphfox@1</code> moves with every 1.x release, and a changed file breaks an integrity hash. Pin <code>glyphfox@1.0.0</code> and the full file path.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'which', q: 'Should I use the element or data-glyph placeholders?', a: 'Placeholders for icons that never change after load: they turn into plain inline SVG with no live element behind them. The element for icons that switch names, morph, or react to hover, click or state. Both come from the same script and can be mixed on one page.' },
    { id: 'htmx', q: 'Does it work with HTML swapped in later, for example by htmx?', a: 'Yes. The runtime observes the whole document, so placeholders inside inserted HTML are replaced as they arrive, and <code>&lt;glyph-fox&gt;</code> elements upgrade on insertion because the element is defined for the page.' },
  ],
};
