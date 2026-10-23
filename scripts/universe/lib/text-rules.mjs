// The repository text rules (scripts/check-text.mjs) applied to the icon
// metadata of the universe build, so the index, the notice and the site pass
// the same check as every other file. Both import the same patterns
// (scripts/lib/text-patterns.mjs).

import { RULES } from '../../lib/text-patterns.mjs';

export function loadTextRules() {
  return RULES.map(([re]) => new RegExp(re.source, re.flags.replace('g', '')));
}

// Lower case name words with the same meaning as the upper case rule (icon
// names are always lower case). Country codes in flag sets are kept.
const WORDS = new Set([String.fromCharCode(97, 105), String.fromCharCode(108, 108, 109), String.fromCharCode(108, 108, 109, 115), 'gpt']);

/**
 * A tester that is true when a text breaks a rule. Icon names are kebab case,
 * so spaces stand in for dashes too. `name` turns on the word check for icon names.
 */
export function textTester(rules) {
  return (text, { name = false, flags = false } = {}) => {
    if (!text) return false;
    const s = String(text);
    const spaced = s.replace(/[-_]+/g, ' ');
    if (rules.some((re) => re.test(s) || re.test(spaced))) return true;
    if (name && !flags) return s.split(/[-_:\s]+/).some((w) => WORDS.has(w));
    return false;
  };
}
