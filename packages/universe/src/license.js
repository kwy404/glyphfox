// License metadata helpers: the license record attached to every icon, the
// attribution line of CC BY sets and the trademark notice of brand icons.

import { LICENSE_KINDS, licenseDecision, normalizeSpdx } from './policy.js';

export const TRADEMARK_NOTICE =
  'Brand and logo icons show trademarks of their owners. The icon licenses cover the drawings, not the trademarks: use a logo only to refer to its brand, follow the brand guidelines of its owner, and do not suggest an endorsement.';

const CC_DEEDS = {
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** The license record of a catalog set, as attached to every icon. */
export function licenseOf(set) {
  if (!set) return null;
  const l = set.license || {};
  return {
    spdx: l.spdx,
    title: l.title,
    url: l.url || CC_DEEDS[l.spdx] || '',
    kind: l.kind,
    attribution: Boolean(l.attribution),
    file: l.file || '',
    set: set.prefix,
    setName: set.name,
    author: set.author ? set.author.name : '',
    authorUrl: set.author ? set.author.url : '',
  };
}

/** Attribution text for a set (TASL: title, author, source, license). */
export function attributionLine(set, { modified = false } = {}) {
  const l = set.license || {};
  const deed = CC_DEEDS[l.spdx] || l.url || '';
  const author = set.author && set.author.name ? ` by ${set.author.name}` : '';
  const source = set.author && set.author.url ? ` (${set.author.url})` : '';
  const change = modified ? ', modified' : '';
  return `Icons from "${set.name}"${author}${source}, licensed under ${l.title || l.spdx}${deed ? ` (${deed})` : ''}${change}.`;
}

/**
 * Checks the license of every set of a catalog against the policy. Returns
 * a list of problems (empty when every set may ship).
 */
export function checkCatalog(catalog, { files } = {}) {
  const problems = [];
  if (!catalog || !Array.isArray(catalog.list)) return ['the catalog has no set list'];
  for (const set of catalog.list) {
    const l = set.license || {};
    if (!l.spdx) {
      problems.push(`${set.prefix}: missing license`);
      continue;
    }
    const spdx = normalizeSpdx(l.spdx);
    const decision = licenseDecision(set.prefix, { name: set.name, author: set.author, license: { spdx, title: l.title } });
    if (!decision.allowed) problems.push(`${set.prefix}: ${decision.reason}`);
    else if (LICENSE_KINDS[spdx] !== l.kind) problems.push(`${set.prefix}: license kind ${l.kind} does not match ${spdx}`);
    if (Boolean(l.attribution) !== /^CC-BY-/.test(spdx)) problems.push(`${set.prefix}: attribution flag does not match ${spdx}`);
    if (files) {
      if (!l.file) problems.push(`${set.prefix}: no license text in LICENSES/`);
      else if (!files.has(l.file)) problems.push(`${set.prefix}: ${l.file} is missing`);
    }
    if (!set.author || !set.author.name) problems.push(`${set.prefix}: no author`);
  }
  return problems;
}
