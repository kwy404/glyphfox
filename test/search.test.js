// Multilingual search: synonyms in five languages, accent folding and plurals,
// shared by the core API, the CLI and the studio (the vendored engine).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { iconNames, search, searchIcons } from '../packages/glyphfox/dist/index.js';
import { main } from '../packages/glyphfox/dist/cli/index.js';
import { SYNONYMS, fold, queryWords, singulars } from '../packages/glyphfox/src/search/index.js';
import * as studio from '../docs/vendor/glyphfox.js';

const first = (q, options) => search(q, options)[0]?.name;
const names = (q, options) => search(q, options).map((i) => i.name);

describe('multilingual search', () => {
  it('finds trash in English, Portuguese, Spanish, French and German', () => {
    for (const q of ['trash', 'lixeira', 'basura', 'poubelle', 'Mülleimer', 'mulleimer', 'muelleimer', 'papelera', 'corbeille', 'Papierkorb', 'lixo', 'rubbish']) {
      expect(first(q), q).toBe('trash');
    }
  });

  it('folds case and accents', () => {
    expect(fold('Mülleimer ÉTOILE Straße Œil')).toBe('mulleimer etoile strasse oeil');
    expect(first('câmera')).toBe('camera');
    expect(first('CÂMERA')).toBe('camera');
    expect(first('Configurações')).toBe('settings');
    expect(first('ÉTOILE')).toBe('star');
    expect(first('Schlüssel')).toBe('key');
    expect(first('schluessel')).toBe('key');
    expect(first('fermer')).toBe('x');
  });

  it('handles simple plurals', () => {
    for (const [q, name] of [
      ['lixeiras', 'trash'],
      ['basuras', 'trash'],
      ['poubelles', 'trash'],
      ['nuvens', 'cloud'],
      ['Dateien', 'file'],
      ['imagens', 'image'],
      ['Häuser', 'home'],
      ['Bücher', 'book'],
      ['corações', 'heart'],
      ['clocks', 'clock'],
      ['leaves', 'leaf'],
    ]) {
      expect(first(q), q).toBe(name);
    }
    expect(names('flèches').slice(0, 8).every((n) => n.includes('arrow'))).toBe(true);
    expect(singulars('categories')).toContain('category');
    expect(singulars('botoes')).toContain('botao');
    expect(singulars('bus')).toEqual([]);
  });

  it('joins phrases and skips small words', () => {
    expect(queryWords('mot de passe')).toEqual(['mot-de-passe']);
    expect(queryWords("carte d'identité")).toEqual(['carte-identite']);
    expect(first('mot de passe')).toBe('password');
    expect(first('carrinho de compras')).toBe('shopping-cart');
    expect(first('ícone de lixeira')).toBe('trash');
    expect(first("carte d'identité")).toBe('id-card');
    expect(first('arc en ciel')).toBe('rainbow');
    expect(first('guarda chuva')).toBe('umbrella');
  });

  it('keeps direct matches first and prefers the reader language', () => {
    expect(first('lock')).toBe('lock');
    expect(first('tag')).toBe('tag');
    const chat = names('chat');
    expect(chat[0]).toMatch(/^message/);
    expect(chat).toContain('cat');
    expect(first('seta', { lang: 'pt-BR' })).toMatch(/^arrow/);
    expect(first('seta', { lang: 'es' })).toBe('mushroom');
  });

  it('completes a word while it is typed and ignores words that match nothing', () => {
    expect(first('lixe')).toBe('trash');
    expect(first('poub')).toBe('trash');
    expect(first('pou')).toBe('pound');
    expect(names('arrow zzzz').length).toBeGreaterThan(5);
    expect(search('zzzz-nothing')).toEqual([]);
  });

  it('can turn synonyms off and still filters by category', () => {
    expect(search('lixeira', { synonyms: false })).toEqual([]);
    expect(search('lixeira', { category: 'interface' }).map((i) => i.name)).toEqual(['trash']);
    expect(search('lixeira', { category: 'animals' })).toEqual([]);
    expect(search('', { limit: 3 })).toHaveLength(3);
  });

  it('points every dictionary entry at icons that exist', () => {
    const data = JSON.parse(readFileSync(resolve('docs/data/icons.json'), 'utf8'));
    const tags = new Set(data.icons.flatMap((i) => i[2]));
    const segments = new Set(iconNames.flatMap((n) => n.split('-')));
    for (const [target, text] of Object.entries(SYNONYMS)) {
      expect(iconNames.includes(target) || segments.has(target) || tags.has(target), target).toBe(true);
      expect(text.split('|'), target).toHaveLength(5);
    }
  });

  it('ranks any list with searchIcons, like the studio does', () => {
    const own = [
      { name: 'my-bin', tags: ['trash'], categories: ['interface'] },
      { name: 'my-star', tags: [], categories: ['shapes'] },
    ];
    expect(searchIcons(own, 'basura').map((i) => i.name)).toEqual(['my-bin']);
    const data = JSON.parse(readFileSync(join('docs', 'data', 'icons.json'), 'utf8'));
    const icons = data.icons.map(([name, body, tags, categories]) => ({ name, body, tags, categories }));
    expect(studio.searchIcons(icons, 'Mülleimer', { lang: 'en' })[0].name).toBe('trash');
  });

  it('is what the CLI searches with', async () => {
    const out = [];
    const code = await main(['search', 'poubelle'], { log: (s) => out.push(s), err: () => {}, tty: false });
    expect(code).toBe(0);
    expect(out[0]).toMatch(/^trash\b/);
    const pt = [];
    await main(['search', 'seta', '--lang', 'pt', '--json'], { log: (s) => pt.push(s), err: () => {}, tty: false });
    expect(JSON.parse(pt.join('\n'))[0].name).toMatch(/^arrow/);
  });
});
