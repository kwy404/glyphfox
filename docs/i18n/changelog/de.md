# Änderungsprotokoll

Alle nennenswerten Änderungen an glyphfox werden hier dokumentiert. Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), und das Projekt hält sich an [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Hinzugefügt

- Das Icon-Set: eigens gezeichnete Icons auf einem 24er-Raster mit Kategorien und Tags, geprüft vom Icon-Lint.
- Variable Achsen in jedem Paket: `weight` (1 bis 3 mit optischem Ausgleich bei kleinen Größen), `corners` (round oder sharp) und `variant` (outline, duotone und solid, ein Stil, der beim Build aus geschlossenen Formen erzeugt wird).
- Die Morph-Engine: jedes Icon in jedes andere, von Hand abgestimmte Paare, `useMorph` für React, `useMorph` für Vue, `morphStore` für Svelte, die Attribute `morph` und `morph-to` der Web Component und ein reiner CSS-Fallback.
- Fusion: `fuse()` kombiniert 2 bis 10 Icons mit den Layouts overlap, side, stack, grid, orbit, badge und inside, mit Aussparungen, und das Ergebnis besteht die Prüfung durch den Icon-Lint.
- Lebendige Zustände: draw, pop, wiggle, spin, pulse, bounce und shake bei mount, hover, click oder über eine state-Prop, unter Beachtung von `prefers-reduced-motion`.
- Modifikatoren: die Badges plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down und dot in einer beliebigen Ecke, mit Aussparungen.
- 23 gemeinsame Props mit denselben Namen in React, Vue, Svelte, Angular und der Web Component.
- Pakete: `glyphfox` (Kern, Icons, `toSvg`, `icons.json`, `sprite.svg`, Runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` mit einem CDN-Build als einzelne Datei, `glyphfox/tailwind` (v3 und v4), `glyphfox/core`, `glyphfox/tools` und `glyphfox-angular`.
- Die CLI `glyphfox`: search, show mit Vorschau im Terminal, copy in neun Formaten, fuse, morph, build für Teilmengen (Sprite, CSS-Masken, Paket), lint und Fox-ify.
- Die Studio-Website: Icon-Browser, Live-Anpassung, Skizzensuche, Editor, Fox-ify, Fusion, Marken-Kit und 3D.
- Die Studio-Website auf Englisch, Portugiesisch (Brasilien), Spanisch, Französisch und Deutsch: statische Seiten pro Sprache mit hreflang-Tags, ein Sprachmenü in Kopf- und Fußzeile und die Sprache des Browsers beim ersten Besuch.
