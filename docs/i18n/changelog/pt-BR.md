# Novidades

Todas as mudanças relevantes do glyphfox ficam registradas aqui. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.2.0] - 2026-10-23

### Adicionado

- Mais 165 ícones base para saúde, acessibilidade, rostos, gestos, educação, ciência, transporte, prédios, casa, ferramentas, roupas, clima, moedas, arquivos, pastas, dispositivos e setas, cada um com categorias, tags e uma animação desenhada.
- 22 ícones de destaque na grade de 48 e 19 ícones isométricos. O glyphfox agora tem 993 ícones: 770 base, 90 de marcas, 43 animados, 60 de destaque e 30 isométricos.
- Um seletor de coleções na página de Ícones: escolha o glyphfox ou qualquer uma das 245 coleções de licença aberta, cada uma com quantidade, licença e prévia, busque em uma coleção ou em todas e dê aos ícones delas peso, cantos, cor, rotação e animação. O endereço guarda a coleção escolhida.

## [1.1.0] - 2026-10-23

### Adicionado

- 41 novos ícones base para formatação de texto, gráficos e matemática, cada um com categorias, tags e uma animação própria: o conjunto agora tem 605 ícones base, 43 animados, 38 de destaque e 11 isométricos.
- A categoria social: 90 ícones de marcas com nomes `brand-*` (Instagram, WhatsApp, Facebook, X, TikTok, YouTube, LinkedIn, Telegram, Discord, GitHub e mais), cada um com tags e animação. Os ícones de marcas são marcas registradas dos seus donos.
- Universo no menu principal e um item "Outras coleções" na página de Ícones que abre os 414.952 ícones em 245 coleções.

### Corrigido

- O hero da página inicial: os ícones agora desenham o Fenn no tamanho e no lugar do desenho, com a cabeça na cor de destaque.

## [1.0.0] - 2026-10-23

### Adicionado

- O conjunto de ícones: ícones originais numa grade de 24 com categorias e tags, verificados pelo lint de ícones.
- Eixos variáveis em todos os pacotes: `weight` (de 1 a 3 com compensação óptica em tamanhos pequenos), `corners` (round ou sharp) e `variant` (outline, duotone e um estilo solid gerado no build a partir das formas fechadas).
- O motor de morph: qualquer ícone vira qualquer outro, pares ajustados à mão, `useMorph` para React, `useMorph` para Vue, `morphStore` para Svelte, os atributos `morph` e `morph-to` do web component e uma alternativa só com CSS.
- Fusão: `fuse()` combina de 2 a 10 ícones com os layouts overlap, side, stack, grid, orbit, badge e inside, com espaços de recorte, e o resultado passa no lint de ícones.
- Estados vivos: draw, pop, wiggle, spin, pulse, bounce e shake no mount, no hover, no clique ou por uma prop de estado, respeitando `prefers-reduced-motion`.
- Modificadores: selos plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down e dot em qualquer canto, com espaços de recorte.
- 23 props compartilhadas, com os mesmos nomes, em React, Vue, Svelte, Angular e no web component.
- Pacotes: `glyphfox` (núcleo, ícones, `toSvg`, `icons.json`, `sprite.svg`, runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` com um build para CDN em um único arquivo, `glyphfox/tailwind` (v3 e v4), `glyphfox/core`, `glyphfox/tools` e `glyphfox-angular`.
- Pacotes para frameworks com as mesmas props, gerados no build, com tree shaking e tipados: `glyphfox/solid`, `glyphfox/preact`, `glyphfox/qwik` (para Qwik 2), `glyphfox/lit` (elementos Lit), `glyphfox/astro` (componentes .astro), `glyphfox/native` (React Native com react-native-svg, estados vivos amostrados quadro a quadro) e `glyphfox/ember` (helpers), cada um com uma peer dependency opcional.
- `glyphfox/react/server`: `Icon` e `Fusion` sem hooks para React Server Components, que não enviam JavaScript; os módulos de `glyphfox/react` são marcados com `'use client'`.
- Guias e receitas para Next.js App Router, Nuxt, SvelteKit, Remix, Alpine e htmx, no README e na documentação em `frameworks/`.
- A CLI `glyphfox`: search, show com prévia no terminal, copy em nove formatos, fuse, morph, build de subconjuntos (sprite, máscaras CSS, pacote), lint e Fox-ify.
- Fontes de ícones: `registerIconSource(prefix, source)` faz ícones `prefix:name` de outros conjuntos funcionarem no `toSvg`, em todos os componentes, no web component e na CDN, com peso, animações, modificadores e Fusão nos ícones de traço e uma alternativa para ícones preenchidos.
- O site do estúdio: navegador de ícones, personalização ao vivo, busca por desenho, editor, Fox-ify, Fusão, kit de marca e 3D.
- Ilustrações do Fenn (sentado, correndo, desenhando, em órbita) feitas com a geometria dos ícones, os banners do README e a prévia para redes sociais.
- Busca multilíngue: sinônimos em inglês, português, espanhol, francês e alemão, busca sem acentos e plurais simples em `search()`, na nova `searchIcons()`, na CLI (`--lang`) e no estúdio.
- Coleções compartilhadas no estúdio: um link que leva a coleção inteira, comprimida, no fragmento da URL, e sessões ao vivo em que amigos editam uma coleção juntos por WebRTC, pareados com seis palavras por relays MQTT públicos, com criptografia de ponta a ponta, presença e mesclagem por ícone em que a última edição vence.
- Glyph script: uma pequena linguagem de texto para ícones (circle, ellipse, rect com raio, line, polyline, polygon, arc, path, group, espelhamento em x ou y, repetição em torno de um centro) com erros na linha e na coluna, compilada para SVG que passa no lint de ícones. Em `glyphfox/script`, no comando `glyphfox script file.gfs` e num playground ao vivo na página Labs do estúdio.
- `glyphfox scan [dir]`: encontra os ícones que um projeto usa em JS, TS, JSX, Vue, Svelte, templates Angular e HTML, gera o subconjunto mínimo como sprite ou módulo ES e aponta ícones sem rótulo acessível onde ele é necessário.
- Exportações em `glyphfox/export`, na CLI e na página Labs do estúdio: um favicon animado (um runtime em canvas com alternativa estática), cursores CSS (PNG em 32 e 64 px com hotspot), saída para plotter (SVG de linha única ordenado para o menor percurso da caneta e G-code com velocidades de avanço e comandos de subir e baixar a caneta) e STL de um ícone extrudado (espessura e chanfro).
- Busca por desenho no estúdio: os 24 ícones mais parecidos aparecem enquanto você desenha, ordenados na própria página com um índice de formas compacto gerado por `scripts/labs/sketch-index.mjs` (máscaras de traço de 32 por 32 expandidas em campos de distância, histogramas de direção do traço e momentos de Zernike).
- O kit de marca mostra uma prévia do conjunto todo com a sua marca e exporta um zip com arquivos SVG temáticos, um sprite, variáveis CSS, um conjunto de favicons (ico e PNGs em 16, 32, 180, 192 e 512), ícones de app e um esqueleto de package.json.
- O site do estúdio em inglês, português (Brasil), espanhol, francês e alemão: páginas estáticas por idioma com tags hreflang, um menu de idiomas no cabeçalho e no rodapé e o idioma do navegador escolhido na primeira visita.

[1.2.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.2.0
[1.1.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.1.0
[1.0.0]: https://github.com/kwy404/glyphfox/releases/tag/v1.0.0
