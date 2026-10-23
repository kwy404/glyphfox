// Compact encodings of the search index (dist/index.json). Each set stores
// its icon names in one newline separated string, one hex digit of flags per
// icon, its aliases and its categories as base 36 index ranges.

export const STYLE_CODES = ['outline', 'solid', 'duotone', 'color'];
export const FLAG_BRAND = 4;
export const FLAG_STROKE = 8;

/** One hex digit: style in bits 0 and 1, brand in bit 2, stroke in bit 3. */
export function encodeFlags({ style, brand, stroke }) {
  const s = Math.max(0, STYLE_CODES.indexOf(style));
  return (s | (brand ? FLAG_BRAND : 0) | (stroke ? FLAG_STROKE : 0)).toString(16);
}

export function decodeFlags(digit) {
  const v = typeof digit === 'number' ? digit : parseInt(digit, 16) || 0;
  return { style: STYLE_CODES[v & 3], brand: Boolean(v & FLAG_BRAND), stroke: Boolean(v & FLAG_STROKE) };
}

/** Sorted integers to "0-5,9,c-k" (base 36). */
export function encodeRanges(list) {
  const nums = [...new Set(list)].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    out.push(j > i ? `${nums[i].toString(36)}-${nums[j].toString(36)}` : nums[i].toString(36));
    i = j;
  }
  return out.join(',');
}

export function decodeRanges(text) {
  const out = [];
  if (!text) return out;
  for (const part of text.split(',')) {
    const dash = part.indexOf('-');
    if (dash === -1) out.push(parseInt(part, 36));
    else {
      const a = parseInt(part.slice(0, dash), 36);
      const b = parseInt(part.slice(dash + 1), 36);
      for (let k = a; k <= b; k++) out.push(k);
    }
  }
  return out;
}

/** Aliases as "alias<TAB>parent index" lines. */
export function encodeAliases(pairs) {
  return pairs.map(([alias, index]) => `${alias}\t${index.toString(36)}`).join('\n');
}

export function decodeAliases(text) {
  if (!text) return [];
  return text.split('\n').map((line) => {
    const tab = line.indexOf('\t');
    return [line.slice(0, tab), parseInt(line.slice(tab + 1), 36)];
  });
}

/**
 * Sorted names with front coding: each line starts with one base 36 digit,
 * the length of the prefix shared with the previous name (at most 35).
 */
export function encodeNames(names) {
  let prev = '';
  const out = [];
  for (const n of names) {
    const max = Math.min(prev.length, n.length, 35);
    let k = 0;
    while (k < max && prev.charCodeAt(k) === n.charCodeAt(k)) k++;
    out.push(k.toString(36) + n.slice(k));
    prev = n;
  }
  return out.join('\n');
}

export function decodeNames(text) {
  if (!text) return [];
  const lines = text.split('\n');
  let prev = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const k = parseInt(line[0], 36);
    prev = prev.slice(0, k) + line.slice(1);
    lines[i] = prev;
  }
  return lines;
}
