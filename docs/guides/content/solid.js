export default {
  slug: 'solid',
  group: 'frameworks',
  order: 80,
  icon: 'cube',
  short: 'Solid',
  related: ['web-components', 'ssr', 'tree-shaking'],
  title: 'Icons in SolidJS and SolidStart: glyphfox',
  description: 'Two ways to use glyphfox icons in SolidJS and SolidStart today: the glyph-fox element with attr: bindings, or a small tree shakable component on the core.',
  h1: 'Icons in SolidJS',
  lead: 'There is no dedicated Solid package yet, and you can do without one. The <code>&lt;glyph-fox&gt;</code> element works in Solid templates, and a component of a few lines on top of <code>glyphfox/core</code> gives you reactive, tree shakable icons that render on the server.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'Install the core package. Everything on this page uses entry points that ship in it: <code>glyphfox/web</code> for the element, and <code>glyphfox/core</code> with <code>glyphfox/icons/NAME</code> for the component.'],
        ['code', 'sh', 'terminal', `npm install glyphfox`],
        ['table', 'install.choose', ['Aspect', 'glyph-fox element', 'Glyph component'], [
          ['Renders', 'In the browser, when the element upgrades.', 'On the server and in the browser.'],
          ['Ships', 'The element, its engine and the icons you register.', 'The renderer and the icon modules you import.'],
          ['Motion', 'Morphs on every name change, hover and click triggers, states.', 'CSS motion inside the SVG: presets and hover morphs.'],
          ['Good for', 'Icons that react to the user.', 'Most icons of an app.'],
        ]],
      ],
    },
    {
      id: 'element',
      h: 'The glyph-fox element',
      blocks: [
        ['p', 'element.p', 'Register the element once, in your entry file. <code>glyphfox/web</code> registers every icon; to keep the bundle to the icons you list, use <code>glyphfox/web/element</code> with <code>registerIcons</code>, as shown in the <a href="web-components.html">web components guide</a>.'],
        ['code', 'js', 'src/index.jsx', `import { render } from 'solid-js/web';
import 'glyphfox/web';
import App from './App';

render(() => <App />, document.getElementById('root'));`],
        ['p', 'element.static', 'Static attributes are compiled into the template, so they reach the element as attributes and work as written:'],
        ['code', 'js', 'Toolbar.jsx', `export function Toolbar() {
  return (
    <div class="toolbar">
      <glyph-fox name="settings" size="20" weight="1.5" />
      <glyph-fox name="bell" animate="shake" trigger="hover" />
    </div>
  );
}`],
        ['p', 'element.dynamic', 'Dynamic values are different. On custom elements, Solid assigns expressions as properties, and <code>&lt;glyph-fox&gt;</code> has no properties: it reads attributes. Prefix dynamic props with the <code>attr:</code> namespace so Solid sets the attribute instead.'],
        ['code', 'js', 'MenuButton.jsx', `import { createSignal } from 'solid-js';

export function MenuButton() {
  const [open, setOpen] = createSignal(false);
  return (
    <button
      type="button"
      aria-expanded={open()}
      aria-label={open() ? 'Close menu' : 'Open menu'}
      onClick={() => setOpen(!open())}
    >
      <glyph-fox attr:name={open() ? 'x' : 'menu'} morph duration="300" />
    </button>
  );
}`],
        ['p', 'element.morph', 'The <code>morph</code> attribute makes the element animate every change of <code>name</code>, so each toggle of the signal plays the hand tuned menu to close morph. Events need nothing special: <code>onClick</code> on a parent works as usual, and triggers such as <code>trigger="click"</code> are handled inside the element.'],
      ],
    },
    {
      id: 'typescript',
      h: 'TypeScript',
      blocks: [
        ['p', 'typescript.p', 'Solid JSX types do not know <code>glyph-fox</code>. Declare it once in a declaration file, and list the attributes you set through <code>attr:</code> in <code>ExplicitAttributes</code>, the interface Solid reads for that namespace.'],
        ['code', 'js', 'src/glyphfox.d.ts', `import 'solid-js';

type GlyphFoxAttributes = {
  name?: string;
  size?: string | number;
  color?: string;
  weight?: string | number;
  variant?: 'outline' | 'duotone' | 'solid';
  animate?: 'draw' | 'pop' | 'wiggle' | 'spin' | 'pulse' | 'bounce' | 'shake';
  trigger?: 'mount' | 'hover' | 'click' | 'state';
  morph?: boolean | string;
  'morph-to'?: string;
  duration?: string | number;
};

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'glyph-fox': JSX.HTMLAttributes<HTMLElement> & GlyphFoxAttributes;
    }
    interface ExplicitAttributes {
      name: string;
      size: string | number;
      active: boolean | string;
    }
  }
}`],
      ],
    },
    {
      id: 'component',
      h: 'A small Glyph component',
      blocks: [
        ['p', 'component.p', 'For icons that do not need the interaction built into the element, render the SVG yourself. <code>renderToString</code> from <code>glyphfox/core</code> turns icon data into markup with every shared prop, and each <code>glyphfox/icons/NAME</code> module holds the data of one icon, so the bundle carries only what you import.'],
        ['code', 'js', 'Glyph.jsx', `import { splitProps } from 'solid-js';
import { renderToString } from 'glyphfox/core';

export function Glyph(props) {
  const [local, options] = splitProps(props, ['icon', 'class']);
  return (
    <span
      class={local.class}
      style={{ display: 'inline-flex', 'line-height': '0' }}
      innerHTML={renderToString(local.icon, options)}
    />
  );
}`],
        ['code', 'js', 'Nav.jsx', `import { Glyph } from './Glyph';
import home from 'glyphfox/icons/home';
import bell from 'glyphfox/icons/bell';

export function Nav(props) {
  return (
    <nav>
      <a href="/">
        <Glyph icon={home} size={20} /> Home
      </a>
      <button type="button" aria-label="Notifications">
        <Glyph icon={bell} animate="shake" trigger="state" active={props.unread > 0} />
      </button>
    </nav>
  );
}`],
        ['p', 'component.reactive', 'The effect behind <code>innerHTML</code> tracks every prop that <code>renderToString</code> reads, so a change of <code>active</code>, <code>size</code> or <code>icon</code> rewrites the markup. The markup is replaced, not tweened. For a morph between two icons, use the element, or a CSS morph on hover with <code>morphTo</code>:'],
        ['code', 'js', 'NextLink.jsx', `import { Glyph } from './Glyph';
import arrowRight from 'glyphfox/icons/arrow-right';
import chevronRight from 'glyphfox/icons/chevron-right';

export const NextLink = () => (
  <a href="/next" class="next">
    Next <Glyph icon={arrowRight} morphTo={chevronRight} trigger="hover" />
  </a>
);`],
        ['p', 'component.morphto', 'With <code>glyphfox/core</code>, <code>morphTo</code> takes icon data, not a name: only <code>toSvg</code> in the main entry resolves names. A name passed here is ignored and the icon stays still. The CSS morph plays while the pointer is over the svg or over its direct parent, which in this component is the wrapper span.'],
        ['p', 'component.syntax', 'The name syntax (<code>file+check@tr</code>, <code>cloud&amp;lock</code>) is also resolved by <code>toSvg</code>. With the core, use the matching props and helpers instead: <code>modifier</code> and <code>modifierCorner</code> for badges, <code>fuse</code> for fusions.'],
        ['code', 'js', 'Status.jsx', `import { fuse } from 'glyphfox/core';
import { Glyph } from './Glyph';
import file from 'glyphfox/icons/file';
import cloud from 'glyphfox/icons/cloud';
import lock from 'glyphfox/icons/lock';

const secureCloud = fuse([cloud, lock], { layout: 'overlap' });

export const Status = () => (
  <p>
    <Glyph icon={file} modifier="check" modifierCorner="top-right" title="Saved" />
    <Glyph icon={secureCloud} size={32} title="Encrypted backup" />
  </p>
);`],
      ],
    },
    {
      id: 'ssr',
      h: 'SolidStart and server rendering',
      blocks: [
        ['p', 'ssr.p', 'The Glyph component renders on the server like any other markup: SolidStart writes the SVG into the HTML, so icons are part of the first paint and the layout does not move when the page hydrates.'],
        ['p', 'ssr.element', 'The element is a browser feature. It upgrades after its script runs and does not use declarative shadow DOM, so server HTML contains the empty tag. Reserve its box with CSS, or keep the icons that must be visible at once on the Glyph component. The trade offs for every framework are in <a href="ssr.html">server rendering</a>.'],
        ['code', 'css', 'src/app.css', `glyph-fox:not(:defined) {
  display: inline-block;
  width: 24px;
  height: 24px;
}`],
        ['p', 'ssr.import', 'Importing <code>glyphfox/web</code> on the server is harmless: the element checks for <code>customElements</code> and does nothing without it. Still, import it from client code, such as <code>src/entry-client.tsx</code> in SolidStart, so the element and its icons stay out of the server bundle.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'The Glyph component passes its props to <code>renderToString</code>, so it takes the shared options with their camelCase names. On the element the same props are attributes in kebab-case, listed in the <a href="web-components.html">web components guide</a>.'],
        ['props', 'tosvg'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Dynamic props without attr:', '<code>name={...}</code> on <code>glyph-fox</code> sets a property the element ignores, and the icon renders empty. Write <code>attr:name={...}</code>. Static strings work without the prefix.'],
          ['A name in morphTo', '<code>renderToString</code> from the core needs icon data for <code>morphTo</code>. A string is ignored. Import the target icon and pass its data.'],
          ['Mount animations replay', 'Every prop change replaces the <code>innerHTML</code>, so a preset with the default <code>trigger="mount"</code> plays again. For animations tied to state, use <code>trigger="state"</code> with <code>active</code>.'],
          ['Every icon by accident', '<code>import { toSvg } from \'glyphfox\'</code> brings every icon into the bundle, because a name can point to any of them. In client code, use the core with per icon modules; keep <code>toSvg</code> for server only code.'],
          ['The element on the server', 'Server HTML holds an empty <code>&lt;glyph-fox&gt;</code> until the script runs. Reserve its size, or render server visible icons with the Glyph component.'],
          ['The wrapper span', 'The Glyph component wraps the svg in a span: flex and grid gaps apply to the span, and <code>class</code> lands on the span, not the svg. Set sizes through props rather than with CSS on the span.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'package', q: 'Is there a glyphfox package for Solid?', a: 'Not yet. Both approaches on this page use what the glyphfox package ships today: the custom element, and the core renderer that the React, Vue and Svelte packages are built on.' },
    { id: 'signals', q: 'Do icons update when a signal changes?', a: 'Yes. With the element, bind through <code>attr:</code> and the element redraws on each attribute change, with a morph when the <code>morph</code> attribute is set. With the Glyph component, the effect behind <code>innerHTML</code> tracks the props that the renderer reads and rewrites the markup.' },
  ],
};
