# Historial de cambios

Todos los cambios importantes de glyphfox se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- El conjunto de iconos: iconos originales en una cuadrícula de 24 con categorías y etiquetas, revisados por el lint de iconos.
- Ejes variables en todos los paquetes: `weight` (de 1 a 3 con compensación óptica en tamaños pequeños), `corners` (round o sharp) y `variant` (outline, duotone y solid, un estilo generado en el build a partir de las formas cerradas).
- El motor de morph: cualquier icono en cualquier otro, pares ajustados a mano, `useMorph` para React, `useMorph` para Vue, `morphStore` para Svelte, los atributos `morph` y `morph-to` del componente web y una alternativa solo con CSS.
- Fusión: `fuse()` combina de 2 a 10 iconos con los layouts overlap, side, stack, grid, orbit, badge e inside, con espacios de recorte, y el resultado pasa el lint de iconos.
- Estados vivos: draw, pop, wiggle, spin, pulse, bounce y shake con mount, hover, click o una prop state, respetando `prefers-reduced-motion`.
- Modificadores: insignias plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down y dot en cualquier esquina, con espacios de recorte.
- 23 props compartidas con los mismos nombres en React, Vue, Svelte, Angular y el componente web.
- Paquetes: `glyphfox` (núcleo, iconos, `toSvg`, `icons.json`, `sprite.svg`, runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` con un build para CDN en un solo archivo, `glyphfox/tailwind` (v3 y v4), `glyphfox/core`, `glyphfox/tools` y `glyphfox-angular`.
- La CLI `glyphfox`: search, show con vista previa en la terminal, copy en nueve formatos, fuse, morph, build de subconjuntos (sprite, máscaras CSS, paquete), lint y Fox-ify.
- El sitio del estudio: explorador de iconos, personalización en vivo, búsqueda por boceto, editor, Fox-ify, Fusión, kit de marca y 3D.
- El sitio del estudio en inglés, portugués (Brasil), español, francés y alemán: páginas estáticas por idioma con etiquetas hreflang, un menú de idiomas en la cabecera y en el pie de página, y el idioma del navegador elegido en la primera visita.
