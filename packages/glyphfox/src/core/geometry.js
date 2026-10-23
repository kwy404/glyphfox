// Geometry for glyphfox: path parsing and serialization, shape conversion,
// affine transforms, exact bounds, flattening, distances, splitting and
// trimming. Segments are absolute arrays:
//   ['M', x, y]  ['L', x, y]  ['C', x1, y1, x2, y2, x, y]
//   ['Q', x1, y1, x, y]  ['A', rx, ry, rot, large, sweep, x, y]  ['Z']

const NUM = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

function isCmd(ch) {
  return ch !== undefined && 'MmLlHhVvCcSsQqTtAaZz'.indexOf(ch) >= 0;
}

/** Parses SVG path data into absolute segments (H, V, S and T are expanded). */
export function parsePath(d) {
  const segs = [];
  const n = d.length;
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let prev = null;
  const skip = () => {
    while (i < n) {
      const c = d.charCodeAt(i);
      if (c === 32 || c === 44 || c === 9 || c === 10 || c === 13 || c === 12) i++;
      else break;
    }
  };
  const num = () => {
    skip();
    NUM.lastIndex = i;
    const m = NUM.exec(d);
    if (!m) throw new Error(`expected a number at position ${i} in path data`);
    i = NUM.lastIndex;
    return parseFloat(m[0]);
  };
  const flag = () => {
    skip();
    const c = d[i];
    if (c !== '0' && c !== '1') throw new Error(`expected an arc flag at position ${i} in path data`);
    i++;
    return c === '1' ? 1 : 0;
  };
  const hasNumber = () => {
    skip();
    return i < n && !isCmd(d[i]);
  };
  for (;;) {
    skip();
    if (i >= n) break;
    if (isCmd(d[i])) {
      cmd = d[i++];
    } else if (!cmd) {
      throw new Error('path data must start with a command');
    }
    const up = cmd.toUpperCase();
    const rel = cmd !== up;
    if (up === 'Z') {
      segs.push(['Z']);
      cx = sx;
      cy = sy;
      prev = null;
      continue;
    }
    if (segs.length === 0 && up !== 'M') throw new Error('path data must start with a move command');
    let first = true;
    do {
      if (up === 'M') {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        if (first) {
          segs.push(['M', x, y]);
          sx = x;
          sy = y;
        } else {
          segs.push(['L', x, y]);
        }
        cx = x;
        cy = y;
        prev = null;
      } else if (up === 'L') {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        segs.push(['L', x, y]);
        cx = x;
        cy = y;
        prev = null;
      } else if (up === 'H') {
        let x = num();
        if (rel) x += cx;
        segs.push(['L', x, cy]);
        cx = x;
        prev = null;
      } else if (up === 'V') {
        let y = num();
        if (rel) y += cy;
        segs.push(['L', cx, y]);
        cy = y;
        prev = null;
      } else if (up === 'C' || up === 'S') {
        let x1;
        let y1;
        if (up === 'C') {
          x1 = num();
          y1 = num();
          if (rel) {
            x1 += cx;
            y1 += cy;
          }
        } else if (prev && prev[0] === 'C') {
          x1 = 2 * cx - prev[1];
          y1 = 2 * cy - prev[2];
        } else {
          x1 = cx;
          y1 = cy;
        }
        let x2 = num();
        let y2 = num();
        let x = num();
        let y = num();
        if (rel) {
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        segs.push(['C', x1, y1, x2, y2, x, y]);
        prev = ['C', x2, y2];
        cx = x;
        cy = y;
      } else if (up === 'Q' || up === 'T') {
        let x1;
        let y1;
        if (up === 'Q') {
          x1 = num();
          y1 = num();
          if (rel) {
            x1 += cx;
            y1 += cy;
          }
        } else if (prev && prev[0] === 'Q') {
          x1 = 2 * cx - prev[1];
          y1 = 2 * cy - prev[2];
        } else {
          x1 = cx;
          y1 = cy;
        }
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        segs.push(['Q', x1, y1, x, y]);
        prev = ['Q', x1, y1];
        cx = x;
        cy = y;
      } else if (up === 'A') {
        const rx = Math.abs(num());
        const ry = Math.abs(num());
        const rot = num();
        const large = flag();
        const sweep = flag();
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        segs.push(['A', rx, ry, rot, large, sweep, x, y]);
        cx = x;
        cy = y;
        prev = null;
      } else {
        throw new Error(`unknown path command "${cmd}"`);
      }
      first = false;
    } while (ARITY[up] > 0 && hasNumber());
  }
  return segs;
}

/** Formats a number with at most `prec` decimals, without trailing zeros or a leading zero. */
export function fmt(v, prec = 2) {
  const p = 10 ** prec;
  let r = Math.round(v * p) / p;
  if (Object.is(r, -0) || Math.abs(r) < 0.5 / p) r = 0;
  let s = String(r);
  if (s.indexOf('e') >= 0) s = r.toFixed(prec).replace(/\.?0+$/, '');
  if (s.startsWith('0.')) s = s.slice(1);
  else if (s.startsWith('-0.')) s = '-' + s.slice(2);
  return s;
}

function joinNums(parts) {
  let out = '';
  for (const s of parts) {
    if (out === '' || s[0] === '-') out += s;
    else out += ' ' + s;
  }
  return out;
}

/**
 * Serializes absolute segments into compact path data, choosing relative or
 * absolute form per segment and using H and V for axis aligned lines.
 */
export function serializePath(segs, prec = 2) {
  let out = '';
  let last = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const p = 10 ** prec;
  const rd = (v) => Math.round(v * p) / p;
  const emit = (cmd, nums) => {
    const body = joinNums(nums.map((v) => fmt(v, prec)));
    const implicit = cmd === last && cmd !== 'M' && cmd !== 'm';
    if (implicit) out += (body[0] === '-' ? '' : ' ') + body;
    else out += cmd + body;
    last = cmd === 'M' ? 'L' : cmd === 'm' ? 'l' : cmd;
  };
  const choose = (abs, rel) => {
    const a = joinNums(abs[1].map((v) => fmt(v, prec)));
    const r = joinNums(rel[1].map((v) => fmt(v, prec)));
    return r.length < a.length ? rel : abs;
  };
  for (const s of segs) {
    const t = s[0];
    if (t === 'Z') {
      out += 'z';
      last = 'z';
      cx = sx;
      cy = sy;
      continue;
    }
    if (t === 'M') {
      const x = rd(s[1]);
      const y = rd(s[2]);
      const [c, nums] = out === '' ? ['M', [x, y]] : choose(['M', [x, y]], ['m', [x - cx, y - cy]]);
      if (last === 'L' || last === 'l') last = '';
      emit(c, nums);
      cx = sx = x;
      cy = sy = y;
    } else if (t === 'L') {
      const x = rd(s[1]);
      const y = rd(s[2]);
      if (Math.abs(y - cy) < 1e-9 && Math.abs(x - cx) > 1e-9) {
        const [c, nums] = choose(['H', [x]], ['h', [x - cx]]);
        emit(c, nums);
      } else if (Math.abs(x - cx) < 1e-9 && Math.abs(y - cy) > 1e-9) {
        const [c, nums] = choose(['V', [y]], ['v', [y - cy]]);
        emit(c, nums);
      } else {
        const [c, nums] = choose(['L', [x, y]], ['l', [x - cx, y - cy]]);
        emit(c, nums);
      }
      cx = x;
      cy = y;
    } else if (t === 'C') {
      const v = s.slice(1).map(rd);
      const [c, nums] = choose(['C', v], ['c', [v[0] - cx, v[1] - cy, v[2] - cx, v[3] - cy, v[4] - cx, v[5] - cy]]);
      emit(c, nums);
      cx = v[4];
      cy = v[5];
    } else if (t === 'Q') {
      const v = s.slice(1).map(rd);
      const [c, nums] = choose(['Q', v], ['q', [v[0] - cx, v[1] - cy, v[2] - cx, v[3] - cy]]);
      emit(c, nums);
      cx = v[2];
      cy = v[3];
    } else if (t === 'A') {
      const x = rd(s[6]);
      const y = rd(s[7]);
      const head = [rd(s[1]), rd(s[2]), rd(s[3])];
      const fl = `${s[4] ? 1 : 0} ${s[5] ? 1 : 0}`;
      const a = joinNums(head.map((q) => fmt(q, prec))) + ' ' + fl + ' ' + joinNums([fmt(x, prec), fmt(y, prec)]);
      const r = joinNums(head.map((q) => fmt(q, prec))) + ' ' + fl + ' ' + joinNums([fmt(x - cx, prec), fmt(y - cy, prec)]);
      const useRel = r.length < a.length;
      const cmd = useRel ? 'a' : 'A';
      const body = (useRel ? r : a).replace(/ (?=-)/g, '');
      const implicit = cmd === last;
      out += implicit ? (body[0] === '-' ? '' : ' ') + body : cmd + body;
      last = cmd;
      cx = x;
      cy = y;
    }
  }
  return out;
}

/** Re-emits path data token by token with normalized numbers (lossless). */
export function minifyPath(d, prec = 2) {
  const tokens = [];
  const n = d.length;
  let i = 0;
  let cmd = '';
  let argIndex = 0;
  while (i < n) {
    const ch = d[i];
    if (isCmd(ch)) {
      cmd = ch;
      argIndex = 0;
      tokens.push(ch);
      i++;
      continue;
    }
    const c = d.charCodeAt(i);
    if (c === 32 || c === 44 || c === 9 || c === 10 || c === 13 || c === 12) {
      i++;
      continue;
    }
    const up = cmd.toUpperCase();
    const k = ARITY[up] ? argIndex % ARITY[up] : 0;
    if (up === 'A' && (k === 3 || k === 4)) {
      tokens.push(d[i] === '1' ? '1' : '0');
      i++;
    } else {
      NUM.lastIndex = i;
      const m = NUM.exec(d);
      if (!m) throw new Error(`expected a number at position ${i} in path data`);
      i = NUM.lastIndex;
      tokens.push(fmt(parseFloat(m[0]), prec));
    }
    argIndex++;
  }
  let out = '';
  let prevNum = false;
  for (const t of tokens) {
    if (isCmd(t)) {
      out += t;
      prevNum = false;
    } else {
      if (prevNum && t[0] !== '-') out += ' ';
      out += t;
      prevNum = true;
    }
  }
  return out;
}

const num = (v, def = 0) => {
  if (v === undefined || v === null || v === '') return def;
  const f = parseFloat(v);
  return Number.isFinite(f) ? f : def;
};

function pointsList(str) {
  const vals = String(str || '')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  const pts = [];
  for (let k = 0; k + 1 < vals.length; k += 2) pts.push([vals[k], vals[k + 1]]);
  return pts;
}

/** Converts a shape node [tag, attrs] into absolute segments. */
export function shapeToSegments(node) {
  const [tag, a] = node;
  switch (tag) {
    case 'path':
      return parsePath(a.d || '');
    case 'line':
      return [
        ['M', num(a.x1), num(a.y1)],
        ['L', num(a.x2), num(a.y2)],
      ];
    case 'polyline':
    case 'polygon': {
      const pts = pointsList(a.points);
      if (!pts.length) return [];
      const segs = [['M', pts[0][0], pts[0][1]]];
      for (let k = 1; k < pts.length; k++) segs.push(['L', pts[k][0], pts[k][1]]);
      if (tag === 'polygon') segs.push(['Z']);
      return segs;
    }
    case 'circle': {
      const cx = num(a.cx);
      const cy = num(a.cy);
      const r = num(a.r);
      return ellipseSegments(cx, cy, r, r);
    }
    case 'ellipse':
      return ellipseSegments(num(a.cx), num(a.cy), num(a.rx), num(a.ry));
    case 'rect': {
      const x = num(a.x);
      const y = num(a.y);
      const w = num(a.width);
      const h = num(a.height);
      let rx = a.rx !== undefined ? num(a.rx) : a.ry !== undefined ? num(a.ry) : 0;
      let ry = a.ry !== undefined ? num(a.ry) : rx;
      rx = Math.min(Math.max(rx, 0), w / 2);
      ry = Math.min(Math.max(ry, 0), h / 2);
      if (!rx || !ry) {
        return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
      }
      return [
        ['M', x + rx, y],
        ['L', x + w - rx, y],
        ['A', rx, ry, 0, 0, 1, x + w, y + ry],
        ['L', x + w, y + h - ry],
        ['A', rx, ry, 0, 0, 1, x + w - rx, y + h],
        ['L', x + rx, y + h],
        ['A', rx, ry, 0, 0, 1, x, y + h - ry],
        ['L', x, y + ry],
        ['A', rx, ry, 0, 0, 1, x + rx, y],
        ['Z'],
      ];
    }
    default:
      return [];
  }
}

function ellipseSegments(cx, cy, rx, ry) {
  // Starts at the top so draw animations begin at twelve o'clock.
  return [
    ['M', cx, cy - ry],
    ['A', rx, ry, 0, 0, 1, cx, cy + ry],
    ['A', rx, ry, 0, 0, 1, cx, cy - ry],
    ['Z'],
  ];
}

/** True when the node is a closed shape by construction or every subpath ends where it starts. */
export function isClosedNode(node) {
  const tag = node[0];
  if (tag === 'circle' || tag === 'ellipse' || tag === 'rect' || tag === 'polygon') return true;
  if (tag === 'line') return false;
  const subs = subpaths(shapeToSegments(node));
  return subs.length > 0 && subs.every((sp) => sp.closed);
}

/** Splits segments into subpaths with their closed flag (Z or matching ends). */
export function subpaths(segs) {
  const out = [];
  let cur = null;
  for (const s of segs) {
    if (s[0] === 'M') {
      if (cur && cur.segs.length > 1) out.push(cur);
      cur = { segs: [s], closed: false };
    } else if (s[0] === 'Z') {
      if (cur) {
        cur.closed = true;
        cur.segs.push(s);
        out.push(cur);
        const m = cur.segs[0];
        cur = { segs: [['M', m[1], m[2]]], closed: false };
      }
    } else if (cur) {
      cur.segs.push(s);
    }
  }
  if (cur && cur.segs.length > 1) out.push(cur);
  for (const sp of out) {
    if (!sp.closed) {
      const m = sp.segs[0];
      const e = endPoint(sp.segs[sp.segs.length - 1]);
      if (e && Math.hypot(e[0] - m[1], e[1] - m[2]) < 0.01 && sp.segs.length > 2) sp.closed = true;
    }
  }
  return out;
}

function endPoint(s) {
  switch (s[0]) {
    case 'M':
    case 'L':
      return [s[1], s[2]];
    case 'C':
      return [s[5], s[6]];
    case 'Q':
      return [s[3], s[4]];
    case 'A':
      return [s[6], s[7]];
    default:
      return null;
  }
}

// Arc conversion (SVG implementation notes F.6.5 and F.6.6).
function arcCenter(x1, y1, s) {
  let [, rx, ry, rot, large, sweep, x2, y2] = s;
  const phi = (rot * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sq = Math.sqrt(lambda);
    rx *= sq;
    ry *= sq;
  }
  const num1 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = den === 0 ? 0 : Math.sqrt(Math.max(0, num1 / den));
  if (large === sweep) coef = -coef;
  const cxp = (coef * (rx * y1p)) / ry;
  const cyp = (coef * -(ry * x1p)) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  else if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  return { cx, cy, rx, ry, phi, theta1, dtheta };
}

function arcToCubics(x1, y1, s) {
  const x2 = s[6];
  const y2 = s[7];
  if ((x1 === x2 && y1 === y2) || !s[1] || !s[2]) {
    return x1 === x2 && y1 === y2 ? [] : [['L', x2, y2]];
  }
  const { cx, cy, rx, ry, phi, theta1, dtheta } = arcCenter(x1, y1, s);
  const n = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2) - 1e-9));
  const delta = dtheta / n;
  const k = (4 / 3) * Math.tan(delta / 4);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const pt = (t) => {
    const ct = Math.cos(t);
    const st = Math.sin(t);
    return [cx + rx * ct * cos - ry * st * sin, cy + rx * ct * sin + ry * st * cos];
  };
  const dpt = (t) => {
    const ct = Math.cos(t);
    const st = Math.sin(t);
    return [-rx * st * cos - ry * ct * sin, -rx * st * sin + ry * ct * cos];
  };
  const out = [];
  let t = theta1;
  for (let j = 0; j < n; j++) {
    const t2 = t + delta;
    const p1 = pt(t);
    const p2 = j === n - 1 ? [x2, y2] : pt(t2);
    const d1 = dpt(t);
    const d2 = dpt(t2);
    out.push(['C', p1[0] + k * d1[0], p1[1] + k * d1[1], p2[0] - k * d2[0], p2[1] - k * d2[1], p2[0], p2[1]]);
    t = t2;
  }
  return out;
}

/** Converts segments to M, L, C and Z only (quadratics and arcs become cubics). */
export function toCubics(segs) {
  const out = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const s of segs) {
    switch (s[0]) {
      case 'M':
        out.push(s);
        cx = sx = s[1];
        cy = sy = s[2];
        break;
      case 'L':
        out.push(s);
        cx = s[1];
        cy = s[2];
        break;
      case 'C':
        out.push(s);
        cx = s[5];
        cy = s[6];
        break;
      case 'Q':
        out.push(['C', cx + (2 / 3) * (s[1] - cx), cy + (2 / 3) * (s[2] - cy), s[3] + (2 / 3) * (s[1] - s[3]), s[4] + (2 / 3) * (s[2] - s[4]), s[3], s[4]]);
        cx = s[3];
        cy = s[4];
        break;
      case 'A':
        out.push(...arcToCubics(cx, cy, s));
        cx = s[6];
        cy = s[7];
        break;
      case 'Z':
        out.push(s);
        cx = sx;
        cy = sy;
        break;
      default:
        break;
    }
  }
  return out;
}

/** Applies an affine matrix [a, b, c, d, e, f] to segments. */
export function transformSegments(segs, m) {
  const [a, b, c, d, e, f] = m;
  const tp = (x, y) => [a * x + c * y + e, b * x + d * y + f];
  const uniform = Math.abs(a - d) < 1e-12 && Math.abs(b + c) < 1e-12 && Math.abs(b) < 1e-12;
  const mirrorUniform = Math.abs(a + d) < 1e-12 && Math.abs(b) < 1e-12 && Math.abs(c) < 1e-12;
  const keepArcs = uniform || mirrorUniform;
  const src = keepArcs ? segs : toCubics(segs);
  const det = a * d - b * c;
  return src.map((s) => {
    switch (s[0]) {
      case 'M':
      case 'L':
        return [s[0], ...tp(s[1], s[2])];
      case 'C':
        return ['C', ...tp(s[1], s[2]), ...tp(s[3], s[4]), ...tp(s[5], s[6])];
      case 'Q':
        return ['Q', ...tp(s[1], s[2]), ...tp(s[3], s[4])];
      case 'A': {
        const sxk = Math.abs(a);
        const rot = mirrorUniform ? -s[3] : s[3];
        return ['A', s[1] * sxk, s[2] * sxk, rot, s[4], det < 0 ? 1 - s[5] : s[5], ...tp(s[6], s[7])];
      }
      default:
        return s;
    }
  });
}

/** Applies a uniform scale and translation to a shape node, keeping primitives when possible. */
export function transformNode(node, s, tx, ty) {
  const [tag, a] = node;
  const out = { ...a };
  const X = (v) => num(v) * s + tx;
  const Y = (v) => num(v) * s + ty;
  switch (tag) {
    case 'circle':
      out.cx = X(a.cx);
      out.cy = Y(a.cy);
      out.r = num(a.r) * s;
      return ['circle', out];
    case 'ellipse':
      out.cx = X(a.cx);
      out.cy = Y(a.cy);
      out.rx = num(a.rx) * s;
      out.ry = num(a.ry) * s;
      return ['ellipse', out];
    case 'rect':
      out.x = X(a.x);
      out.y = Y(a.y);
      out.width = num(a.width) * s;
      out.height = num(a.height) * s;
      if (a.rx !== undefined) out.rx = num(a.rx) * s;
      if (a.ry !== undefined) out.ry = num(a.ry) * s;
      return ['rect', out];
    case 'line':
      out.x1 = X(a.x1);
      out.y1 = Y(a.y1);
      out.x2 = X(a.x2);
      out.y2 = Y(a.y2);
      return ['line', out];
    case 'polyline':
    case 'polygon':
      out.points = pointsList(a.points)
        .map(([x, y]) => `${x * s + tx} ${y * s + ty}`)
        .join(' ');
      return [tag, out];
    default: {
      out.d = serializePath(transformSegments(parsePath(a.d || ''), [s, 0, 0, s, tx, ty]), 4);
      return ['path', out];
    }
  }
}

// Bounds.
function cubicExtrema(p0, p1, p2, p3) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  const ts = [];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) ts.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      ts.push((-b + sq) / (2 * a), (-b - sq) / (2 * a));
    }
  }
  return ts.filter((t) => t > 0 && t < 1);
}

function cubicAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function arcBounds(x1, y1, s, box) {
  const x2 = s[6];
  const y2 = s[7];
  extend(box, x2, y2);
  if (!s[1] || !s[2] || (x1 === x2 && y1 === y2)) return;
  const { cx, cy, rx, ry, phi, theta1, dtheta } = arcCenter(x1, y1, s);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const candidates = [];
  const tx = Math.atan2(-ry * sin, rx * cos);
  const ty = Math.atan2(ry * cos, rx * sin);
  for (const base of [tx, ty]) candidates.push(base, base + Math.PI);
  const lo = Math.min(theta1, theta1 + dtheta);
  const hi = Math.max(theta1, theta1 + dtheta);
  for (const c of candidates) {
    for (let k = -2; k <= 2; k++) {
      const t = c + k * 2 * Math.PI;
      if (t > lo && t < hi) {
        const ct = Math.cos(t);
        const st = Math.sin(t);
        extend(box, cx + rx * ct * cos - ry * st * sin, cy + rx * ct * sin + ry * st * cos);
      }
    }
  }
}

function extend(box, x, y) {
  if (x < box.minX) box.minX = x;
  if (y < box.minY) box.minY = y;
  if (x > box.maxX) box.maxX = x;
  if (y > box.maxY) box.maxY = y;
}

/** Exact bounding box of segments (curves use their extrema, arcs their true extent). */
export function segmentsBounds(segs, box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }) {
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const s of segs) {
    switch (s[0]) {
      case 'M':
        cx = sx = s[1];
        cy = sy = s[2];
        extend(box, cx, cy);
        break;
      case 'L':
        cx = s[1];
        cy = s[2];
        extend(box, cx, cy);
        break;
      case 'C': {
        extend(box, s[5], s[6]);
        for (const t of cubicExtrema(cx, s[1], s[3], s[5])) extend(box, cubicAt(cx, s[1], s[3], s[5], t), cubicAt(cy, s[2], s[4], s[6], t));
        for (const t of cubicExtrema(cy, s[2], s[4], s[6])) extend(box, cubicAt(cx, s[1], s[3], s[5], t), cubicAt(cy, s[2], s[4], s[6], t));
        cx = s[5];
        cy = s[6];
        break;
      }
      case 'Q': {
        const c = toCubics([
          ['M', cx, cy],
          ['Q', s[1], s[2], s[3], s[4]],
        ]);
        segmentsBounds(c, box);
        cx = s[3];
        cy = s[4];
        break;
      }
      case 'A':
        arcBounds(cx, cy, s, box);
        cx = s[6];
        cy = s[7];
        break;
      case 'Z':
        cx = sx;
        cy = sy;
        break;
      default:
        break;
    }
  }
  return box;
}

/** Bounding box of a shape node. */
export function nodeBounds(node) {
  return segmentsBounds(shapeToSegments(node));
}

// Evaluation and splitting of L and C segments with a start point.
export function evalSegment(p0, s, t) {
  if (s[0] === 'C') {
    return [cubicAt(p0[0], s[1], s[3], s[5], t), cubicAt(p0[1], s[2], s[4], s[6], t)];
  }
  const e = s[0] === 'Z' ? s.__end : [s[1], s[2]];
  return [p0[0] + (e[0] - p0[0]) * t, p0[1] + (e[1] - p0[1]) * t];
}

function lerp2(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Returns the part of segment s (starting at p0) between parameters t0 and t1. */
export function sliceSegment(p0, s, t0, t1) {
  if (s[0] === 'C') {
    let q0 = p0;
    let q1 = [s[1], s[2]];
    let q2 = [s[3], s[4]];
    let q3 = [s[5], s[6]];
    // Split at t1, keep the first part.
    if (t1 < 1) {
      const a = lerp2(q0, q1, t1);
      const b = lerp2(q1, q2, t1);
      const c = lerp2(q2, q3, t1);
      const d = lerp2(a, b, t1);
      const e = lerp2(b, c, t1);
      const f = lerp2(d, e, t1);
      q1 = a;
      q2 = d;
      q3 = f;
    }
    // Split the result at t0 / t1, keep the second part.
    const u = t1 > 0 ? t0 / t1 : 0;
    if (u > 0) {
      const a = lerp2(q0, q1, u);
      const b = lerp2(q1, q2, u);
      const c = lerp2(q2, q3, u);
      const d = lerp2(a, b, u);
      const e = lerp2(b, c, u);
      const f = lerp2(d, e, u);
      q0 = f;
      q1 = e;
      q2 = c;
    }
    return { start: q0, seg: ['C', q1[0], q1[1], q2[0], q2[1], q3[0], q3[1]] };
  }
  const end = s[0] === 'Z' ? s.__end : [s[1], s[2]];
  const a = lerp2(p0, end, t0);
  const b = lerp2(p0, end, t1);
  return { start: a, seg: ['L', b[0], b[1]] };
}

function approxLength(p0, s) {
  if (s[0] === 'C') {
    const c = [p0, [s[1], s[2]], [s[3], s[4]], [s[5], s[6]]];
    let chord = Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1]);
    let poly = 0;
    for (let k = 0; k < 3; k++) poly += Math.hypot(c[k + 1][0] - c[k][0], c[k + 1][1] - c[k][1]);
    return (chord + poly) / 2;
  }
  const e = s[0] === 'Z' ? s.__end : [s[1], s[2]];
  return Math.hypot(e[0] - p0[0], e[1] - p0[1]);
}

/**
 * Flattens segments into polylines: [{ points: [[x, y], ...], closed }].
 * `step` is the target distance between samples on curves.
 */
export function flatten(segs, step = 0.35) {
  const cubic = toCubics(segs);
  const out = [];
  let cur = null;
  let p = [0, 0];
  let start = [0, 0];
  for (const s of cubic) {
    if (s[0] === 'M') {
      if (cur && cur.points.length > 1) out.push(cur);
      p = [s[1], s[2]];
      start = p;
      cur = { points: [p], closed: false };
    } else if (s[0] === 'L') {
      p = [s[1], s[2]];
      if (cur) cur.points.push(p);
    } else if (s[0] === 'C') {
      const len = approxLength(p, s);
      const n = Math.max(2, Math.min(96, Math.ceil(len / step)));
      for (let k = 1; k <= n; k++) cur.points.push(evalSegment(p, s, k / n));
      p = [s[5], s[6]];
    } else if (s[0] === 'Z') {
      if (cur) {
        if (Math.hypot(p[0] - start[0], p[1] - start[1]) > 1e-9) cur.points.push(start);
        cur.closed = true;
        out.push(cur);
        cur = { points: [start], closed: false };
      }
      p = start;
    }
  }
  if (cur && cur.points.length > 1) out.push(cur);
  for (const sp of out) {
    if (!sp.closed && sp.points.length > 2) {
      const a = sp.points[0];
      const b = sp.points[sp.points.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) sp.closed = true;
    }
  }
  return out;
}

/** Flattens a node into polylines. */
export function flattenNode(node, step) {
  return flatten(shapeToSegments(node), step);
}

export function polylineLength(points) {
  let len = 0;
  for (let k = 1; k < points.length; k++) len += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]);
  return len;
}

/** Resamples a polyline to n points evenly spaced by arc length. */
export function resample(points, n) {
  if (points.length === 0) return [];
  if (points.length === 1 || n < 2) return Array.from({ length: Math.max(1, n) }, () => [points[0][0], points[0][1]]);
  const cum = [0];
  for (let k = 1; k < points.length; k++) cum.push(cum[k - 1] + Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]));
  const total = cum[cum.length - 1];
  if (total === 0) return Array.from({ length: n }, () => [points[0][0], points[0][1]]);
  const out = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (j < points.length - 1 && cum[j] < target) j++;
    const seg = cum[j] - cum[j - 1];
    const t = seg > 0 ? (target - cum[j - 1]) / seg : 0;
    out.push([points[j - 1][0] + (points[j][0] - points[j - 1][0]) * t, points[j - 1][1] + (points[j][1] - points[j - 1][1]) * t]);
  }
  return out;
}

/** Even-odd point in polygon test. */
export function pointInPolygon(pt, poly) {
  const [x, y] = pt;
  let inside = false;
  for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) {
    const xi = poly[k][0];
    const yi = poly[k][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSegment(pt, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(pt[0] - (a[0] + t * dx), pt[1] - (a[1] + t * dy));
}

/** Minimum distance from a point to a list of polylines. */
export function distToPolylines(pt, polys) {
  let best = Infinity;
  for (const poly of polys) {
    const pts = poly.points;
    if (pts.length === 1) best = Math.min(best, Math.hypot(pt[0] - pts[0][0], pt[1] - pts[0][1]));
    for (let k = 1; k < pts.length; k++) {
      const d = distToSegment(pt, pts[k - 1], pts[k]);
      if (d < best) best = d;
    }
  }
  return best;
}

export function polygonArea(points) {
  let a = 0;
  for (let k = 0, j = points.length - 1; k < points.length; j = k++) a += (points[j][0] + points[k][0]) * (points[j][1] - points[k][1]);
  return a / 2;
}

/**
 * Removes the parts of the segments where `excluded(point)` is true.
 * Curves are cut at refined parameters, so kept pieces follow the original
 * geometry exactly. Pieces shorter than `minLength` are dropped.
 */
export function trimSegments(segs, excluded, { minLength = 0.4, samplesPerUnit = 4 } = {}) {
  const cubic = toCubics(segs);
  const subs = [];
  let cur = null;
  let start = null;
  let p = null;
  for (const s of cubic) {
    if (s[0] === 'M') {
      if (cur && cur.items.length) subs.push(cur);
      start = [s[1], s[2]];
      p = start;
      cur = { items: [], closed: false };
    } else if (s[0] === 'Z') {
      if (cur) {
        if (Math.hypot(p[0] - start[0], p[1] - start[1]) > 1e-9) {
          const z = ['L', start[0], start[1]];
          cur.items.push({ p0: p, seg: z });
        }
        cur.closed = true;
        subs.push(cur);
        cur = { items: [], closed: false };
      }
      p = start;
    } else if (cur) {
      cur.items.push({ p0: p, seg: s });
      p = s[0] === 'C' ? [s[5], s[6]] : [s[1], s[2]];
    }
  }
  if (cur && cur.items.length) subs.push(cur);

  const out = [];
  let changed = false;
  for (const sub of subs) {
    const pieces = [];
    let cut = false;
    for (let idx = 0; idx < sub.items.length; idx++) {
      const { p0, seg } = sub.items[idx];
      const len = approxLength(p0, seg);
      const n = Math.max(8, Math.ceil(len * samplesPerUnit));
      const ex = [];
      for (let k = 0; k <= n; k++) ex.push(excluded(evalSegment(p0, seg, k / n)));
      if (ex.every((v) => !v)) {
        pieces.push({ idx, t0: 0, t1: 1, start: p0, seg });
        continue;
      }
      cut = true;
      const refine = (ta, tb, aOut) => {
        // aOut: true when ta is kept and tb is excluded.
        let lo = ta;
        let hi = tb;
        for (let r = 0; r < 18; r++) {
          const mid = (lo + hi) / 2;
          const e = excluded(evalSegment(p0, seg, mid));
          if (e === aOut) hi = mid;
          else lo = mid;
        }
        return aOut ? lo : hi;
      };
      let k = 0;
      while (k <= n) {
        if (ex[k]) {
          k++;
          continue;
        }
        let j = k;
        while (j < n && !ex[j + 1]) j++;
        const t0 = k === 0 ? 0 : refine((k - 1) / n, k / n, false);
        const t1 = j === n ? 1 : refine(j / n, (j + 1) / n, true);
        if (t1 > t0 + 1e-6) {
          const sl = sliceSegment(p0, seg, t0, t1);
          pieces.push({ idx, t0, t1, start: sl.start, seg: sl.seg });
        }
        k = j + 1;
      }
    }
    if (!cut) {
      // Untouched subpath: keep as is.
      const first = sub.items[0];
      const segsOut = [['M', first.p0[0], first.p0[1]], ...sub.items.map((it) => it.seg)];
      if (sub.closed) segsOut.push(['Z']);
      out.push(...segsOut);
      continue;
    }
    changed = true;
    // Chain continuous pieces.
    const chains = [];
    for (const pc of pieces) {
      const last = chains[chains.length - 1];
      const prev = last && last[last.length - 1];
      if (prev && pc.t0 === 0 && prev.t1 === 1 && pc.idx === prev.idx + 1) last.push(pc);
      else chains.push([pc]);
    }
    if (sub.closed && chains.length > 1) {
      const firstChain = chains[0];
      const lastChain = chains[chains.length - 1];
      if (firstChain[0].idx === 0 && firstChain[0].t0 === 0 && lastChain[lastChain.length - 1].idx === sub.items.length - 1 && lastChain[lastChain.length - 1].t1 === 1) {
        chains[0] = [...lastChain, ...firstChain];
        chains.pop();
      }
    }
    for (const chain of chains) {
      let length = 0;
      for (const pc of chain) length += approxLength(pc.start, pc.seg);
      if (length < minLength) continue;
      out.push(['M', chain[0].start[0], chain[0].start[1]]);
      for (const pc of chain) out.push(pc.seg);
    }
  }
  return { segs: out, changed };
}

/** Area weighted centroid and length of a set of polylines. */
export function polylinesCentroid(polys) {
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (const poly of polys) {
    const pts = poly.points;
    for (let k = 1; k < pts.length; k++) {
      const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      sx += ((pts[k][0] + pts[k - 1][0]) / 2) * l;
      sy += ((pts[k][1] + pts[k - 1][1]) / 2) * l;
      total += l;
    }
    if (pts.length === 1) {
      sx += pts[0][0];
      sy += pts[0][1];
      total += 1e-9;
    }
  }
  if (!total) return [12, 12];
  return [sx / total, sy / total];
}
