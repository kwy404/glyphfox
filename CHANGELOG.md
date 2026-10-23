# Changelog

All notable changes to glyphfox are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The icon set: original icons on a 24 grid with categories and tags, checked by the icon lint.
- Variable axes in every package: `weight` (1 to 3 with optical compensation at small sizes), `corners` (round or sharp) and `variant` (outline, duotone and a solid style generated at build time from closed shapes).
- The morph engine: any icon into any other, hand tuned pairs, `useMorph` for React, `useMorph` for Vue, `morphStore` for Svelte, the `morph` and `morph-to` attributes of the web component and a CSS only fallback.
- Fusion: `fuse()` combines 2 to 10 icons with the overlap, side, stack, grid, orbit, badge and inside layouts, with knockout gaps, and the result passes the icon lint.
- Living states: draw, pop, wiggle, spin, pulse, bounce and shake on mount, hover, click or a state prop, respecting `prefers-reduced-motion`.
- Modifiers: plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down and dot badges in any corner with knockout gaps.
- 23 shared props with the same names in React, Vue, Svelte, Angular and the web component.
- Packages: `glyphfox` (core, icons, `toSvg`, `icons.json`, `sprite.svg`, runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` with a single file CDN build, `glyphfox/tailwind` (v3 and v4), `glyphfox/core`, `glyphfox/tools` and `glyphfox-angular`.
- The `glyphfox` CLI: search, show with a terminal preview, copy in nine formats, fuse, morph, build subsets (sprite, CSS masks, package), lint and Fox-ify.
- The studio site: icon browser, live customization, sketch search, editor, Fox-ify, Fusion, brand kit and 3D.
- Multilingual search: synonyms in English, Portuguese, Spanish, French and German, accent folding and simple plurals in `search()`, the new `searchIcons()`, the CLI (`--lang`) and the studio.
- Shared collections in the studio: a share link that carries the whole collection, compressed, in its URL fragment, and live sessions where friends edit one collection together over WebRTC, paired with six words through public MQTT relays, end to end encrypted, with presence and last writer wins merging per icon.
