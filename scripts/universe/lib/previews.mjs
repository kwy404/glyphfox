// Preview strips of the sets gallery: 12 icons per set, the same concepts in
// every set (found by synonyms in names, aliases, categories and tags) so
// cards and the compare view show how each set draws a home, a search, a
// heart... Sets without a concept (flags, logos) fill the strip with their
// own sample icons. Small drawings are preferred to keep the file light.

import { bakeTransforms, iconData } from '../../../packages/universe/src/iconify.js';
import { encodeFlags } from '../../../packages/universe/src/format.js';

export const CONCEPTS = ['home', 'search', 'heart', 'user', 'settings', 'bell', 'trash', 'star', 'arrow-right', 'check', 'mail', 'calendar'];

const SYNONYMS = {
  home: ['home', 'house', 'house-door', 'home-alt', 'homepage'],
  search: ['search', 'magnify', 'magnifying-glass', 'magnifier', 'find', 'loupe', 'zoom'],
  heart: ['heart', 'favorite', 'love', 'like'],
  user: ['user', 'person', 'account', 'profile', 'avatar', 'people', 'human', 'bust-in-silhouette'],
  settings: ['settings', 'gear', 'cog', 'cogwheel', 'preferences', 'config', 'options', 'wrench'],
  bell: ['bell', 'notification', 'notifications', 'alarm', 'alert'],
  trash: ['trash', 'delete', 'bin', 'garbage', 'trash-can', 'wastebasket', 'remove'],
  star: ['star', 'rating', 'favorite-star', 'starred'],
  'arrow-right': ['arrow-right', 'right-arrow', 'arrow-forward', 'arrow-narrow-right', 'right', 'next', 'chevron-right'],
  check: ['check', 'checkmark', 'check-mark', 'tick', 'done', 'ok'],
  mail: ['mail', 'email', 'envelope', 'inbox', 'letter', 'message'],
  calendar: ['calendar', 'calendar-month', 'calendar-days', 'date', 'event', 'schedule'],
};

const MAX_BODY = 1400;
// Previews are drawn at about 28 px: two decimals are plenty.
const light = (body) => body.replace(/(\d+\.\d{2})\d+/g, '$1');
const words = (n) => n.split('-');

/** How well a name matches a synonym (higher is better, 0 is no match). */
function matchScore(name, syn) {
  if (name === syn) return 100;
  if (name.startsWith(`${syn}-`)) return 70 - Math.min(30, name.length - syn.length);
  if (name.endsWith(`-${syn}`)) return 50 - Math.min(30, name.length - syn.length);
  if (`-${name}-`.includes(`-${syn}-`)) return 30 - Math.min(25, name.length - syn.length);
  return 0;
}

/**
 * The preview strip of one set: [[name, body, flags, concept, box?]...].
 * `classes` maps names to { style, brand, stroke }; `tags` (optional) maps
 * names to upstream tags; `aliases` maps alias names to parents.
 */
export function previewStrip({ data, names, classes, tags, aliases, dominant }) {
  const box = [data.left || 0, data.top || 0, data.width || 16, data.height || 16];
  const used = new Set();
  const out = [];
  const bodyOf = (name) => {
    const raw = iconData(data, name);
    if (!raw) return null;
    const b = bakeTransforms(raw);
    const body = light(b.body);
    if (body.length > MAX_BODY) return null;
    const own = [b.left, b.top, b.width, b.height];
    return { body, box: own.every((v, i) => v === box[i]) ? null : own };
  };
  const push = (name, concept) => {
    const b = bodyOf(name);
    if (!b) return false;
    const c = classes.get(name);
    const entry = [name, b.body, encodeFlags(c), concept];
    if (b.box) entry.push(b.box);
    out.push(entry);
    used.add(name);
    return true;
  };
  const sizes = (name) => (/(^|-)(8|10|12|14|16|20|28|32|48)(-|$)/.test(name) ? 8 : 0);
  CONCEPTS.forEach((concept, k) => {
    const candidates = [];
    for (const syn of SYNONYMS[concept]) {
      for (const name of names) {
        if (used.has(name)) continue;
        let s = matchScore(name, syn);
        const t = tags && tags.get(name);
        if (!s && t && t.includes(syn.replace(/-/g, ' '))) s = 18;
        if (!s) continue;
        s -= SYNONYMS[concept].indexOf(syn) * 15 + sizes(name);
        const c = classes.get(name);
        if (c && c.style === dominant) s += 6;
        if (words(name).some((w) => /^(off|slash|x|minus|plus|add|remove|filled|fill|solid|bold|duotone|twotone|broken)$/.test(w))) s -= 6;
        candidates.push([s, name]);
      }
      for (const [alias, parent] of aliases) {
        if (used.has(parent)) continue;
        const s = matchScore(alias, syn);
        if (s >= 70) candidates.push([s - 10 - SYNONYMS[concept].indexOf(syn) * 15, parent]);
      }
    }
    candidates.sort((a, b) => b[0] - a[0] || a[1].length - b[1].length || (a[1] < b[1] ? -1 : 1));
    for (const [, name] of candidates.slice(0, 12)) if (push(name, k)) break;
  });
  // Fill with the set samples, then with icons spread over the set.
  const fill = [...(data.info && data.info.samples ? data.info.samples : [])];
  const step = Math.max(1, Math.floor(names.length / 40));
  for (let i = 0; i < names.length; i += step) fill.push(names[i]);
  for (const name of fill) {
    if (out.length >= 12) break;
    if (!used.has(name) && names.includes(name)) push(name, -1);
  }
  return { box, icons: out };
}
