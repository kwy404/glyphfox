<p align="center">
  <a href="https://kwy404.github.io/glyphfox/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/glyphfox@main/assets/banner-dark.png">
      <img src="https://cdn.jsdelivr.net/gh/kwy404/glyphfox@main/assets/banner-light.png" alt="glyphfox: icons that move, morph and fuse" width="880">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/glyphfox"><img src="https://img.shields.io/npm/v/glyphfox?color=ff7a1a&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/glyphfox"><img src="https://img.shields.io/npm/dm/glyphfox?color=ff7a1a" alt="npm downloads"></a>
  <a href="https://github.com/kwy404/glyphfox/actions/workflows/ci.yml"><img src="https://github.com/kwy404/glyphfox/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.jsdelivr.com/package/npm/glyphfox"><img src="https://img.shields.io/jsdelivr/npm/hm/glyphfox?color=ff7a1a" alt="jsDelivr"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-ff7a1a" alt="MIT license"></a>
</p>

# glyphfox

Original open source icons on a 24 grid that do more than sit still. Every icon is **variable** (weight, corners and style axes), **morphs** into any other icon, **fuses** with other icons into new ones that still pass the rules, takes **modifier badges** in any corner and comes with **living states** (draw, pop, wiggle, spin, pulse, bounce, shake). One set of props works the same in React, Vue, Svelte, Angular, the `<glyph-fox>` web component, Tailwind CSS, the CDN and the CLI.

**[Open the studio](https://kwy404.github.io/glyphfox/)** to browse, customize, morph, fuse, draw your own icons, Fox-ify any SVG, search by sketch, export a brand kit and render icons in 3D.

[Português (Brasil)](i18n/README.pt-BR.md)

## Contents

- [Install](#install)
- [Quick start](#quick-start): [React](#react), [Vue](#vue), [Svelte](#svelte), [Angular](#angular), [Web component and CDN](#web-component-and-cdn), [Tailwind CSS](#tailwind-css), [Plain HTML](#plain-html), [JavaScript](#javascript)
- [Props](#props)
- [Name syntax](#name-syntax)
- [Variable axes](#variable-axes) · [Morph](#morph) · [Fusion](#fusion) · [Living states](#living-states) · [Modifiers](#modifiers)
- [CLI](#cli)
- [The studio](#the-studio)
- [Icon rules](#icon-rules)

## Install

```sh
npm install glyphfox
```

`glyphfox` has no dependencies. React, Vue, Svelte and Tailwind CSS are optional peer dependencies, used only when you import their entry points. Angular lives in its own package:

```sh
npm install glyphfox-angular
```

## Quick start

### React

```jsx
import { HomeIcon, FileIcon, Fusion, MorphIcon } from 'glyphfox/react';

export function Toolbar({ open, saved }) {
  return (
    <>
      <HomeIcon />
      <FileIcon size={20} weight={1.5} modifier={saved ? 'check' : undefined} />
      <Fusion icons={['cloud', 'lock']} layout="overlap" />
      <MorphIcon name={open ? 'x' : 'menu'} />
    </>
  );
}
```

Components are tree shakable (`/*#__PURE__*/`, `sideEffects: false`), use `forwardRef`, and pass `className`, `style` and every SVG attribute through. Deep imports work too: `import { FileIcon } from 'glyphfox/react/icons/file'`. The `useMorph(name, { duration })` hook returns icon data that morphs whenever `name` changes.

### Vue

```vue
<script setup>
import { HomeIcon, Fusion, MorphIcon } from 'glyphfox/vue';
</script>

<template>
  <HomeIcon :size="32" color="#ff7a1a" variant="duotone" />
  <Fusion :icons="['file', 'check']" layout="badge" />
  <MorphIcon :name="playing ? 'pause' : 'play'" />
</template>
```

`useMorph(nameRef)` is the composable equivalent of the React hook.

### Svelte

```svelte
<script>
  import { HeartIcon, Fusion } from 'glyphfox/svelte';
  let liked = $state(false);
</script>

<button onclick={() => (liked = !liked)}>
  <HeartIcon animate="pop" trigger="state" active={liked} variant={liked ? 'solid' : 'outline'} />
</button>
<Fusion icons={['user', 'shield']} layout="badge" />
```

Svelte 5. `morphStore('menu')` is a store that morphs on every `set(name)`.

### Angular

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { iconHome, iconFile, iconCheck } from 'glyphfox';
import { GlyphFoxIcon, provideGlyphFox } from 'glyphfox-angular';

bootstrapApplication(App, {
  providers: [provideGlyphFox({ icons: [iconHome, iconFile, iconCheck], defaults: { weight: 1.75 } })],
});
```

```html
<gf-icon name="home" [size]="24"></gf-icon>
<gf-icon name="file+check@tr" variant="duotone"></gf-icon>
<gf-icon [icons]="['cloud', 'lock']" layout="overlap"></gf-icon>
```

`GlyphFoxIcon` is a standalone component with every shared prop as an input. Register only the icons you use, or pass `icons` from `glyphfox` to register all of them.

### Web component and CDN

One file, every icon, no build step:

```html
<script src="https://cdn.jsdelivr.net/npm/glyphfox@1"></script>
<!-- or https://unpkg.com/glyphfox@1 -->

<glyph-fox name="home"></glyph-fox>
<glyph-fox name="file+check" size="32" weight="1.5"></glyph-fox>
<glyph-fox name="cloud&lock" layout="overlap"></glyph-fox>
<glyph-fox name="menu" morph></glyph-fox> <!-- animates when name changes -->
```

Every prop is an attribute in kebab-case (`secondary-color`, `flip-x`, `morph-to`...). With a bundler: `import 'glyphfox/web'` (all icons) or `import { defineGlyphFox } from 'glyphfox/web/element'` (bring your own icons with `registerIcons`). The CDN build also exposes `window.glyphfox` (`toSvg`, `fuse`, `search`...).

### Tailwind CSS

Icons as CSS masks in `currentColor`, so `text-*`, `size-*` and `opacity-*` utilities just work.

```js
// Tailwind v3: tailwind.config.js
module.exports = { plugins: [require('glyphfox/tailwind')] };
```

```css
/* Tailwind v4 */
@import "tailwindcss";
@plugin "glyphfox/tailwind";
```

```html
<span class="gf-home text-2xl text-orange-500"></span>
<span class="gf-[file+check] gf-spin"></span>          <!-- v3 also accepts gf-file+check -->
<span class="gf-[cloud&lock]/side"></span>             <!-- fusion with a layout -->
<span class="gf-heart/solid-sharp-w1.5"></span>        <!-- axes after the slash -->
```

Animations: `gf-spin`, `gf-pulse`, `gf-pop`, `gf-wiggle`, `gf-bounce`, `gf-shake`. Options: `glyphfox({ prefix, size, variant, corners, weight, combos })`.

### Plain HTML

```html
<script type="module">import 'https://cdn.jsdelivr.net/npm/glyphfox@1/dist/runtime/auto.js';</script>
<i data-glyph="search" data-size="20" data-variant="duotone"></i>
```

The runtime replaces every `data-glyph` element with inline SVG, including elements added later.

### JavaScript

```js
import { toSvg, fuse, createMorph, search, getIcon } from 'glyphfox';

toSvg('file', { size: 32, color: '#ff7a1a', variant: 'solid' });
toSvg('file+check@tr');                      // modifier badge
toSvg('cloud&lock:overlap');                 // fusion
toSvg('menu', { morphTo: 'x', trigger: 'hover' }); // CSS only morph
fuse(['cloud', 'lock'], { layout: 'overlap', gap: 1 }); // icon data, passes the lint
search('arrow', { limit: 10 });
```

Also in the package: `glyphfox/icons.json`, `glyphfox/sprite.svg` (`<use href="sprite.svg#gf-home">`), `glyphfox/styles.css` (optional animation classes), `glyphfox/core` (the engine without icon data) and `glyphfox/tools` (lint and Fox-ify).

## Props

The same props, with the same names and meaning, in every package. Attributes use kebab-case (`secondary-color`). The plain use stays `<HomeIcon />`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | number or string | `24` | Width and height. Numbers are pixels, strings can be `1em`, `2rem`. |
| `color` | string | `currentColor` | Main color. |
| `secondaryColor` | string | `color` | Color of the duotone layer and of the solid fill. |
| `secondaryOpacity` | number | `0.3` duotone, `1` solid | Opacity of the duotone layer or of the solid fill. |
| `weight` | number | `2` | Weight axis, stroke width from 1 to 3 on the 24 grid. Optically compensated below 24 px. |
| `absoluteWeight` | boolean | `false` | Keeps the stroke at `weight` pixels at any size. |
| `corners` | `round` or `sharp` | `round` | Corners axis: round or sharp joins and caps. |
| `variant` | `outline`, `duotone`, `solid` | `outline` | Style axis. Solid is generated from the closed shapes of each icon. |
| `rotate` | number | `0` | Rotation in degrees. |
| `flipX` | boolean | `false` | Mirror horizontally. |
| `flipY` | boolean | `false` | Mirror vertically. |
| `mirrorRtl` | boolean | `false` | Mirror in right to left layouts. |
| `animate` | `draw`, `pop`, `wiggle`, `spin`, `pulse`, `bounce`, `shake` | none | Living state preset. |
| `trigger` | `mount`, `hover`, `click`, `state` | `mount` | When the animation, or the morph, plays. |
| `active` | boolean | `false` | The state for `trigger="state"`. |
| `duration` | number (ms) | per preset, `450` for morphs | Animation or morph duration. |
| `delay` | number (ms) | `0` | Animation or morph delay. |
| `loop` | boolean or number | `false` (`true` for spin and pulse) | Repeat forever or a number of times. |
| `modifier` | `plus`, `minus`, `check`, `x`, `alert`, `lock`, `clock`, `sync`, `arrow-up`, `arrow-down`, `dot` | none | Modifier badge with an automatic knockout gap. |
| `modifierCorner` | `top-left`, `top-right`, `bottom-left`, `bottom-right` | `bottom-right` | Badge corner (`tl`, `tr`, `bl`, `br` also work). |
| `morphTo` | icon name or data | none | Morph target; the trigger decides when it shows. |
| `title` | string | none | Accessible name: adds `<title>`, `role="img"` and `aria-label`. |
| `decorative` | boolean | `true` without a title | Hides the icon from assistive technology (`aria-hidden`). |

Plus `class` (`className` in React) and `style`, passed to the `<svg>` (or to the host element for Angular and the web component). Every animation respects `prefers-reduced-motion`.

## Name syntax

Shared by the web component, the CDN, Tailwind, the CLI and `toSvg`:

| Spec | Meaning |
| --- | --- |
| `file` | an icon |
| `file+check` | with a modifier badge |
| `file+check@tl` | badge in a corner: `tl`, `tr`, `bl`, `br` |
| `cloud&lock` | a fusion of 2 to 10 icons |
| `cloud&lock:side` | a fusion with a layout |
| `heart/solid` | a style: `outline`, `duotone`, `solid` |

## Variable axes

Every icon renders along three axes. **Weight** runs from 1 to 3; at 16 px and below the stroke grows a little so small icons keep their presence (`absoluteWeight` turns this off). **Corners** switch between round and sharp joins and caps. **Style** gives outline, duotone (the hand drawn duotone layer when the icon has one, or a translucent fill of its closed shapes) and solid (closed shapes filled, inner lines cut out as negative space, generated at build time).

```jsx
<SearchIcon weight={1} />
<SearchIcon weight={3} corners="sharp" />
<FolderIcon variant="duotone" secondaryColor="#ff7a1a" />
<FolderIcon variant="solid" />
```

## Morph

Any icon morphs into any other: paths are normalized, resampled, matched with an optimal assignment and interpolated. Hand tuned pairs make the common ones feel designed: menu to close, play to pause, plus to check, sun to moon, eye to eye-off, bell to bell-ring, heart to a filled heart, copy to check, lock to unlock, wifi to wifi-off.

```jsx
<MenuIcon morphTo={open ? 'x' : undefined} />            // morphs when morphTo changes
<HeartIcon morphTo="heart/solid" trigger="click" />      // toggles on click
<MorphIcon name={copied ? 'check' : 'copy'} />          // morphs on every name change
```

Without JavaScript, `toSvg('menu', { morphTo: 'x', trigger: 'hover' })` returns an SVG that morphs with a CSS `d` transition and falls back to a cross fade where CSS `d` is not supported.

## Fusion

`fuse()` combines 2 to 10 icons into one icon that follows the same rules (padding box, one weight, no transforms), so it passes the icon lint. Each part is scaled and snapped to the grid; where parts overlap, the part behind is cut around the part in front with a knockout gap, so lines never collide.

| Layout | Use |
| --- | --- |
| `overlap` | diagonal back and front, like a file over a folder |
| `side`, `stack` | side by side or stacked |
| `grid` | 2x2, 3x3 and a 10 slot layout |
| `orbit` | one center icon with up to 9 small icons around it |
| `badge` | icons as corner badges |
| `inside` | one icon inside another closed shape, like a heart inside a shield |

```jsx
<Fusion icons={['cloud', 'lock']} layout="overlap" gap={1} />
<Fusion icons={['shield', 'heart']} layout="inside" />
```

```sh
npx glyphfox fuse user shield --layout badge --format svg
```

## Living states

Presets that understand the icon: `draw` traces the strokes in drawing order, `pop`, `wiggle`, `spin`, `pulse`, `bounce` and `shake` (a bell style swing from the top). Trigger them on `mount`, `hover` (the icon or its parent), `click` (replays on every click) or `state` (plays while `active` is true). The styles travel inside the SVG, so they also work in `toSvg` output, data URIs and exported files. The studio exports animated SVG, GIF and WebM.

```jsx
<BellIcon animate="shake" trigger="state" active={hasNews} />
<SparklesIcon animate="draw" trigger="hover" />
```

## Modifiers

Any icon takes a badge in any corner, with the base icon cut around it: a few hundred icons give thousands of correct combinations.

```jsx
<FileIcon modifier="check" />
<CloudIcon modifier="sync" modifierCorner="top-right" />
```

```html
<glyph-fox name="user+plus@tl"></glyph-fox>
```

## CLI

```sh
npx glyphfox search arrow
npx glyphfox show file+check --variant solid     # details, terminal preview, SVG
npx glyphfox copy heart --format jsx --size 32   # svg, jsx, vue, svelte, angular, html, tailwind, cdn, datauri
npx glyphfox fuse cloud lock --layout overlap --format svg --out cloud-lock.svg
npx glyphfox morph menu x --trigger hover --out menu.svg
npx glyphfox build home search file+check --type sprite --out public/icons
npx glyphfox build --from icons.txt --type package --name @acme/icons --out acme-icons
npx glyphfox lint my-icon.svg
npx glyphfox foxify any-icon.svg --out fox.svg
```

`build` makes a sprite, a CSS file with mask classes, or a small package (`package.json`, ESM exports, types, sprite and SVG files) from a list of names. Every command takes the shared props as flags (`--weight 1.5 --corners sharp --variant duotone`).

## The studio

[kwy404.github.io/glyphfox](https://kwy404.github.io/glyphfox/) runs entirely in your browser:

- browse with instant search by name, tag and category, or **draw a rough shape** to find the closest icons;
- customize every axis and prop live, then copy in every format or download SVG, PNG, animated SVG, GIF and WebM;
- **morph** any pair, **fuse** 2 to 10 icons with every layout, add **modifiers**;
- **edit** icons on the 24 grid (pen and shape tools, node editing, undo and redo, live lint) and keep a local collection;
- **Fox-ify** any SVG into the glyphfox style with a before and after view;
- export a **brand kit** (themed package, sprite, CSS, favicon and app icons);
- render any icon in **3D** with lighting and material presets.

## Icon rules

Original drawings only, on a 24 by 24 grid: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, stroke width 2, round caps and joins, 2 px padding, no transforms, no fills except one optional duotone layer (`class="gf-secondary"`). Sources live in `icons/NAME.svg` with `icons/NAME.json` (`categories` and `tags`); `node tools/icons/lint.mjs` checks them.

## Development

```sh
npm install
npm run build          # icons/ to packages/glyphfox/dist and docs/data
npm run build:angular  # packages/glyphfox-angular/dist (ng-packagr)
npm run typecheck
npm test
npm run serve          # the studio on http://localhost:4173
```

## Author

Made by **Alexandre Kohler** ([GitHub](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)). Fenn, the geometric fox, is drawn with the same grid and stroke as the icons.

## License

[MIT](LICENSE)
