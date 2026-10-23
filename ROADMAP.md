# Roadmap

Everything on this page is in scope for 1.0. The packages stay at 0.0.0 until every box is checked and the whole suite passes; then they move to 1.0.0 together.

## Done

- [x] Original icon set on the 24 grid with the icon lint (400 or more icons)
- [x] Variable axes: weight with optical compensation, corners, outline, duotone and solid
- [x] Morph engine with hand tuned pairs, `useMorph` (React, Vue), `morphStore` (Svelte), web component attribute and the CSS fallback
- [x] Fusion with seven layouts, knockout gaps and a lint clean result, everywhere (packages, Tailwind, CLI, CDN, studio, gallery)
- [x] Living states: seven presets, four triggers, reduced motion, animated SVG, GIF and WebM export
- [x] Modifiers: eleven badges in four corners with knockout gaps
- [x] Fox-ify, sketch search, brand kit and Hero 3D in the studio
- [x] 23 shared props with the same names in React, Vue, Svelte, Angular and the web component
- [x] Packages: core, React, Vue, Svelte, web component with the CDN build, Tailwind v3 and v4, Angular, CLI
- [x] Studio site in English and Portuguese with cinematic scroll scenes, Lighthouse 95 or more
- [x] Fenn illustrations (first pass), README banners, social preview and site preview image

## Fenn

- [ ] Redraw the illustrations with better proportions, a confident silhouette, rhythm in the legs and tail, and the icon stroke style
- [ ] Re-render the sheet, the banners and the site uses

## Frameworks

- [ ] Svelte 4 and Svelte 5 from the same components, tested with both compilers
- [ ] Solid (`glyphfox/solid`)
- [ ] Preact (`glyphfox/preact`)
- [ ] Qwik (`glyphfox/qwik`)
- [ ] Lit (`glyphfox/lit`)
- [ ] Astro (`glyphfox/astro`)
- [ ] React Native with react-native-svg (`glyphfox/native`)
- [ ] Ember (`glyphfox-ember`)
- [ ] Recipes: Next.js App Router (server component safe), Nuxt, SvelteKit, Remix, Alpine and htmx through the web component
- [ ] Native exports from the CLI: Android VectorDrawable XML, Jetpack Compose ImageVector, iOS asset catalog with SwiftUI usage, Flutter assets with a Dart constants file
- [ ] The same props everywhere they make sense, documented per package, with tests per package

## Universe

- [ ] Components accept universe names (`prefix:name`) through a small resolver hook, in every package and the web component
- [ ] Weight, animations, modifiers and Fusion on stroke based universe sets, with a clear fallback for filled sets

## Site in five languages

- [ ] English, Portuguese (Brazil), Spanish, French and German as static pages (`docs/`, `docs/pt-br/`, `docs/es/`, `docs/fr/`, `docs/de/`)
- [ ] hreflang, canonical and a language switcher that follows the browser language on the first visit
- [ ] Every UI string, the docs and the guides translated; code samples stay as code
- [ ] Universe page shell in every language
- [ ] A check that fails when a page has English left outside code

## Search and discovery

- [ ] One useful guide per framework and per use case (install, usage, every prop, tree shaking, SSR, accessibility, animation, examples) in the five languages
- [ ] One page per glyphfox icon with a real preview, every format snippet and related icons
- [ ] Written titles and meta descriptions, Open Graph and Twitter cards, JSON-LD (SoftwareSourceCode, BreadcrumbList, FAQPage only on pages with a real FAQ)
- [ ] Sitemap index, robots.txt, canonical and hreflang on every page
- [ ] Fast Core Web Vitals and semantic HTML; no thin or duplicated pages, no pages about other libraries, no pages for universe icons

## Extras

- [ ] Smart data icons with a `value` prop: battery level, signal bars, volume, progress ring, thermometer, calendar with today's date, clock with the real time
- [ ] Locale aware icons: currency from the locale through Intl, automatic right to left mirroring for directional icons, heavier weight under `prefers-contrast: more`
- [ ] `StatusIcon` with loading, success and error states that morph into each other
- [ ] Glyph script: a tiny text language for icons (circle, line, rect, arc, path) with a live preview in the studio and a compile step to SVG
- [ ] `IconGroup` choreography with staggered animations
- [ ] `glyphfox scan`: finds the icons a project uses, builds the minimal subset and flags icons without an accessible label
- [ ] Animated favicon export
- [ ] CSS cursor export with a hotspot
- [ ] Single line plotter export (SVG and G-code) and STL export from the 3D view
- [ ] Collections shared by link with live peer to peer co-editing (WebRTC with a public signaling relay)
- [ ] Multilingual search with synonyms in English, Portuguese and Spanish

## Release

- [ ] README in Portuguese (`i18n/README.pt-BR.md`)
- [ ] Changelog for 1.0.0
- [ ] Every package at 1.0.0, CI green on Node 20 and 22
