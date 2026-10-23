// Text folding for search: lower case, no accents, a few letters spelled out
// (ß to ss, æ to ae, œ to oe), so "Mülleimer", "MULLEIMER" and "mulleimer"
// are the same word. Simple plural handling for the five search languages.

const SPECIAL = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ł': 'l', 'ı': 'i', 'þ': 'th', 'ð': 'd' };

/** Lower case text without accents. */
export function fold(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[ßæœøđłıþð]/g, (c) => SPECIAL[c])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** The German spelling without umlauts (ä to ae), or null when there are none. */
export function transliterate(text) {
  const s = String(text ?? '').toLowerCase();
  if (!/[äöüß]/.test(s)) return null;
  return fold(s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue'));
}

/** Folded words of a query: letters, digits and hyphens; everything else separates. */
export function words(text) {
  return fold(text)
    .split(/[^a-z0-9-]+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
}

// Plural endings of English, Portuguese, Spanish, French and German, longest
// first, with the singular ending they come from. Applied to folded words, so
// "botões" is "botoes" and "Häuser" is "hauser".
const PLURALS = [
  ['eaux', 'eau'], // fr bateaux
  ['ies', 'y'], // en categories
  ['ves', 'f'], // en leaves
  ['ves', 'fe'], // en knives
  ['oes', 'ao'], // pt botões
  ['aes', 'ao'], // pt pães
  ['ais', 'al'], // pt sinais
  ['eis', 'el'], // pt papéis
  ['ois', 'ol'], // pt faróis
  ['aux', 'al'], // fr journaux
  ['eux', 'eu'], // fr jeux
  ['ces', 'z'], // es luces
  ['zes', 'z'], // pt luzes
  ['nen', ''], // de Freundinnen
  ['ns', 'm'], // pt nuvens
  ['en', ''], // de Dateien
  ['er', ''], // de Bilder
  ['es', ''], // en boxes, es flores
  ['s', ''], // most languages
  ['n', ''], // de Wolken
  ['e', ''], // de Hunde
  ['x', ''], // fr feux
];

/** Possible singular forms of a folded word (the word itself excluded). */
export function singulars(word) {
  const out = [];
  for (const [end, base] of PLURALS) {
    if (!word.endsWith(end)) continue;
    const stem = word.slice(0, word.length - end.length);
    if (stem.length < 3) continue;
    const s = stem + base;
    if (s !== word && !out.includes(s)) out.push(s);
  }
  return out;
}
