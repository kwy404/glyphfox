# Journal des modifications

Tous les changements notables de glyphfox sont consignés ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet applique la [gestion sémantique de version](https://semver.org/lang/fr/).

## [1.3.0] - 2026-10-24

### Ajouts

- Les collections d'affichage (60 icônes sur la grille de 48) et isométrique (30 icônes) sont dans le paquet : `display/NOM` et `isometric/NOM` fonctionnent dans `toSvg`, `getIcon`, le web component et le build CDN, leurs données sont dans `glyphfox/collections` et les composants React, Vue et Svelte viennent de `glyphfox/<framework>/collections`.
- Solid, Preact et Lit utilisent le même moteur de déclencheurs : inView, survol, focus, press, `triggerParent` et les timelines image par image fonctionnent comme dans React, Vue et Svelte.
- Les 860 icônes de base ont maintenant chacune une animation dessinée pour elle.
- Le film de l'accueil se lit dans le lecteur de glyphfox : le bouton lecture se transforme en pause, la timeline a des chapitres et des aperçus en miniature, avec sous-titres, vitesse, picture in picture, plein écran et raccourcis clavier.
- Les pages export natif, icônes intelligentes et frameworks (la vue générale et les recettes Next.js, Nuxt, Remix, SvelteKit, Alpine.js et htmx) en portugais, espagnol, français et allemand.
- Un test dans le navigateur (`npm run e2e`), avec son propre job en CI, qui ouvre toutes les pages principales dans les cinq langues sur ordinateur et sur téléphone.
- Des formulaires de demande d'icône et de bug et un guide de contribution.

### Corrections

- La galerie et la comparaison de l'univers renvoyaient une erreur et la comparaison ne s'affichait jamais.
- Sur téléphone, le sélecteur de jeux, le studio, Labs, la page des icônes intelligentes et celle de l'univers ne coupent plus le contenu et ne défilent plus de côté.

## [1.2.0] - 2026-10-23

### Ajouts

- 165 icônes de base en plus pour la santé, l'accessibilité, les visages, les gestes, l'éducation, la science, les transports, les bâtiments, la maison, les outils, les vêtements, la météo, les devises, les fichiers, les dossiers, les appareils et les flèches, chacune avec ses catégories, ses tags et une animation dessinée.
- 22 icônes d'affichage sur la grille de 48 et 19 icônes isométriques. glyphfox compte maintenant 993 icônes : 770 de base, 90 de marques, 43 animées, 60 d'affichage et 30 isométriques.
- Un sélecteur de jeux sur la page Icônes : choisissez glyphfox ou l'un des 245 jeux sous licence ouverte, chacun avec son nombre d'icônes, sa licence et un aperçu, cherchez dans un jeu ou dans tous et donnez à leurs icônes l'épaisseur, les coins, la couleur, la rotation et l'animation. L'URL garde le jeu choisi.

## [1.1.0] - 2026-10-23

### Ajouts

- 41 nouvelles icônes de base pour la mise en forme du texte, les graphiques et les mathématiques, chacune avec ses catégories, ses mots clés et une animation conçue pour elle : le jeu compte désormais 605 icônes de base, 43 animées, 38 grand format et 11 isométriques.
- La catégorie social : 90 icônes de marques nommées `brand-*` (Instagram, WhatsApp, Facebook, X, TikTok, YouTube, LinkedIn, Telegram, Discord, GitHub et plus), chacune avec des tags et une animation. Les icônes de marques sont des marques de leurs propriétaires.
- Univers dans la navigation principale et une entrée « Autres jeux » sur la page Icônes qui ouvre les 414 952 icônes de 245 jeux.

### Corrections

- Le hero de l'accueil : les icônes dessinent maintenant Fenn à la taille et à la place du dessin, avec la tête dans la couleur d'accent.

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

[1.3.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.3.0
[1.2.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.2.0
[1.1.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.1.0
[1.0.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.0.0
