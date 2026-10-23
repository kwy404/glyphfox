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
- Glyph script: a tiny text language for icons (circle, ellipse, rect with radius, line, polyline, polygon, arc, path, group, mirror x or y, repeat around a center) with errors at the line and column, compiled to SVG that passes the icon lint. In `glyphfox/script`, the `glyphfox script file.gfs` command and a live playground in the studio Labs page.
- `glyphfox scan [dir]`: finds the icons a project uses in JS, TS, JSX, Vue, Svelte, Angular templates and HTML, builds the minimal subset as a sprite or an ES module and flags icons without an accessible label where one is needed.
- Exports in `glyphfox/export`, the CLI and the studio Labs page: an animated favicon (a canvas runtime with a static fallback), CSS cursors (PNG at 32 and 64 px with a hotspot), plotter output (single line SVG ordered for minimal pen travel, and G-code with feed rates and pen up and down commands) and STL from an extruded icon (thickness and bevel).
