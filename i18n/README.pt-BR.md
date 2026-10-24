<p align="center">
  <a href="https://kwy404.github.io/glyphfox/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../assets/banner-dark.png">
      <img src="../assets/banner-light.png" alt="glyphfox: ícones que se movem, se transformam e se fundem" width="880">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/glyphfox"><img src="https://img.shields.io/npm/v/glyphfox?color=ff7a1a&label=npm" alt="versão no npm"></a>
  <a href="https://www.npmjs.com/package/glyphfox"><img src="https://img.shields.io/npm/dm/glyphfox?color=ff7a1a" alt="downloads no npm"></a>
  <a href="https://github.com/kwy404/glyphfox/actions/workflows/ci.yml"><img src="https://github.com/kwy404/glyphfox/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.jsdelivr.com/package/npm/glyphfox"><img src="https://img.shields.io/jsdelivr/npm/hm/glyphfox?color=ff7a1a" alt="jsDelivr"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-ff7a1a" alt="licença MIT"></a>
</p>

# glyphfox

Ícones open source originais em um grid de 24 que fazem mais do que ficar parados. Todo ícone é **variável** (eixos de peso, cantos e estilo), **se transforma** em qualquer outro ícone, **se funde** com outros ícones formando ícones novos que continuam respeitando as regras, aceita **badges de modificador** em qualquer canto e vem com **estados vivos** (draw, pop, wiggle, spin, pulse, bounce, shake). Um único conjunto de props funciona do mesmo jeito em React (incluindo Server Components), Vue, Svelte, Angular, Solid, Preact, Qwik, Lit, Astro, React Native, Ember, no web component `<glyph-fox>`, no Tailwind CSS, na CDN e na CLI.

**[Abra o estúdio](https://kwy404.github.io/glyphfox/)** para navegar, personalizar, transformar, fundir, desenhar seus próprios ícones, aplicar o Fox-ify a qualquer SVG, buscar por esboço, exportar um kit de marca e renderizar ícones em 3D.

[English](../README.md)

## Sumário

- [Instalação](#instalação)
- [Início rápido](#início-rápido): [React](#react), [Vue](#vue), [Svelte](#svelte), [Angular](#angular), [Solid](#solid), [Preact](#preact), [Qwik](#qwik), [Lit](#lit), [Astro](#astro), [React Native](#react-native), [Ember](#ember), [Web component e CDN](#web-component-e-cdn), [Tailwind CSS](#tailwind-css), [HTML puro](#html-puro), [JavaScript](#javascript)
- [Receitas](#receitas): [Next.js App Router](#nextjs-app-router-com-server-components), [Nuxt](#nuxt), [SvelteKit](#sveltekit), [Remix e React Router](#remix-e-react-router), [Alpine](#alpine), [htmx](#htmx)
- [Props](#props)
- [Sintaxe de nomes](#sintaxe-de-nomes)
- [Eixos variáveis](#eixos-variáveis) · [Morph](#morph) · [Fusion](#fusion) · [Estados vivos](#estados-vivos) · [Modificadores](#modificadores)
- [CLI](#cli)
- [Exportações nativas](#exportações-nativas): Android, Jetpack Compose, iOS, SwiftUI, Flutter
- [Glyph script](#glyph-script)
- [Scan e exportações](#scan-e-exportações)
- [O estúdio](#o-estúdio)
- [Ícones sociais](#ícones-sociais)
- [Regras dos ícones](#regras-dos-ícones)

## Instalação

```sh
npm install glyphfox
```

`glyphfox` não tem dependências. React, Vue, Svelte, Solid, Preact, Qwik, Lit, Astro, React Native (com `react-native-svg`), Ember e Tailwind CSS são peer dependencies opcionais, usadas apenas quando você importa os pontos de entrada correspondentes. O Angular fica em um pacote próprio:

```sh
npm install glyphfox-angular
```

## Início rápido

### React

```jsx
import { HomeIcon, FileIcon, Fusion, MorphIcon } from 'glyphfox/react';

export function Toolbar({ open, saved }) {
  return (
    <>
      <HomeIcon />
      <FileIcon size={20} weight={1.5} modifier={saved ? 'check' : undefined} />
      <Fusion icons={['cloud', 'lock']} layout="overlap" />
      <MorphIcon name={open ? 'x' : 'menu'} />
    </>
  );
}
```

Os componentes são compatíveis com tree shaking (`/*#__PURE__*/`, `sideEffects: false`), usam `forwardRef` e repassam `className`, `style` e todos os atributos SVG. Deep imports também funcionam: `import { FileIcon } from 'glyphfox/react/icons/file'`. O hook `useMorph(name, { duration })` retorna dados de ícone que se transformam sempre que `name` muda.

Os módulos são marcados com `'use client'`, então Server Components podem renderizá-los como client components. Para ícones que não enviam nenhum JavaScript, `glyphfox/react/server` oferece os server components `Icon` e `Fusion`, sem hooks, com todos os ícones disponíveis pelo nome:

```jsx
import { Icon, Fusion } from 'glyphfox/react/server';

<Icon name="file+check@tr" size={20} variant="duotone" />
<Fusion icons={['cloud', 'lock']} layout="overlap" />
```

### Vue

```vue
<script setup>
import { HomeIcon, Fusion, MorphIcon } from 'glyphfox/vue';
</script>

<template>
  <HomeIcon :size="32" color="#ff7a1a" variant="duotone" />
  <Fusion :icons="['file', 'check']" layout="badge" />
  <MorphIcon :name="playing ? 'pause' : 'play'" />
</template>
```

`useMorph(nameRef)` é o composable equivalente ao hook do React.

### Svelte

```svelte
<script>
  import { HeartIcon, Fusion } from 'glyphfox/svelte';
  let liked = $state(false);
</script>

<button onclick={() => (liked = !liked)}>
  <HeartIcon animate="pop" trigger="state" active={liked} variant={liked ? 'solid' : 'outline'} />
</button>
<Fusion icons={['user', 'shield']} layout="badge" />
```

Svelte 5. `morphStore('menu')` é uma store que se transforma a cada `set(name)`.

### Angular

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { iconHome, iconFile, iconCheck } from 'glyphfox';
import { GlyphFoxIcon, provideGlyphFox } from 'glyphfox-angular';

bootstrapApplication(App, {
  providers: [provideGlyphFox({ icons: [iconHome, iconFile, iconCheck], defaults: { weight: 1.75 } })],
});
```

```html
<gf-icon name="home" [size]="24"></gf-icon>
<gf-icon name="file+check@tr" variant="duotone"></gf-icon>
<gf-icon [icons]="['cloud', 'lock']" layout="overlap"></gf-icon>
```

`GlyphFoxIcon` é um componente standalone com cada prop compartilhada como input. Registre só os ícones que você usa ou passe `icons` de `glyphfox` para registrar todos eles.

### Solid

```jsx
import { createSignal } from 'solid-js';
import { HomeIcon, HeartIcon, Fusion, MorphIcon } from 'glyphfox/solid';

export function Toolbar() {
  const [open, setOpen] = createSignal(false);
  return (
    <nav>
      <HomeIcon size={20} class="nav-icon" />
      <HeartIcon animate="pop" trigger="click" variant="duotone" />
      <Fusion icons={['cloud', 'lock']} layout="overlap" />
      <button onClick={() => setOpen(!open())}>
        <MorphIcon name={open() ? 'x' : 'menu'} />
      </button>
    </nav>
  );
}
```

Sem configuração de compilador: o mesmo módulo renderiza no SolidStart, tanto no servidor quanto no navegador. `class`, `style`, `ref` e eventos chegam ao svg; `useMorph(accessor)` retorna um accessor que se transforma quando o nome muda.

### Preact

```jsx
import { FileIcon, HeartIcon, MorphIcon } from 'glyphfox/preact';

<FileIcon size={20} weight={1.5} modifier="check" class="doc" />
<HeartIcon animate="pop" trigger="click" />
<MorphIcon name={copied ? 'check' : 'copy'} />
```

A API do React (`Icon`, `Fusion`, `MorphIcon`, `useMorph`) sobre `preact` e `preact/hooks`, sem `preact/compat`. No Preact 11, uma `ref` chega ao svg.

### Qwik

```tsx
import { component$, useSignal } from '@qwik.dev/core';
import { iconX } from 'glyphfox';
import { BellIcon, HomeIcon, MenuIcon, registerIcons } from 'glyphfox/qwik';

registerIcons([iconX]); // names used only by morphTo, Icon or Fusion

export default component$(() => {
  const open = useSignal(false);
  return (
    <header>
      <HomeIcon size={20} class="logo" />
      <BellIcon animate="shake" trigger="hover" />
      <button onClick$={() => (open.value = !open.value)}>
        <MenuIcon morphTo="x" trigger="state" active={open.value} />
      </button>
    </header>
  );
});
```

Para Qwik 2 (`@qwik.dev/core`). Componentes leves que renderizam no servidor e retomam sem JavaScript: os estados vivos e o `morphTo` rodam em CSS, `active` alterna `trigger="state"` e `trigger="click"` usa um pequeno handler inline. Nomes em `Icon`, `morphTo` e `Fusion` precisam ser registrados: os componentes de ícone registram o próprio ícone, e `registerIcons([iconX])` (ou `registerIcons(icons)` para o conjunto inteiro) cobre os nomes que você só escreve como strings.

### Lit

```js
import { html } from 'lit';
import { defineIcons, FileIcon, HeartIcon, Icon, Fusion, MorphIcon } from 'glyphfox/lit';

defineIcons([FileIcon, HeartIcon, Icon, Fusion, MorphIcon]); // <gf-file>, <gf-heart>, <gf-glyph>, <gf-fusion>, <gf-morph>

html`
  <gf-file size="20" weight="1.5" modifier="check"></gf-file>
  <gf-heart animate="pop" trigger="click" secondary-color="#ff7a1a"></gf-heart>
  <gf-glyph name="cloud&lock:overlap"></gf-glyph>
  <gf-morph .name=${open ? 'x' : 'menu'}></gf-morph>
`;
```

Elementos Lit 3 em shadow DOM que também renderizam com `@lit-labs/ssr`. Nada é definido no import; `defineIcons(list, { prefix: 'my' })` gera `<my-file>`. Atributos são em kebab-case, propriedades em camelCase, e o atributo `animate` é a propriedade `animatePreset` (todo elemento já tem um método `animate()`), enquanto `animation` reproduz a animação desenhada, como em todos os pacotes. `class` e `style` estilizam o elemento host.

### Astro

```astro
---
import { HomeIcon, Icon, Fusion } from 'glyphfox/astro';
import SearchIcon from 'glyphfox/astro/icons/search';
---

<HomeIcon size={20} class:list={['nav-icon', { active: true }]} />
<SearchIcon weight={1.5} />
<Icon name="file+check@tr" variant="duotone" />
<Fusion icons={['cloud', 'lock']} layout="overlap" />
```

Componentes `.astro` que renderizam SVG estático no servidor e não enviam JavaScript, com todos os ícones disponíveis para `Icon`, `morphTo` e `Fusion`. `class`, `style` (string ou objeto) e qualquer atributo são repassados.

### React Native

```sh
npm install glyphfox react-native-svg
```

```jsx
import { HomeIcon, BellIcon, MorphIcon } from 'glyphfox/native';

<HomeIcon size={28} color="#ff7a1a" />
<BellIcon animate="shake" trigger="state" active={unread > 0} />
<MorphIcon name={open ? 'x' : 'menu'} style={{ marginLeft: 8 }} />
```

Os mesmos componentes sobre `react-native-svg`. Não há CSS no nativo, então os estados vivos são amostrados frame a frame a partir dos mesmos presets e os morphs são interpolados, ambos respeitando a configuração de reduzir movimento; `trigger="click"` dispara ao pressionar. `title` define o rótulo de acessibilidade e as refs chegam ao `Svg`.

### Ember

```gjs
import { FileIcon, Glyph, Fusion } from 'glyphfox/ember';

<template>
  {{FileIcon size=20 weight=1.5 class="toolbar-icon"}}
  {{Glyph "file+check@tr" variant="duotone"}}
  {{Fusion "cloud" "lock" layout="overlap"}}
</template>
```

Helpers de função simples (Ember 4.5 ou mais recente, sem configuração de addon) que retornam markup confiável, para .gjs, .gts e templates clássicos. Props, `class`, `style` e atributos são argumentos nomeados. Nomes em `Glyph`, `morphTo` e `Fusion` precisam ser registrados: os helpers de ícone registram o próprio ícone, e `registerIcons([iconCloud])` (ou `registerIcons(icons)`) cobre o resto.

### Web component e CDN

Um arquivo, todos os ícones, sem etapa de build:

```html
<script src="https://cdn.jsdelivr.net/npm/glyphfox@1"></script>
<!-- or https://unpkg.com/glyphfox@1 -->

<glyph-fox name="home"></glyph-fox>
<glyph-fox name="file+check" size="32" weight="1.5"></glyph-fox>
<glyph-fox name="cloud&lock" layout="overlap"></glyph-fox>
<glyph-fox name="menu" morph></glyph-fox> <!-- animates when name changes -->
```

Toda prop é um atributo em kebab-case (`secondary-color`, `flip-x`, `morph-to`...). Com um bundler: `import 'glyphfox/web'` (todos os ícones) ou `import { defineGlyphFox } from 'glyphfox/web/element'` (traga seus próprios ícones com `registerIcons`). O build da CDN também expõe `window.glyphfox` (`toSvg`, `fuse`, `search`...).

### Tailwind CSS

Ícones como máscaras CSS em `currentColor`, então as classes utilitárias `text-*`, `size-*` e `opacity-*` simplesmente funcionam.

```js
// Tailwind v3: tailwind.config.js
module.exports = { plugins: [require('glyphfox/tailwind')] };
```

```css
/* Tailwind v4 */
@import "tailwindcss";
@plugin "glyphfox/tailwind";
```

```html
<span class="gf-home text-2xl text-orange-500"></span>
<span class="gf-[file+check] gf-spin"></span>          <!-- v3 also accepts gf-file+check -->
<span class="gf-[cloud&lock]/side"></span>             <!-- fusion with a layout -->
<span class="gf-heart/solid-sharp-w1.5"></span>        <!-- axes after the slash -->
```

Animações: `gf-spin`, `gf-pulse`, `gf-pop`, `gf-wiggle`, `gf-bounce`, `gf-shake`. Opções: `glyphfox({ prefix, size, variant, corners, weight, combos })`.

### HTML puro

```html
<script type="module">import 'https://cdn.jsdelivr.net/npm/glyphfox@1/dist/runtime/auto.js';</script>
<i data-glyph="search" data-size="20" data-variant="duotone"></i>
```

O runtime substitui cada elemento `data-glyph` por SVG inline, inclusive elementos adicionados depois.

### JavaScript

```js
import { toSvg, fuse, createMorph, search, getIcon } from 'glyphfox';

toSvg('file', { size: 32, color: '#ff7a1a', variant: 'solid' });
toSvg('file+check@tr');                      // modifier badge
toSvg('cloud&lock:overlap');                 // fusion
toSvg('menu', { morphTo: 'x', trigger: 'hover' }); // CSS only morph
fuse(['cloud', 'lock'], { layout: 'overlap', gap: 1 }); // icon data, passes the lint
search('arrow', { limit: 10 });
search('lixeira');                           // trash, synonyms in five languages
```

`search` entende palavras do dia a dia em inglês, português, espanhol, francês e alemão (`lixeira`, `basura`, `poubelle` e `Mülleimer`: todas encontram `trash`), não diferencia maiúsculas de minúsculas, ignora acentos e lida com plurais simples. Passe `lang: 'pt'` para priorizar o significado da palavra nesse idioma, ou `synonyms: false` para buscar apenas em nomes e tags. `searchIcons(list, query)` ordena a sua própria lista de ícones da mesma forma.

Também no pacote: `glyphfox/icons.json`, `glyphfox/sprite.svg` (`<use href="sprite.svg#gf-home">`), `glyphfox/styles.css` (classes de animação opcionais), `glyphfox/core` (o motor sem os dados dos ícones) e `glyphfox/tools` (lint e Fox-ify).

## Receitas

Versões mais longas, com todos os passos, estão nos [guias de frameworks](https://kwy404.github.io/glyphfox/frameworks/).

### Next.js App Router com Server Components

```tsx
// app/page.tsx: a Server Component, no JavaScript sent for these icons
import { Icon } from 'glyphfox/react/server';

export default function Page() {
  return <Icon name="bell" animate="shake" trigger="hover" title="Notifications" />;
}
```

```tsx
// app/like-button.tsx
'use client';
import { HeartIcon } from 'glyphfox/react';
```

Server Components renderizam SVG estático com `glyphfox/react/server` (todos os ícones pelo nome, estados vivos em CSS e morphs por hover ou por estado). Use `glyphfox/react` em client components para o trigger de clique e os morphs interpolados. Adicione `experimental.optimizePackageImports: ['glyphfox']` ao `next.config` ou use deep imports (`glyphfox/react/icons/file`). [Receita completa](https://kwy404.github.io/glyphfox/frameworks/nextjs.html).

### Nuxt

```ts
// modules/glyphfox.ts: auto import the components you choose
import { addComponent, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule({
  setup() {
    for (const name of ['HomeIcon', 'BellIcon', 'Icon', 'MorphIcon']) addComponent({ name, export: name, filePath: 'glyphfox/vue' });
  },
});
```

`glyphfox/vue` renderiza no servidor e hidrata, sem `build.transpile`. Registre em um plugin os ícones que você só usa pelo nome (`registerIcons([iconCloud])`) para que a renderização no servidor os inclua. [Receita completa](https://kwy404.github.io/glyphfox/frameworks/nuxt.html).

### SvelteKit

```svelte
<script>
  import { HomeIcon } from 'glyphfox/svelte';
  import FileIcon from 'glyphfox/svelte/icons/file';
</script>

<HomeIcon size={20} />
<FileIcon modifier="check" />
```

`glyphfox/svelte` distribui arquivos-fonte `.svelte` que o SvelteKit compila, então os ícones renderizam no servidor e são pré-renderizados como HTML estático. Chame `registerIcons` em `+layout.js` para os ícones que você só usa pelo nome. [Receita completa](https://kwy404.github.io/glyphfox/frameworks/sveltekit.html).

### Remix e React Router

```tsx
// app/root.tsx
import sprite from 'glyphfox/sprite.svg?url';

export const links = () => [{ rel: 'preload', href: sprite, as: 'image', type: 'image/svg+xml' }];
```

`glyphfox/react` funciona nas rotas sem ajustes, renderizado no servidor e hidratado. Para listas estáticas longas, aponte elementos `<use>` para o sprite em cache (`sprite + '#gf-home'`). [Receita completa](https://kwy404.github.io/glyphfox/frameworks/remix.html).

### Alpine

```html
<script src="https://cdn.jsdelivr.net/npm/glyphfox@1"></script>

<div x-data="{ open: false }">
  <button @click="open = !open"><glyph-fox :name="open ? 'x' : 'menu'" morph></glyph-fox></button>
  <span x-html="glyphfox.toSvg(open ? 'heart/solid' : 'heart', { size: 20 })"></span>
</div>
```

`<glyph-fox>` reage a mudanças de atributo, então os bindings do Alpine controlam todas as props e `morph` anima as trocas de nome. [Receita completa](https://kwy404.github.io/glyphfox/frameworks/alpine.html).

### htmx

```js
// a server route that answers an htmx request
import { toSvg } from 'glyphfox';

res.send(`<button hx-post="/like" hx-swap="outerHTML">${toSvg('heart/solid', { animate: 'pop' })}</button>`);
```

Renderize SVG no servidor com `toSvg`, retorne tags `<glyph-fox>` (os custom elements fazem upgrade quando são inseridos pelo swap) ou use o runtime `data-glyph`, que também substitui placeholders que chegam depois. [Receita completa](https://kwy404.github.io/glyphfox/frameworks/htmx.html).

## Props

As mesmas props, com os mesmos nomes e significado, em todos os pacotes. Atributos usam kebab-case (`secondary-color`). O uso simples continua sendo `<HomeIcon />`.

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `size` | number ou string | `24` | Largura e altura. Números são pixels, strings podem ser `1em`, `2rem`. |
| `color` | string | `currentColor` | Cor principal. |
| `secondaryColor` | string | `color` | Cor da camada duotone e do preenchimento solid. |
| `secondaryOpacity` | number | `0.3` duotone, `1` solid | Opacidade da camada duotone ou do preenchimento solid. |
| `weight` | number | `2` | Eixo de peso, espessura do traço de 1 a 3 no grid de 24. Com compensação óptica abaixo de 24 px. |
| `absoluteWeight` | boolean | `false` | Mantém o traço com `weight` pixels em qualquer tamanho. |
| `corners` | `round` ou `sharp` | `round` | Eixo de cantos: junções e pontas arredondadas ou retas. |
| `variant` | `outline`, `duotone`, `solid` | `outline` | Eixo de estilo. O solid é gerado a partir das formas fechadas de cada ícone. |
| `rotate` | number | `0` | Rotação em graus. |
| `flipX` | boolean | `false` | Espelha na horizontal. |
| `flipY` | boolean | `false` | Espelha na vertical. |
| `mirrorRtl` | boolean | `false` | Espelha em layouts da direita para a esquerda. |
| `animate` | `draw`, `pop`, `wiggle`, `spin`, `pulse`, `bounce`, `shake` | nenhum | Preset de estado vivo. |
| `trigger` | `mount`, `hover`, `click`, `focus`, `press`, `inView`, `loop`, `state` | `mount` | Quando a animação, ou o morph, acontece. Hover, focus e press revertem suavemente quando terminam. |
| `active` | boolean | `false` | O estado para `trigger="state"`. |
| `duration` | number (ms) | conforme o preset, `450` para morphs | Duração da animação ou do morph. |
| `delay` | number (ms) | `0` | Atraso da animação ou do morph. |
| `loop` | boolean ou number | `false` (`true` para spin e pulse) | Repete para sempre ou por um número de vezes. |
| `modifier` | `plus`, `minus`, `check`, `x`, `alert`, `lock`, `clock`, `sync`, `arrow-up`, `arrow-down`, `dot` | nenhum | Badge de modificador com vão de recorte automático. |
| `modifierCorner` | `top-left`, `top-right`, `bottom-left`, `bottom-right` | `bottom-right` | Canto do badge (`tl`, `tr`, `bl`, `br` também funcionam). |
| `morphTo` | nome ou dados de ícone | nenhum | Alvo do morph; o trigger decide quando ele aparece. |
| `title` | string | nenhum | Nome acessível: adiciona `<title>`, `role="img"` e `aria-label`. |
| `decorative` | boolean | `true` sem título | Esconde o ícone das tecnologias assistivas (`aria-hidden`). |
| `animation` | `true`, um nome ou uma timeline | nenhum | Reproduz a animação desenhada para o próprio ícone (uma timeline de frames por elemento). Tem prioridade sobre `animate`. |
| `triggerParent` | boolean | `false` | Hover, focus e press no link ou botão mais próximo também animam o ícone. |
| `disabled` | boolean | `false` | Interrompe todas as animações. |

Além disso, `class` (`className` no React) e `style` são repassados ao `<svg>` (ou ao elemento host no Angular, no Lit e no web component; o React Native aceita apenas `style`). Todas as animações respeitam `prefers-reduced-motion`.

## Sintaxe de nomes

Compartilhada pelo web component, pela CDN, pelo Tailwind, pela CLI e por `toSvg`:

| Spec | Significado |
| --- | --- |
| `file` | um ícone |
| `file+check` | com um badge de modificador |
| `file+check@tl` | badge em um canto: `tl`, `tr`, `bl`, `br` |
| `cloud&lock` | uma fusão de 2 a 10 ícones |
| `cloud&lock:side` | uma fusão com um layout |
| `heart/solid` | um estilo: `outline`, `duotone`, `solid` |

## Eixos variáveis

Todo ícone é renderizado em três eixos. **Peso** vai de 1 a 3; em 16 px ou menos o traço engrossa um pouco para que ícones pequenos não percam presença (`absoluteWeight` desativa isso). **Cantos** alternam entre junções e pontas arredondadas ou retas. **Estilo** oferece outline, duotone (a camada duotone desenhada à mão quando o ícone tem uma, ou um preenchimento translúcido das suas formas fechadas) e solid (formas fechadas preenchidas, linhas internas recortadas como espaço negativo, gerado em tempo de build).

```jsx
<SearchIcon weight={1} />
<SearchIcon weight={3} corners="sharp" />
<FolderIcon variant="duotone" secondaryColor="#ff7a1a" />
<FolderIcon variant="solid" />
```

## Morph

Qualquer ícone se transforma em qualquer outro: os paths são normalizados, reamostrados, pareados por uma atribuição ótima e interpolados. Pares ajustados à mão fazem os mais comuns parecerem desenhados: menu para fechar, play para pause, mais para check, sol para lua, olho para olho riscado, sino para sino tocando, coração para coração preenchido, copiar para check, cadeado fechado para aberto, wifi para wifi desligado.

```jsx
<MenuIcon morphTo={open ? 'x' : undefined} />            // morphs when morphTo changes
<HeartIcon morphTo="heart/solid" trigger="click" />      // toggles on click
<MorphIcon name={copied ? 'check' : 'copy'} />          // morphs on every name change
```

Sem JavaScript, `toSvg('menu', { morphTo: 'x', trigger: 'hover' })` retorna um SVG que se transforma com uma transição CSS de `d` e faz fallback para um cross fade onde o `d` em CSS não é suportado.

## Fusion

`fuse()` combina de 2 a 10 ícones em um único ícone que segue as mesmas regras (caixa de padding, um único peso, sem transformações), então ele passa no lint de ícones. Cada parte é redimensionada e encaixada no grid; onde as partes se sobrepõem, a parte de trás é recortada em volta da parte da frente com um vão de recorte, então as linhas nunca colidem.

| Layout | Uso |
| --- | --- |
| `overlap` | um atrás e outro na frente, na diagonal, como um arquivo sobre uma pasta |
| `side`, `stack` | lado a lado ou empilhados |
| `grid` | 2x2, 3x3 e um layout de 10 posições |
| `orbit` | um ícone central com até 9 ícones pequenos em volta |
| `badge` | ícones como badges nos cantos |
| `inside` | um ícone dentro de outra forma fechada, como um coração dentro de um escudo |

```jsx
<Fusion icons={['cloud', 'lock']} layout="overlap" gap={1} />
<Fusion icons={['shield', 'heart']} layout="inside" />
```

```sh
npx glyphfox fuse user shield --layout badge --format svg
```

## Estados vivos

Presets que entendem o ícone: `draw` percorre os traços na ordem em que foram desenhados, `pop`, `wiggle`, `spin`, `pulse`, `bounce` e `shake` (um balanço de sino a partir do topo). Dispare-os em `mount`, `hover` (no ícone ou no elemento pai), `click` (repete a cada clique) ou `state` (toca enquanto `active` for verdadeiro). Os estilos ficam dentro do próprio SVG, então também funcionam na saída de `toSvg`, em data URIs e em arquivos exportados. O estúdio exporta SVG animado, GIF e WebM.

```jsx
<BellIcon animate="shake" trigger="state" active={hasNews} />
<SparklesIcon animate="draw" trigger="hover" />
```

## Modificadores

Qualquer ícone aceita um badge em qualquer canto, com o ícone base recortado em volta dele: algumas centenas de ícones rendem milhares de combinações corretas.

```jsx
<FileIcon modifier="check" />
<CloudIcon modifier="sync" modifierCorner="top-right" />
```

```html
<glyph-fox name="user+plus@tl"></glyph-fox>
```

## CLI

```sh
npx glyphfox search arrow
npx glyphfox search poubelle --lang fr          # synonyms in en, pt, es, fr and de
npx glyphfox show file+check --variant solid     # details, terminal preview, SVG
npx glyphfox copy heart --format jsx --size 32   # svg, jsx, vue, svelte, angular, html, tailwind, cdn, datauri
npx glyphfox fuse cloud lock --layout overlap --format svg --out cloud-lock.svg
npx glyphfox morph menu x --trigger hover --out menu.svg
npx glyphfox build home search file+check --type sprite --out public/icons
npx glyphfox build --from icons.txt --type package --name @acme/icons --out acme-icons
npx glyphfox lint my-icon.svg
npx glyphfox foxify any-icon.svg --out fox.svg
npx glyphfox script sun.gfs --out sun.svg        # glyph script to an icon
npx glyphfox scan src --type esm --out src/icons.js
npx glyphfox favicon bell --animate shake --out public/favicon
npx glyphfox cursor cursor --hotspot tl --out public/cursors
npx glyphfox plot heart --format gcode --feed 1200 --pen-up "M5" --pen-down "M3 S30"
npx glyphfox stl heart --thickness 3 --bevel 0.6 --out heart.stl
```

`build` gera um sprite, um arquivo CSS com classes de máscara ou um pacote pequeno (`package.json`, exports ESM, tipos, sprite e arquivos SVG) a partir de uma lista de nomes. Todo comando aceita as props compartilhadas como flags (`--weight 1.5 --corners sharp --variant duotone`). Os comandos de exportação (`favicon`, `cursor`, `plot`, `stl`) aceitam uma spec de ícone, um glyph script `.gfs` ou um arquivo `.svg`.

## Glyph script

Desenhe ícones como texto. Um arquivo `.gfs` tem um comando por linha e compila para um SVG que passa no lint de ícones: as transformações são aplicadas direto nas coordenadas e cada erro aponta a sua linha e coluna.

```
# sun.gfs
circle 12 12 4
repeat 8 around 12 12 {
  line 12 2 12 4.5
}
```

Formas: `circle cx cy r`, `ellipse cx cy rx ry`, `rect x y w h radius r`, `line x1 y1 x2 y2`, `polyline` e `polygon` com pares x y, `arc`, `dot x y` e `path "M4 12h16"`. Blocos: `group` (`move`, `rotate`, `scale`), `mirror x` ou `mirror y`, `repeat n around cx cy` e `duotone` para a camada secundária. `let r = 4` dá nome a um valor e `#` inicia um comentário. A página Labs do estúdio tem um playground ao vivo com exemplos.

```js
import { compileScript } from 'glyphfox/script';

const { ok, svg, icon, errors } = compileScript(source); // errors: [{ message, line, column }]
```

## Scan e exportações

`glyphfox scan [dir]` lista os ícones que um projeto usa em JS, TS, JSX, Vue, Svelte, templates Angular e HTML (componentes, imports de dados, specs de `toSvg`, `<glyph-fox>`, `<gf-icon>`, `data-glyph`, classes do Tailwind e referências ao sprite), sugere um nome para ícones desconhecidos, aponta ícones que precisam de um rótulo acessível (um ícone sozinho em um botão ou link sem `aria-label`, texto ou `title`) e grava o subconjunto mínimo como sprite (`--type sprite`) ou como módulo ES para `registerIcons` e `provideGlyphFox` (`--type esm`). `--strict` falha quando encontra problemas de acessibilidade, para uso em CI.

Os exportadores rodam no Node e no navegador, pela CLI, por `glyphfox/export` e na página Labs do estúdio:

| Comando | Saída |
| --- | --- |
| `favicon` | um ícone de aba animado: um pequeno runtime que reproduz os frames por meio de um canvas, com `favicon.svg` e `favicon-32.png` como fallback estático |
| `cursor` | um cursor CSS: PNG em 32 e 64 px com um halo, um hotspot e o CSS com `image-set()` |
| `plot` | plotters de caneta: um SVG de linha única (só traços, ordenados para o menor deslocamento da caneta) ou G-code com velocidades de avanço e comandos para subir e descer a caneta |
| `stl` | impressão 3D: o ícone extrudado com uma espessura e um bisel chanfrado ou arredondado, como um STL estanque, binário ou ASCII |

```js
import { iconHeart } from 'glyphfox';
import { cursorKit, toGcode, toStl } from 'glyphfox/export';

const stl = toStl(iconHeart, { thickness: 3, bevel: 0.6 }); // Uint8Array
const { css, files } = cursorKit(iconHeart, { hotspot: 'center' });
const gcode = toGcode(iconHeart, { feed: 1200, penUp: 'M5', penDown: 'M3 S30' });
```

## Exportações nativas

`glyphfox export` gera assets vetoriais de verdade para apps mobile a partir da mesma geometria dos pacotes web, então peso, cantos, duotone, modificadores e fusões são preservados e os traços continuam sendo traços.

```sh
npx glyphfox export android home search file+check --out app/src/main/res   # res/drawable/gf_home.xml
npx glyphfox export compose --from icons.txt --package com.acme.icons --out app/src/main/java
npx glyphfox export ios home search --out MyApp/Assets.xcassets              # SVG image sets
npx glyphfox export swiftui home search --out MyApp                          # GlyphFox.swift and the catalog
npx glyphfox export flutter home search --out .                              # assets/glyphfox and lib/glyphfox.dart
```

| Alvo | Saída | Uso |
| --- | --- | --- |
| `android` | XML VectorDrawable por ícone, com tint de `?attr/colorControlNormal` | `@drawable/gf_home` |
| `compose` | propriedades `ImageVector` em um objeto `GlyphFox`, um arquivo Kotlin por ícone | `Icon(GlyphFox.Home, contentDescription = null)` |
| `ios` | um catálogo `.xcassets` de image sets SVG com Preserve Vector Data e renderização como template | `UIImage(named: "gf-home")` |
| `swiftui` | o mesmo catálogo mais um enum `GlyphFox` e `Image(glyphfox:)` | `Image(glyphfox: .home)` |
| `flutter` | assets SVG, constantes `GlyphFoxIcons` e um widget `GlyphFoxIcon` construído sobre o flutter_svg | `GlyphFoxIcon(GlyphFoxIcons.home)` |

Todo alvo aceita nomes, `--from list.txt` ou `--all`, além de `--size`, `--weight`, `--corners`, `--variant outline|duotone`, `--color`, `--secondary-color`, `--rotate`, `--flip-x` e `--mirror-rtl`. Sem `--color`, os ícones seguem o tint da plataforma; uma cor hexadecimal fica embutida, e no Android um atributo de tema ou um resource de cor (`?attr/colorPrimary`, `@color/brand`) vira o tint. `--prefix`, `--package`, `--rendering` e `--assets` ajustam nomes e pastas. O [guia de exportações nativas](https://kwy404.github.io/glyphfox/native.html) cobre cada plataforma.

## O estúdio

[kwy404.github.io/glyphfox](https://kwy404.github.io/glyphfox/) roda inteiramente no seu navegador:

- navegue com busca instantânea por nome, tag e categoria, em inglês, português, espanhol, francês ou alemão, ou **desenhe uma forma aproximada** para encontrar os ícones mais parecidos;
- personalize cada eixo e cada prop ao vivo, depois copie em qualquer formato ou baixe SVG, PNG, SVG animado, GIF e WebM;
- faça o **morph** entre qualquer par, **funda** de 2 a 10 ícones com qualquer layout, adicione **modificadores**;
- **edite** ícones no grid de 24 (ferramentas de caneta e de formas, edição de nós, desfazer e refazer, lint ao vivo) e mantenha uma coleção local;
- **compartilhe** a coleção como um link que carrega todos os ícones no próprio fragmento (sem servidor), ou **edite ao vivo** com amigos, ponto a ponto: seis palavras abrem uma sessão WebRTC, criptografada de ponta a ponta com uma chave gerada a partir das palavras, com presença (quem está editando o quê) e merge sem conflitos;
- use o **Fox-ify** para levar qualquer SVG ao estilo glyphfox, com uma visualização de antes e depois;
- exporte um **kit de marca** (pacote com tema, sprite, CSS, favicon e ícones de app);
- renderize qualquer ícone, fusão ou modificador em **3D**: os traços viram sólidos biselados em argila fosca, plástico brilhante, metal escovado, vidro ou neon, sob cinco configurações de iluminação, com controles de órbita e uma base giratória, exportados como PNG em 1x, 2x ou 4x (transparente, se preferir) ou incorporados em qualquer página com `<glyphfox-3d>`.
- no **Labs**, escreva ícones em glyph script com pré-visualização ao vivo e exporte um favicon animado, um cursor CSS, SVG e G-code para plotter ou um STL.
- leia o site inteiro em English, Português (Brasil), Español, Français ou Deutsch, escolhido pelo idioma do navegador na primeira visita ([como o site é traduzido](../docs/I18N.md)).

## Ícones sociais

A categoria `social` reúne ícones de marca das redes e serviços que as pessoas mais colocam em links. Cada um se chama `brand-NAME`, é desenhado do zero como um contorno do logo no mesmo grid de 24 e com o mesmo traço do resto do conjunto, tem como tags o nome da rede, os nomes antigos, `social`, `logo` e `brand`, e ganha uma animação pop ou draw.

```jsx
import { BrandInstagramIcon } from 'glyphfox/react';

export function Follow() {
  return (
    <a href="https://www.instagram.com/seunome" aria-label="Instagram">
      <BrandInstagramIcon size={20} />
    </a>
  );
}
```

Os mesmos nomes funcionam em todo lugar: `<glyph-fox name="brand-instagram">`, `toSvg('brand-instagram')`, a classe Tailwind `gf-brand-instagram` e `npx glyphfox copy brand-instagram`.

Redes, todas com o prefixo `brand-`: airbnb, amazon, apple, apple-music, apple-podcasts, bandcamp, behance, bereal, bilibili, bitbucket, blogger, bluesky, clubhouse, codepen, dailymotion, deezer, dev-to, deviantart, discord, dribbble, facebook, figma, flickr, github, gitlab, goodreads, google, google-meet, hacker-news, hashnode, imdb, instagram, kakaotalk, kick, ko-fi, kwai, lemon8, letterboxd, line, linkedin, mastodon, medium, meetup, messenger, microsoft, microsoft-teams, netflix, nextdoor, notion, patreon, pinterest, product-hunt, qq, quora, reddit, roblox, rumble, signal, skype, slack, snapchat, soundcloud, spotify, stack-overflow, steam, strava, substack, telegram, threads, tidal, tiktok, tinder, trello, tripadvisor, tumblr, twitch, twitter, viber, vimeo, vk, vsco, wechat, weibo, whatsapp, wordpress, x, xing, yelp, youtube, zoom.

Os ícones de marca são marcas registradas dos seus donos e devem ser usados de acordo com as diretrizes de cada marca.

## Regras dos ícones

Apenas desenhos originais, em um grid de 24 por 24: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, espessura de traço 2, pontas e junções arredondadas, padding de 2 px, sem transformações, sem preenchimentos exceto uma camada duotone opcional (`class="gf-secondary"`). Os arquivos-fonte ficam em `icons/NAME.svg` com `icons/NAME.json` (`categories` e `tags`); `node tools/icons/lint.mjs` faz a verificação.

## Desenvolvimento

```sh
npm install
npm run build          # icons/ to packages/glyphfox/dist and docs/data
npm run build:angular  # packages/glyphfox-angular/dist (ng-packagr)
npm run typecheck
npm run check:i18n     # every page translated in every language
npm test
npm run serve          # the studio on http://localhost:4173
```

## Autor

Feito por **Alexandre Kohler** ([GitHub](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)). Fenn, a raposa geométrica, é desenhada com o mesmo grid e o mesmo traço dos ícones.

## Licença

[MIT](../LICENSE)
