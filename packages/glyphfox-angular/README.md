# glyphfox-angular

Angular bindings for [glyphfox](https://kwy404.github.io/glyphfox/): variable, morphable and fusable original icons on a 24 grid.

```sh
npm install glyphfox-angular
```

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { iconHome, iconFile } from 'glyphfox';
import { provideGlyphFox } from 'glyphfox-angular';

bootstrapApplication(App, { providers: [provideGlyphFox({ icons: [iconHome, iconFile], defaults: { weight: 1.75 } })] });
```

```ts
import { GlyphFoxIcon } from 'glyphfox-angular';

@Component({
  selector: 'app-toolbar',
  imports: [GlyphFoxIcon],
  template: `
    <gf-icon name="home"></gf-icon>
    <gf-icon name="file+check@tr" variant="duotone" [size]="20"></gf-icon>
    <gf-icon [icons]="['cloud', 'lock']" layout="overlap"></gf-icon>
    <gf-icon name="menu" [morphTo]="open ? 'x' : null"></gf-icon>
  `,
})
export class Toolbar {}
```

`<gf-icon>` is a standalone component. Inputs: `name` (any spec: `file`, `file+check@tr`, `cloud&lock:side`, `heart/solid`), `icon` (icon data), `icons`, `layout` and `gap` (fusion), and the shared props `size`, `color`, `secondaryColor`, `secondaryOpacity`, `weight`, `absoluteWeight`, `corners`, `variant`, `rotate`, `flipX`, `flipY`, `mirrorRtl`, `animate`, `trigger`, `active`, `duration`, `delay`, `loop`, `modifier`, `modifierCorner`, `morphTo`, `title` and `decorative`. Use `class` and `style` on the host.

`provideGlyphFox({ icons, defaults })` registers icons by name (pass only the ones you use) and default props. Names that are not registered load on demand.

Full documentation: [kwy404.github.io/glyphfox/docs.html](https://kwy404.github.io/glyphfox/docs.html)

Made by Alexandre Kohler ([GitHub](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)). MIT license.
