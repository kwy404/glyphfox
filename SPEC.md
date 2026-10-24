# glyphfox: product spec

glyphfox is an open source icon library and icon studio by Alexandre Kohler (kwy404). MIT license. Mascot: Fenn, a geometric fox drawn with the same grid and stroke as the icons.

## Icons

- Original icons only, drawn for this set on a 24 by 24 grid: viewBox "0 0 24 24", fill "none", stroke "currentColor", stroke-width 2, round caps and joins, 2 px padding, consistent optical size. Never copy or trace another icon set.
- Source files: icons/NAME.svg (kebab-case names) and icons/NAME.json with { "categories": [...], "tags": [...] }.
- Target for 1.0: at least 400 icons across these categories: arrows, interface, navigation, files, communication, media, devices, development, data, commerce, finance, weather, nature, maps, people, security, text, shapes, generic symbols (no third party logos), animals (including a fox). Brand icons (third party logos, named `brand-NAME`) live only in the social category.
- Every icon must pass the lint: valid SVG, only the allowed attributes, stays inside the padding box, no transforms, no fills except an optional duotone layer marked with class "gf-secondary".
- Duotone: an icon may add one secondary layer (class "gf-secondary", fill currentColor with opacity) so it can take a second color.

## Packages (one repo, npm workspaces)

- glyphfox: the core. ESM and CJS, typed. Exports every icon as data (name, body, tags, categories), a toSvg(name, options) helper, the full icons.json, an SVG sprite, and a tiny runtime to replace `<i data-glyph="name">` in plain HTML.
- glyphfox/web: the `<glyph-fox name="..." size color secondary-color stroke rotate flip label>` custom element, also served as one file from jsDelivr and unpkg (the CDN build).
- React: `import { FoxIcon } from "glyphfox/react"` style components, tree-shakable, forwardRef, size, color, secondaryColor, strokeWidth, absoluteStrokeWidth, title for accessibility. Also Vue 3 and Svelte components, and Angular (a standalone component and an icon registry provider; publish as the separate package glyphfox-angular if Angular packaging needs it).
- Tailwind plugin (glyphfox/tailwind): classes like `gf-arrow-right` that render the icon as a CSS mask in currentColor, so text color, size and opacity utilities work on icons.
- Options everywhere: size, color, secondary color, stroke width, rotate, flip, spin and pulse animations, title.
- A CLI (`npx glyphfox`) to search icons, copy an icon in any format, and build a custom subset (sprite, font-free CSS, or a small package) from a list of names.

## Studio (the site, GitHub Pages from docs/)

- Browse and search every icon with instant filter by name, tag and category.
- Customize live: color, secondary color, size, stroke width, rotation, flip, background preview, light and dark.
- Copy as SVG, JSX, Vue, Svelte, Angular, HTML web component, Tailwind class, CDN snippet, data URI; download SVG and PNG at any size.
- Create icons directly in the browser: an editor on the 24 grid with snapping, pen and shape tools (line, polyline, rect, rounded rect, circle, ellipse, arc, bezier), node editing, undo and redo, import an SVG and normalize it to the grid and stroke rules, live lint against the icon rules, preview in context, save to a local collection, export the collection as SVG files, a sprite or a ready to publish package.json skeleton.
- Docs for every framework with copyable examples, a changelog, and the author footer: Alexandre Kohler with https://github.com/kwy404 and https://www.linkedin.com/in/alexandre-silva-173687256/ .
- Serious, premium design, light and dark, responsive, fast, accessible. Site copy in English, Portuguese (Brazil), Spanish, French and German.

## Rules

- No emoji and no U+2013 or U+2014 dashes anywhere (code, docs, site, commits, npm).
- Tests for the build, the lint, every framework package and the CLI; CI on GitHub Actions.

## Pillars (what makes glyphfox more than an icon set)

1. Variable icons. Every icon renders along continuous axes: weight (stroke 1 to 3, with optical compensation at small sizes), corners (round or sharp joins and caps) and style (outline, duotone, and a solid style generated at build time where the shape is closed). One prop or attribute per axis in every package (`weight`, `corners`, `variant`), and sliders in the studio.
2. Morph anything. A small morph engine (normalize paths, resample, match points, interpolate) animates any icon into any other, with hand tuned pairs: menu to close, play to pause, plus to check, sun to moon, eye to eye-off, bell to bell-ring, heart to heart filled, copy to check, lock to unlock, wifi to wifi-off. React `useMorph`, Vue and Svelte equivalents, the web component `morph` attribute, and a CSS only fallback.
3. Fusion. `fuse(names, { layout, gap, scale, offsets })` combines 2 to 10 icons into one new icon that passes the same lint (padding, weight axis, no transforms). Layouts: overlap, side, stack, grid (2x2, 3x3 and a 10 slot layout), orbit, badge and inside. Parts are scaled and snapped to the grid; where parts overlap, the back part is trimmed around the front part by an automatic knockout gap, so lines never collide. Available as `<Fusion icons={["cloud", "lock"]} layout="overlap" />` (React, Vue, Svelte, Angular), `<glyph-fox name="cloud&lock" layout="overlap">`, Tailwind `gf-cloud&lock` or `gf-[cloud&lock:side]`, the CLI `glyphfox fuse cloud lock --layout overlap` and the CDN. The studio has a Fusion tool and a curated gallery.
4. Living states. Animation presets that understand the icon: draw (stroke-dashoffset in drawing order), pop, wiggle, spin, pulse, bounce and shake, triggered on hover, click, mount or a state prop, always respecting prefers-reduced-motion. The studio exports animated SVG, GIF and WebM.
5. Modifiers. Any icon takes a modifier badge (plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down, dot) in any corner, with an automatic knockout gap: `<FileIcon modifier="check" />`, Tailwind `gf-file+check`, CLI and CDN `file+check` (corner suffix `@tl`, `@tr`, `@bl`, `@br`).
6. Fox-ify. Paste or drop any SVG in the studio and it is converted to the glyphfox style (24 grid, stroke 2, round joins, padding, lint fixes) with a before and after view, then saved to the collection.
7. Sketch search. Draw a rough shape in the studio and get the closest icons (rasterized shape features compared in the browser, no network, no models).
8. Brand kit. Pick a seed color, weight, corners and style and export the whole set themed as a package, a sprite, CSS, a favicon and app icons.
9. Hero 3D. Render any icon extruded in 3D in the studio (three.js SVGLoader and ExtrudeGeometry from jsDelivr) with lighting and material presets, and export PNG.

Name syntax shared by the CDN, the web component, Tailwind and the CLI: `name`, `name+modifier@corner`, `a&b&c:layout`.

## Site

Dark first, precise grid, generous whitespace, sharp typography, subtle borders and gradients. Only original art: the glyphfox icons, Fenn and illustrations built from the icon geometry. Cinematic scroll scenes (icons that assemble, morph and draw themselves, a weight axis that sweeps with the scroll, modifiers that snap in, icons that fly together and fuse), a hero where hundreds of icons flow into the glyphfox mark, spring easing and parallax depth, all with CSS, requestAnimationFrame or the Web Animations API, lazy offscreen work and a still, complete layout under prefers-reduced-motion. Lighthouse performance and accessibility at 95 or more.

## Scope additions for 1.0

The checklist lives in ROADMAP.md. In short:

- Frameworks: Solid, Preact, Qwik, Lit, Astro, React Native (react-native-svg) and Ember next to React, Vue, Svelte 4 and 5, Angular and the web component, with recipes for Next.js, Nuxt, SvelteKit, Remix, Alpine and htmx, and CLI exports for Android (VectorDrawable, Compose ImageVector), iOS (asset catalog, SwiftUI) and Flutter (assets and Dart constants). Same props everywhere they make sense, tests per package.
- Universe: the components accept `prefix:name` icons from packages/universe through a small resolver hook; weight, animations, modifiers and Fusion work on stroke based sets, with a clear fallback for filled sets.
- The site ships as static pages in five languages with hreflang, canonical and a language switcher, plus a check for untranslated English.
- Discovery: a guide per framework and per use case in every language, a page per glyphfox icon, structured data, sitemap index and robots.txt. No thin or duplicated pages, no pages about other libraries and no pages for universe icons.
- Extras: smart data icons, locale aware icons, StatusIcon, glyph script, IconGroup, `glyphfox scan`, animated favicon, CSS cursor, plotter and STL export, shared collections with peer to peer co-editing, multilingual search synonyms.
