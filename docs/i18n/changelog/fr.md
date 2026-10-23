# Journal des modifications

Tous les changements notables de glyphfox sont consignés ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet applique la [gestion sémantique de version](https://semver.org/lang/fr/).

## [Non publié]

### Ajouts

- Le jeu d'icônes : des icônes originales sur une grille de 24, avec catégories et étiquettes, vérifiées par le lint des icônes.
- Des axes variables dans tous les paquets : `weight` (de 1 à 3, avec compensation optique aux petites tailles), `corners` (arrondis ou vifs) et `variant` (contour, duotone et un style plein généré à la compilation à partir des formes fermées).
- Le moteur de morphing : n'importe quelle icône en n'importe quelle autre, des paires réglées à la main, `useMorph` pour React, `useMorph` pour Vue, `morphStore` pour Svelte, les attributs `morph` et `morph-to` du composant web et une solution de repli en CSS pur.
- Fusion : `fuse()` combine de 2 à 10 icônes avec les dispositions overlap, side, stack, grid, orbit, badge et inside, avec des espaces de découpe, et le résultat passe le lint des icônes.
- États animés : draw, pop, wiggle, spin, pulse, bounce et shake, déclenchés sur mount, hover, click ou state, en respectant `prefers-reduced-motion`.
- Modificateurs : badges plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down et dot dans n'importe quel coin, avec des espaces de découpe.
- 23 props partagées, avec les mêmes noms dans React, Vue, Svelte, Angular et le composant web.
- Paquets : `glyphfox` (cœur, icônes, `toSvg`, `icons.json`, `sprite.svg`, runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` avec une version CDN en un seul fichier, `glyphfox/tailwind` (v3 et v4), `glyphfox/core`, `glyphfox/tools` et `glyphfox-angular`.
- La CLI `glyphfox` : search, show avec un aperçu dans le terminal, copy en neuf formats, fuse, morph, build de sous-ensembles (sprite, masques CSS, paquet), lint et Fox-ify.
- Le site du studio : explorateur d'icônes, personnalisation en direct, recherche par croquis, éditeur, Fox-ify, Fusion, kit de marque et 3D.
- Le site du studio en anglais, portugais (Brésil), espagnol, français et allemand : des pages statiques par langue avec les balises hreflang, un menu des langues dans l'en-tête et le pied de page, et la langue du navigateur choisie dès la première visite.
