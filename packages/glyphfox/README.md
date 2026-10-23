# glyphfox

Original icons on a 24 grid that change weight, morph, fuse, take modifier badges and come alive, with the same props in React, Vue, Svelte, Angular, the `<glyph-fox>` web component, Tailwind CSS, the CDN and the CLI.

This page is the API reference of the `glyphfox` package. Guides, examples and the studio live at [kwy404.github.io/glyphfox](https://kwy404.github.io/glyphfox/) and in the [repository README](https://github.com/kwy404/glyphfox#readme).

```sh
npm install glyphfox
```

No runtime dependencies. React, Vue, Svelte and Tailwind CSS are optional peer dependencies, used only by their entry points. Angular ships as the separate package `glyphfox-angular`.

## Entry points

| Import | What it is |
| --- | --- |
| `glyphfox` | Icon data, `toSvg`, `fuse`, `search`, morph and composition helpers, icon sources |
| `glyphfox/icons/<name>` | One icon as data (`export default`), for the smallest bundles |
| `glyphfox/core` | The rendering engine without icon data (integrations, custom renderers) |
| `glyphfox/react` | `<NameIcon>` components, `Icon`, `Fusion`, `MorphIcon`, `useMorph` |
| `glyphfox/vue` | The same components for Vue 3, `useMorph` |
| `glyphfox/svelte` | The same components for Svelte, `morphStore` |
| `glyphfox/web` | The `<glyph-fox>` custom element (`defineGlyphFox`) |
| `glyphfox/web/cdn` | One file with every icon, the element and a global `glyphfox` (jsDelivr, unpkg) |
| `glyphfox/tailwind` | Tailwind CSS plugin for v3 and v4 (CSS mask classes) |
| `glyphfox/runtime` | Replaces `<i data-glyph="name">` in plain HTML |
| `glyphfox/tools` | Icon lint and Fox-ify (convert any SVG to the glyphfox style) |
| `glyphfox/icons.json`, `glyphfox/sprite.svg`, `glyphfox/styles.css` | Static assets |

The `glyphfox` binary is the CLI: `npx glyphfox --help`.

## Stability

Everything on this page is public API and follows semantic versioning: names, signatures, the props, the name syntax, the icon data shape and the rendered markup classes (`glyphfox`, `glyphfox-<name>`, `gf-secondary`, `gf-fill`). Exports that are not documented here are internal and may change in any release.

## Rendering

```js
import { toSvg, getIcon, resolve, renderIcon, renderToString } from 'glyphfox';

toSvg('file', { size: 32, weight: 1.5, variant: 'duotone', color: '#ff7a1a' });
toSvg('file+check@tr', { animate: 'pop', trigger: 'hover' });
toSvg('cloud&lock:side');
```

| Function | Returns |
| --- | --- |
| `toSvg(spec, options?)` | SVG markup for any spec or icon data, with the shared props |
| `toNode(spec, options?)` | The same as a node tree `['svg', attrs, children]` |
| `resolve(spec, options?)` | Icon data for a spec, with its modifier and fusion applied |
| `renderIcon(icon, props?)` | Node tree for icon data |
| `renderToString(icon, props?)` | SVG markup for icon data |
| `getIcon(name)` | Icon data for a name, or `null` |
| `search(query, { limit?, category? })` | Icons ranked by name, tag and category |
| `icons`, `iconNames`, `categories` | The whole set, its names and its categories |
| `strokeWidth({ size, weight, absoluteWeight })` | The stroke width an icon is drawn with |

`options` takes every shared prop plus `class` (extra class names), `style` (inline style string) and `gap` (knockout gap of modifiers and fusions in grid units, default 1).

Icon data has this shape. Every icon module (`glyphfox/icons/file`) and every entry of `icons` is one:

```ts
interface IconData {
  name: string;
  body: string; // markup inside <svg viewBox="0 0 24 24">
  tags: string[];
  categories: string[];
  solid?: [number[], number[]] | null; // fill shapes and knockout lines of the solid style
  filled?: boolean; // icons from filled sets (see icon sources)
}
```

## Props

The same 23 props in every package. The web component takes them as kebab case attributes (`secondary-color`, `flip-x`, `morph-to`).

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `size` | number or string | 24 | Width and height; numbers are pixels |
| `color` | string | currentColor | Main color |
| `secondaryColor` | string | color | Color of the duotone layer and of the solid fill |
| `secondaryOpacity` | number | 0.3 duotone, 1 solid | Opacity of that layer |
| `weight` | number 1 to 3 | 2 | Stroke weight on the 24 grid, optically compensated below 24 px |
| `absoluteWeight` | boolean | false | Keeps the stroke at `weight` pixels at every size |
| `corners` | `round`, `sharp` | round | Joins and caps |
| `variant` | `outline`, `duotone`, `solid` | outline | Style axis; solid and duotone are generated from closed shapes |
| `rotate` | number | 0 | Rotation in degrees |
| `flipX`, `flipY` | boolean | false | Mirror horizontally or vertically |
| `mirrorRtl` | boolean | false | Mirror when the icon sits in a right to left context |
| `animate` | `draw`, `pop`, `wiggle`, `spin`, `pulse`, `bounce`, `shake` | none | Living state preset |
| `trigger` | `mount`, `hover`, `click`, `state` | mount | When the animation or the morph plays |
| `active` | boolean | false | Plays (or morphs) while true with `trigger="state"` |
| `duration`, `delay` | number (ms) | preset | Animation or morph timing |
| `loop` | boolean or number | preset | true loops forever, a number sets the count |
| `modifier` | `plus`, `minus`, `check`, `x`, `alert`, `lock`, `clock`, `sync`, `arrow-up`, `arrow-down`, `dot` | none | Modifier badge with a knockout gap |
| `modifierCorner` | `bottom-right`, `top-right`, `bottom-left`, `top-left` (or `br`, `tr`, `bl`, `tl`) | bottom-right | Corner of the badge |
| `morphTo` | spec or icon data | none | Morph target |
| `title` | string | none | Accessible name: adds `<title>` and `role="img"` |
| `decorative` | boolean | true without a title | Hides the icon from assistive technology |

Animations respect `prefers-reduced-motion`. `PROPS`, `DEFAULTS` and `ATTRIBUTES` (prop to attribute name) are exported for integrations.

## Name syntax

One string syntax shared by `toSvg`, the components (`name`), the web component, Tailwind, the CDN and the CLI:

| Spec | Meaning |
| --- | --- |
| `file` | An icon |
| `file+check` | With a modifier badge (bottom right) |
| `file+check@tl` | With the badge in a corner: `tl`, `tr`, `bl`, `br` |
| `cloud&lock` | A fusion of 2 to 10 icons (overlap for two, grid for more) |
| `cloud&lock:side` | A fusion with a layout |
| `heart/solid` | Any of the above with a style override |
| `mdi:home` | An icon from a registered icon source (see below) |

`parseSpec(spec)` returns `{ names, layout, modifier, corner, variant }`; `isComposite(spec)` tells whether a spec needs composition. In a fusion whose last part has a prefix and a name that is also a layout word, write the layout explicitly (`cloud&mdi:grid:overlap`).

## Variable axes

- Weight: `strokeWidth({ size, weight, absoluteWeight })` computes the stroke. Below 24 px the stroke grows slightly so small icons keep their presence.
- Corners: `round` uses round caps and joins, `sharp` uses square caps and miter joins.
- Style: `duotone` draws the icon's secondary layer (or its closed shapes) in `secondaryColor` at `secondaryOpacity`; `solid` fills the closed shapes and cuts the inner lines out of the fill with masks. Icons without closed shapes stay outline. `analyzeSolid(nodes)` exposes the analysis.

## Morph

```js
import { createMorph, getIcon, toSvg } from 'glyphfox';

const m = createMorph(getIcon('menu'), getIcon('x'));
m.frame(0.5); // icon data halfway
toSvg('play', { morphTo: 'pause', trigger: 'hover' }); // CSS morph, no script
```

Paths are normalized, resampled, matched and interpolated, so any icon turns into any other. `MORPH_PAIRS` lists the hand tuned pairs (menu and x, play and pause, plus and check, sun and moon, eye and eye-off, bell and bell-ring, heart and heart/solid, copy and check, lock and unlock, wifi and wifi-off). The components animate `morphTo` with the triggers above; `useMorph` (React, Vue) and `morphStore` (Svelte) give the frames to your own code.

## Fusion

```js
import { fuse, toSvg } from 'glyphfox';

const icon = fuse(['cloud', 'lock'], { layout: 'overlap', gap: 1 });
toSvg(icon, { weight: 1.75 });
```

`fuse(list, options)` takes 2 to 10 names, specs or icon data. Options: `layout` (`LAYOUTS`: overlap, side, stack, grid, orbit, badge, inside), `gap` (knockout gap, default 1), `weight` (the stroke it will be drawn with), `scale` (one number or one per part), `offsets` (`[dx, dy]` per part in grid units). Parts are scaled and snapped to the grid; where they overlap, the part behind is trimmed around the part in front. The result is icon data that passes the icon lint, with `parts` (the box of every part).

## Modifiers

```js
import { withModifier, getIcon } from 'glyphfox';

withModifier(getIcon('file'), 'check', 'top-right', { weight: 2, gap: 1 });
```

`MODIFIER_NAMES` and `CORNERS` list the badges and corners. The icon under the badge is trimmed so a clean gap separates them at every weight.

## Living states

`ANIMATIONS` holds the presets (duration, easing, loop), `ANIMATION_NAMES` and `TRIGGERS` the names. `animationLength(spec)` gives the total time and `frameState(spec, t)` samples a preset at a time, which the studio uses to export GIF and WebM. Rendered animations are scoped CSS inside the SVG, so they work anywhere SVG markup does.

## Icon sources

Icons from other sets (for example the glyphfox universe sets) are used with a prefix: `mdi:home`, `ph:rocket`. A package registers a source once, and every entry point resolves the names: `toSvg`, the React, Vue, Svelte and Angular components, the web component and the CDN global.

```js
import { registerIconSource, loadIcon, toSvg } from 'glyphfox';

// Synchronous source.
registerIconSource('demo', {
  get: (name) => (name === 'dot' ? { body: '<circle cx="12" cy="12" r="4"/>' } : null),
});
// Asynchronous source: a function is used as load(name).
registerIconSource('remote', (name) => fetch(`/icons/${name}.json`).then((r) => (r.ok ? r.json() : null)));

toSvg('demo:dot', { weight: 1.5, animate: 'draw' });
await loadIcon('remote:rocket'); // the components load names on their own
```

| Function | What it does |
| --- | --- |
| `registerIconSource(prefix, source)` | `source` is `{ get(name) }`, `{ load(name) }` or a function used as `load`; `null` removes it |
| `hasIconSource(prefix)` | True when a source is registered |
| `loadIcon(name)` | Loads and registers any name, prefixed or not |
| `normalizeIcon(icon, name?)` | The normalization applied to source data |

A source returns `{ body, viewBox?, mode?, tags?, categories?, set?, license?, author? }`. The body is moved onto the 24 grid when `viewBox` is not `0 0 24 24`, groups are flattened and their paint is passed down to the shapes.

- Stroke based icons (`mode: "stroke"`, the default) behave like the glyphfox set: weight, corners, animations, modifiers, Fusion and morph all apply. The style axis uses their closed shapes.
- Filled icons (`mode: "fill"`) keep their own paint. Weight and the style axis do not change them, `draw` falls back to `pop`, modifiers cut a disk out of the shapes, and Fusion cuts the parts behind with a mask. The result is marked `filled: true`.

The registry is shared through `globalThis`, so the ESM build, the CommonJS build and the framework entry points see the same icons and sources.

## Formats

`snippet(format, spec, props?)` builds copyable code in any of `FORMATS`: `svg`, `jsx`, `vue`, `svelte`, `angular`, `html`, `tailwind`, `cdn`, `datauri`. `componentName(name)` gives the component name (`arrow-right` to `ArrowRightIcon`), `dataName(name)` the data export name (`iconArrowRight`), `toDataUri(svg)` a CSS ready data URI.

## Plain HTML

```html
<i data-glyph="file+check" data-size="20"></i>
<script type="module">
  import { replaceGlyphs } from 'glyphfox';
  replaceGlyphs(document, { observe: true });
</script>
```

`replaceGlyphs(root, { observe })` replaces every element with `data-glyph` and returns the count; with `observe` it keeps watching for new elements. The CDN build runs it on load.

## glyphfox/core

The engine without icon data, for integrations and custom renderers: `renderIcon`, `renderToString`, `withModifier`, `fuse`, `createMorph`, `parseSpec`, `resolveSpec(spec, lookup, { weight, gap })`, `registerIcons`, `lookupIcon`, `loadIcon`, `setIconLoader`, `registerIconSource`, `hasIconSource`, `normalizeIcon`, the controller helpers used by every component (`splitProps`, `reducedMotion`, `tween`, `morphGoal`, `morphFrame`), `animationCss`, `frameState`, `propsFromAttributes`, `parseBody`, `nodesToString` and the constants above.

## Framework entry points

| Entry | Exports |
| --- | --- |
| `glyphfox/react` | One forwardRef component per icon (`FileIcon`), `Icon` (`name`, `icon`), `Fusion` (`icons`, `layout`, `gap`, `scale`, `offsets`), `MorphIcon`, `useMorph(spec, options)`, `createIcon(data)`, `registerIcons` |
| `glyphfox/vue` | The same components, `useMorph`, `createIcon`, `registerIcons`, `glyphProps` |
| `glyphfox/svelte` | `Icon`, `Fusion`, `MorphIcon`, `morphStore`, `registerIcons`, one component per icon under `glyphfox/svelte/icons/<name>` |
| `glyphfox/web` | `GlyphFoxElement`, `defineGlyphFox(tag?)`; the element takes `name`, `layout`, `gap` and every prop as an attribute |
| `glyphfox/tailwind` | The plugin (options `prefix`, `size`, `variant`, `corners`, `weight`, `combos`), `maskUrl`, `parseAxes` |
| `glyphfox-angular` | `GlyphFoxIcon` (the standalone `<gf-icon>` component), `provideGlyphFox`, `provideGlyphFoxIcons`, `GLYPHFOX_CONFIG` |

Every component passes other attributes (class, style, events) to the `<svg>`.

## glyphfox/tools

`lintSvg(svg)` and `lintBody(body)` check the icon rules and return `{ rule, message }` problems; `canonicalSvg(body)` writes an icon file; `foxify(svg, { snap, fit, padding })` converts any SVG to the glyphfox style and returns `{ svg, body, problems, notes }`.

## License

MIT, Alexandre Kohler ([github.com/kwy404](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).
