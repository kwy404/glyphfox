export default {
  slug: 'react-native',
  group: 'frameworks',
  order: 120,
  icon: 'smartphone',
  short: 'React Native',
  related: ['react', 'tree-shaking', 'accessibility'],
  title: 'React Native icons with glyphfox and react-native-svg',
  description: 'Render glyphfox icons in React Native with react-native-svg: SvgXml, small per icon imports for Metro, color, weight, fusions, morph frames and accessibility.',
  h1: 'Icons in React Native',
  lead: 'React Native has no SVG element of its own, so glyphfox icons render through react-native-svg. The glyphfox engine turns icon data into an SVG string and SvgXml draws it natively on iOS and Android.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['p', 'install.p', 'Install glyphfox and react-native-svg. In an Expo project, let Expo pick the react-native-svg version that matches your SDK; in a bare project, install the iOS pods afterwards.'],
        ['code', 'sh', 'terminal', `npm install glyphfox react-native-svg
# Expo
npx expo install react-native-svg
# bare React Native, iOS
npx pod-install`],
        ['p', 'install.p2', 'The React components in <code>glyphfox/react</code> are not for React Native: they render DOM <code>&lt;svg&gt;</code> elements, and React Native has no host component with that name. Use the core engine described below.'],
      ],
    },
    {
      id: 'how',
      h: 'How it works',
      blocks: [
        ['p', 'how.p', '<code>renderToString(icon, options)</code> from <code>glyphfox/core</code> takes icon data and the shared props and returns a complete SVG string. Everything that changes geometry happens in JavaScript before the string exists: the weight axis with its optical compensation, round or sharp corners, the duotone and solid styles, rotation and flips, modifier badges with their knockout gap, and fusions. react-native-svg then parses the string once and draws native shapes.'],
        ['p', 'how.p2', 'What does not survive is anything that relies on CSS in a browser: the living state animations, the CSS only morph and the right to left mirroring class. The section on limits below lists each one with its native replacement.'],
      ],
    },
    {
      id: 'component',
      h: 'A small Glyph component',
      blocks: [
        ['p', 'component.p', 'Wrap <code>SvgXml</code> once and use it everywhere. The string is memoized, so re-rendering the parent does not parse the SVG again, and the color is passed to <code>SvgXml</code> as a prop so a theme change does not rebuild the string.'],
        ['code', 'js', 'Glyph.tsx', `import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { renderToString } from 'glyphfox/core';
import type { IconData, SvgOptions } from 'glyphfox';

type Props = Omit<SvgOptions, 'size' | 'color'> & { icon: IconData; size?: number; color?: string };

export function Glyph({ icon, size = 24, color = '#121014', ...options }: Props) {
  const key = JSON.stringify(options);
  const xml = useMemo(() => renderToString(icon, { ...options, size }), [icon, size, key]);
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}`],
        ['code', 'js', 'Toolbar.tsx', `import { View } from 'react-native';
import home from 'glyphfox/icons/home';
import bell from 'glyphfox/icons/bell';
import folder from 'glyphfox/icons/folder';
import { Glyph } from './Glyph';

export function Toolbar() {
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <Glyph icon={home} size={22} color="#ff7a1a" />
      <Glyph icon={bell} modifier="dot" weight={1.5} />
      <Glyph icon={folder} variant="duotone" />
    </View>
  );
}`],
        ['p', 'component.p2', 'The strokes use <code>currentColor</code>, and react-native-svg resolves it from the <code>color</code> prop. Follow the system theme with <code>useColorScheme()</code> and pass a different color; the cached SVG string stays the same.'],
      ],
    },
    {
      id: 'imports',
      h: 'Keep the bundle small',
      blocks: [
        ['p', 'imports.p', 'Metro does not tree shake. Whatever a module imports ends up in the app bundle, so the way you import icons decides how much ships:'],
        ['table', 'imports.table', ['Import', 'What ships', 'Use it for'], [
          ['<code>glyphfox/core</code> plus <code>glyphfox/icons/NAME</code>', 'The engine and the icons you import, a few hundred bytes per icon', 'Most apps'],
          ['<code>toSvg</code> from <code>glyphfox</code>', 'The engine and every icon in the set', 'Prototypes, or icons chosen by name at runtime'],
          ['A subset package built with the CLI', 'Only finished SVG strings, no engine at all', 'A fixed set of icons with fixed props'],
        ]],
        ['p', 'imports.p2', 'The CLI turns a list of icons into a small package whose exports are plain SVG strings, with the props baked in at build time. Add the folder to your app as a workspace or <code>file:</code> dependency and pass the strings to <code>SvgXml</code>. Dashes in names become underscores, so <code>arrow-right</code> is exported as <code>arrow_right</code>:'],
        ['code', 'sh', 'terminal', 'npx glyphfox build home search bell arrow-right --type package --name @acme/icons --weight 1.75 --out packages/icons'],
        ['code', 'js', 'Header.tsx', `import { SvgXml } from 'react-native-svg';
import { home, arrow_right } from '@acme/icons';

export function Header() {
  return (
    <>
      <SvgXml xml={home} width={24} height={24} color="#121014" />
      <SvgXml xml={arrow_right} width={20} height={20} color="#121014" />
    </>
  );
}`],
      ],
    },
    {
      id: 'metro',
      h: 'Metro and package exports',
      blocks: [
        ['p', 'metro.p', '<code>glyphfox/core</code> and <code>glyphfox/icons/NAME</code> are subpath exports declared in the <code>exports</code> field of the package. Metro reads that field by default from React Native 0.79. On older versions, turn it on in the Metro config, otherwise these imports fail with an unable to resolve module error:'],
        ['code', 'js', 'metro.config.js', `const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  resolver: { unstable_enablePackageExports: true },
});`],
        ['p', 'metro.p2', 'Always hand icon data, not names, to the engine. The web packages load unknown names with a dynamic import of the icon folder, which works in web bundlers but is not something Metro follows; with data in hand, nothing ever needs to be loaded.'],
      ],
    },
    {
      id: 'shapes',
      h: 'Styles, modifiers and fusions',
      blocks: [
        ['p', 'shapes.p', 'The composition tools of the core work on data too. <code>fuse</code> combines 2 to 10 icons into a new icon that still follows the icon rules, and every option below is applied when the string is built:'],
        ['code', 'js', 'Sync.tsx', `import { fuse } from 'glyphfox/core';
import cloud from 'glyphfox/icons/cloud';
import lock from 'glyphfox/icons/lock';
import heart from 'glyphfox/icons/heart';
import { Glyph } from './Glyph';

const cloudLock = fuse([cloud, lock], { layout: 'overlap' });

export function Sync({ synced }: { synced: boolean }) {
  return (
    <>
      <Glyph icon={cloudLock} size={28} />
      <Glyph icon={cloud} modifier={synced ? 'check' : 'sync'} modifierCorner="top-right" />
      <Glyph icon={heart} variant="solid" corners="sharp" />
    </>
  );
}`],
        ['p', 'shapes.p2', 'Create fusions at module level or memoize them: <code>fuse</code> computes the knockout geometry, which is cheap once but wasteful on every render.'],
      ],
    },
    {
      id: 'morph',
      h: 'Animating a morph',
      blocks: [
        ['p', 'morph.p', 'There is no CSS to transition, but the morph engine itself is plain JavaScript. <code>createMorph(from, to)</code> prepares a morph once, using the hand tuned pairs such as menu to x and play to pause automatically, and <code>frame(t)</code> returns icon data for any progress from 0 to 1. <code>tween</code> from the core drives the progress with <code>requestAnimationFrame</code>:'],
        ['code', 'js', 'MenuButtonIcon.tsx', `import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { createMorph, renderToString, tween } from 'glyphfox/core';
import menu from 'glyphfox/icons/menu';
import x from 'glyphfox/icons/x';

const morph = createMorph(menu, x);

export function MenuButtonIcon({ open, color = '#121014' }: { open: boolean; color?: string }) {
  const [t, setT] = useState(open ? 1 : 0);
  const current = useRef(t);
  current.current = t;

  useEffect(() => {
    let alive = true;
    let cancel = () => {};
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (alive) cancel = tween(current.current, open ? 1 : 0, { duration: reduce ? 0 : 280 }, setT);
    });
    return () => {
      alive = false;
      cancel();
    };
  }, [open]);

  return <SvgXml xml={renderToString(morph.frame(t), { size: 24 })} width={24} height={24} color={color} />;
}`],
        ['p', 'morph.p2', 'Each frame builds and parses a new string, which is fine for a single icon over a few hundred milliseconds. Avoid running many morphs at once, and keep long running motion such as a spinner on a native transform of a wrapping view instead.'],
      ],
    },
    {
      id: 'a11y',
      h: 'Accessibility',
      blocks: [
        ['p', 'a11y.p', 'The <code>title</code>, <code>role</code> and <code>aria</code> attributes inside the SVG string do not reach the native accessibility tree, so set accessibility props on the component around the icon. An icon inside a labelled button needs nothing more; a standalone icon that carries meaning becomes an image with a label:'],
        ['code', 'js', 'Status.tsx', `import { Pressable, View } from 'react-native';
import search from 'glyphfox/icons/search';
import cloud from 'glyphfox/icons/cloud';
import { Glyph } from './Glyph';

export function Status({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={onSearch}>
        <Glyph icon={search} />
      </Pressable>
      <View accessible accessibilityRole="image" accessibilityLabel="All changes synced">
        <Glyph icon={cloud} modifier="check" />
      </View>
    </>
  );
}`],
        ['p', 'a11y.p2', 'The general rules for when an icon needs a label are in the <a href="accessibility.html">accessibility guide</a>.'],
      ],
    },
    {
      id: 'limits',
      h: 'What does not carry over',
      blocks: [
        ['table', 'limits.table', ['Feature', 'On the web', 'In React Native'], [
          ['Living states (<code>animate</code>)', 'Keyframes in a <code>&lt;style&gt;</code> element inside the SVG', 'SvgXml ignores the style element. Animate a wrapping view with Animated or Reanimated, for example a rotation for a spinner.'],
          ['CSS only morph (<code>morphTo</code> with a trigger)', 'A CSS transition of the path data', 'Render frames with <code>createMorph</code> as shown above.'],
          ['<code>mirrorRtl</code>', 'A class that flips the icon inside <code>dir="rtl"</code>', 'Pass <code>flipX={I18nManager.isRTL}</code> for directional icons.'],
          ['<code>title</code> and <code>decorative</code>', 'A title element, <code>role="img"</code> and <code>aria-hidden</code>', 'Accessibility props on the wrapper.'],
          ['Relative sizes', '<code>"1em"</code>, <code>"2rem"</code>', 'Numbers only.'],
        ]],
      ],
    },
    {
      id: 'props',
      h: 'Props',
      blocks: [
        ['p', 'props.p', 'These options of <code>renderToString</code> and <code>toSvg</code> change the drawing itself and work in React Native. They have the same names and meaning as the props of every other glyphfox package.'],
        ['props', 'tosvg', ['size', 'color', 'secondaryOpacity', 'weight', 'absoluteWeight', 'corners', 'variant', 'rotate', 'flipX', 'flipY', 'modifier', 'modifierCorner']],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['Using <code>glyphfox/react</code>', 'The web components render DOM elements, so React Native stops with an error about a missing view config for <code>svg</code>. Render through <code>SvgXml</code> instead.'],
          ['The whole set in the bundle', '<code>import { toSvg } from \'glyphfox\'</code> pulls every icon into the app, because Metro keeps all of it. Import icon data one by one, or build a subset package.'],
          ['Unable to resolve <code>glyphfox/core</code>', 'Package exports are off in Metro before React Native 0.79. Enable <code>unstable_enablePackageExports</code>.'],
          ['Parsing on every render', 'An inline <code>renderToString</code> call in a long list builds and parses a string per row and per render. Memoize the string, as the Glyph component does, or use prebuilt strings.'],
          ['Unknown names', '<code>toSvg</code> throws on a name that does not exist. Validate names that come from a server against <code>iconNames</code>, or map them to imported data yourself.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'expo', q: 'Does it work with Expo?', a: 'Yes. Install react-native-svg with <code>npx expo install react-native-svg</code> and use the same Glyph component. Expo uses Metro, so the note on package exports applies: SDKs built on React Native 0.79 or newer need no change.' },
    { id: 'spin', q: 'How do I make a loading spinner?', a: 'Draw <a href="../icons/loader.html">loader</a> or <a href="../icons/loader-circle.html">loader-circle</a> with the Glyph component and rotate a wrapping <code>Animated.View</code> with a looping timing animation. The native driver keeps it smooth, and the SVG string is built only once.' },
  ],
};
