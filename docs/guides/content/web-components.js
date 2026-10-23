export default {
  slug: 'web-components',
  group: 'frameworks',
  order: 130,
  icon: 'puzzle',
  short: 'Lit and web components',
  related: ['html-cdn', 'accessibility', 'ssr'],
  title: 'Icons in Lit and web components: glyphfox',
  description: 'Use the glyph-fox custom element in Lit and plain web components: register every icon or a subset, bind attributes, style it and keep it accessible.',
  h1: 'Icons in Lit and web components',
  lead: 'glyphfox ships a custom element, <code>&lt;glyph-fox&gt;</code>, that takes the icon name and every shared prop as attributes. It works anywhere HTML works and fits Lit templates without a wrapper.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'Install the package and register the element once, in the entry module of your app. Importing <code>glyphfox/web</code> registers every icon and defines <code>&lt;glyph-fox&gt;</code> as a side effect, so nothing else is needed.'],
        ['code', 'sh', 'terminal', `npm install glyphfox`],
        ['code', 'js', 'main.js', `import 'glyphfox/web';`],
        ['p', 'install.subset', 'To ship only the icons you use, take the element from <code>glyphfox/web/element</code>, register icon data from <code>glyphfox/icons/NAME</code> and define the element yourself. <code>registerIcons</code> comes from <code>glyphfox/core</code>, which shares its registry with the element.'],
        ['code', 'js', 'icons.js', `import { defineGlyphFox } from 'glyphfox/web/element';
import { registerIcons } from 'glyphfox/core';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';
import bell from 'glyphfox/icons/bell';
import search from 'glyphfox/icons/search';

registerIcons([menu, x, bell, search]);
defineGlyphFox();`],
        ['table', 'install.table', ['Entry point', 'What it ships', 'Size (esbuild, minified)'], [
          ['<code>glyphfox/web</code>', 'The element, the engine and every icon, registered on import.', 'about 209 KB, 59 KB gzip'],
          ['<code>glyphfox/web/element</code>', 'The element and the engine; you register the icons.', 'about 77 KB, 28 KB gzip with one icon, plus a few hundred bytes per icon'],
        ]],
        ['p', 'install.lazy', 'A name you did not register is loaded on demand. webpack and esbuild turn those loads into one small chunk per icon, but a Vite production build leaves the import inside <code>node_modules</code> as written and the icon stays empty (see the <a href="tree-shaking.html#chunks">tree shaking guide</a>). Register every icon you use with <code>glyphfox/web/element</code>; they then also draw on the first frame, without a network round trip.'],
      ],
    },
    {
      id: 'usage',
      h: 'Use the element',
      blocks: [
        ['p', 'usage.p', 'The element renders an inline SVG into its shadow root. <code>name</code> takes the full name syntax, so modifier badges, fusions and styles need no extra API, and every shared prop is an attribute in kebab-case.'],
        ['code', 'js', 'index.html', `<glyph-fox name="home"></glyph-fox>
<glyph-fox name="file+check" size="32" weight="1.5"></glyph-fox>
<glyph-fox name="cloud&lock" layout="overlap"></glyph-fox>
<glyph-fox name="heart/solid" color="#e11d48"></glyph-fox>
<glyph-fox name="bell" animate="shake" trigger="hover"></glyph-fox>`],
        ['p', 'usage.update', 'The element observes its attributes. Change one with <code>setAttribute</code>, or through any template that writes attributes, and the icon redraws with the new value.'],
      ],
    },
    {
      id: 'lit',
      h: 'Lit templates',
      blocks: [
        ['p', 'lit.p', 'In Lit, bind values with attribute bindings. The element reads attributes and has no matching JavaScript properties, so a property binding such as <code>.name=${...}</code> sets a field the element never reads and the icon stays as it was.'],
        ['code', 'js', 'app-toolbar.js', `import { LitElement, html, css } from 'lit';
import 'glyphfox/web';

export class AppToolbar extends LitElement {
  static properties = {
    open: { type: Boolean },
    unread: { type: Number },
  };

  static styles = css\`
    button { display: inline-flex; align-items: center; gap: 8px; color: inherit; }
    glyph-fox { color: var(--toolbar-icon, currentColor); }
  \`;

  constructor() {
    super();
    this.open = false;
    this.unread = 0;
  }

  render() {
    return html\`
      <button type="button" aria-expanded=\${this.open} @click=\${() => (this.open = !this.open)}>
        <glyph-fox name=\${this.open ? 'x' : 'menu'} morph duration="300"></glyph-fox>
        <span>Menu</span>
      </button>
      <glyph-fox
        name="bell"
        animate="shake"
        trigger="state"
        ?active=\${this.unread > 0}
        title=\${this.unread ? \`\${this.unread} new notifications\` : 'No new notifications'}
      ></glyph-fox>
    \`;
  }
}

customElements.define('app-toolbar', AppToolbar);`],
        ['p', 'lit.bool', 'Use boolean bindings for flags: <code>?morph=${...}</code> and <code>?active=${...}</code>. The element reads an empty attribute or <code>"true"</code> as true, and <code>"false"</code> or a missing attribute as false, so a boolean binding maps one to one.'],
        ['p', 'lit.optional', 'For optional values, bind <code>nothing</code> (or use the <code>ifDefined</code> directive) so the attribute is removed when there is no value. An empty <code>size</code> attribute gives the inner svg an empty width and height, and the browser falls back to its default svg size.'],
        ['code', 'js', 'icon-button.js', `import { html, nothing } from 'lit';

export const iconButton = ({ name, size, label, onClick }) => html\`
  <button type="button" aria-label=\${label} @click=\${onClick}>
    <glyph-fox name=\${name} size=\${size ?? nothing}></glyph-fox>
  </button>
\`;`],
      ],
    },
    {
      id: 'shadow',
      h: 'Styling through the shadow root',
      blocks: [
        ['p', 'shadow.color', 'The svg lives in the element shadow root with its strokes in <code>currentColor</code>. Color inherits across the shadow boundary, so set <code>color</code> on the element or on any ancestor. The host is <code>display: inline-flex</code> with <code>line-height: 0</code> and <code>vertical-align: middle</code>, so it sits on a line of text without extra CSS.'],
        ['p', 'shadow.size', 'Size comes from the <code>size</code> attribute, which sets the width and height of the inner svg. CSS width and height on the host do not scale the drawing. Use <code>size="1em"</code> to follow the font size, or write the attribute from your own design tokens.'],
        ['code', 'js', 'note.html', `<p class="note">
  <glyph-fox name="circle-info" size="1em" weight="2.5"></glyph-fox>
  The icon follows the font size of this paragraph.
</p>
<glyph-fox name="folder" variant="duotone" color="#0f172a" secondary-color="#ff7a1a"></glyph-fox>`],
        ['code', 'css', 'toolbar.css', `.toolbar glyph-fox { color: #6b7280; }
.toolbar button:hover glyph-fox { color: #111827; }`],
        ['p', 'shadow.parts', 'There are no parts or slots to style: everything inside is generated from the props. Change the drawing with attributes such as <code>weight</code>, <code>corners</code>, <code>variant</code> and <code>secondary-color</code>, not with selectors that try to reach into the shadow root.'],
      ],
    },
    {
      id: 'tag',
      h: 'Your own tag name',
      blocks: [
        ['p', 'tag.p', '<code>defineGlyphFox(tag)</code> defines the element under another name and returns its class. Use it to match the prefix of your design system or to avoid a clash with another element. It is safe to call more than once: a tag that is already defined is returned as it is.'],
        ['code', 'js', 'icons.js', `import { defineGlyphFox } from 'glyphfox/web/element';
import { registerIcons } from 'glyphfox/core';
import home from 'glyphfox/icons/home';
import settings from 'glyphfox/icons/settings';

registerIcons([home, settings]);
defineGlyphFox('acme-icon');`],
        ['code', 'js', 'index.html', `<acme-icon name="home" size="20"></acme-icon>
<acme-icon name="settings" size="20" weight="1.5"></acme-icon>`],
        ['p', 'tag.entry', 'Importing <code>glyphfox/web</code> also defines <code>glyph-fox</code>, so pick one entry point per app: <code>glyphfox/web</code> for the default tag with every icon, <code>glyphfox/web/element</code> when you choose the tag and the icon list.'],
      ],
    },
    {
      id: 'triggers',
      h: 'Triggers and morphs',
      blocks: [
        ['p', 'triggers.p', 'The element handles its own interaction. With <code>trigger="hover"</code> or <code>trigger="click"</code> it listens on itself, and with <code>trigger="state"</code> it follows the <code>active</code> attribute. The <code>morph</code> attribute animates every change of <code>name</code>, while <code>morph-to</code> morphs toward a second icon whenever the trigger fires.'],
        ['code', 'js', 'index.html', `<glyph-fox name="menu" morph-to="x" trigger="click"></glyph-fox>
<glyph-fox name="sparkles" animate="draw" trigger="hover"></glyph-fox>
<glyph-fox id="visibility" name="eye" morph></glyph-fox>

<script type="module">
  const eye = document.getElementById('visibility');
  eye.addEventListener('click', () => {
    eye.setAttribute('name', eye.getAttribute('name') === 'eye' ? 'eye-off' : 'eye');
  });
</script>`],
        ['p', 'triggers.parent', 'Hover and click are measured on the element itself. The animation styles live inside the shadow root, where they cannot see the parent, and the click listener sits on the host. When a whole button should react, drive the icon from the button: use <code>trigger="state"</code> and set <code>active</code> from the button handlers.'],
        ['code', 'js', 'save-button.html', `<button type="button" class="save">
  <glyph-fox name="save" animate="pop" trigger="state"></glyph-fox>
  Save
</button>

<script type="module">
  const button = document.querySelector('.save');
  const icon = button.querySelector('glyph-fox');
  button.addEventListener('pointerenter', () => icon.setAttribute('active', ''));
  button.addEventListener('pointerleave', () => icon.removeAttribute('active'));
</script>`],
        ['p', 'triggers.motion', 'Morphs and presets respect <code>prefers-reduced-motion</code>: transitions jump to the end and animations do not play. The presets and triggers are described in <a href="animated-icons.html">animated icons</a>.'],
      ],
    },
    {
      id: 'static',
      h: 'Static SVG inside Lit templates',
      blocks: [
        ['p', 'static.p', 'When an icon never changes after render, you can skip the element and insert the SVG markup. <code>renderToString</code> from <code>glyphfox/core</code> renders icon data with the shared props, and Lit inserts the string with the <code>unsafeHTML</code> directive. The renderer escapes titles and attribute values, so the markup is safe to insert.'],
        ['code', 'js', 'saved-badge.js', `import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderToString } from 'glyphfox/core';
import circleCheck from 'glyphfox/icons/circle-check';

const check = unsafeHTML(renderToString(circleCheck, { size: 16, color: '#16a34a' }));

export const savedBadge = () => html\`<span class="badge">\${check} Saved</span>\`;`],
        ['p', 'static.tosvg', 'For the name syntax (<code>file+check@tr</code>, <code>cloud&amp;lock</code>), use <code>toSvg</code> from <code>glyphfox</code>. It resolves any name, which means it carries every icon; see <a href="tree-shaking.html">tree shaking</a> before you use it in a client bundle.'],
      ],
    },
    {
      id: 'props',
      h: 'Attributes',
      blocks: [
        ['p', 'props.p', 'Every shared prop is an attribute in kebab-case. The element adds four of its own: <code>name</code> for the icon, with the full name syntax; <code>layout</code> and <code>gap</code> for fusions; and <code>morph</code>, which animates changes of <code>name</code>. Numbers are read from their text, and booleans follow the rule above.'],
        ['props', 'web'],
      ],
    },
    {
      id: 'a11y',
      h: 'Accessibility',
      blocks: [
        ['p', 'a11y.p', 'Without a label the icon is decorative: the inner svg gets <code>aria-hidden="true"</code>. That is right for an icon next to visible text, and for an icon button that carries its own <code>aria-label</code>.'],
        ['p', 'a11y.title', 'To give the icon itself a name, use the <code>title</code> attribute. It adds a <code>&lt;title&gt;</code>, <code>role="img"</code> and <code>aria-label</code> to the inner svg. Do not rely on <code>aria-label</code> on the element: the label stays on the host, which has no role, while the svg inside becomes an image without a name. <code>title</code> on the host is also the global HTML attribute, so browsers show it as a tooltip.'],
        ['code', 'js', 'index.html', `<!-- decorative: the button carries the name -->
<button type="button" aria-label="Close dialog">
  <glyph-fox name="x"></glyph-fox>
</button>

<!-- meaningful on its own -->
<glyph-fox name="triangle-alert" title="Warning" color="#b45309"></glyph-fox>`],
        ['p', 'a11y.more', 'Patterns for links, status icons and contrast are in the <a href="accessibility.html">accessibility guide</a>.'],
      ],
    },
    {
      id: 'ssr',
      h: 'Server rendering and layout shift',
      blocks: [
        ['p', 'ssr.p', 'The element draws when it upgrades in the browser. Server rendered HTML holds only the empty tag, and the element does not use declarative shadow DOM, so the icon appears after the script runs. Reserve the space so the layout does not move when it does.'],
        ['code', 'css', 'icons.css', `glyph-fox:not(:defined) {
  display: inline-block;
  width: 24px;
  height: 24px;
  vertical-align: middle;
}
glyph-fox[size="16"]:not(:defined) {
  width: 16px;
  height: 16px;
}`],
        ['p', 'ssr.more', 'When an icon has to be in the first paint, in email or in HTML for crawlers, render the SVG string on the server instead. The options for each framework are in <a href="ssr.html">server rendering</a>.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Self closing tags', 'Write <code>&lt;glyph-fox name="home"&gt;&lt;/glyph-fox&gt;</code>. HTML ignores the slash in <code>&lt;glyph-fox /&gt;</code>, so the element stays open and the content after it becomes its children, which the shadow root does not show.'],
          ['Property bindings', 'Lit <code>.name=${...}</code> and other property bindings set a JavaScript field that the element does not read. Bind attributes. Solid needs <code>attr:</code> for the same reason, see the <a href="solid.html">Solid guide</a>.'],
          ['Empty attributes', 'An empty <code>size</code> renders an svg with empty width and height. Remove the attribute when there is no value, with <code>nothing</code> or <code>ifDefined</code> in Lit.'],
          ['Hover and click on the parent', 'Hover and click triggers fire on the icon only, not on the button around it. Use <code>trigger="state"</code> and set <code>active</code> from the parent.'],
          ['Attribute changes replay mount animations', 'The element swaps its inner svg whenever the markup changes, so with an <code>animate</code> preset and the default <code>trigger="mount"</code>, changing <code>color</code> or <code>size</code> plays the animation again. Use <code>trigger="state"</code> for icons whose other attributes change often.'],
          ['An empty icon', 'An unknown name renders nothing and logs a <code>glyphfox:</code> warning in the console. A valid name that is not registered draws as soon as its module loads, so check the network panel before you look for a typo.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'frameworks', q: 'Can I use the element in React, Vue or Angular?', a: 'Yes, it is a standard custom element. The framework packages are the better fit there, though: <a href="react.html">glyphfox/react</a>, <a href="vue.html">glyphfox/vue</a> and <a href="angular.html">glyphfox-angular</a> give typed props and render on the server. Keep the element for Lit, plain HTML and pages that mix stacks. In Vue templates, tell the compiler that <code>glyph-fox</code> is a custom element with <code>compilerOptions.isCustomElement</code>, otherwise Vue tries to resolve it as a component.' },
  ],
};
