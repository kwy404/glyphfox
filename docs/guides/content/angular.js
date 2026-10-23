export default {
  slug: 'angular',
  group: 'frameworks',
  order: 50,
  icon: 'shield',
  short: 'Angular',
  related: ['ssr', 'tree-shaking', 'accessibility'],
  title: 'Angular icons with the glyphfox standalone component',
  description: 'Add glyphfox icons to Angular with the standalone gf-icon component: provideGlyphFox, inputs, fusion, modifiers, lazy route icons, SSR and zoneless apps.',
  h1: 'Icons in Angular',
  lead: 'glyphfox-angular adds a standalone <code>gf-icon</code> component and a provider that registers icons by name. It supports Angular 17 and newer, server rendering, OnPush and zoneless change detection.',
  sections: [
    {
      id: 'install',
      h: 'Install',
      blocks: [
        ['code', 'sh', 'terminal', `npm install glyphfox glyphfox-angular`],
        ['p', 'install.p', '<code>glyphfox-angular</code> is published in the Angular package format, built with ng-packagr, and uses <code>glyphfox</code> for the icon data and the rendering engine. Its peer dependency is <code>@angular/core</code> 17 or newer, because the inputs rely on input transforms such as <code>booleanAttribute</code>.'],
      ],
    },
    {
      id: 'provide',
      h: 'Register icons with provideGlyphFox',
      blocks: [
        ['p', 'provide.p', '<code>gf-icon</code> looks icons up by name, so register the ones your templates use. Every icon is a named data export of <code>glyphfox</code>: <code>home</code> is <code>iconHome</code>, <code>arrow-right</code> is <code>iconArrowRight</code>.'],
        ['code', 'js', 'src/app/app.config.ts', `import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { iconCheck, iconFile, iconHome, iconMenu, iconSave, iconSearch, iconX } from 'glyphfox';
import { provideGlyphFox } from 'glyphfox-angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideGlyphFox({
      icons: [iconHome, iconSearch, iconFile, iconMenu, iconX, iconSave, iconCheck],
      defaults: { weight: 1.75 },
    }),
  ],
};`],
        ['p', 'provide.defaults', '<code>defaults</code> applies to every <code>gf-icon</code> under that injector, and an input on the element wins over the default. Several <code>provideGlyphFox</code> calls in the same injector add up: their icons are all registered and their defaults are merged in order. <code>provideGlyphFoxIcons(icons)</code> is the short form when you only register icons.'],
        ['p', 'provide.all', 'To make every icon available by name, pass the full record: <code>import { icons } from \'glyphfox\'</code> and <code>provideGlyphFox({ icons })</code>. That puts the data of all 419 icons in the bundle that loads the provider, about 105 KB minified and 25 KB gzip, so keep it for prototypes and internal tools. Two named data exports cost well under 1 KB.'],
      ],
    },
    {
      id: 'component',
      h: 'Use gf-icon',
      blocks: [
        ['code', 'js', 'src/app/toolbar.component.ts', `import { Component, signal } from '@angular/core';
import { GlyphFoxIcon } from 'glyphfox-angular';

@Component({
  selector: 'app-toolbar',
  standalone: true, // the default from Angular 19
  imports: [GlyphFoxIcon],
  template: \`
    <a href="/" aria-label="Home"><gf-icon name="home" /></a>
    <gf-icon name="search" size="20" />
    <gf-icon name="file+check@tr" variant="duotone" secondaryColor="#ff7a1a" />
    <button type="button" aria-label="Menu" [attr.aria-expanded]="open()" (click)="open.set(!open())">
      <gf-icon name="menu" morphTo="x" trigger="state" [active]="open()" />
    </button>
  \`,
})
export class Toolbar {
  readonly open = signal(false);
}`],
        ['p', 'component.inputs', 'Inputs use the camelCase prop names: <code>secondaryColor</code>, <code>modifierCorner</code>, <code>flipX</code>. Static strings work for every input, numeric ones included (<code>size="20"</code> becomes the number 20), and boolean inputs accept a bare attribute, so <code>&lt;gf-icon name="arrow-right" mirrorRtl /&gt;</code> mirrors the arrow in right to left layouts.'],
        ['p', 'component.host', '<code>class</code> and <code>style</code> go on the <code>gf-icon</code> host, an inline flex box around the svg. Strokes use <code>currentColor</code>, so the CSS <code>color</code> of the host or of any parent colors the icon, and the <code>color</code> input sets it directly.'],
      ],
    },
    {
      id: 'syntax',
      h: 'Modifiers, styles and fusion',
      blocks: [
        ['p', 'syntax.p', '<code>name</code> takes the full name syntax. <code>file+check</code> adds a badge, <code>@tl</code>, <code>@tr</code>, <code>@bl</code> or <code>@br</code> picks its corner, and <code>heart/solid</code> picks a style. Badges are drawn by the engine, so only the base icon has to be registered. For a fusion, pass the parts to <code>[icons]</code> and choose a <code>layout</code>.'],
        ['code', 'js', 'src/app/status.component.html', `<gf-icon name="cloud+sync@tr" />
<gf-icon name="heart/solid" color="#e5484d" />
<gf-icon [icons]="['cloud', 'lock']" layout="overlap" [gap]="1" />
<gf-icon [icons]="['user', 'shield']" layout="badge" />
<gf-icon [icons]="['file', 'image', 'music', 'video']" layout="grid" />`],
        ['p', 'syntax.fusion', 'A fusion is resolved by name like any other icon, so every part must be registered. The result follows <code>weight</code>, <code>variant</code> and the other inputs, and where parts overlap the part behind is cut around the part in front. Layouts are overlap, side, stack, grid, orbit, badge and inside.'],
      ],
    },
    {
      id: 'data',
      h: 'Icon data instead of names',
      blocks: [
        ['p', 'data.p', 'The <code>icon</code> input takes icon data directly and skips the registry, which suits icons picked in code from a fixed map.'],
        ['code', 'js', 'src/app/file-row.component.ts', `import { Component, computed, input } from '@angular/core';
import { iconFile, iconFileCode, iconFileImage, iconFileText } from 'glyphfox';
import { GlyphFoxIcon } from 'glyphfox-angular';

const byType = { code: iconFileCode, image: iconFileImage, text: iconFileText };
type FileType = keyof typeof byType;

@Component({
  selector: 'app-file-row',
  standalone: true,
  imports: [GlyphFoxIcon],
  template: \`<gf-icon [icon]="icon()" size="18" /> {{ name() }}\`,
})
export class FileRow {
  readonly name = input.required<string>();
  readonly type = input<FileType | null>(null);
  readonly icon = computed(() => {
    const type = this.type();
    return type ? byType[type] : iconFile;
  });
}`],
      ],
    },
    {
      id: 'lazy',
      h: 'Icons for lazy routes',
      blocks: [
        ['p', 'lazy.p', '<code>provideGlyphFox</code> returns environment providers, so it also works in the <code>providers</code> of a route. Declared in a lazily loaded routes file, feature icons travel with the lazy chunk instead of the main bundle.'],
        ['code', 'js', 'src/app/icons.ts', `import { iconHome, iconMenu, iconSearch, iconX } from 'glyphfox';
import type { GlyphFoxConfig } from 'glyphfox-angular';

export const sharedIcons = {
  icons: [iconHome, iconSearch, iconMenu, iconX],
  defaults: { weight: 1.75 },
} satisfies GlyphFoxConfig;`],
        ['code', 'js', 'src/app/app.routes.ts', `import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'billing', loadChildren: () => import('./billing/billing.routes').then((m) => m.BILLING_ROUTES) },
];`],
        ['code', 'js', 'src/app/billing/billing.routes.ts', `import { Routes } from '@angular/router';
import { iconCreditCard, iconReceipt, iconWallet } from 'glyphfox';
import { provideGlyphFox } from 'glyphfox-angular';
import { sharedIcons } from '../icons';
import { BillingPage } from './billing.page';

export const BILLING_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideGlyphFox({ ...sharedIcons, icons: [...sharedIcons.icons, iconCreditCard, iconReceipt, iconWallet] }),
    ],
    component: BillingPage,
  },
];`],
        ['p', 'lazy.scope', 'A route that calls <code>provideGlyphFox</code> gets its own configuration. Angular does not merge multi providers across injectors, so components under that route read only the route call, including its defaults. Spreading a shared object, as above, keeps the root icons and defaults in place.'],
      ],
    },
    {
      id: 'ssr',
      h: 'Server rendering and hydration',
      blocks: [
        ['p', 'ssr.p', '<code>gf-icon</code> writes its svg through <code>Renderer2</code>, so with Angular SSR or prerendering the icon is already in the HTML, and the browser redraws the same markup when the component initializes. The server has no <code>requestAnimationFrame</code>: a morph goes straight to its end value there, and a morph with the default trigger (mount) only plays once the app boots in the browser.'],
        ['p', 'ssr.register', 'Register every icon the server renders. A name that is not registered is fetched with a dynamic import, and that request can still be pending when the server serializes the page, which leaves an empty icon in the HTML until hydration fills it in.'],
        ['p', 'ssr.chunks', 'The same loader explains a detail of production builds: the output lists one small chunk per icon, because the builder bundles every possible target of that dynamic import. Those chunks are only downloaded for names you did not register.'],
      ],
    },
    {
      id: 'change-detection',
      h: 'OnPush, signals and zoneless apps',
      blocks: [
        ['p', 'cd.p', '<code>gf-icon</code> uses OnPush and draws its svg itself whenever an input changes, on hover and click triggers, and on every frame of a morph. It does not depend on zone.js, so it works in zoneless apps, and signals bind like any other value: <code>[active]="saved()"</code>.'],
        ['code', 'js', 'src/app/save-button.component.ts', `import { Component, signal } from '@angular/core';
import { GlyphFoxIcon } from 'glyphfox-angular';

@Component({
  selector: 'app-save-button',
  standalone: true,
  imports: [GlyphFoxIcon],
  template: \`
    <button type="button" (click)="save()">
      <gf-icon name="save" morphTo="check" trigger="state" [active]="saved()" [duration]="300" />
      {{ saved() ? 'Saved' : 'Save' }}
    </button>
  \`,
})
export class SaveButton {
  readonly saved = signal(false);

  save() {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}`],
        ['p', 'cd.living', 'Living state presets work the same way: <code>&lt;gf-icon name="bell" animate="shake" trigger="state" [active]="hasNews()" /&gt;</code> swings the bell while the signal is true, and <code>animate="spin"</code> on <code>loader-circle</code> makes a spinner. The animations are CSS inside the svg and stop under reduced motion; the <a href="animated-icons.html">animated icons guide</a> lists every preset and trigger.'],
      ],
    },
    {
      id: 'props',
      h: 'Inputs',
      blocks: [
        ['p', 'props.p', 'Every shared prop is an input with the same name and meaning as in the other glyphfox packages.'],
        ['props', 'angular'],
        ['p', 'props.extra', 'Besides the shared props, <code>gf-icon</code> takes <code>name</code> (any spec), <code>icon</code> (icon data), <code>icons</code> (2 to 10 parts of a fusion), <code>layout</code> and <code>gap</code>.'],
      ],
    },
    {
      id: 'pitfalls',
      h: 'Pitfalls',
      blocks: [
        ['pitfalls', 'pitfalls.list', [
          ['provideGlyphFox in a component', 'It returns environment providers, which belong in the application config, an NgModule or a route. Angular rejects them in the <code>providers</code> of a component.'],
          ['A lazy route loses the root defaults', 'Route providers replace the configuration for everything under the route, because multi providers are not merged across injectors. Spread a shared config object into every call.'],
          ['aria-label on the host', 'An <code>aria-label</code> on <code>gf-icon</code> makes the inner svg non decorative (<code>role="img"</code>), but the label stays on the host element, which has no role, so screen readers may announce nothing. Use the <code>title</code> input for a meaningful icon, or label the parent button and keep the icon decorative.'],
          ['A fusion that never appears', 'If one part of <code>[icons]</code> is not registered, the whole fusion waits for it and renders empty in the meantime, on the server included. Register every part.'],
          ['Registering the whole set by accident', '<code>provideGlyphFox({ icons })</code> with the full record from <code>glyphfox</code> keeps every icon in the bundle. Import the named data exports you need instead.'],
        ]],
      ],
    },
  ],
  faq: [
    { id: 'ngmodule', q: 'Can I use glyphfox-angular in an NgModule based app?', a: 'Yes. <code>GlyphFoxIcon</code> is a standalone component, so add it to the <code>imports</code> of the NgModule that declares your components, and put <code>provideGlyphFox(...)</code> in the <code>providers</code> of your root module.' },
    { id: 'versions', q: 'Which Angular versions are supported?', a: 'Angular 17 and newer, the peer dependency range of the package. On 17 and 18, keep <code>standalone: true</code> on the components that import <code>GlyphFoxIcon</code>; from 19 it is the default. Self closing tags such as <code>&lt;gf-icon name="home" /&gt;</code> work in every supported version.' },
  ],
};
