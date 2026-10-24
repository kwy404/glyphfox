# Historial de cambios

Todos los cambios importantes de glyphfox se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- 82 iconos base nuevos para formato de texto, gráficos, matemáticas, salud, accesibilidad, caras y gestos, educación y ciencia, cada uno con categorías, etiquetas y una animación propia: el conjunto tiene ahora 646 iconos base, 43 animados, 38 de exhibición y 11 isométricos.

## [1.0.0] - 2026-10-23

### Añadido

- El conjunto de iconos: iconos originales en una cuadrícula de 24 con categorías y etiquetas, revisados por el lint de iconos.
- Ejes variables en todos los paquetes: `weight` (de 1 a 3 con compensación óptica en tamaños pequeños), `corners` (round o sharp) y `variant` (outline, duotone y solid, un estilo generado en el build a partir de las formas cerradas).
- El motor de morph: cualquier icono en cualquier otro, pares ajustados a mano, `useMorph` para React, `useMorph` para Vue, `morphStore` para Svelte, los atributos `morph` y `morph-to` del componente web y una alternativa solo con CSS.
- Fusión: `fuse()` combina de 2 a 10 iconos con los layouts overlap, side, stack, grid, orbit, badge e inside, con espacios de recorte, y el resultado pasa el lint de iconos.
- Estados vivos: draw, pop, wiggle, spin, pulse, bounce y shake con mount, hover, click o una prop state, respetando `prefers-reduced-motion`.
- Modificadores: insignias plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down y dot en cualquier esquina, con espacios de recorte.
- 23 props compartidas con los mismos nombres en React, Vue, Svelte, Angular y el componente web.
- Paquetes: `glyphfox` (núcleo, iconos, `toSvg`, `icons.json`, `sprite.svg`, runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` con un build para CDN en un solo archivo, `glyphfox/tailwind` (v3 y v4), `glyphfox/core`, `glyphfox/tools` y `glyphfox-angular`.
- Paquetes para frameworks con las mismas props, generados en el build, con tree shaking y tipados: `glyphfox/solid`, `glyphfox/preact`, `glyphfox/qwik` (para Qwik 2), `glyphfox/lit` (elementos Lit), `glyphfox/astro` (componentes .astro), `glyphfox/native` (React Native con react-native-svg, estados vivos muestreados fotograma a fotograma) y `glyphfox/ember` (helpers), cada uno con una dependencia peer opcional.
- `glyphfox/react/server`: `Icon` y `Fusion` sin hooks para React Server Components, que no envían JavaScript; los módulos de `glyphfox/react` llevan `'use client'`.
- Guías y recetas para Next.js App Router, Nuxt, SvelteKit, Remix, Alpine y htmx, en el README y en la documentación en `frameworks/`.
- La CLI `glyphfox`: search, show con vista previa en la terminal, copy en nueve formatos, fuse, morph, build de subconjuntos (sprite, máscaras CSS, paquete), lint y Fox-ify.
- Fuentes de iconos: `registerIconSource(prefix, source)` hace que los iconos `prefix:name` de otros conjuntos funcionen en `toSvg`, en todos los componentes, en el web component y en la CDN, con grosor, animaciones, modificadores y Fusión en los iconos de trazo y una alternativa para los iconos rellenos.
- El sitio del estudio: explorador de iconos, personalización en vivo, búsqueda por boceto, editor, Fox-ify, Fusión, kit de marca y 3D.
- Ilustraciones de Fenn (sentado, corriendo, dibujando, en órbita) hechas con la geometría de los iconos, los banners del README y la vista previa para redes sociales.
- Búsqueda multilingüe: sinónimos en inglés, portugués, español, francés y alemán, búsqueda sin acentos y plurales simples en `search()`, en la nueva `searchIcons()`, en la CLI (`--lang`) y en el estudio.
- Colecciones compartidas en el estudio: un enlace que lleva la colección entera, comprimida, en el fragmento de la URL, y sesiones en vivo en las que tus amigos editan una colección juntos por WebRTC, emparejados con seis palabras a través de relays MQTT públicos, con cifrado de extremo a extremo, presencia y fusión por icono en la que gana la última edición.
- Glyph script: un pequeño lenguaje de texto para iconos (circle, ellipse, rect con radio, line, polyline, polygon, arc, path, group, espejo en x o y, repetición alrededor de un centro) con errores en la línea y la columna, compilado a SVG que pasa el lint de iconos. En `glyphfox/script`, el comando `glyphfox script file.gfs` y un playground en vivo en la página Labs del estudio.
- `glyphfox scan [dir]`: encuentra los iconos que usa un proyecto en JS, TS, JSX, Vue, Svelte, plantillas de Angular y HTML, genera el subconjunto mínimo como sprite o como módulo ES y señala los iconos sin etiqueta accesible donde hace falta una.
- Exportaciones en `glyphfox/export`, en la CLI y en la página Labs del estudio: un favicon animado (un runtime en canvas con una alternativa estática), cursores CSS (PNG a 32 y 64 px con hotspot), salida para plóter (SVG de una sola línea ordenado para el menor recorrido de la pluma, y G-code con velocidades de avance y comandos para subir y bajar la pluma) y STL de un icono extruido (espesor y bisel).
- Búsqueda por dibujo en el estudio: los 24 iconos más parecidos aparecen mientras dibujas, ordenados en la propia página con un índice de formas compacto generado por `scripts/labs/sketch-index.mjs` (máscaras de trazo de 32 por 32 expandidas en campos de distancia, histogramas de dirección del trazo y momentos de Zernike).
- El kit de marca muestra una vista previa de todo el conjunto con tu marca y exporta un zip con archivos SVG con tu marca, un sprite, variables CSS, un conjunto de favicons (ico y PNG de 16, 32, 180, 192 y 512), iconos de app y un esqueleto de package.json.
- El sitio del estudio en inglés, portugués (Brasil), español, francés y alemán: páginas estáticas por idioma con etiquetas hreflang, un menú de idiomas en la cabecera y en el pie de página, y el idioma del navegador elegido en la primera visita.

[1.0.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.0.0
