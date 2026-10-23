// Search over the compact universe index: names, aliases and categories
// (tags) of every set. Sets are decoded on first use; matching runs on one
// joined string per set with indexOf, so a query over 400,000 names takes a
// few milliseconds. Results are global ids (set offset + icon position).

import { decodeAliases, decodeFlags, decodeNames, decodeRanges, STYLE_CODES, FLAG_BRAND, FLAG_STROKE } from './format.js';

function upper(starts, pos) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function joinNames(names) {
  const starts = new Int32Array(names.length);
  let pos = 0;
  for (let i = 0; i < names.length; i++) {
    starts[i] = pos;
    pos += names[i].length + 1;
  }
  return { text: names.join('\n') + '\n', starts };
}

/** Normalized query terms: lower case words; "prefix:" narrows to a set. */
export function parseQuery(query, prefixes) {
  let q = String(query || '').trim().toLowerCase();
  let prefix = null;
  const colon = q.indexOf(':');
  if (colon > 0 && prefixes.has(q.slice(0, colon))) {
    prefix = q.slice(0, colon);
    q = q.slice(colon + 1);
  }
  const terms = q
    .split(/[\s_,]+/)
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
  return { prefix, terms, joined: terms.join('-') };
}

export class UniverseIndex {
  /** `raw` is dist/index.json; `catalog` (dist/catalog.json) enables license filters and set ranks. */
  constructor(raw, catalog = null) {
    this.raw = raw;
    this.prefixes = raw.sets.slice();
    this.prefixSet = new Set(this.prefixes);
    this.position = new Map(this.prefixes.map((p, i) => [p, i]));
    this.offsets = new Int32Array(this.prefixes.length + 1);
    this.prefixes.forEach((p, i) => {
      this.offsets[i + 1] = this.offsets[i] + raw.data[p].f.length;
    });
    this.total = this.offsets[this.prefixes.length];
    this.decoded = new Map();
    this.info = new Map(((catalog && catalog.list) || []).map((s) => [s.prefix, s]));
  }

  /** Decoded data of one set. */
  set(prefix) {
    let d = this.decoded.get(prefix);
    if (d) return d;
    const raw = this.raw.data[prefix];
    if (!raw) return null;
    const names = decodeNames(raw.n);
    const { text, starts } = joinNames(names);
    const aliasPairs = decodeAliases(raw.a);
    const alias = joinNames(aliasPairs.map((a) => a[0]));
    const cats = raw.c.map(([name, ranges]) => ({ name, lower: name.toLowerCase(), ids: decodeRanges(ranges) }));
    d = { prefix, count: names.length, text, starts, flags: raw.f, alias, aliasParent: Int32Array.from(aliasPairs.map((a) => a[1])), cats, catsOf: null };
    this.decoded.set(prefix, d);
    return d;
  }

  nameAt(d, i) {
    const end = i + 1 < d.starts.length ? d.starts[i + 1] - 1 : d.text.length - 1;
    return d.text.slice(d.starts[i], end);
  }

  /** Position of an icon name in its set, or -1. */
  find(prefix, name) {
    const d = this.set(prefix);
    if (!d) return -1;
    const at = d.text.startsWith(`${name}\n`) ? 0 : d.text.indexOf(`\n${name}\n`);
    if (at === -1) return -1;
    return at === 0 ? 0 : upper(d.starts, at + 1);
  }

  /** { prefix, name, index, style, brand, stroke } of a global id. */
  entry(id) {
    const s = upper(this.offsets, id);
    const prefix = this.prefixes[s];
    const d = this.set(prefix);
    const i = id - this.offsets[s];
    return { id, prefix, name: this.nameAt(d, i), index: i, ...decodeFlags(d.flags[i]) };
  }

  /** Categories (tags) of an icon. */
  categoriesOf(prefix, index) {
    const d = this.set(prefix);
    if (!d) return [];
    if (!d.catsOf) {
      d.catsOf = new Map();
      for (const c of d.cats) for (const i of c.ids) d.catsOf.set(i, [...(d.catsOf.get(i) || []), c.name]);
    }
    return d.catsOf.get(index) || [];
  }

  /** Aliases of an icon. */
  aliasesOf(prefix, index) {
    const d = this.set(prefix);
    const out = [];
    if (!d) return out;
    for (let k = 0; k < d.aliasParent.length; k++) if (d.aliasParent[k] === index) out.push(this.nameAt({ text: d.alias.text, starts: d.alias.starts }, k));
    return out;
  }

  /** The filter test of a set and of the icon flags. */
  filters({ sets, styles, brand, stroke, licenses } = {}) {
    const setOk = sets && sets.length ? new Set(sets) : null;
    const styleMask = styles && styles.length ? styles.reduce((m, s) => m | (1 << STYLE_CODES.indexOf(s)), 0) : 0;
    const licOk = licenses && licenses.length ? new Set(licenses) : null;
    const prefixOk = (p) => {
      if (setOk && !setOk.has(p)) return false;
      if (licOk) {
        const info = this.info.get(p);
        if (!info || !(licOk.has(info.license.spdx) || licOk.has(info.license.kind) || (licOk.has('attribution-free') && !info.license.attribution))) return false;
      }
      return true;
    };
    const iconOk = (digit) => {
      if (!styleMask && brand === undefined && !stroke) return true;
      const v = parseInt(digit, 16);
      if (styleMask && !(styleMask & (1 << (v & 3)))) return false;
      if (brand === true && !(v & FLAG_BRAND)) return false;
      if (brand === false && v & FLAG_BRAND) return false;
      if (stroke && !(v & FLAG_STROKE)) return false;
      return true;
    };
    return { prefixOk, iconOk };
  }

  /** Every icon id that passes the filters, in set order (browsing without a query). */
  browse(options = {}) {
    const { prefixOk, iconOk } = this.filters(options);
    const out = [];
    this.prefixes.forEach((p, s) => {
      if (!prefixOk(p)) return;
      const f = this.raw.data[p].f;
      const base = this.offsets[s];
      for (let i = 0; i < f.length; i++) if (iconOk(f[i])) out.push(base + i);
    });
    return Uint32Array.from(out);
  }

  /**
   * Ids of the icons matching a query, best first. Matches names, aliases
   * and categories; every word must match. Options: the filters of browse().
   */
  searchIds(query, options = {}) {
    const { prefix, terms, joined } = parseQuery(query, this.prefixSet);
    if (!terms.length) return this.browse(prefix ? { ...options, sets: [prefix] } : options);
    const { prefixOk, iconOk } = this.filters(options);
    const anchor = terms.reduce((a, t) => (t.length > a.length ? t : a), '');
    const others = terms.filter((t) => t !== anchor);
    const scores = new Map();
    const scoreName = (name, t) => {
      if (name === t) return 60;
      if (name.startsWith(t)) return 40 + (name[t.length] === '-' ? 8 : 0);
      const at = name.indexOf(t);
      if (at === -1) return 0;
      return name[at - 1] === '-' ? 26 + (name[at + t.length] === '-' || at + t.length === name.length ? 6 : 0) : 12;
    };
    this.prefixes.forEach((p, s) => {
      if (prefix && p !== prefix) return;
      if (!prefixOk(p)) return;
      const d = this.set(p);
      const base = this.offsets[s];
      const rank = s < 45 ? (45 - s) * 0.1 : 0;
      const put = (i, score) => {
        if (!iconOk(d.flags[i])) return;
        const id = base + i;
        const prev = scores.get(id);
        if (prev === undefined || score > prev) scores.set(id, score);
      };
      const check = (text) => others.every((t) => text.includes(t));
      // Names.
      let at = d.text.indexOf(anchor);
      let last = -1;
      while (at !== -1) {
        const i = upper(d.starts, at);
        if (i !== last) {
          last = i;
          const name = this.nameAt(d, i);
          if (check(name)) {
            let score = scoreName(name, anchor) + others.reduce((sum, t) => sum + scoreName(name, t) * 0.5, 0);
            if (name === joined) score += 40;
            score += Math.max(0, 24 - name.length) * 0.4 + rank;
            put(i, score);
          }
        }
        at = i + 1 < d.starts.length ? d.text.indexOf(anchor, d.starts[i + 1]) : -1;
      }
      // Aliases.
      if (d.aliasParent.length) {
        let k = d.alias.text.indexOf(anchor);
        while (k !== -1) {
          const j = upper(d.alias.starts, k);
          const alias = this.nameAt({ text: d.alias.text, starts: d.alias.starts }, j);
          const i = d.aliasParent[j];
          if (check(`${alias} ${this.nameAt(d, i)}`)) put(i, scoreName(alias, anchor) * 0.8 + rank);
          const next = j + 1 < d.alias.starts.length ? d.alias.starts[j + 1] : d.alias.text.length;
          k = d.alias.text.indexOf(anchor, next);
        }
      }
      // Categories as tags.
      for (const c of d.cats) {
        if (!c.lower.includes(anchor)) continue;
        for (const i of c.ids) {
          if (check(`${c.lower} ${this.nameAt(d, i)}`)) put(i, 8 + rank);
        }
      }
    });
    const ids = Uint32Array.from(scores.keys());
    ids.sort((a, b) => scores.get(b) - scores.get(a) || a - b);
    return ids;
  }

  /** Search results as objects (at most `limit`, default 60). */
  search(query, options = {}) {
    const ids = this.searchIds(query, options);
    const limit = options.limit ?? 60;
    const out = [];
    for (let k = 0; k < ids.length && out.length < limit; k++) {
      const e = this.entry(ids[k]);
      out.push({ name: `${e.prefix}:${e.name}`, prefix: e.prefix, icon: e.name, style: e.style, brand: e.brand, stroke: e.stroke });
    }
    return out;
  }
}
