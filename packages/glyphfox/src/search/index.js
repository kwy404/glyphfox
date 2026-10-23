// Icon search shared by the core API, the CLI and the studio: names, tags and
// categories, plus a synonyms dictionary in English, Portuguese, Spanish,
// French and German (lixeira, basura, poubelle and Mülleimer all find trash),
// accent folding and simple plurals. Every word of a query has to match.

import { fold, singulars, transliterate, words } from './fold.js';
import { LANGUAGES, SYNONYMS } from './synonyms.js';

export { fold, singulars, words } from './fold.js';
export { LANGUAGES, SYNONYMS } from './synonyms.js';

// Articles, prepositions and "icon" in the five languages: skipped when the
// query has other words ("ícone de lixeira", "mot de passe").
const STOPWORDS = new Set(
  (
    'the of a an and for with icon icons symbol ' +
    'de da do das dos e o os as um uma para com em no na nos nas ao icone icones ' +
    'el la los las un una y del con en por icono iconos ' +
    'le les l d une des du et au aux pour avec sur icone icones ' +
    'der die das den dem des ein eine einen und mit fur von zum zur im'
  ).split(' '),
);

// word -> [{ target, lang }], built once from SYNONYMS.
const INDEX = new Map();
const add = (word, target, lang) => {
  if (!word) return;
  let list = INDEX.get(word);
  if (!list) INDEX.set(word, (list = []));
  if (!list.some((e) => e.target === target)) list.push({ target, lang });
};
for (const [target, text] of Object.entries(SYNONYMS)) {
  text.split('|').forEach((group, i) => {
    for (const raw of group.trim().split(/\s+/)) {
      if (!raw) continue;
      const word = fold(raw);
      add(word, target, LANGUAGES[i]);
      add(transliterate(raw), target, LANGUAGES[i]);
      // Phrases also match without their small words: "carte d'identité".
      if (word.includes('-')) add(word.split('-').filter((p) => !STOPWORDS.has(p)).join('-'), target, LANGUAGES[i]);
    }
  });
}
const ENTRIES = [...INDEX.keys()].sort();

/** The dictionary entries of a folded word: [{ target, lang }]. */
export function synonymsOf(word) {
  return INDEX.get(fold(word)) || [];
}

/** Joins words that form a dictionary phrase ("mot de passe" to mot-de-passe). */
function phrases(list) {
  const out = [];
  for (let i = 0; i < list.length; ) {
    let taken = 1;
    for (let n = Math.min(4, list.length - i); n > 1; n--) {
      const parts = list.slice(i, i + n);
      const full = parts.join('-');
      const short = parts.filter((p) => !STOPWORDS.has(p)).join('-');
      const hit = INDEX.has(full) ? full : INDEX.has(short) && short.includes('-') ? short : null;
      if (hit) {
        out.push(hit);
        taken = n;
        break;
      }
    }
    if (taken === 1) out.push(list[i]);
    i += taken;
  }
  return out;
}

/** The words a query is matched with, after phrases and small words. */
export function queryWords(query) {
  const list = phrases(words(query));
  const kept = list.filter((w) => !STOPWORDS.has(w));
  return kept.length ? kept : list;
}

const cache = new WeakMap();
function facts(icon) {
  let f = cache.get(icon);
  if (!f) {
    f = { segments: icon.name.split('-'), tags: (icon.tags || []).map(fold), categories: icon.categories || [] };
    cache.set(icon, f);
  }
  return f;
}

/** Score of a word typed as is: name, then parts of the name, tags, categories. */
function direct(icon, w) {
  const { segments, tags, categories } = facts(icon);
  const name = icon.name;
  if (name === w) return 100;
  if (name.startsWith(w)) return 60;
  if (segments.includes(w)) return 50;
  if (segments.some((s) => s.startsWith(w))) return 45;
  if (tags.includes(w)) return 30;
  if (tags.some((t) => t.startsWith(w))) return 20;
  if (name.includes(w)) return 12;
  if (categories.some((c) => c.startsWith(w))) return 10;
  if (tags.some((t) => t.includes(w))) return 5;
  return 0;
}

/** Score of a whole word (a singular form or a dictionary target): exact matches only. */
function exact(icon, w, [n, s, t]) {
  const f = facts(icon);
  if (icon.name === w) return n;
  if (f.segments.includes(w)) return s;
  if (f.tags.includes(w)) return t;
  return 0;
}

const SINGULAR = [95, 50, 28];
const SYNONYM = [29, 24, 15];
const PREFIX = [14, 12, 8];

function plan(word, list, { synonyms, lang }) {
  const p = { word, forms: [], targets: [], prefix: [] };
  const anyDirect = list.some((ic) => direct(ic, word) > 0);
  const anyExact = list.some((ic) => exact(ic, word, SINGULAR) > 0);
  let entries = synonyms ? INDEX.get(word) || [] : [];
  if (!anyExact && !entries.length) {
    p.forms = singulars(word);
    if (synonyms) entries = p.forms.flatMap((s) => INDEX.get(s) || []);
  }
  // A word with a meaning in the reader's language ranks that meaning first
  // ("seta" is an arrow in Portuguese and a mushroom in Spanish).
  const mine = lang ? entries.filter((e) => e.lang === lang) : [];
  const strong = mine.length ? mine : entries;
  p.targets = [...new Set(strong.map((e) => e.target))];
  const weak = new Set(entries.filter((e) => !strong.includes(e)).map((e) => e.target));
  const formHit = p.forms.some((s) => list.some((ic) => exact(ic, s, SINGULAR) > 0));
  if (synonyms && !anyDirect && !entries.length && !formHit && word.length >= 3) {
    for (const entry of ENTRIES) if (entry.startsWith(word)) for (const e of INDEX.get(entry)) weak.add(e.target);
  }
  p.prefix = [...weak];
  return p;
}

function score(icon, p) {
  let best = direct(icon, p.word);
  if (best >= 100) return best;
  for (const s of p.forms) best = Math.max(best, exact(icon, s, SINGULAR));
  for (const t of p.targets) best = Math.max(best, exact(icon, t, SYNONYM));
  for (const t of p.prefix) best = Math.max(best, exact(icon, t, PREFIX));
  return best;
}

/**
 * Ranks a list of icons ({ name, tags, categories }) for a query.
 * Options: limit (50), category, synonyms (true; false matches names and tags
 * only) and lang (en, pt, es, fr or de: the meaning in that language first).
 * Words that match no icon at all are ignored as long as another word matches.
 */
export function searchIcons(list, query, { limit = 50, category, synonyms = true, lang } = {}) {
  const pool = category ? list.filter((ic) => (ic.categories || []).includes(category)) : list;
  const short = typeof lang === 'string' ? lang.slice(0, 2).toLowerCase() : undefined;
  let plans = queryWords(query).map((w) => plan(w, pool, { synonyms, lang: short }));
  const live = plans.filter((p) => pool.some((ic) => score(ic, p) > 0));
  if (live.length) plans = live;
  const out = [];
  for (const icon of pool) {
    let total = 0;
    let ok = true;
    for (const p of plans) {
      const s = score(icon, p);
      if (!s) {
        ok = false;
        break;
      }
      total += s;
    }
    if (ok) out.push([icon, total]);
  }
  out.sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name));
  return out.slice(0, limit).map(([icon]) => icon);
}
