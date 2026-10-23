// Six word codes for a live session, from the 256 icon words of wordlist.js
// (8 random bits per word). Input is forgiving: case, accents, spaces and
// punctuation are ignored, a unique start of a word is enough, and a single
// typo is corrected when only one word is that close.

import { WORDLIST } from './wordlist.js';
import { randomBytes } from './bytes.js';

export const WORD_COUNT = 6;
const INDEX = new Set(WORDLIST);

/** Six random words. */
export function generateWords(random = randomBytes) {
  return Array.from(random(WORD_COUNT), (b) => WORDLIST[b]);
}

/** Lower case letters only: " Rocket!" is "rocket", accents are dropped. */
export function normalizeWord(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function oneEditApart(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // one letter changed
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // two letters swapped
  }
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  return long.slice(i + 1) === short.slice(i); // one letter added or missing
}

/** The list word for what someone typed: exact, a unique start (3 letters or more) or one typo away. */
export function resolveWord(text) {
  const s = normalizeWord(text);
  if (!s) return null;
  if (INDEX.has(s)) return s;
  if (s.length >= 3) {
    const starts = WORDLIST.filter((w) => w.startsWith(s));
    if (starts.length === 1) return starts[0];
  }
  if (s.length >= 3) {
    const near = WORDLIST.filter((w) => oneEditApart(s, w));
    if (near.length === 1) return near[0];
  }
  return null;
}

/** Splits a pasted phrase ("rocket, whale-cactus...") into its parts. */
export function splitPhrase(text) {
  return String(text ?? '')
    .split(/[^A-Za-z\u00c0-\u024f]+/)
    .filter(Boolean);
}

/** Resolves six words: { ok, words, missing } where missing lists the positions that did not resolve. */
export function resolvePhrase(parts) {
  const list = Array.isArray(parts) ? parts : splitPhrase(parts);
  const words = [];
  const missing = [];
  for (let i = 0; i < WORD_COUNT; i++) {
    const w = resolveWord(list[i]);
    words.push(w);
    if (!w) missing.push(i);
  }
  return { ok: missing.length === 0 && list.length === WORD_COUNT, words, missing };
}

/** The canonical phrase: six words separated by single spaces. */
export const phraseOf = (words) => words.map(normalizeWord).join(' ');

/** A link that opens the studio with the words filled in: studio.html#live=word-word-... */
export function wordsLink(pageUrl, words) {
  return `${String(pageUrl).split('#')[0]}#live=${words.map(normalizeWord).join('-')}`;
}
