export default {
  slug: 'react',
  group: 'frameworks',
  order: 10,
  icon: 'atom',
  short: 'React',
  related: ['nextjs', 'tree-shaking', 'animated-icons', 'accessibility'],
  title: 'React icons with glyphfox: SVG components and props',
  description: 'Use glyphfox icons in React: install, tree shakable SVG components, every prop, icons by name, modifiers, Fusion, morphing, refs and TypeScript types.',
  h1: 'React icons',
  lead: 'Every glyphfox icon is a React component that renders inline SVG. The same props work on every icon, nothing needs a provider, and the components you do not import never reach your bundle.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'The React components live in the main <code>glyphfox</code> package under the <code>glyphfox/react</code> entry point. React is an optional peer dependency: the package works with React 16.8 and newer because it only needs hooks and <code>forwardRef</code>, and its test suite runs against React 19.'],
        ['code', 'sh', 'terminal', 'npm install glyphfox'],
        ['p', 'install.p2', 'There is no stylesheet to import and no build plugin to add. The package ships ESM and CommonJS builds with type declarations, so Vite, webpack, Rspack, esbuild and Parcel pick it up as is.'],
      ],
    },
    {
      id: 'first',
      h: 'Render your first icons',
      blocks: [
        ['p', 'first.p', 'Each icon is exported under its name in PascalCase with an <code>Icon</code> suffix: <code>home</code> becomes <code>HomeIcon</code>, <code>arrow-right</code> becomes <code>ArrowRightIcon</code> and <code>message-circle</code> becomes <code>MessageCircleIcon</code>. Search the <a href="../icons.html">icon browser</a> to find a name; every icon page, such as <a href="../icons/arrow-right.html">arrow right</a>, also shows the import line.'],
        ['code', 'js', 'Toolbar.jsx', `import { HomeIcon, SearchIcon, BellIcon } from 'glyphfox/react';

export function Toolbar() {
  return (
    <nav className="toolbar">
      <a href="/"><HomeIcon /> Home</a>
      <button type="button" aria-label="Search">
        <SearchIcon />
      </button>
      <BellIcon size={20} />
    </nav>
  );
}`],
        ['p', 'first.p2', 'Without props an icon is 24 by 24 pixels, draws with <code>stroke="currentColor"</code> so it takes the text color of its parent, and is marked <code>aria-hidden="true"</code> because most icons sit next to a visible label. Give it a <code>title</code> when the icon is the only thing that carries the meaning; the <a href="accessibility.html">accessibility guide</a> covers the patterns.'],
      ],
    },
    {
      id: 'axes',
      h: 'Size, color, weight and style',
      blocks: [
        ['p', 'axes.p', 'Every icon renders along three axes: weight, corners and style. They are plain props, so they can follow state, themes or breakpoints like any other value.'],
        ['code', 'js', 'Axes.jsx', `import { FolderIcon, SearchIcon, ArrowRightIcon } from 'glyphfox/react';

export function Axes() {
  return (
    <>
      <SearchIcon size={32} color="#ff7a1a" />
      <SearchIcon weight={1} />
      <SearchIcon weight={3} corners="sharp" />
      <SearchIcon size={16} weight={1.5} absoluteWeight />
      <FolderIcon variant="duotone" secondaryColor="#ff7a1a" />
      <FolderIcon variant="solid" />
      <ArrowRightIcon rotate={90} />
      <ArrowRightIcon mirrorRtl />
    </>
  );
}`],
        ['ul', 'axes.list', [
          '<code>size</code> takes a number of pixels or any CSS length string such as <code>"1.25em"</code>.',
          '<code>weight</code> runs from 1 to 3 on the 24 grid. Below 24 pixels the stroke is compensated optically, up to 30 percent heavier at the smallest sizes, so a 16 pixel icon keeps the same presence as a 24 pixel one. <code>absoluteWeight</code> turns that off and keeps the stroke at exactly <code>weight</code> pixels.',
          '<code>variant="duotone"</code> uses the hand drawn second layer when the icon has one, or a translucent fill of its closed shapes. <code>variant="solid"</code> fills the closed shapes and cuts the inner lines out as negative space.',
          '<code>mirrorRtl</code> flips directional icons when they render inside <code>dir="rtl"</code>, so the same markup works in both directions.',
        ]],
      ],
    },
    {
      id: 'names',
      h: 'Icons by name',
      blocks: [
        ['p', 'names.p', 'When the icon comes from data, a CMS field, a route table or a user setting, render it with <code>Icon</code> and a name. The <code>name</code> prop takes the full name syntax shared by every glyphfox package, so modifiers, fusions and styles work from a single string.'],
        ['code', 'js', 'MenuItem.jsx', `import { Icon } from 'glyphfox/react';

export function MenuItem({ item }) {
  // item.icon could be "settings", "file+check@tr", "cloud&lock:overlap" or "heart/solid"
  return (
    <li>
      <Icon name={item.icon} size={18} />
      {item.label}
    </li>
  );
}`],
        ['p', 'names.p2', 'Names that were not imported anywhere are loaded on demand with a dynamic import. webpack and esbuild split it into one small chunk per icon, and until that chunk arrives <code>Icon</code> renders an empty SVG of the right size, so the layout does not jump. A Vite production build leaves that import untouched inside <code>node_modules</code>, so there the name stays empty (the <a href="tree-shaking.html#chunks">tree shaking guide</a> has the details). In every bundler the fix is the same: register the data of the names you render from strings once at startup, and they render synchronously, on the first paint and on the server:'],
        ['code', 'js', 'icons.js', `import { registerIcons } from 'glyphfox/react';
import { iconSettings, iconFile, iconCloud, iconLock } from 'glyphfox';

registerIcons([iconSettings, iconFile, iconCloud, iconLock]);`],
        ['p', 'names.p3', 'The data exports (<code>iconSettings</code>, <code>iconArrowRight</code>...) come from the main <code>glyphfox</code> entry and are tree shaken like the components: importing one costs a few hundred bytes. Importing a component such as <code>SettingsIcon</code> registers its data as well.'],
      ],
    },
    {
      id: 'compose',
      h: 'Modifiers and fusions',
      blocks: [
        ['p', 'compose.p', 'A modifier is a small badge in a corner of any icon: <code>plus</code>, <code>minus</code>, <code>check</code>, <code>x</code>, <code>alert</code>, <code>lock</code>, <code>clock</code>, <code>sync</code>, <code>arrow-up</code>, <code>arrow-down</code> or <code>dot</code>. The icon underneath is cut around the badge with a knockout gap, so lines never touch at any weight.'],
        ['code', 'js', 'Status.jsx', `import { FileIcon, CloudIcon, Fusion } from 'glyphfox/react';

export function Status({ saved, syncing }) {
  return (
    <>
      <FileIcon modifier={saved ? 'check' : undefined} />
      <CloudIcon modifier={syncing ? 'sync' : undefined} modifierCorner="top-right" />
      <Fusion icons={['cloud', 'lock']} layout="overlap" gap={1} />
      <Fusion icons={['shield', 'heart']} layout="inside" />
    </>
  );
}`],
        ['p', 'compose.p2', '<code>Fusion</code> combines 2 to 10 icons into one new icon that still follows the icon rules: one weight, the 24 grid and the padding box. The layouts are <code>overlap</code>, <code>side</code>, <code>stack</code>, <code>grid</code>, <code>orbit</code>, <code>badge</code> and <code>inside</code>; <code>gap</code> sets the knockout gap in grid units, and <code>scale</code> and <code>offsets</code> fine tune each part. Fusion accepts every shared prop, so a fused icon can be duotone, animated or labelled like any other.'],
      ],
    },
    {
      id: 'motion',
      h: 'Morphing and living states',
      blocks: [
        ['p', 'motion.p', 'Three tools cover motion. <code>MorphIcon</code> morphs whenever its <code>name</code> changes. <code>morphTo</code> on any icon morphs toward a target when its <code>trigger</code> fires. <code>animate</code> plays a preset (draw, pop, wiggle, spin, pulse, bounce or shake) on mount, hover, click or while <code>active</code> is true.'],
        ['code', 'js', 'Motion.jsx', `import { MorphIcon, MenuIcon, BellIcon, HeartIcon } from 'glyphfox/react';

export function Motion({ open, copied, hasNews, liked }) {
  return (
    <>
      <MorphIcon name={copied ? 'check' : 'copy'} duration={300} />
      <MenuIcon morphTo={open ? 'x' : undefined} />
      <BellIcon animate="shake" trigger="state" active={hasNews} />
      <HeartIcon animate="pop" trigger="click" variant={liked ? 'solid' : 'outline'} />
    </>
  );
}`],
        ['p', 'motion.p2', 'For a custom renderer, <code>useMorph(name, { duration })</code> returns the icon data of the current frame, which you can pass to <code>Icon</code> through its <code>icon</code> prop or to your own drawing code. Every animation respects <code>prefers-reduced-motion</code>. The <a href="animated-icons.html">animated icons guide</a> goes through presets, triggers and the hand tuned morph pairs.'],
        ['code', 'js', 'CustomMorph.jsx', `import { Icon, useMorph } from 'glyphfox/react';

export function PlayButton({ playing }) {
  const frame = useMorph(playing ? 'pause' : 'play', { duration: 250 });
  return frame ? <Icon icon={frame.icon} variant={frame.variant} size={28} /> : null;
}`],
      ],
    },
    {
      id: 'dom',
      h: 'Refs, className, style and events',
      blocks: [
        ['p', 'dom.p', 'The components are <code>forwardRef</code> components, so a ref points at the rendered <code>&lt;svg&gt;</code> element. <code>className</code> is added after the built in <code>glyphfox glyphfox-NAME</code> classes, <code>style</code> is passed as is, and every other SVG attribute or event handler (<code>onClick</code>, <code>data-*</code>, <code>aria-*</code>, <code>id</code>) goes straight to the element.'],
        ['code', 'js', 'Like.jsx', `import { useRef } from 'react';
import { HeartIcon } from 'glyphfox/react';

export function Like({ onLike }) {
  const ref = useRef(null);
  const like = () => {
    ref.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], 240);
    onLike();
  };
  return (
    <button type="button" onClick={like}>
      <HeartIcon ref={ref} className="like-icon" style={{ color: 'var(--accent)' }} />
      Like
    </button>
  );
}`],
        ['p', 'dom.p2', 'An <code>aria-label</code> passed this way also marks the icon as meaningful: the component switches from <code>aria-hidden</code> to <code>role="img"</code> automatically.'],
      ],
    },
    {
      id: 'types',
      h: 'TypeScript',
      blocks: [
        ['p', 'types.p', 'Types ship with the package. <code>GlyphIconComponent</code> is the type of every icon component, <code>GlyphProps</code> are its props (the shared props plus every SVG attribute), and <code>IconName</code> from the main entry is the union of every icon name, which gives you autocompletion on <code>Icon</code> and in your own data.'],
        ['code', 'js', 'nav.tsx', `import type { IconName } from 'glyphfox';
import { Icon, HomeIcon, SettingsIcon, type GlyphIconComponent } from 'glyphfox/react';

type NavItem = { label: string; href: string; icon: GlyphIconComponent };
const items: NavItem[] = [
  { label: 'Home', href: '/', icon: HomeIcon },
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Nav() {
  return (
    <nav>
      {items.map(({ label, href, icon: ItemIcon }) => (
        <a key={href} href={href}>
          <ItemIcon size={18} /> {label}
        </a>
      ))}
    </nav>
  );
}

export function Badge({ name }: { name: IconName }) {
  return <Icon name={name} variant="duotone" />;
}`],
      ],
    },
    {
      id: 'imports',
      h: 'Imports and bundle size',
      blocks: [
        ['p', 'imports.p', 'Named imports from <code>glyphfox/react</code> are tree shaken: each icon is its own module, created with a pure annotation, and the package declares which files have side effects. Deep imports such as <code>glyphfox/react/icons/home</code> load a single icon module directly, which helps tools that do not tree shake and keeps development servers from touching the full index.'],
        ['code', 'js', 'deep-imports.js', `import { HomeIcon } from 'glyphfox/react/icons/home';
import FileIcon from 'glyphfox/react/icons/file'; // default export works too`],
        ['p', 'imports.p2', 'What breaks tree shaking, what the shared runtime costs and why the build output contains one tiny chunk per icon is measured in the <a href="tree-shaking.html">tree shaking guide</a>.'],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'Every icon component, <code>Icon</code>, <code>Fusion</code> and <code>MorphIcon</code> take the same props. They have the same names and meaning in Vue, Svelte, Angular, the web component and <code>toSvg</code>, so a value copied from the <a href="../studio.html">studio</a> works everywhere.'],
        ['props', 'react'],
        ['p', 'props.p2', '<code>Icon</code> and <code>MorphIcon</code> also take <code>name</code> (any name syntax) or <code>icon</code> (icon data). <code>Fusion</code> takes <code>icons</code>, <code>layout</code>, <code>gap</code>, <code>scale</code> and <code>offsets</code>.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['<code>Icon</code> renders empty at first', 'A name that is not registered yet is fetched with a dynamic import, so the first render (and the server render) is an empty SVG. Import the component, or call <code>registerIcons</code> with the data of every name you render by string.'],
          ['Next.js Server Components', 'The components use hooks and the package has no <code>"use client"</code> directive, so a Server Component cannot render them directly. The <a href="nextjs.html">Next.js guide</a> shows the one file fix and a zero JavaScript option.'],
          ['Coloring with <code>fill</code>', 'The icons are strokes on <code>fill="none"</code>. Passing <code>fill</code> fills every shape, which is rarely what you want. Use <code>color</code> (or CSS <code>color</code> on a parent) for the stroke and <code>variant="solid"</code> for filled shapes.'],
          ['Global CSS overrides the weight', 'A stylesheet rule such as <code>svg { stroke-width: 1.5 }</code> wins over the SVG attribute that carries the weight axis, including its optical compensation. Scope such rules or use the <code>weight</code> prop.'],
          ['Relative sizes skip optical compensation', 'Compensation needs to know the pixel size. With <code>size="1em"</code> the stroke stays at the plain weight, which can look thin at small text sizes; pass a pixel number where it matters, or a slightly higher <code>weight</code>.'],
          ['Calling <code>createIcon</code> during render', '<code>createIcon(data)</code> turns your own icon data into a component with every prop. Call it once at module level: calling it inside a component creates a new component type on every render and remounts the SVG.'],
          ['<code>import *</code> with a dynamic key', '<code>Icons[name]</code> on a namespace import keeps every icon in the bundle. Use <code>Icon</code> with a name instead, which loads only what is rendered.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'own', q: 'Can I use my own icons with the same props?', a: 'Yes. <code>createIcon(data)</code> from <code>glyphfox/react</code> takes icon data (<code>name</code>, <code>body</code>, <code>tags</code>, <code>categories</code>) and returns a component with every shared prop, including weight, the duotone and solid styles, modifiers and morphing. Draw the icon in the <a href="../studio.html">studio editor</a> or convert an existing SVG with Fox-ify so it follows the same grid and stroke rules.' },
    { id: 'defaults', q: 'How do I set a default size or weight for every icon?', a: 'The React package has no provider, so the usual way is a small wrapper such as <code>const NavIcon = (props) =&gt; &lt;Icon size={20} weight={1.75} {...props} /&gt;</code>. Color needs nothing: icons follow the CSS <code>color</code> of their parent.' },
  ],
};
