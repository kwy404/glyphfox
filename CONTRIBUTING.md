# Contributing to glyphfox

Thanks for helping. Icon requests and bug reports go through the issue forms; pull requests are welcome for fixes, icons, translations and docs.

## Icons

Every icon is an original drawing for this set. Never copy or trace another icon set.

- Grid: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, round caps and joins, 2 px of padding, no transforms.
- Duotone: one optional secondary layer with `class="gf-secondary"`.
- Files: `icons/NAME.svg` (kebab-case name) and `icons/NAME.json` with `categories`, `tags` and an animation block in the frame format of the other icons.
- Brand icons live only in the `social` category and are named `brand-NAME`. Brands are trademarks of their owners; only add a brand whose guidelines allow its logo in icon sets.
- Collections: `icons/display` (48 grid) and `icons/isometric` follow their own folder rules.

Check your icons before you open a pull request:

```sh
node tools/icons/lint.mjs
node tools/icons/sheet.mjs --help
```

The lint checks the attributes, the padding box, the stroke rules and the animation poses. The sheet renders a review page in light and dark at several sizes.

## Development

```sh
npm install
npm run build        # icons to packages/glyphfox/dist and the site data in docs/
npm run check:text   # no emoji and no en or em dashes in any text
npm run check:i18n   # every page translated in every language
npm test
npm run serve        # the studio on http://localhost:4173
```

After `npm run build`, commit the regenerated files in `docs/` too: CI fails when `git diff -- docs` is not clean.

## Translations

The site is published in English, Portuguese (Brazil), Spanish, French and German. [docs/I18N.md](docs/I18N.md) explains the string files, how pages are localized and how to add a language.

## Pull requests

- One topic per pull request, with tests for code changes.
- Run the commands above and keep the checks green.
- Describe what changed and why; screenshots help for icons and the site.
