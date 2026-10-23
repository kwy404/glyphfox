// Morph engine: normalizes both icons into strands (flattened subpaths),
// matches strands with an optimal assignment, resamples matched strands to
// the same point count, aligns start points and direction, and interpolates.
// Hand tuned hints refine the most common pairs.

import { flattenNode, polylineLength, resample } from './geometry.js';
import { iconNodes, nodesToString, splitLayers } from './nodes.js';

/** The curated pairs shown in the studio. A "/solid" suffix morphs the style too. */
export const MORPH_PAIRS = [
  ['menu', 'x'],
  ['play', 'pause'],
  ['plus', 'check'],
  ['sun', 'moon'],
  ['eye', 'eye-off'],
  ['bell', 'bell-ring'],
  ['heart', 'heart/solid'],
  ['copy', 'check'],
  ['lock', 'unlock'],
  ['wifi', 'wifi-off'],
];

/**
 * Hints keyed by "from>to". map lists [fromStrand, toStrand] pairs, null
 * means the strand collapses (or grows) and fades. mode "rotate" turns
 * strands around their centers while they morph.
 */
export const MORPH_HINTS = {
  'menu>x': { map: [[0, 0], [1, null], [2, 1]], mode: 'rotate' },
  'menu>close': { map: [[0, 0], [1, null], [2, 1]], mode: 'rotate' },
  'play>pause': { map: [[0, 0], [0, 1]], mode: 'linear' },
  'plus>check': { map: [[1, 0], [0, null]], mode: 'rotate' },
  'eye>eye-off': { map: [[0, 0], [0, 1], [1, null], [null, 2]], mode: 'linear' },
  'copy>check': { map: [[0, 0], [1, null]], mode: 'linear' },
  'sun>moon': { mode: 'linear' },
};

function centroid(points) {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p[0];
    sy += p[1];
  }
  return points.length ? [sx / points.length, sy / points.length] : [12, 12];
}

function strandsOf(icon) {
  const { primary } = splitLayers(iconNodes(icon));
  const out = [];
  for (const node of primary) {
    for (const poly of flattenNode(node, 0.2)) {
      const len = polylineLength(poly.points);
      out.push({ points: poly.points, closed: poly.closed, len, c: centroid(poly.points) });
    }
  }
  return out;
}

function sampleStrand(s, n) {
  if (s.closed) {
    const pts = resample(s.points, n + 1);
    pts.pop();
    return pts;
  }
  return resample(s.points, n);
}

function hungarian(cost) {
  const n = cost.length;
  const INF = 1e18;
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const ans = new Array(n);
  for (let j = 1; j <= n; j++) ans[p[j] - 1] = j - 1;
  return ans;
}

function ssd(A, B) {
  let s = 0;
  for (let k = 0; k < A.length; k++) {
    const dx = A[k][0] - B[k][0];
    const dy = A[k][1] - B[k][1];
    s += dx * dx + dy * dy;
  }
  return s;
}

function rotations(P, closed) {
  const out = [P, [...P].reverse()];
  if (!closed) return out;
  const n = P.length;
  const all = [];
  for (const base of out) for (let k = 0; k < n; k++) all.push(base.slice(k).concat(base.slice(0, k)));
  return all;
}

function align(A, B, aClosed, bClosed) {
  if (bClosed || !aClosed) {
    let best = B;
    let bestCost = Infinity;
    for (const cand of rotations(B, bClosed)) {
      const c = ssd(A, cand);
      if (c < bestCost) {
        bestCost = c;
        best = cand;
      }
    }
    return [A, best];
  }
  let best = A;
  let bestCost = Infinity;
  for (const cand of rotations(A, true)) {
    const c = ssd(cand, B);
    if (c < bestCost) {
      bestCost = c;
      best = cand;
    }
  }
  return [best, B];
}

function makePair(a, b, mode) {
  const n = Math.max(16, Math.min(160, Math.round(Math.max(a ? a.len : 0, b ? b.len : 0) / 0.35)));
  if (a && b) {
    const [A, B] = align(sampleStrand(a, n), sampleStrand(b, n), a.closed, b.closed);
    return { A, B, closed: a.closed && b.closed, fade: 0, mode };
  }
  if (a) {
    const A = sampleStrand(a, n);
    return { A, B: A.map(() => [...a.c]), closed: false, fade: -1, mode: 'linear' };
  }
  const B = sampleStrand(b, n);
  return { A: B.map(() => [...b.c]), B, closed: false, fade: 1, mode: 'linear' };
}

function procrustes(A, B, ca, cb) {
  let cross = 0;
  let dot = 0;
  for (let k = 0; k < A.length; k++) {
    const ax = A[k][0] - ca[0];
    const ay = A[k][1] - ca[1];
    const bx = B[k][0] - cb[0];
    const by = B[k][1] - cb[1];
    cross += ax * by - ay * bx;
    dot += ax * bx + ay * by;
  }
  return Math.atan2(cross, dot);
}

const prepCache = new WeakMap();

/** Prepares the strand pairs for a morph between two icon data objects. */
export function prepareMorph(from, to, hints) {
  let inner = prepCache.get(from);
  if (!inner) {
    inner = new WeakMap();
    prepCache.set(from, inner);
  }
  const cached = !hints && inner.get(to);
  if (cached) return cached;
  const sa = strandsOf(from);
  const sb = strandsOf(to);
  const base = (n) => String(n || '').split(/[+&:/@]/)[0];
  let hint = hints || MORPH_HINTS[`${base(from.name)}>${base(to.name)}`];
  let reverse = false;
  if (!hint && MORPH_HINTS[`${base(to.name)}>${base(from.name)}`]) {
    hint = MORPH_HINTS[`${base(to.name)}>${base(from.name)}`];
    reverse = true;
  }
  const mode = (hint && hint.mode) || 'linear';
  let pairs = null;
  if (hint && hint.map) {
    const map = reverse ? hint.map.map(([x, y]) => [y, x]) : hint.map;
    const usedA = new Set();
    const usedB = new Set();
    const ok = map.every(([x, y]) => (x === null || x < sa.length) && (y === null || y < sb.length));
    if (ok) {
      pairs = [];
      for (const [x, y] of map) {
        if (x !== null) usedA.add(x);
        if (y !== null) usedB.add(y);
        pairs.push(makePair(x === null ? null : sa[x], y === null ? null : sb[y], mode));
      }
      sa.forEach((s, k) => !usedA.has(k) && pairs.push(makePair(s, null, mode)));
      sb.forEach((s, k) => !usedB.has(k) && pairs.push(makePair(null, s, mode)));
    }
  }
  if (!pairs) {
    const m = sa.length;
    const n = sb.length;
    const size = m + n;
    const cost = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        if (i < m && j < n) {
          const a = sa[i];
          const b = sb[j];
          row.push(Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]) + 0.25 * Math.abs(a.len - b.len) + (a.closed !== b.closed ? 2 : 0));
        } else if (i < m) row.push(5 + 0.2 * sa[i].len);
        else if (j < n) row.push(5 + 0.2 * sb[j].len);
        else row.push(0);
      }
      cost.push(row);
    }
    const assign = size ? hungarian(cost) : [];
    pairs = [];
    for (let i = 0; i < m; i++) pairs.push(makePair(sa[i], assign[i] < n ? sb[assign[i]] : null, mode));
    for (let j = 0; j < n; j++) if (!assign.slice(0, m).includes(j)) pairs.push(makePair(null, sb[j], mode));
  }
  for (const p of pairs) {
    p.ca = centroid(p.A);
    p.cb = centroid(p.B);
    p.theta = p.mode === 'rotate' && p.fade === 0 ? procrustes(p.A, p.B, p.ca, p.cb) : 0;
  }
  const out = { from, to, pairs };
  if (!hints) inner.set(to, out);
  return out;
}

const r2 = (v) => Math.round(v * 100) / 100;

/** Points of a strand pair at progress t (0 to 1). */
export function pairPoints(p, t) {
  const out = [];
  if (p.theta) {
    const cx = p.ca[0] + (p.cb[0] - p.ca[0]) * t;
    const cy = p.ca[1] + (p.cb[1] - p.ca[1]) * t;
    const ang = p.theta * t;
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const cosB = Math.cos(-p.theta);
    const sinB = Math.sin(-p.theta);
    for (let k = 0; k < p.A.length; k++) {
      const ax = p.A[k][0] - p.ca[0];
      const ay = p.A[k][1] - p.ca[1];
      const bx0 = p.B[k][0] - p.cb[0];
      const by0 = p.B[k][1] - p.cb[1];
      const bx = bx0 * cosB - by0 * sinB;
      const by = bx0 * sinB + by0 * cosB;
      const mx = ax + (bx - ax) * t;
      const my = ay + (by - ay) * t;
      out.push([cx + mx * cosA - my * sinA, cy + mx * sinA + my * cosA]);
    }
    return out;
  }
  for (let k = 0; k < p.A.length; k++) out.push([p.A[k][0] + (p.B[k][0] - p.A[k][0]) * t, p.A[k][1] + (p.B[k][1] - p.A[k][1]) * t]);
  return out;
}

/** Path data for a list of points. */
export function pointsToPath(points, closed) {
  if (!points.length) return '';
  let d = `M${r2(points[0][0])} ${r2(points[0][1])}`;
  for (let k = 1; k < points.length; k++) d += `L${r2(points[k][0])} ${r2(points[k][1])}`;
  return closed ? d + 'Z' : d;
}

/** Opacity of a pair at progress t (strands without a partner fade). */
export function pairOpacity(p, t) {
  if (p.fade < 0) return Math.max(0, 1 - t * 1.6);
  if (p.fade > 0) return Math.max(0, Math.min(1, (t - 0.35) / 0.65));
  return 1;
}

/**
 * Creates a morph between two icon data objects. frame(t) returns an icon
 * data object for progress t: the exact source at 0, the exact target at 1.
 */
export function createMorph(from, to, options = {}) {
  const prep = prepareMorph(from, to, options.hints);
  const { fromVariant, toVariant } = options;
  return {
    from,
    to,
    pairs: prep.pairs,
    frame(t) {
      if (t <= 0) return from;
      if (t >= 1) return to;
      const nodes = prep.pairs.map((p) => {
        const op = pairOpacity(p, t);
        const attrs = { d: pointsToPath(pairPoints(p, t), p.closed && p.fade === 0) };
        if (op < 1) attrs.opacity = r2(op);
        return ['path', attrs];
      });
      return { name: `${from.name}>${to.name}`, body: nodesToString(nodes), tags: [], categories: [], morph: { from, to, t, fromVariant, toVariant } };
    },
  };
}
