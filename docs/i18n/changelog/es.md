# Historial de cambios

Todos los cambios importantes de glyphfox se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.3.0] - 2026-10-24

### Añadido

- Las colecciones de presentación (60 iconos en la cuadrícula de 48) e isométrica (30 iconos) vienen en el paquete: `display/NOMBRE` e `isometric/NOMBRE` funcionan en `toSvg`, `getIcon`, el web component y el build del CDN, sus datos están en `glyphfox/collections` y los componentes de React, Vue y Svelte vienen de `glyphfox/<framework>/collections`.
- Solid, Preact y Lit usan el mismo motor de disparadores, así que inView, hover, foco, press, `triggerParent` y las líneas de tiempo por fotogramas funcionan como en React, Vue y Svelte.
- Los 860 iconos base tienen ahora una animación diseñada para cada uno.
- La película de la portada se reproduce en el reproductor propio de glyphfox: el play se transforma en pausa, la línea de tiempo tiene capítulos y miniaturas, y hay subtítulos, velocidad, picture in picture, pantalla completa y atajos de teclado.
- Las páginas de exportación nativa, iconos inteligentes y frameworks (la vista general y las recetas de Next.js, Nuxt, Remix, SvelteKit, Alpine.js y htmx) en portugués, español, francés y alemán.
- Una prueba en el navegador (`npm run e2e`), con su propio job en CI, que abre todas las páginas principales en los cinco idiomas en escritorio y en móvil.
- Formularios para pedir iconos y reportar errores y una guía para contribuir.

### Corregido

- La galería y la comparación del universo daban un error y la comparación nunca aparecía.
- En el móvil, el selector de sets, el estudio, Labs, la página de iconos inteligentes y la del universo ya no cortan contenido ni se desplazan de lado.

## [1.2.0] - 2026-10-23

### Añadido

- 165 iconos base más para salud, accesibilidad, caras, gestos, educación, ciencia, transporte, edificios, el hogar, herramientas, ropa, clima, monedas, archivos, carpetas, dispositivos y flechas, cada uno con categorías, etiquetas y una animación diseñada.
- 22 iconos de presentación en la cuadrícula de 48 y 19 iconos isométricos. glyphfox ahora tiene 993 iconos: 770 base, 90 de marcas, 43 animados, 60 de presentación y 30 isométricos.
- Un selector de sets en la página de Iconos: elige glyphfox o cualquiera de los 245 sets de licencia abierta, cada uno con su cantidad, licencia y vista previa, busca en un set o en todos y da a sus iconos grosor, esquinas, color, rotación y animación. La URL guarda el set elegido.

## [1.1.0] - 2026-10-23

### Añadido

- 41 iconos base nuevos para formato de texto, gráficos y matemáticas, cada uno con categorías, etiquetas y una animación propia: el conjunto tiene ahora 605 iconos base, 43 animados, 38 de exhibición y 11 isométricos.
- La categoría social: 90 iconos de marcas con nombres `brand-*` (Instagram, WhatsApp, Facebook, X, TikTok, YouTube, LinkedIn, Telegram, Discord, GitHub y más), cada uno con etiquetas y una animación. Los iconos de marcas son marcas registradas de sus dueños.
- Universo en la navegación principal y una entrada "Otros sets" en la página de Iconos que abre los 414.952 iconos de 245 sets.

### Corregido

- El hero de la portada: los iconos ahora dibujan a Fenn con el tamaño y la posición del dibujo, con la cabeza en el color de acento.

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

[1.3.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.3.0
[1.2.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.2.0
[1.1.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.1.0
[1.0.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.0.0
