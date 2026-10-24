# Journal des modifications

Tous les changements notables de glyphfox sont consignés ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet applique la [gestion sémantique de version](https://semver.org/lang/fr/).

## [Non publié]

### Ajouts

- 123 nouvelles icônes de base pour la mise en forme du texte, les graphiques, les mathématiques, la santé, l'accessibilité, les visages et les gestes, l'éducation, les sciences, les transports, les bâtiments et les lieux et la maison, chacune avec ses catégories, ses mots clés et une animation conçue pour elle : le jeu compte désormais 687 icônes de base, 43 animées, 38 grand format et 11 isométriques.

## [1.0.0] - 2026-10-23

### Ajouts

- Le jeu d'icônes : des icônes originales sur une grille de 24, avec catégories et étiquettes, vérifiées par le lint des icônes.
- Des axes variables dans tous les paquets : `weight` (de 1 à 3, avec compensation optique aux petites tailles), `corners` (arrondis ou vifs) et `variant` (contour, duotone et un style plein généré à la compilation à partir des formes fermées).
- Le moteur de morphing : n'importe quelle icône en n'importe quelle autre, des paires réglées à la main, `useMorph` pour React, `useMorph` pour Vue, `morphStore` pour Svelte, les attributs `morph` et `morph-to` du composant web et une solution de repli en CSS pur.
- Fusion : `fuse()` combine de 2 à 10 icônes avec les dispositions overlap, side, stack, grid, orbit, badge et inside, avec des espaces de découpe, et le résultat passe le lint des icônes.
- États animés : draw, pop, wiggle, spin, pulse, bounce et shake, déclenchés sur mount, hover, click ou state, en respectant `prefers-reduced-motion`.
- Modificateurs : badges plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down et dot dans n'importe quel coin, avec des espaces de découpe.
- 23 props partagées, avec les mêmes noms dans React, Vue, Svelte, Angular et le composant web.
- Paquets : `glyphfox` (cœur, icônes, `toSvg`, `icons.json`, `sprite.svg`, runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` avec une version CDN en un seul fichier, `glyphfox/tailwind` (v3 et v4), `glyphfox/core`, `glyphfox/tools` et `glyphfox-angular`.
- Des paquets pour les frameworks avec les mêmes props, générés au build, compatibles tree shaking et typés : `glyphfox/solid`, `glyphfox/preact`, `glyphfox/qwik` (pour Qwik 2), `glyphfox/lit` (éléments Lit), `glyphfox/astro` (composants .astro), `glyphfox/native` (React Native avec react-native-svg, états vivants échantillonnés image par image) et `glyphfox/ember` (helpers), chacun avec une dépendance peer facultative.
- `glyphfox/react/server` : `Icon` et `Fusion` sans hooks pour les React Server Components, qui n'envoient aucun JavaScript ; les modules de `glyphfox/react` sont marqués `'use client'`.
- Des guides et des recettes pour Next.js App Router, Nuxt, SvelteKit, Remix, Alpine et htmx, dans le README et dans la documentation sous `frameworks/`.
- La CLI `glyphfox` : search, show avec un aperçu dans le terminal, copy en neuf formats, fuse, morph, build de sous-ensembles (sprite, masques CSS, paquet), lint et Fox-ify.
- Sources d'icônes : `registerIconSource(prefix, source)` fait fonctionner les icônes `prefix:name` d'autres jeux dans `toSvg`, dans chaque composant, dans le web component et sur le CDN, avec l'épaisseur, les animations, les modificateurs et la Fusion sur les icônes à trait, et une solution de repli pour les icônes pleines.
- Le site du studio : explorateur d'icônes, personnalisation en direct, recherche par croquis, éditeur, Fox-ify, Fusion, kit de marque et 3D.
- Des illustrations de Fenn (assis, en course, en train de dessiner, en orbite) construites à partir de la géométrie des icônes, les bannières du README et l'aperçu pour les réseaux sociaux.
- Recherche multilingue : synonymes en anglais, portugais, espagnol, français et allemand, recherche sans accents et pluriels simples dans `search()`, la nouvelle `searchIcons()`, la CLI (`--lang`) et le studio.
- Des collections partagées dans le studio : un lien qui transporte toute la collection, compressée, dans le fragment de son URL, et des sessions en direct où des amis modifient une collection ensemble via WebRTC, appairés avec six mots par des relais MQTT publics, chiffrées de bout en bout, avec la présence et une fusion par icône où la dernière modification l'emporte.
- Glyph script : un petit langage texte pour les icônes (circle, ellipse, rect avec rayon, line, polyline, polygon, arc, path, group, miroir en x ou en y, répétition autour d'un centre) avec les erreurs à la ligne et à la colonne, compilé en SVG qui passe le lint des icônes. Dans `glyphfox/script`, la commande `glyphfox script file.gfs` et un bac à sable en direct sur la page Labs du studio.
- `glyphfox scan [dir]` : trouve les icônes qu'un projet utilise en JS, TS, JSX, Vue, Svelte, templates Angular et HTML, construit le sous-ensemble minimal en sprite ou en module ES et signale les icônes sans libellé accessible là où il en faut un.
- Des exports dans `glyphfox/export`, la CLI et la page Labs du studio : un favicon animé (un runtime canvas avec une version statique de repli), des curseurs CSS (PNG en 32 et 64 px avec un point sensible), une sortie pour traceur (SVG à trait unique ordonné pour un déplacement minimal du stylo, et G-code avec vitesses d'avance et commandes de levée et de descente du stylo) et un STL à partir d'une icône extrudée (épaisseur et biseau).
- Recherche par dessin dans le studio : les 24 icônes les plus proches apparaissent pendant que vous dessinez, classées dans la page à partir d'un index de formes compact construit par `scripts/labs/sketch-index.mjs` (masques de trait de 32 sur 32 étendus en champs de distance, histogrammes de direction du trait et moments de Zernike).
- Le kit de marque prévisualise tout le jeu aux couleurs de la marque et exporte un zip avec des fichiers SVG personnalisés, un sprite, des variables CSS, un jeu de favicons (ico et PNG en 16, 32, 180, 192 et 512), des icônes d'application et un squelette de package.json.
- Le site du studio en anglais, portugais (Brésil), espagnol, français et allemand : des pages statiques par langue avec les balises hreflang, un menu des langues dans l'en-tête et le pied de page, et la langue du navigateur choisie dès la première visite.

[1.0.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.0.0
