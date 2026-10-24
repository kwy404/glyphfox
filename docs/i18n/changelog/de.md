# Änderungsprotokoll

Alle nennenswerten Änderungen an glyphfox werden hier dokumentiert. Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), und das Projekt hält sich an [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

### Hinzugefügt

- 206 neue Basis-Icons für Textformatierung, Diagramme, Mathematik, Gesundheit, Barrierefreiheit, Gesichter und Gesten, Bildung, Wissenschaft, Verkehr, Gebäude und Orte, Haushalt, Werkzeuge, Kleidung, Wetter, Währungen, Dateien und Geräte und Pfeile, jedes mit Kategorien, Schlagwörtern und einer eigenen Animation: Das Set umfasst jetzt 770 Basis-Icons, 43 animierte, 38 große Schau-Icons und 11 isometrische Icons.

## [1.0.0] - 2026-10-23

### Hinzugefügt

- Das Icon-Set: eigens gezeichnete Icons auf einem 24er-Raster mit Kategorien und Tags, geprüft vom Icon-Lint.
- Variable Achsen in jedem Paket: `weight` (1 bis 3 mit optischem Ausgleich bei kleinen Größen), `corners` (round oder sharp) und `variant` (outline, duotone und solid, ein Stil, der beim Build aus geschlossenen Formen erzeugt wird).
- Die Morph-Engine: jedes Icon in jedes andere, von Hand abgestimmte Paare, `useMorph` für React, `useMorph` für Vue, `morphStore` für Svelte, die Attribute `morph` und `morph-to` der Web Component und ein reiner CSS-Fallback.
- Fusion: `fuse()` kombiniert 2 bis 10 Icons mit den Layouts overlap, side, stack, grid, orbit, badge und inside, mit Aussparungen, und das Ergebnis besteht die Prüfung durch den Icon-Lint.
- Lebendige Zustände: draw, pop, wiggle, spin, pulse, bounce und shake bei mount, hover, click oder über eine state-Prop, unter Beachtung von `prefers-reduced-motion`.
- Modifikatoren: die Badges plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down und dot in einer beliebigen Ecke, mit Aussparungen.
- 23 gemeinsame Props mit denselben Namen in React, Vue, Svelte, Angular und der Web Component.
- Pakete: `glyphfox` (Kern, Icons, `toSvg`, `icons.json`, `sprite.svg`, Runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` mit einem CDN-Build als einzelne Datei, `glyphfox/tailwind` (v3 und v4), `glyphfox/core`, `glyphfox/tools` und `glyphfox-angular`.
- Framework-Pakete mit denselben Props, vom Build erzeugt, tree-shakebar und typisiert: `glyphfox/solid`, `glyphfox/preact`, `glyphfox/qwik` (für Qwik 2), `glyphfox/lit` (Lit-Elemente), `glyphfox/astro` (.astro-Komponenten), `glyphfox/native` (React Native mit react-native-svg, lebendige Zustände Bild für Bild abgetastet) und `glyphfox/ember` (Helper), jeweils mit einer optionalen Peer-Abhängigkeit.
- `glyphfox/react/server`: `Icon` und `Fusion` ohne Hooks für React Server Components, die kein JavaScript ausliefern; die Module von `glyphfox/react` sind mit `'use client'` markiert.
- Anleitungen und Rezepte für Next.js App Router, Nuxt, SvelteKit, Remix, Alpine und htmx, im README und in der Dokumentation unter `frameworks/`.
- Die CLI `glyphfox`: search, show mit Vorschau im Terminal, copy in neun Formaten, fuse, morph, build für Teilmengen (Sprite, CSS-Masken, Paket), lint und Fox-ify.
- Icon-Quellen: `registerIconSource(prefix, source)` lässt `prefix:name`-Icons aus anderen Sets in `toSvg`, in jeder Komponente, im Web Component und im CDN funktionieren, mit Strichstärke, Animationen, Modifikatoren und Fusion bei Strich-Icons und einem Fallback für gefüllte Icons.
- Die Studio-Website: Icon-Browser, Live-Anpassung, Skizzensuche, Editor, Fox-ify, Fusion, Marken-Kit und 3D.
- Fenn-Illustrationen (sitzend, laufend, zeichnend, im Orbit) aus der Geometrie der Icons, die README-Banner und die Vorschau für soziale Netzwerke.
- Mehrsprachige Suche: Synonyme auf Englisch, Portugiesisch, Spanisch, Französisch und Deutsch, Suche ohne Akzente und einfache Pluralformen in `search()`, im neuen `searchIcons()`, in der CLI (`--lang`) und im Studio.
- Geteilte Sammlungen im Studio: ein Link, der die ganze Sammlung komprimiert im URL-Fragment trägt, und Live-Sitzungen, in denen Freunde eine Sammlung gemeinsam über WebRTC bearbeiten, gekoppelt mit sechs Wörtern über öffentliche MQTT-Relays, Ende-zu-Ende-verschlüsselt, mit Anwesenheit und Zusammenführung pro Icon, bei der die letzte Änderung gewinnt.
- Glyph script: eine kleine Textsprache für Icons (circle, ellipse, rect mit Radius, line, polyline, polygon, arc, path, group, Spiegelung in x oder y, Wiederholung um einen Mittelpunkt) mit Fehlern an Zeile und Spalte, kompiliert zu SVG, das den Icon-Lint besteht. In `glyphfox/script`, im Befehl `glyphfox script file.gfs` und in einem Live-Playground auf der Labs-Seite des Studios.
- `glyphfox scan [dir]`: findet die Icons, die ein Projekt in JS, TS, JSX, Vue, Svelte, Angular-Templates und HTML nutzt, baut die minimale Teilmenge als Sprite oder ES-Modul und markiert Icons ohne zugängliche Beschriftung, wo eine nötig ist.
- Exporte in `glyphfox/export`, in der CLI und auf der Labs-Seite des Studios: ein animiertes Favicon (eine Canvas-Laufzeit mit statischem Fallback), CSS-Cursor (PNG in 32 und 64 px mit Hotspot), Plotter-Ausgabe (einlinige SVG, für minimale Stiftwege sortiert, und G-Code mit Vorschüben und Befehlen zum Heben und Senken des Stifts) und STL aus einem extrudierten Icon (Dicke und Fase).
- Skizzensuche im Studio: Die 24 ähnlichsten Icons erscheinen, während du zeichnest, direkt auf der Seite sortiert anhand eines kompakten Formindex aus `scripts/labs/sketch-index.mjs` (Strichmasken von 32 mal 32, zu Distanzfeldern erweitert, Histogramme der Strichrichtung und Zernike-Momente).
- Das Marken-Kit zeigt das ganze Set im Markendesign als Vorschau und exportiert ein Zip mit angepassten SVG-Dateien, einem Sprite, CSS-Variablen, einem Favicon-Satz (ico und PNGs in 16, 32, 180, 192 und 512), App-Icons und einem package.json-Gerüst.
- Die Studio-Website auf Englisch, Portugiesisch (Brasilien), Spanisch, Französisch und Deutsch: statische Seiten pro Sprache mit hreflang-Tags, ein Sprachmenü in Kopf- und Fußzeile und die Sprache des Browsers beim ersten Besuch.

[1.0.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.0.0
