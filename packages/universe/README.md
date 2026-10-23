# glyphfox-universe

One glyphfox API over <!-- universe:total -->414,952<!-- /universe:total --> open license icons from established sets: Material Symbols, Material Design Icons, Fluent UI System Icons, IBM Carbon, Font Awesome Free, Bootstrap Icons, Heroicons, Phosphor, Lucide, Tabler, Remix Icon, Ionicons, Ant Design, Simple Icons and every other set in Iconify whose license allows redistribution and modification. A `prefix:name` resolver, instant search over names, tags and aliases, license metadata on every icon, the glyphfox style transforms on top, and bundler plugins that inline only the icons you use.

```sh
npm i glyphfox-universe
```

The package is small: it ships the code, a catalog of every set (counts, authors, licenses) and a compact search index (about 5 MB, loaded lazily). Icon drawings are never copied into it: each set loads on demand as one JSON file, from the `@iconify-json/<prefix>` packages on jsDelivr, or from a local install of `@iconify-json/<prefix>` or `@iconify/json` when there is one (Node reads those first). The data comes from [@iconify/json](https://github.com/iconify/icon-sets) <!-- universe:source -->2.2.547<!-- /universe:source --> (MIT); every set keeps its own license.

## Quick start

```js
import { getIcon, toSvg, search } from 'glyphfox-universe';

const icon = await getIcon('mdi:home');
// { name: 'mdi:home', body, viewBox: '0 0 24 24', width, height, stroke: false,
//   license: { spdx: 'Apache-2.0', title, url, kind: 'permissive', attribution: false, author, file } }

const svg = await toSvg('lucide:rocket', { size: 32, weight: 1.5, color: '#ff7a1a', animate: 'draw' });

const hits = await search('arrow left', { styles: ['outline'], licenses: ['permissive', 'public-domain'], limit: 20 });
// [{ name: 'lucide:arrow-left', prefix: 'lucide', icon: 'arrow-left', style: 'outline', brand: false, stroke: true }, ...]
```

With the glyphfox components, register the universe once and use any prefixed name wherever glyphfox takes a name:

```jsx
import 'glyphfox-universe/glyphfox';
import { Icon } from 'glyphfox/react';

<Icon name="ph:rocket-launch" size={24} weight={1.5} />
```

```html
<script type="module">
  import 'glyphfox/web';
  import 'glyphfox-universe/glyphfox';
</script>
<glyph-fox name="tabler:heart" animate="draw"></glyph-fox>
```

## How names resolve (for the glyphfox packages)

1. A universe name is `prefix:name`, lower case: `parseName('mdi:home')` gives `{ prefix: 'mdi', name: 'home' }`. Names without a prefix are glyphfox icons. Fusion and modifiers keep their syntax: `cloud&mdi:lock:side`, `tabler:file+check@tr`.
2. `import 'glyphfox-universe/glyphfox'` calls `registerIconSource(prefix, source)` of glyphfox for every shipped prefix (`PREFIXES`, <!-- universe:sets-count -->245<!-- /universe:sets-count --> of them). Each source has `get(name)`, which answers from memory (icons already loaded or registered offline), and `load(name)`, which loads the set and resolves the icon.
3. The source hands glyphfox `{ body, viewBox, set, license, author }`, plus `mode: 'fill'` for icons that are not stroke based. glyphfox normalizes the viewBox onto its 24 grid, so stroke based icons keep their strokes and the weight axis, `animate="draw"`, modifiers and Fusion work on them. Color icons (emoji, flags, logos in color) render best with `toSvg`, which keeps gradients and masks.
4. `getIcon(name)` follows Iconify aliases (with their rotations and flips, baked into the body), loads the set once per page (a small cache keeps the most recent sets) and attaches the license record of the set. Unknown names resolve to `null`; prefixes that are not shipped reject, so a set with a license that is not allowed can never be used through this API.
5. `getIconSync(name)` and `toSvgSync(name)` answer without a promise for icons already in memory, which is what server rendering and the offline bundles use.

### Stroke based sets

`icon.stroke` is true when the drawing uses `currentColor` strokes. For those icons `weight` (the stroke width on the 24 grid, scaled to the icon box, with the glyphfox optical compensation below 24 px), `corners` and the `draw` animation apply. These sets are stroke based (60 percent of their icons or more), with their native stroke width:

<!-- universe:stroke:start -->
`lucide` (2), `tabler` (2), `feather` (2), `iconoir` (1.5), `hugeicons` (1.5), `icon-park-outline` (4), `akar-icons` (2), `andrsrxn` (1.5), `arcticons` (1), `bytesize` (2), `charm` (1.5), `ci` (2), `codex` (2), `covid` (1.5), `gala` (15.992), `glyphs` (6), `grommet-icons` (2), `guidance` (1), `heroicons-outline` (2), `humbleicons` (2), `iconamoon` (2), `iconmind` (2.5), `iconoven` (1.5), `keyline-icons` (2), `lets-icons` (2), `lucide-lab` (2), `majesticons` (2), `matita` (1.6), `meteor-icons` (2), `proicons` (1.5), `quill` (2), `si` (1.5), `streamline-cyber` (1), `streamline-guidance` (1), `system-uicons` (0.933), `vadivam` (2), `wordpress` (1.5).
<!-- universe:stroke:end -->

Many other sets have stroke based icons too (for example the outline themes of Heroicons, Solar and MingCute); the search index flags every icon, so `search(q, { stroke: true })` finds them across all sets.

## API

| Export | What it does |
| --- | --- |
| `getIcon(name)` | The icon object (body, viewBox, box, stroke flag, license), loading its set on demand. |
| `getIcons(names)` | Many icons at once, one request per set. |
| `getIconSync(name)` | The icon when it is already in memory, else `undefined`. |
| `toSvg(name, options)`, `toSvgSync(name, options)` | SVG markup with the style transforms. |
| `iconToSvg(icon, options)` | SVG markup of an icon object. |
| `search(query, options)` | Search names, aliases and categories (tags) across every set. |
| `loadIndex()` | The search index (`UniverseIndex`: `searchIds`, `browse`, `entry`, `categoriesOf`, `aliasesOf`). |
| `listSets()`, `getSet(prefix)`, `loadCatalog()` | The catalog: every set with its counts, styles, author, license and CDN package. |
| `loadSet(prefix)` | The Iconify JSON of a set. |
| `registerIcons(bundle)` | Registers offline icons (what the plugins and `add()` write). |
| `attributionFor(name)`, `attributionLine(set)` | The credit line of CC BY and CC BY-SA sets. |
| `licenseDecision`, `checkCatalog` | The license policy and the check the build runs. |
| `configure(options)` | `cdn`, `dataUrl` (folder with `catalog.json` and `index.json`), `fetch`, `offline`, `maxSets`. |
| `PREFIXES` (from `glyphfox-universe/glyphfox`) | Every shipped prefix; `registerUniverse(register, prefixes)` registers a subset. |

Options of `toSvg` and `iconToSvg`: `size` (number or CSS length, the height; the width keeps the ratio), `color`, `secondaryColor` and `secondaryOpacity` (paint the translucent duotone layer), `weight`, `absoluteWeight`, `corners` (`round` or `sharp`), `rotate` (degrees), `flipX`, `flipY`, `animate` (`spin`, `pulse`, `draw`; always behind `prefers-reduced-motion`), `title` (accessible name, else `aria-hidden`), `class`, `attrs`, `idPrefix` (ids of gradients and masks get a unique prefix so many icons can share a page; pass one for stable server output).

Search options: `limit`, `sets`, `styles` (`outline`, `solid`, `duotone`, `color`), `brand` (`true` for logos only, `false` to leave them out), `stroke`, `licenses` (SPDX ids or kinds: `public-domain`, `permissive`, `attribution`, `share-alike`). A query that starts with `prefix:` searches one set. Styles come from the theme names of each set (Iconify prefixes and suffixes), style words in the names and the drawing itself.

## Offline builds

The bundler plugins find the universe names in your sources (and in every module the build transforms) and inline only those icons, with the license of every set used in the module header.

```js
// vite.config.js
import { glyphfoxUniverse } from 'glyphfox-universe/vite';
export default { plugins: [glyphfoxUniverse({ include: ['src'], icons: ['mdi:home'] })] };

// webpack.config.js or rspack.config.js
const { GlyphfoxUniversePlugin } = require('glyphfox-universe/webpack');
module.exports = { plugins: [new GlyphfoxUniversePlugin({ include: ['src'] })] };

// main.js
import 'virtual:glyphfox-universe';
```

### `glyphfox add` (for the CLI)

`add(names, { out, cwd })` from `glyphfox-universe/add` resolves icons and merges them into an offline module (default `src/glyphfox-universe.js`) that registers them; `addCommand(argv)` is the whole command with its usage line, messages and exit code:

```sh
glyphfox add mdi:home lucide:rocket --out src/icons.js
```

```js
import { addCommand, ADD_USAGE } from 'glyphfox-universe/add';
process.exitCode = await addCommand(process.argv.slice(3));
```

## Licenses

- A set ships only when its SPDX license allows redistribution and modification: public domain (CC0, Unlicense), permissive (MIT, ISC, BSD, Apache 2.0), attribution (CC BY 3.0 and 4.0) and share alike (CC BY-SA, OFL, MPL, GPL). Non commercial or no derivatives licenses, sets without a license and proprietary sets such as Apple SF Symbols never ship.
- Every icon carries `license` (`spdx`, `title`, `url`, `kind`, `attribution`, `author`, `file`).
- The license texts, exactly as each set publishes them, and the notice with every author and link are in [LICENSES](https://github.com/kwy404/glyphfox/tree/main/LICENSES) and in [NOTICE.md](NOTICE.md).
- The build fails when a set has a missing or non redistributable license, when its license text is missing, or when an excluded set reaches the index (`npm run check`).
- Share alike sets (CC BY-SA, OFL, GPL, MPL) ask that changed versions keep the same license; filter them out with `licenses: ['public-domain', 'permissive', 'attribution']` when that does not suit your project.
- Brand and logo icons show trademarks of their owners. The licenses cover the drawings, not the trademarks: use a logo only to refer to its brand, follow the brand guidelines of its owner, and do not suggest an endorsement.

### Attribution

These sets are licensed under Creative Commons Attribution or Attribution ShareAlike. Credit them where their icons are used (an about page or the credits of your app is enough); `attributionFor(name)` gives the line for any icon.

<!-- universe:attribution:start -->
- Icons from "Font Awesome Solid" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Font Awesome Regular" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Font Awesome Brands" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Codicons" by Microsoft Corporation (https://github.com/microsoft/vscode-codicons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Solar" by 480 Design (https://www.figma.com/community/file/1166831539721848736), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Streamline" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Twitter Emoji" by Twitter (https://github.com/jdecked/twemoji), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "OpenMoji" by OpenMoji (https://github.com/hfg-gmuend/openmoji), licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
- Icons from "Game Icons" by GameIcons (https://github.com/game-icons/icons), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).
- Icons from "Arcticons" by Donnnno (https://github.com/Arcticons-Team/Arcticons), licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
- Icons from "Basil" by Craftwork (https://www.figma.com/community/file/931906394678748246), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Brandico" by Fontello (https://github.com/fontello/brandico.font), licensed under CC BY SA (https://creativecommons.org/licenses/by-sa/3.0/).
- Icons from "coolicons" by Kryston Schwarze (https://github.com/krystonschwarze/coolicons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "CoreUI Free" by creativeLabs Łukasz Holeczek (https://github.com/coreui/coreui-icons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Covid Icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Emoji One (Colored)" by Emoji One (https://github.com/EmojiTwo/emojitwo), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Emoji One (Monotone)" by Emoji One (https://github.com/EmojiTwo/emojitwo), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Emoji One (v1)" by Emoji One (https://github.com/joypixels/emojione-legacy), licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
- Icons from "Entypo+" by Daniel Bruce (https://github.com/chancancode/entypo-plus), licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
- Icons from "Entypo+ Social" by Daniel Bruce (https://github.com/chancancode/entypo-plus), licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
- Icons from "Font Awesome 5 Brands" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Font Awesome 5 Regular" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Font Awesome 5 Solid" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Font Awesome 6 Brands" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Font Awesome 6 Regular" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Font Awesome 6 Solid" by Dave Gandy (https://github.com/FortAwesome/Font-Awesome), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "FontAudio" by @fefanto (https://github.com/fefanto/fontaudio), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Fontelico" by Fontello (https://github.com/fontello/fontelico.font), licensed under CC BY SA (https://creativecommons.org/licenses/by-sa/3.0/).
- Icons from "Font-GIS" by Jean-Marc Viglino (https://github.com/viglino/font-gis), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Guidance" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "IconaMoon" by Dariush Habibpour (https://github.com/dariushhpg1/IconaMoon), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Lets Icons" by Leonid Tsvetkov (https://www.figma.com/community/file/886554014393250663), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "NRK Core Icons" by Norsk rikskringkasting (https://github.com/nrkno/core-icons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Pepicons" by CyCraft (https://github.com/CyCraft/pepicons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Pepicons Pencil" by CyCraft (https://github.com/CyCraft/pepicons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Pepicons Pop!" by CyCraft (https://github.com/CyCraft/pepicons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Pepicons Print" by CyCraft (https://github.com/CyCraft/pepicons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Pixel Icon" by HackerNoon (https://github.com/hackernoon/pixel-icon-library), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Röntgen" by Sergey Vartanov (https://github.com/enzet/Roentgen), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "selfh.st/icons" by selfh.st (https://github.com/selfhst/icons), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "SmartIcons Glyph" by SmartIcons, licensed under CC BY SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
- Icons from "Streamline Block" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Streamline color" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Cyber free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Cyber color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Streamline Emojis" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Flex free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Flex color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Freehand free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Freehand color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Guidance" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Kameleon color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Logos free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Pixel free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Plump free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Plump color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Sharp free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Sharp color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Stickies color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Ultimate free icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Ultimate color icons" by Streamline (https://github.com/webalys-hq/streamline-vectors), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Subway Icon Set" by Mariusz Ostrowski (https://github.com/mariuszostrowski/subway), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Icons from "Typicons" by Stephen Hutchings (https://github.com/stephenhutchings/typicons.font), licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
<!-- universe:attribution:end -->

## Sets

<!-- universe:sets:start -->
414,952 icons in 245 sets (from 418,395 icons in 248 sets in @iconify/json 2.2.547). Counts are visible icons; aliases and hidden icons resolve too but are not counted.

| Set | Prefix | Icons | License | Kind | Stroke |
| --- | --- | ---: | --- | --- | --- |
| [Material Symbols](https://github.com/google/material-design-icons) | `material-symbols` | 15,744 | [Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE) | Permissive |  |
| [Material Design Icons](https://github.com/Templarian/MaterialDesign) | `mdi` | 7,447 | [Apache 2.0](https://github.com/Templarian/MaterialDesign/blob/master/LICENSE) | Permissive |  |
| [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons) | `fluent` | 19,900 | [MIT](https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE) | Permissive |  |
| [Lucide](https://github.com/lucide-icons/lucide) | `lucide` | 1,902 | [ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE) | Permissive | yes |
| [Tabler Icons](https://github.com/tabler/tabler-icons) | `tabler` | 6,216 | [MIT](https://github.com/tabler/tabler-icons/blob/master/LICENSE) | Permissive | yes |
| [Phosphor](https://github.com/phosphor-icons/core) | `ph` | 9,066 | [MIT](https://github.com/phosphor-icons/core/blob/main/LICENSE) | Permissive |  |
| [Carbon](https://github.com/carbon-design-system/carbon/tree/main/packages/icons) | `carbon` | 2,611 | Apache 2.0 | Permissive |  |
| [Bootstrap Icons](https://github.com/twbs/icons) | `bi` | 2,074 | [MIT](https://github.com/twbs/icons/blob/main/LICENSE.md) | Permissive |  |
| [HeroIcons](https://github.com/tailwindlabs/heroicons) | `heroicons` | 1,288 | [MIT](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE) | Permissive |  |
| [Remix Icon](https://github.com/cyberalien/RemixIcon) | `ri` | 3,061 | [Apache 2.0](https://github.com/cyberalien/RemixIcon/blob/master/License) | Permissive |  |
| [Font Awesome Solid](https://github.com/FortAwesome/Font-Awesome) | `fa7-solid` | 2,000 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Font Awesome Regular](https://github.com/FortAwesome/Font-Awesome) | `fa7-regular` | 272 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Font Awesome Brands](https://github.com/FortAwesome/Font-Awesome) | `fa7-brands` | 605 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Simple Icons](https://github.com/simple-icons/simple-icons) | `simple-icons` | 3,464 | [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) | Public domain |  |
| [Google Material Icons](https://github.com/material-icons/material-icons) | `ic` | 10,955 | [Apache 2.0](https://github.com/material-icons/material-icons/blob/master/LICENSE) | Permissive |  |
| [Material Symbols Light](https://github.com/google/material-design-icons) | `material-symbols-light` | 15,809 | [Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE) | Permissive |  |
| [IonIcons](https://github.com/ionic-team/ionicons) | `ion` | 1,357 | [MIT](https://github.com/ionic-team/ionicons/blob/main/LICENSE) | Permissive |  |
| [Ant Design Icons](https://github.com/ant-design/ant-design-icons) | `ant-design` | 846 | [MIT](https://github.com/ant-design/ant-design-icons/blob/master/LICENSE) | Permissive |  |
| [Octicons](https://github.com/primer/octicons/) | `octicon` | 768 | [MIT](https://github.com/primer/octicons/blob/main/LICENSE) | Permissive |  |
| [Codicons](https://github.com/microsoft/vscode-codicons) | `codicon` | 640 | [CC BY 4.0](https://github.com/microsoft/vscode-codicons/blob/main/LICENSE) | Attribution |  |
| [Feather Icons](https://github.com/feathericons/feather) | `feather` | 286 | [MIT](https://github.com/feathericons/feather/blob/master/LICENSE) | Permissive | yes |
| [Solar](https://www.figma.com/community/file/1166831539721848736) | `solar` | 8,706 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [MingCute Icon](https://github.com/Richard9394/MingCute) | `mingcute` | 3,216 | [Apache 2.0](https://github.com/Richard9394/MingCute/blob/main/LICENSE) | Permissive |  |
| [Iconoir](https://github.com/iconoir-icons/iconoir) | `iconoir` | 1,671 | [MIT](https://github.com/iconoir-icons/iconoir/blob/main/LICENSE) | Permissive | yes |
| [Huge Icons](https://icon-sets.iconify.design/icon-sets/hugeicons/) | `hugeicons` | 5,949 | MIT | Permissive | yes |
| [IconPark Outline](https://github.com/bytedance/IconPark) | `icon-park-outline` | 2,658 | [Apache 2.0](https://github.com/bytedance/IconPark/blob/master/LICENSE) | Permissive | yes |
| [TDesign Icons](https://github.com/Tencent/tdesign-icons) | `tdesign` | 2,316 | [MIT](https://github.com/Tencent/tdesign-icons/blob/main/LICENSE) | Permissive |  |
| [Clarity](https://github.com/vmware/clarity) | `clarity` | 1,103 | [MIT](https://github.com/vmware/clarity-assets/blob/master/LICENSE) | Permissive |  |
| [Unicons](https://github.com/Iconscout/unicons) | `uil` | 1,215 | [Apache 2.0](https://github.com/Iconscout/unicons/blob/master/LICENSE) | Permissive |  |
| [Boxicons](https://github.com/box-icons/boxicons-core) | `boxicons` | 3,768 | [MIT](https://github.com/box-icons/boxicons-core/blob/main/LICENSE) | Permissive |  |
| [Radix Icons](https://github.com/radix-ui/icons) | `radix-icons` | 332 | [MIT](https://github.com/radix-ui/icons/blob/master/LICENSE) | Permissive |  |
| [Akar Icons](https://github.com/artcoholic/akar-icons) | `akar-icons` | 454 | [MIT](https://github.com/artcoholic/akar-icons/blob/master/LICENSE) | Permissive | yes |
| [Streamline](https://github.com/webalys-hq/streamline-vectors) | `streamline` | 2,943 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [SVG Logos](https://github.com/gilbarbara/logos) | `logos` | 1,999 | [CC0](https://raw.githubusercontent.com/gilbarbara/logos/master/LICENSE.txt) | Public domain |  |
| [Devicon](https://github.com/devicons/devicon/tree/master) | `devicon` | 1,062 | [MIT](https://github.com/devicons/devicon/blob/master/LICENSE) | Permissive |  |
| [Skill Icons](https://github.com/tandpfun/skill-icons) | `skill-icons` | 400 | [MIT](https://github.com/tandpfun/skill-icons/blob/main/LICENSE) | Permissive |  |
| [VSCode Icons](https://github.com/vscode-icons/vscode-icons) | `vscode-icons` | 1,705 | [MIT](https://github.com/vscode-icons/vscode-icons/blob/master/LICENSE) | Permissive |  |
| [Fluent UI System Color Icons](https://github.com/microsoft/fluentui-system-icons) | `fluent-color` | 890 | [MIT](https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE) | Permissive |  |
| [Fluent Emoji Flat](https://github.com/microsoft/fluentui-emoji) | `fluent-emoji-flat` | 3,139 | [MIT](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE) | Permissive |  |
| [Noto Emoji](https://github.com/googlefonts/noto-emoji) | `noto` | 3,729 | [Apache 2.0](https://github.com/googlefonts/noto-emoji/blob/main/svg/LICENSE) | Permissive |  |
| [Twitter Emoji](https://github.com/jdecked/twemoji) | `twemoji` | 3,988 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [OpenMoji](https://github.com/hfg-gmuend/openmoji) | `openmoji` | 4,543 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Share alike |  |
| [Flag Icons](https://github.com/lipis/flag-icons) | `flag` | 542 | [MIT](https://github.com/lipis/flag-icons/blob/main/LICENSE) | Permissive |  |
| [Circle Flags](https://github.com/HatScripts/circle-flags) | `circle-flags` | 444 | [MIT](https://github.com/HatScripts/circle-flags/blob/gh-pages/LICENSE) | Permissive |  |
| [Game Icons](https://github.com/game-icons/icons) | `game-icons` | 4,132 | [CC BY 3.0](https://github.com/game-icons/icons/blob/master/license.txt) | Attribution |  |
| [Academicons](https://github.com/jpswalsh/academicons) | `academicons` | 158 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| [andrsrxn/icons](https://github.com/andrsrxn/icons) | `andrsrxn` | 2,562 | [MIT](https://github.com/andrsrxn/icons/blob/main/LICENSE) | Permissive | yes |
| [Arcticons](https://github.com/Arcticons-Team/Arcticons) | `arcticons` | 15,292 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Share alike | yes |
| [@icons](https://github.com/Voxybuns/at-icons) | `at-icons` | 642 | [MIT](https://github.com/Voxybuns/at-icons/blob/main/LICENSE) | Permissive |  |
| [Basil](https://www.figma.com/community/file/931906394678748246) | `basil` | 493 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Bitcoin Icons](https://github.com/BitcoinDesign/Bitcoin-Icons) | `bitcoin-icons` | 330 | [MIT](https://github.com/BitcoinDesign/Bitcoin-Icons/blob/main/LICENSE-MIT) | Permissive |  |
| [BPMN](https://github.com/bpmn-io/bpmn-font) | `bpmn` | 112 | [Open Font License](https://github.com/bpmn-io/bpmn-font/blob/master/LICENSE) | Share alike |  |
| [Brandico](https://github.com/fontello/brandico.font) | `brandico` | 45 | [CC BY SA](https://creativecommons.org/licenses/by-sa/3.0/) | Share alike |  |
| [Bubbles](https://github.com/leemonade/bubbles) | `bubbles` | 409 | [MIT](https://github.com/leemonade/bubbles/blob/main/LICENSE) | Permissive |  |
| [BoxIcons v2](https://github.com/box-icons/boxicons) | `bx` | 814 | [MIT](https://github.com/box-icons/boxicons/blob/main/LICENSE) | Permissive |  |
| [Boxicons Brands](https://github.com/box-icons/boxicons-core) | `bxl` | 288 | [MIT](https://github.com/box-icons/boxicons-core/blob/main/LICENSE) | Permissive |  |
| [BoxIcons v2 Solid](https://github.com/box-icons/boxicons) | `bxs` | 665 | [MIT](https://github.com/box-icons/boxicons/blob/main/LICENSE) | Permissive |  |
| [Bytesize Icons](https://github.com/danklammer/bytesize-icons) | `bytesize` | 101 | [MIT](https://github.com/danklammer/bytesize-icons/blob/master/LICENSE.md) | Permissive | yes |
| [Catppuccin Icons](https://github.com/catppuccin/vscode-icons) | `catppuccin` | 655 | [MIT](https://github.com/catppuccin/vscode-icons/blob/main/LICENSE) | Permissive |  |
| [Charm Icons](https://github.com/jaynewey/charm-icons) | `charm` | 261 | [MIT](https://github.com/jaynewey/charm-icons/blob/main/LICENSE) | Permissive | yes |
| [coolicons](https://github.com/krystonschwarze/coolicons) | `ci` | 442 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution | yes |
| [CoreUI Brands](https://github.com/coreui/coreui-icons) | `cib` | 829 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [CoreUI Flags](https://github.com/coreui/coreui-icons) | `cif` | 199 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [CoreUI Free](https://github.com/coreui/coreui-icons) | `cil` | 554 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Circum Icons](https://github.com/Klarr-Agency/Circum-Icons) | `circum` | 288 | [Mozilla Public License 2.0](https://github.com/Klarr-Agency/Circum-Icons/blob/main/LICENSE) | Share alike |  |
| [CodeX Icons](https://github.com/codex-team/icons) | `codex` | 78 | [MIT](https://github.com/codex-team/icons/blob/master/LICENSE) | Permissive | yes |
| [Covid Icons](https://github.com/webalys-hq/streamline-vectors) | `covid` | 142 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution | yes |
| [Cryptocurrency Icons](https://github.com/atomiclabs/cryptocurrency-icons) | `cryptocurrency` | 483 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [Cryptocurrency Color Icons](https://github.com/atomiclabs/cryptocurrency-icons) | `cryptocurrency-color` | 483 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [Cuida Icons](https://github.com/Sysvale/cuida-icons) | `cuida` | 182 | [Apache 2.0](https://github.com/Sysvale/cuida-icons/blob/main/LICENSE) | Permissive |  |
| [Dashicons](https://github.com/WordPress/dashicons) | `dashicons` | 342 | [GPL](https://github.com/WordPress/dashicons/blob/master/gpl.txt) | Share alike |  |
| [Devicon Line](https://github.com/devicons/devicon/tree/master) | `devicon-line` | 69 | [MIT](https://github.com/devicons/devicon/blob/master/LICENSE) | Permissive |  |
| [Devicon Original](https://github.com/devicons/devicon/tree/master) | `devicon-original` | 659 | [MIT](https://github.com/devicons/devicon/blob/master/LICENSE) | Permissive |  |
| [Devicon Plain](https://github.com/devicons/devicon/tree/master) | `devicon-plain` | 772 | [MIT](https://github.com/devicons/devicon/blob/master/LICENSE) | Permissive |  |
| [Dinkie Icons](https://github.com/atelier-anchor/dinkie-icons) | `dinkie-icons` | 1,198 | [MIT](https://github.com/atelier-anchor/dinkie-icons/blob/main/LICENSE) | Permissive |  |
| [Duoicons](https://github.com/fazdiu/duo-icons) | `duo-icons` | 91 | [MIT](https://github.com/fazdiu/duo-icons/blob/master/LICENSE) | Permissive |  |
| [Evil Icons](https://github.com/evil-icons/evil-icons) | `ei` | 70 | [MIT](https://github.com/evil-icons/evil-icons/blob/master/LICENSE.txt) | Permissive |  |
| [Elusive Icons](https://github.com/dovy/elusive-icons) | `el` | 304 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| [Emoji One (Colored)](https://github.com/EmojiTwo/emojitwo) | `emojione` | 1,834 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Emoji One (Monotone)](https://github.com/EmojiTwo/emojitwo) | `emojione-monotone` | 1,403 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Emoji One (v1)](https://github.com/joypixels/emojione-legacy) | `emojione-v1` | 1,262 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Share alike |  |
| [Energy Icons](https://github.com/Sam-r-passmore/energy-icons) | `energy-icons` | 8,244 | [MIT](https://github.com/Sam-r-passmore/energy-icons/blob/main/LICENSE) | Permissive |  |
| [Entypo+](https://github.com/chancancode/entypo-plus) | `entypo` | 321 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Share alike |  |
| [Entypo+ Social](https://github.com/chancancode/entypo-plus) | `entypo-social` | 76 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Share alike |  |
| [EOS Icons](https://gitlab.com/SUSE-UIUX/eos-icons) | `eos-icons` | 246 | [MIT](https://gitlab.com/SUSE-UIUX/eos-icons/-/blob/master/LICENSE) | Permissive |  |
| [Element Plus](https://github.com/element-plus/element-plus-icons) | `ep` | 293 | [MIT](https://github.com/element-plus/element-plus-icons/blob/main/packages/svg/package.json) | Permissive |  |
| [Elegant](https://github.com/pprince/etlinefont-bower) | `et` | 100 | [GPL 3.0](https://www.gnu.org/licenses/gpl.html) | Share alike |  |
| [Eva Icons](https://github.com/akveo/eva-icons/) | `eva` | 490 | [MIT](https://github.com/akveo/eva-icons/blob/master/LICENSE.txt) | Permissive |  |
| [Framework7 Icons](https://github.com/framework7io/framework7-icons) | `f7` | 1,253 | [MIT](https://github.com/framework7io/framework7-icons/blob/master/LICENSE) | Permissive |  |
| [Font Awesome 4](https://github.com/FortAwesome/Font-Awesome/tree/fa-4) | `fa` | 649 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| [Font Awesome 5 Brands](https://github.com/FortAwesome/Font-Awesome) | `fa-brands` | 457 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Font Awesome 5 Regular](https://github.com/FortAwesome/Font-Awesome) | `fa-regular` | 151 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Font Awesome 5 Solid](https://github.com/FortAwesome/Font-Awesome) | `fa-solid` | 1,001 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Font Awesome 6 Brands](https://github.com/FortAwesome/Font-Awesome) | `fa6-brands` | 495 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Font Awesome 6 Regular](https://github.com/FortAwesome/Font-Awesome) | `fa6-regular` | 163 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Font Awesome 6 Solid](https://github.com/FortAwesome/Font-Awesome) | `fa6-solid` | 1,402 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [FontAudio](https://github.com/fefanto/fontaudio) | `fad` | 155 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Famicons](https://github.com/familyjs/famicons) | `famicons` | 1,342 | [MIT](https://github.com/familyjs/famicons/blob/main/LICENSE) | Permissive |  |
| [Feather Icon](https://github.com/feathericon/feathericon) | `fe` | 255 | [MIT](https://github.com/feathericon/feathericon/blob/master/LICENSE) | Permissive |  |
| [File Icons](https://github.com/file-icons/icons) | `file-icons` | 930 | [ISC](https://github.com/file-icons/icons/blob/master/LICENSE.md) | Permissive |  |
| [Flagpack](https://github.com/Yummygum/flagpack-core) | `flagpack` | 254 | [MIT](https://github.com/Yummygum/flagpack-core/blob/main/LICENSE) | Permissive |  |
| [Flat Color Icons](https://github.com/icons8/flat-Color-icons) | `flat-color-icons` | 329 | MIT | Permissive |  |
| [Flat UI Icons](https://github.com/designmodo/Flat-UI) | `flat-ui` | 100 | [MIT](https://github.com/designmodo/Flat-UI/blob/master/LICENSE) | Permissive |  |
| [Flowbite Icons](https://github.com/themesberg/flowbite-icons) | `flowbite` | 751 | [MIT](https://github.com/themesberg/flowbite-icons/blob/main/LICENSE) | Permissive |  |
| [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) | `fluent-emoji` | 3,120 | [MIT](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE) | Permissive |  |
| [Fluent Emoji High Contrast](https://github.com/microsoft/fluentui-emoji) | `fluent-emoji-high-contrast` | 1,594 | [MIT](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE) | Permissive |  |
| [Fluent UI MDL2](https://github.com/microsoft/fluentui/tree/master/packages/react-icons-mdl2) | `fluent-mdl2` | 1,734 | [MIT](https://github.com/microsoft/fluentui/blob/master/packages/react-icons-mdl2/LICENSE) | Permissive |  |
| [Fontelico](https://github.com/fontello/fontelico.font) | `fontelico` | 34 | [CC BY SA](https://creativecommons.org/licenses/by-sa/3.0/) | Share alike |  |
| [Fontisto](https://github.com/kenangundogan/fontisto) | `fontisto` | 615 | [MIT](https://github.com/kenangundogan/fontisto/blob/master/LICENSE) | Permissive |  |
| [FormKit Icons](https://github.com/formkit/formkit/tree/master/packages/icons) | `formkit` | 144 | [MIT](https://github.com/formkit/formkit/blob/master/packages/icons/LICENSE) | Permissive |  |
| [Foundation](https://github.com/zurb/foundation-icon-fonts) | `foundation` | 283 | MIT | Permissive |  |
| [Firefox OS Emoji](https://github.com/mozilla/fxemoji) | `fxemoji` | 1,034 | [Apache 2.0](https://mozilla.github.io/fxemoji/LICENSE.md) | Permissive |  |
| [Gala Icons](https://github.com/cyberalien/gala-icons) | `gala` | 51 | [GPL](https://github.com/cyberalien/gala-icons/blob/main/LICENSE) | Share alike | yes |
| [Garden SVG Icons](https://github.com/zendeskgarden/svg-icons) | `garden` | 1,491 | [Apache 2.0](https://github.com/zendeskgarden/svg-icons/blob/main/LICENSE.md) | Permissive |  |
| Google Cloud Icons | `gcp` | 206 | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) | Permissive |  |
| [GeoGlyphs](https://github.com/cugos/geoglyphs) | `geo` | 30 | [MIT](https://github.com/cugos/geoglyphs/blob/main/LICENSE.md) | Permissive |  |
| [css.gg](https://github.com/astrit/css.gg) | `gg` | 704 | [MIT](https://github.com/astrit/css.gg/blob/master/LICENSE) | Permissive |  |
| [Ginetex Care Symbols](https://github.com/yessir-web-tech/ginetex-icons) | `ginetex` | 50 | [MIT](https://github.com/yessir-web-tech/ginetex-icons/blob/main/LICENSE) | Permissive |  |
| [Font-GIS](https://github.com/viglino/font-gis) | `gis` | 367 | [CC BY 4.0](https://github.com/Viglino/font-gis/blob/main/LICENSE-CC-BY.md) | Attribution |  |
| [Glyphs](https://github.com/gorango/glyphs) | `glyphs` | 3,452 | [MIT](https://github.com/gorango/glyphs/blob/main/license) | Permissive | yes |
| [Glyphs Poly](https://github.com/gorango/glyphs) | `glyphs-poly` | 863 | [MIT](https://github.com/gorango/glyphs/blob/main/license) | Permissive |  |
| [Gravity UI Icons](https://github.com/gravity-ui/icons/) | `gravity-ui` | 809 | [MIT](https://github.com/gravity-ui/icons/blob/main/LICENSE) | Permissive |  |
| [Griddy Icons](https://github.com/griddy-icons/griddy-icons) | `griddy-icons` | 2,003 | [MIT](https://github.com/griddy-icons/griddy-icons/blob/main/LICENSE) | Permissive |  |
| [Gridicons](https://github.com/Automattic/gridicons) | `gridicons` | 207 | [GPL 2.0](https://github.com/Automattic/gridicons/blob/trunk/LICENSE.md) | Share alike |  |
| [Grommet Icons](https://github.com/grommet/grommet-icons) | `grommet-icons` | 636 | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) | Permissive | yes |
| [Guidance](https://github.com/webalys-hq/streamline-vectors) | `guidance` | 360 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution | yes |
| [Health Icons](https://github.com/resolvetosavelives/healthicons) | `healthicons` | 2,060 | [MIT](https://github.com/resolvetosavelives/healthicons/blob/main/LICENSE) | Permissive |  |
| [HeroIcons v1 Outline](https://github.com/tailwindlabs/heroicons) | `heroicons-outline` | 230 | [MIT](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE) | Permissive | yes |
| [HeroIcons v1 Solid](https://github.com/tailwindlabs/heroicons) | `heroicons-solid` | 230 | [MIT](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE) | Permissive |  |
| [Humbleicons](https://github.com/zraly/humbleicons) | `humbleicons` | 286 | [MIT](https://github.com/zraly/humbleicons/blob/master/license) | Permissive | yes |
| [IcoMoon Free](https://github.com/Keyamoon/IcoMoon-Free) | `icomoon-free` | 491 | [GPL](https://www.gnu.org/licenses/gpl.html) | Share alike |  |
| [IconPark](https://github.com/bytedance/IconPark) | `icon-park` | 2,658 | [Apache 2.0](https://github.com/bytedance/IconPark/blob/master/LICENSE) | Permissive |  |
| [IconPark Solid](https://github.com/bytedance/IconPark) | `icon-park-solid` | 1,947 | [Apache 2.0](https://github.com/bytedance/IconPark/blob/master/LICENSE) | Permissive |  |
| [IconPark TwoTone](https://github.com/bytedance/IconPark) | `icon-park-twotone` | 1,944 | [Apache 2.0](https://github.com/bytedance/IconPark/blob/master/LICENSE) | Permissive |  |
| [IconaMoon](https://github.com/dariushhpg1/IconaMoon) | `iconamoon` | 1,781 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution | yes |
| [IconMind](https://github.com/Iconmind/iconmind) | `iconmind` | 31,644 | [MIT](https://github.com/Iconmind/iconmind/blob/main/LICENSE) | Permissive | yes |
| [IconOven](https://iconoven.com/icons) | `iconoven` | 18,132 | MIT | Permissive | yes |
| [Icons8 Windows 10 Icons](https://github.com/icons8/windows-10-icons) | `icons8` | 234 | MIT | Permissive |  |
| Icalicons | `il` | 84 | MIT | Permissive |  |
| [Innowatio Font](https://github.com/innowatio/iwwa-icons) | `iwwa` | 105 | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) | Permissive |  |
| [Siemens Industrial Experience Icons](https://github.com/siemens/ix-icons) | `ix` | 1,461 | [MIT](https://github.com/siemens/ix-icons/blob/main/LICENSE.md) | Permissive |  |
| [Jam Icons](https://github.com/michaelampr) | `jam` | 940 | [MIT](https://github.com/cyberalien/jam-backup/blob/main/LICENSE) | Permissive |  |
| [Kubernetes Icons](https://kubernetes.io) | `k8s` | 38 | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) | Permissive |  |
| [Keyline Icons](https://github.com/keyline-icons/keyline-icons) | `keyline-icons` | 12,544 | [MIT](https://github.com/keyline-icons/keyline-icons/blob/main/LICENSE) | Permissive | yes |
| [Line Awesome](https://github.com/icons8/line-awesome) | `la` | 1,544 | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) | Permissive |  |
| [Lets Icons](https://www.figma.com/community/file/886554014393250663) | `lets-icons` | 1,528 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution | yes |
| [Material Line Icons](https://github.com/cyberalien/line-md) | `line-md` | 1,218 | [MIT](https://github.com/cyberalien/line-md/blob/main/license.txt) | Permissive |  |
| [Lineicons](https://github.com/LineiconsHQ/Lineicons) | `lineicons` | 603 | [MIT](https://github.com/LineiconsHQ/Lineicons/blob/main/LICENSE.md) | Permissive |  |
| [Ligature Symbols](https://github.com/kudakurage/LigatureSymbols) | `ls` | 348 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| [Lsicon](https://www.lsicon.com/) | `lsicon` | 716 | [MIT](https://github.com/wisdesignsystem/lsicon/blob/main/LICENSE) | Permissive |  |
| [Lucide Extended](https://github.com/applifted/lucide-extended) | `lucide-extended` | 2,717 | [ISC](https://github.com/applifted/lucide-extended/blob/main/LICENSE) | Permissive |  |
| [Lucide Lab](https://github.com/lucide-icons/lucide-lab) | `lucide-lab` | 373 | [ISC](https://github.com/lucide-icons/lucide-lab/blob/main/LICENSE) | Permissive | yes |
| [Mage Icons](https://github.com/Mage-Icons/mage-icons) | `mage` | 1,042 | [Apache 2.0](https://github.com/Mage-Icons/mage-icons/blob/main/License.txt) | Permissive |  |
| [Majesticons](https://github.com/halfmage/majesticons) | `majesticons` | 760 | [MIT](https://github.com/halfmage/majesticons/blob/main/LICENSE) | Permissive | yes |
| [Maki](https://github.com/mapbox/maki) | `maki` | 215 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [Map Icons](https://github.com/scottdejonge/map-icons) | `map` | 167 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| Marketeq | `marketeq` | 590 | MIT | Permissive |  |
| [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) | `material-icon-theme` | 900 | [MIT](https://github.com/material-extensions/vscode-material-icon-theme/blob/main/LICENSE) | Permissive |  |
| [Matita](https://github.com/matita-dev/icons) | `matita` | 260 | [MIT](https://github.com/matita-dev/icons/blob/main/LICENSE) | Permissive | yes |
| [Material Design Light](https://github.com/Templarian/MaterialDesignLight) | `mdi-light` | 284 | [Open Font License](https://github.com/Templarian/MaterialDesignLight/blob/master/LICENSE.md) | Share alike |  |
| [Medical Icons](https://github.com/samcome/webfont-medical-icons) | `medical-icon` | 144 | [MIT](https://github.com/samcome/webfont-medical-icons/blob/master/LICENSE) | Permissive |  |
| [Memory Icons](https://github.com/Pictogrammers/Memory) | `memory` | 651 | [Apache 2.0](https://github.com/Pictogrammers/Memory/blob/main/LICENSE) | Permissive |  |
| [Meteocons](https://github.com/basmilius/weather-icons) | `meteocons` | 447 | [MIT](https://github.com/basmilius/weather-icons/blob/dev/LICENSE) | Permissive |  |
| [Meteor Icons](https://github.com/zkreations/icons) | `meteor-icons` | 404 | [MIT](https://github.com/zkreations/icons/blob/main/LICENSE) | Permissive | yes |
| [Mono Icons](https://github.com/mono-company/mono-icons) | `mi` | 180 | [MIT](https://github.com/mono-company/mono-icons/blob/master/LICENSE.md) | Permissive |  |
| [Mono Icons](https://github.com/mono-company/mono-icons) | `mono-icons` | 180 | [MIT](https://github.com/mono-company/mono-icons/blob/master/LICENSE.md) | Permissive |  |
| [Myna UI Icons](https://github.com/praveenjuge/mynaui-icons) | `mynaui` | 2,620 | [MIT](https://github.com/praveenjuge/mynaui-icons/blob/main/LICENSE) | Permissive |  |
| [Nimbus](https://github.com/cyberalien/nimbus-icons) | `nimbus` | 140 | [MIT](https://github.com/cyberalien/nimbus-icons/blob/main/LICENSE) | Permissive |  |
| [Nonicons](https://github.com/yamatsum/nonicons) | `nonicons` | 69 | [MIT](https://github.com/yamatsum/nonicons/blob/master/LICENSE) | Permissive |  |
| [Noto Emoji (v1)](https://github.com/googlefonts/noto-emoji) | `noto-v1` | 2,162 | [Apache 2.0](https://github.com/googlefonts/noto-emoji/blob/main/svg/LICENSE) | Permissive |  |
| [NRK Core Icons](https://github.com/nrkno/core-icons) | `nrk` | 633 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Open Iconic](https://github.com/iconic/open-iconic) | `oi` | 223 | [MIT](https://github.com/iconic/open-iconic/blob/master/ICON-LICENSE) | Permissive |  |
| [OOUI](https://github.com/wikimedia/oojs-ui) | `ooui` | 421 | [MIT](https://github.com/wikimedia/oojs-ui/blob/master/LICENSE-MIT) | Permissive |  |
| [OSM Icons](https://github.com/gmgeo/osmic) | `osmic` | 169 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [OpenSearch UI](https://github.com/opensearch-project/oui) | `oui` | 436 | [Apache 2.0](https://github.com/opensearch-project/oui/blob/main/LICENSE.txt) | Permissive |  |
| [Gitlab SVGs](https://gitlab.com/gitlab-org/gitlab-svgs/-/tree/main) | `pajamas` | 403 | [MIT](https://gitlab.com/gitlab-org/gitlab-svgs/-/blob/main/LICENSE) | Permissive |  |
| [Pepicons](https://github.com/CyCraft/pepicons) | `pepicons` | 428 | [CC BY 4.0](https://github.com/CyCraft/pepicons/blob/dev/LICENSE) | Attribution |  |
| [Pepicons Pencil](https://github.com/CyCraft/pepicons) | `pepicons-pencil` | 1,275 | [CC BY 4.0](https://github.com/CyCraft/pepicons/blob/dev/LICENSE) | Attribution |  |
| [Pepicons Pop!](https://github.com/CyCraft/pepicons) | `pepicons-pop` | 1,275 | [CC BY 4.0](https://github.com/CyCraft/pepicons/blob/dev/LICENSE) | Attribution |  |
| [Pepicons Print](https://github.com/CyCraft/pepicons) | `pepicons-print` | 1,275 | [CC BY 4.0](https://github.com/CyCraft/pepicons/blob/dev/LICENSE) | Attribution |  |
| [Pico-icon](https://github.com/yne/picon) | `picon` | 824 | [Open Font License](https://github.com/yne/picon/blob/master/OFL.txt) | Share alike |  |
| [Pinhead Map Icons](https://github.com/waysidemapping/pinhead) | `pinhead` | 2,747 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [Pixel Icon](https://github.com/hackernoon/pixel-icon-library) | `pixel` | 575 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Pixelarticons](https://github.com/halfmage/pixelarticons) | `pixelarticons` | 1,024 | [MIT](https://github.com/halfmage/pixelarticons/blob/master/LICENSE) | Permissive |  |
| [Prime Icons](https://github.com/primefaces/primeicons) | `prime` | 312 | [MIT](https://github.com/primefaces/primeicons/blob/master/LICENSE) | Permissive |  |
| [ProIcons](https://github.com/ProCode-Software/proicons) | `proicons` | 543 | [MIT](https://github.com/ProCode-Software/proicons/blob/main/LICENSE) | Permissive | yes |
| [Qlementine Icons](https://github.com/oclero/qlementine-icons) | `qlementine-icons` | 905 | [MIT](https://github.com/oclero/qlementine-icons/blob/master/LICENSE) | Permissive |  |
| [Quill Icons](https://www.figma.com/community/file/1034432054377533052/Quill-Iconset) | `quill` | 140 | [MIT](https://github.com/yourtempo/tempo-quill-icons/blob/main/LICENSE) | Permissive | yes |
| [Raphael](https://github.com/dmitrybaranovskiy/raphael) | `raphael` | 266 | MIT | Permissive |  |
| [Reicon](https://github.com/dqev/reicon) | `reicon` | 6,590 | [MIT](https://github.com/dqev/reicon/blob/main/LICENSE) | Permissive |  |
| [Rivet Icons](https://github.com/indiana-university/rivet-icons) | `rivet-icons` | 210 | [BSD 3-Clause](https://github.com/indiana-university/rivet-icons/blob/develop/LICENSE) | Permissive |  |
| [Röntgen](https://github.com/enzet/Roentgen) | `roentgen` | 574 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [selfh.st/icons](https://github.com/selfhst/icons) | `selfhst` | 7,237 | [CC BY 4.0](https://github.com/selfhst/icons/blob/main/LICENSE) | Attribution |  |
| [Sargam Icons](https://github.com/planetabhi/sargam-icons) | `si` | 1,215 | [MIT](https://github.com/planetabhi/sargam-icons/blob/main/LICENSE.txt) | Permissive | yes |
| SmartIcons Glyph | `si-glyph` | 799 | [CC BY SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Share alike |  |
| [SidekickIcons](https://github.com/ndri/sidekickicons) | `sidekickicons` | 232 | [MIT](https://github.com/ndri/sidekickicons/blob/master/LICENSE) | Permissive |  |
| [Simple line icons](https://github.com/thesabbir/simple-line-icons) | `simple-line-icons` | 189 | [MIT](https://github.com/thesabbir/simple-line-icons/blob/master/LICENSE.md) | Permissive |  |
| [Stash Icons](https://github.com/stash-ui/icons) | `stash` | 982 | [MIT](https://github.com/stash-ui/icons/blob/master/LICENSE) | Permissive |  |
| [Streamline Block](https://github.com/webalys-hq/streamline-vectors) | `streamline-block` | 300 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Streamline color](https://github.com/webalys-hq/streamline-vectors) | `streamline-color` | 1,962 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Cyber free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-cyber` | 500 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution | yes |
| [Cyber color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-cyber-color` | 500 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Streamline Emojis](https://github.com/webalys-hq/streamline-vectors) | `streamline-emojis` | 787 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Flex free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-flex` | 1,488 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Flex color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-flex-color` | 992 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Freehand free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-freehand` | 1,000 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Freehand color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-freehand-color` | 1,000 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Guidance](https://github.com/webalys-hq/streamline-vectors) | `streamline-guidance` | 360 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution | yes |
| [Kameleon color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-kameleon-color` | 400 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Logos free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-logos` | 1,359 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Pixel free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-pixel` | 659 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Plump free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-plump` | 1,481 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Plump color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-plump-color` | 988 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Sharp free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-sharp` | 1,476 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Sharp color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-sharp-color` | 984 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Stickies color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-stickies-color` | 200 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Ultimate free icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-ultimate` | 1,997 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Ultimate color icons](https://github.com/webalys-hq/streamline-vectors) | `streamline-ultimate-color` | 997 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [Subway Icon Set](https://github.com/mariuszostrowski/subway) | `subway` | 306 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Attribution |  |
| [SVG Spinners](https://github.com/n3r4zzurr0/svg-spinners) | `svg-spinners` | 46 | [MIT](https://github.com/n3r4zzurr0/svg-spinners/blob/main/LICENSE) | Permissive |  |
| [System UIcons](https://github.com/CoreyGinnivan/system-uicons) | `system-uicons` | 430 | [Unlicense](https://github.com/CoreyGinnivan/system-uicons/blob/master/LICENSE) | Public domain | yes |
| [Teenyicons](https://github.com/teenyicons/teenyicons) | `teenyicons` | 1,200 | [MIT](https://github.com/teenyicons/teenyicons/blob/master/LICENSE) | Permissive |  |
| [Temaki](https://github.com/rapideditor/temaki) | `temaki` | 557 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | Public domain |  |
| [theSVG](https://github.com/glincker/thesvg) | `thesvg` | 3,744 | [MIT](https://github.com/glincker/thesvg/blob/main/LICENSE) | Permissive |  |
| [theSVG Color](https://github.com/glincker/thesvg) | `thesvg-color` | 5,112 | [MIT](https://github.com/glincker/thesvg/blob/main/LICENSE) | Permissive |  |
| [Web3 Icons](https://github.com/0xa3k5/web3icons) | `token` | 1,787 | [MIT](https://github.com/0xa3k5/web3icons/blob/main/LICENCE) | Permissive |  |
| [Web3 Icons Branded](https://github.com/0xa3k5/web3icons) | `token-branded` | 4,083 | [MIT](https://github.com/0xa3k5/web3icons/blob/main/LICENCE) | Permissive |  |
| [TopCoat Icons](https://github.com/topcoat/icons) | `topcoat` | 89 | [Apache 2.0](https://github.com/topcoat/icons/blob/master/LICENSE) | Permissive |  |
| [Typicons](https://github.com/stephenhutchings/typicons.font) | `typcn` | 336 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Share alike |  |
| [Unicons Monochrome](https://github.com/Iconscout/unicons) | `uim` | 298 | [Apache 2.0](https://github.com/Iconscout/unicons/blob/master/LICENSE) | Permissive |  |
| [Unicons Solid](https://github.com/Iconscout/unicons) | `uis` | 190 | [Apache 2.0](https://github.com/Iconscout/unicons/blob/master/LICENSE) | Permissive |  |
| [Unicons Thin Line](https://github.com/Iconscout/unicons) | `uit` | 216 | [Apache 2.0](https://github.com/Iconscout/unicons/blob/master/LICENSE) | Permissive |  |
| [uiw icons](https://github.com/uiwjs/icons) | `uiw` | 214 | [MIT](https://github.com/uiwjs/icons/blob/master/LICENSE) | Permissive |  |
| [UnJS Logos](https://github.com/unjs) | `unjs` | 63 | Apache 2.0 | Permissive |  |
| [Vaadin Icons](https://github.com/vaadin/web-components) | `vaadin` | 636 | Apache 2.0 | Permissive |  |
| [Vadivam](https://github.com/praveenjuge/vadivam) | `vadivam` | 1,902 | [MIT](https://github.com/praveenjuge/vadivam/blob/main/LICENSE) | Permissive | yes |
| [Vesper Icons](https://github.com/kkvesper/vesper-icons) | `vs` | 159 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| Web Symbols Liga | `websymbol` | 85 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| [WeUI Icon](https://github.com/weui/weui-icon) | `weui` | 162 | MIT | Permissive |  |
| WebHostingHub Glyphs | `whh` | 2,125 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| [Weather Icons](https://github.com/erikflowers/weather-icons) | `wi` | 219 | [Open Font License](https://scripts.sil.org/cms/scripts/page.php?site_id=nrsi&id=OFL) | Share alike |  |
| [WordPress Icons](https://github.com/WordPress/gutenberg/tree/HEAD/packages/icons) | `wordpress` | 346 | [GPL](https://github.com/WordPress/gutenberg/blob/HEAD/LICENSE.md#gnu-general-public-license-version-2) | Share alike | yes |
| [Icons8 Windows 8 Icons](https://github.com/icons8/WPF-UI-Framework) | `wpf` | 200 | MIT | Permissive |  |
| [Material Design Iconic Font](https://github.com/zavoloklom/material-design-iconic-font) | `zmdi` | 777 | Open Font License | Share alike |  |
| [Zondicons](https://github.com/dukestreetstudio/zondicons) | `zondicons` | 297 | [MIT](https://github.com/dukestreetstudio/zondicons/blob/master/LICENSE) | Permissive |  |
| **Total** | | **414,952** | | | |

Sets left out:

- `cbi` (Custom Brand Icons, 1,757 icons, CC-BY-NC-SA-4.0): CC-BY-NC-SA-4.0 does not allow commercial use or modification.
- `emblemicons` (Emblemicons, 0 icons, MIT): the set has no icons.
- `ps` (PrestaShop Icons, 479 icons, CC-BY-NC-4.0): CC-BY-NC-4.0 does not allow commercial use or modification.

1,207 icon names are left out of the index by the repository text rules (scripts/check-text.mjs); they still resolve by name. 4,617 icons in 5 sets (`bubbles`, `devicon-line`, `devicon-original`, `fluent-emoji`, `streamline-guidance`) are not served by jsDelivr and need a local install of their package.
<!-- universe:sets:end -->

## Build

`npm run build` in this folder streams the @iconify/json tarball one set at a time (it is never extracted), keeps the sets the policy allows, classifies every icon (style, brand, stroke), writes `dist/catalog.json` and `dist/index.json`, fetches the license texts into `LICENSES/` and runs the license check. `dist/` is generated and not committed. Tests: `npm test` (vitest).

## License

The code is MIT, see [LICENSE](LICENSE). The icons keep the licenses of their sets, listed above.
