export default {
  slug: 'qwik',
  group: 'frameworks',
  order: 100,
  icon: 'zap',
  short: 'Qwik',
  related: ['ssr', 'web-components', 'astro'],
  title: 'Icons in Qwik with zero JavaScript: glyphfox',
  description: 'Render glyphfox icons in Qwik on the server so they ship no JavaScript and need no resuming, and add the glyph-fox element only where an icon has to react.',
  h1: 'Icons in Qwik',
  lead: 'Most icons never change after the page loads. In Qwik they can be plain SVG written on the server, with no component code sent to the browser. For the few that morph or react, the <code>&lt;glyph-fox&gt;</code> element handles the interaction by itself.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'Install the core package. The server side approach uses <code>glyphfox/core</code> and one module per icon from <code>glyphfox/icons/NAME</code>; the element comes from <code>glyphfox/web</code>. Nothing needs to be configured in Vite or in Qwik.'],
        ['code', 'sh', 'terminal', `npm install glyphfox`],
        ['note', 'install.v2', 'The examples import from <code>@builder.io/qwik</code>. Qwik 2 moves these imports to <code>@qwik.dev/core</code>; the glyphfox side stays the same.'],
      ],
    },
    {
      id: 'server',
      h: 'Icons rendered on the server',
      blocks: [
        ['p', 'server.p', '<code>renderToString</code> returns the SVG markup for icon data and the shared props. Qwik inserts raw markup with <code>dangerouslySetInnerHTML</code>, which in Qwik takes the string itself, not an object as in React.'],
        ['code', 'js', 'src/components/icon/icon.tsx', `import type { IconData, SvgOptions } from 'glyphfox';
import { renderToString } from 'glyphfox/core';

type Props = SvgOptions & {
  icon: IconData;
  class?: string;
};

export const Icon = ({ icon, class: className, ...options }: Props) => (
  <span
    class={className}
    style="display:inline-flex;line-height:0"
    dangerouslySetInnerHTML={renderToString(icon, options)}
  />
);`],
        ['p', 'server.inline', '<code>Icon</code> is a plain function, an inline component in Qwik terms. It renders as part of its parent and has no lazy loading boundary of its own. On the server the parent writes it into the HTML, and as long as the parent does not render again in the browser, no code for it is ever downloaded.'],
        ['code', 'js', 'src/routes/layout.tsx', `import { component$, Slot } from '@builder.io/qwik';
import home from 'glyphfox/icons/home';
import settings from 'glyphfox/icons/settings';
import bookOpen from 'glyphfox/icons/book-open';
import { Icon } from '~/components/icon/icon';

export default component$(() => (
  <div class="shell">
    <nav class="sidebar">
      <a href="/"><Icon icon={home} size={20} /> Home</a>
      <a href="/docs/"><Icon icon={bookOpen} size={20} /> Docs</a>
      <a href="/settings/"><Icon icon={settings} size={20} weight={1.5} /> Settings</a>
    </nav>
    <main>
      <Slot />
    </main>
  </div>
));`],
        ['p', 'server.rerender', 'If a component renders again on the client, for example because it reads a signal that changes, Qwik downloads its render function and the modules it imports, including the renderer from <code>glyphfox/core</code>. Keep icons in components that render once, and move the parts that change into their own components.'],
      ],
    },
    {
      id: 'motion',
      h: 'Motion without JavaScript',
      blocks: [
        ['p', 'motion.p', 'The markup from <code>renderToString</code> carries its own CSS. With <code>animate</code> it plays a preset, and with <code>morphTo</code> and <code>trigger: \'hover\'</code> it morphs while the pointer is over the svg or its direct parent. Neither needs a script, and both stop under <code>prefers-reduced-motion</code>.'],
        ['code', 'js', 'src/components/status.tsx', `import arrowRight from 'glyphfox/icons/arrow-right';
import chevronRight from 'glyphfox/icons/chevron-right';
import loader from 'glyphfox/icons/loader';
import { Icon } from '~/components/icon/icon';

export const Next = () => (
  <a href="/next/" class="next">
    Next <Icon icon={arrowRight} morphTo={chevronRight} trigger="hover" />
  </a>
);

export const Saving = () => <Icon icon={loader} animate="spin" title="Saving" />;`],
        ['p', 'motion.morphto', 'With the core, <code>morphTo</code> takes icon data, not a name: import the target icon as above. A string is ignored and the icon stays still.'],
        ['p', 'motion.state', 'For a state such as open or selected, render with <code>trigger: \'state\'</code>: the svg then morphs when it gets the class <code>gf-on</code>. Toggling a class needs no re-render, so the only code the browser downloads is the click handler, and only on the first click.'],
        ['code', 'js', 'src/components/menu-toggle.tsx', `import { component$ } from '@builder.io/qwik';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';
import { Icon } from '~/components/icon/icon';

export const MenuToggle = component$(() => (
  <button
    type="button"
    aria-label="Menu"
    aria-expanded="false"
    onClick$={(_, button) => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      button.querySelector('svg')?.classList.toggle('gf-on', open);
    }}
  >
    <Icon icon={menu} morphTo={x} trigger="state" />
  </button>
));`],
      ],
    },
    {
      id: 'element',
      h: 'Interactive icons with the element',
      blocks: [
        ['p', 'element.p', 'When an icon has to switch between names, morph on every change, or react to clicks on its own, use the <code>&lt;glyph-fox&gt;</code> element. Load it from a visible task in the component that uses it, so the browser fetches it only when such an icon is on screen.'],
        ['code', 'js', 'src/components/like-button.tsx', `import { component$, useVisibleTask$ } from '@builder.io/qwik';

export const LikeButton = component$(() => {
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    import('glyphfox/web');
  });

  return (
    <button type="button" class="like" aria-label="Like">
      <glyph-fox name="heart" morph-to="heart/solid" trigger="click"></glyph-fox>
    </button>
  );
});`],
        ['p', 'element.attrs', 'Write the props of the element as string attributes, as in HTML: <code>name</code>, <code>size</code>, <code>morph</code>, <code>morph-to</code>, <code>trigger</code>. With a click or hover trigger the element keeps its own state, so the component never renders again and Qwik has nothing to resume for it.'],
        ['p', 'element.subset', '<code>glyphfox/web</code> carries every icon. To load less, import a module of your own from the task that registers a subset with <code>defineGlyphFox</code> and <code>registerIcons</code>, as in the <a href="web-components.html">web components guide</a>. If your TypeScript setup rejects the unknown tag, declare <code>glyph-fox</code> among the JSX intrinsic elements in a declaration file.'],
        ['p', 'element.layout', 'The element draws after it upgrades, so the server HTML holds an empty tag. Reserve its size with CSS so the layout does not move:'],
        ['code', 'css', 'src/global.css', `glyph-fox:not(:defined) {
  display: inline-block;
  width: 24px;
  height: 24px;
}`],
      ],
    },
    {
      id: 'city',
      h: 'Qwik City',
      blocks: [
        ['p', 'city.p', 'Layouts and routes render on the server, so the <code>Icon</code> component works in <code>src/routes/layout.tsx</code>, in pages and in every component they render. Static site generation writes the same markup into HTML files.'],
        ['p', 'city.loader', 'When icon names come from data, resolve them on the server. In a <code>routeLoader$</code>, <code>toSvg</code> from <code>glyphfox</code> accepts any name and the full name syntax; it carries every icon, which is fine in server only code.'],
        ['code', 'js', 'src/routes/features/index.tsx', `import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { toSvg } from 'glyphfox';

const FEATURES = [
  { icon: 'shield-check', label: 'Audited' },
  { icon: 'cloud&lock:overlap', label: 'Encrypted backups' },
  { icon: 'file+check@tr', label: 'Signed releases' },
];

export const useFeatures = routeLoader$(() =>
  FEATURES.map((f) => ({ ...f, svg: toSvg(f.icon, { size: 28, weight: 1.75 }) })),
);

export default component$(() => {
  const features = useFeatures();
  return (
    <ul class="features">
      {features.value.map((f) => (
        <li key={f.label}>
          <span dangerouslySetInnerHTML={f.svg} />
          {f.label}
        </li>
      ))}
    </ul>
  );
});`],
        ['p', 'city.cdn', 'To have the element on every page instead, add the single file CDN build to the head in <code>src/root.tsx</code> with <code>defer</code>, as described in <a href="html-cdn.html">HTML and CDN</a>. That trades a 62 KB gzip download on each page for not tracking where the element is used.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'The <code>Icon</code> component forwards its props to <code>renderToString</code>, which takes the shared options with their camelCase names, plus <code>class</code> and <code>style</code> strings for the svg. On the element the same props are attributes in kebab-case.'],
        ['props', 'tosvg'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['dangerouslySetInnerHTML takes a string', 'Pass the markup itself. The React form with <code>__html</code> does not work in Qwik.'],
          ['Parents that render again', 'An icon inside a component that renders again in the browser brings <code>glyphfox/core</code> with it, about 37 KB minified. Keep stateful parts in small components of their own.'],
          ['Names in morphTo', 'The core needs icon data for <code>morphTo</code>. A string is ignored, and the icon does not morph.'],
          ['Hover reaches only the direct parent', 'The CSS hover morph reacts to the svg and its direct parent, which is the wrapper span. Hovering a larger button around it does not start the morph; for that, toggle <code>gf-on</code> with <code>trigger: \'state\'</code>.'],
          ['toSvg in client code', '<code>import { toSvg } from \'glyphfox\'</code> carries every icon. It belongs in server only code such as <code>routeLoader$</code>; in components that may run in the browser, use the core with per icon modules.'],
          ['The element before it upgrades', 'Server HTML holds an empty <code>&lt;glyph-fox&gt;</code>. Reserve its box with CSS, or render icons that must be visible at once with the <code>Icon</code> component.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'zero-js', q: 'Do server rendered icons really ship no JavaScript?', a: 'Yes, as long as the component that renders them does not render again in the browser. The HTML holds plain SVG, and presets and hover morphs are CSS inside that SVG. Only components that render again, and the <code>&lt;glyph-fox&gt;</code> element, bring code to the browser.' },
    { id: 'react', q: 'Can I use the React components through qwikify$?', a: 'They behave like any React component inside <code>qwikify$</code>, but that island then ships React and the glyphfox React runtime. For icons, server rendered markup or the element costs far less.' },
  ],
};
