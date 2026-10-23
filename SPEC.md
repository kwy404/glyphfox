# glyphfox: product spec

glyphfox is an open source icon library and icon studio by Alexandre Kohler (kwy404). MIT license. Mascot: Fenn, a geometric fox drawn with the same grid and stroke as the icons.

## Icons

- Original icons only, drawn for this set on a 24 by 24 grid: viewBox "0 0 24 24", fill "none", stroke "currentColor", stroke-width 2, round caps and joins, 2 px padding, consistent optical size. Never copy or trace another icon set.
- Source files: icons/NAME.svg (kebab-case names) and icons/NAME.json with { "categories": [...], "tags": [...] }.
- Target for 1.0: at least 400 icons across these categories: arrows, interface, navigation, files, communication, media, devices, development, data, commerce, finance, weather, nature, maps, people, security, text, shapes, brands-free generic symbols (no third party logos), animals (including a fox).
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
- Serious, premium design, light and dark, responsive, fast, accessible. Site copy in English and Portuguese (Brazil).

## Rules

- No emoji, no U+2013 or U+2014 dashes, never mention AI or any AI product anywhere (code, docs, site, commits, npm).
- Commits as `git -c user.name=kwy404 -c user.email=thekaway404@gmail.com commit`, no trailers.
- Tests for the build, the lint, every framework package and the CLI; CI on GitHub Actions.
