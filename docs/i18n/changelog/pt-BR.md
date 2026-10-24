# Novidades

Todas as mudanças relevantes do glyphfox ficam registradas aqui. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Ainda não lançado]

### Adicionado

- O conjunto de ícones: ícones originais numa grade de 24 com categorias e tags, verificados pelo lint de ícones.
- Eixos variáveis em todos os pacotes: `weight` (de 1 a 3 com compensação óptica em tamanhos pequenos), `corners` (round ou sharp) e `variant` (outline, duotone e um estilo solid gerado no build a partir das formas fechadas).
- O motor de morph: qualquer ícone vira qualquer outro, pares ajustados à mão, `useMorph` para React, `useMorph` para Vue, `morphStore` para Svelte, os atributos `morph` e `morph-to` do web component e uma alternativa só com CSS.
- Fusão: `fuse()` combina de 2 a 10 ícones com os layouts overlap, side, stack, grid, orbit, badge e inside, com espaços de recorte, e o resultado passa no lint de ícones.
- Estados vivos: draw, pop, wiggle, spin, pulse, bounce e shake no mount, no hover, no clique ou por uma prop de estado, respeitando `prefers-reduced-motion`.
- Modificadores: selos plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down e dot em qualquer canto, com espaços de recorte.
- 23 props compartilhadas, com os mesmos nomes, em React, Vue, Svelte, Angular e no web component.
- Pacotes: `glyphfox` (núcleo, ícones, `toSvg`, `icons.json`, `sprite.svg`, runtime), `glyphfox/react`, `glyphfox/vue`, `glyphfox/svelte`, `glyphfox/web` com um build para CDN em um único arquivo, `glyphfox/tailwind` (v3 e v4), `glyphfox/core`, `glyphfox/tools` e `glyphfox-angular`.
- A CLI `glyphfox`: search, show com prévia no terminal, copy em nove formatos, fuse, morph, build de subconjuntos (sprite, máscaras CSS, pacote), lint e Fox-ify.
- O site do estúdio: navegador de ícones, personalização ao vivo, busca por desenho, editor, Fox-ify, Fusão, kit de marca e 3D.
- O site do estúdio em inglês, português (Brasil), espanhol, francês e alemão: páginas estáticas por idioma com tags hreflang, um menu de idiomas no cabeçalho e no rodapé e o idioma do navegador escolhido na primeira visita.
