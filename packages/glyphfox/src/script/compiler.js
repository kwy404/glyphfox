// Glyph script compiler: statements to an icon body that passes the icon
// lint. Every transform (group, mirror, repeat) is baked into the
// coordinates: circles stay circles, axis aligned rects and ellipses stay
// primitives, everything else becomes a path whose arcs are kept exact.
// Errors and warnings carry the line and column of the command that made
// the problem, including which copy of a mirror or a repeat broke a rule.

import { minifyPath, nodeBounds, segmentsBounds, serializePath, parsePath, shapeToSegments, subpaths } from '../core/geometry.js';
import { attrNum, nodesToString } from '../core/nodes.js';
import { canonicalSvg, lintSvg } from '../core/lint.js';
import { COMMANDS, GlyphScriptError, describe, errorAfter, errorAt, parseScript, suggestion } from './parser.js';

const EPS = 1e-9;
const IDENTITY = [1, 0, 0, 1, 0, 0];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_CATEGORY = 'shapes';
const MAX_SHAPES = 2000;

class CompileFailure extends Error {
  constructor(record) {
    super(record.message);
    this.record = record;
  }
}

const fail = (tok, message) => {
  throw new CompileFailure(errorAt(tok, message));
};
const failAfter = (tok, message) => {
  throw new CompileFailure(errorAfter(tok, message));
};

// Affine matrices [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f.
function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

const snap = (v) => (Math.abs(v) < 1e-12 ? 0 : Math.abs(Math.abs(v) - 1) < 1e-12 ? Math.sign(v) : v);
const translate = (dx, dy) => [1, 0, 0, 1, dx, dy];

/** Clockwise rotation in degrees (the y axis points down) around a point. */
function rotation(deg, cx = 12, cy = 12) {
  const r = (deg * Math.PI) / 180;
  const c = snap(Math.cos(r));
  const s = snap(Math.sin(r));
  return mul(translate(cx, cy), mul([c, s, -s, c, 0, 0], translate(-cx, -cy)));
}

const scaling = (k, cx = 12, cy = 12) => [k, 0, 0, k, cx - k * cx, cy - k * cy];
const mirrorX = (at) => [-1, 0, 0, 1, 2 * at, 0];
const mirrorY = (at) => [1, 0, 0, -1, 0, 2 * at];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/**
 * Transforms segments by a similarity matrix and keeps arcs exact: the arc
 * radii scale, the x axis rotation turns with the matrix and the sweep
 * flag flips when the matrix mirrors.
 */
export function transformSimilar(segs, m) {
  const [a, b, c, d] = m;
  const det = a * d - b * c;
  const k = Math.sqrt(Math.abs(det));
  const theta = (Math.atan2(b, a) * 180) / Math.PI;
  const tp = (x, y) => apply(m, x, y);
  return segs.map((s) => {
    switch (s[0]) {
      case 'M':
      case 'L':
        return [s[0], ...tp(s[1], s[2])];
      case 'C':
        return ['C', ...tp(s[1], s[2]), ...tp(s[3], s[4]), ...tp(s[5], s[6])];
      case 'Q':
        return ['Q', ...tp(s[1], s[2]), ...tp(s[3], s[4])];
      case 'A': {
        const rx = s[1] * k;
        const ry = s[2] * k;
        let rot = det >= 0 ? s[3] + theta : theta - s[3];
        rot = Math.abs(rx - ry) < 1e-9 ? 0 : (((rot % 180) + 180) % 180);
        if (Math.abs(rot - 180) < 1e-9) rot = 0;
        return ['A', rx, ry, rot, s[4], det >= 0 ? s[5] : 1 - s[5], ...tp(s[6], s[7])];
      }
      default:
        return s;
    }
  });
}

const num = (v) => attrNum(v, 2);
const round2 = (v) => Math.round(v * 100) / 100;
const pts = (list) => list.map(([x, y]) => `${num(x)},${num(y)}`).join(' ');

function pointAt(cx, cy, r, deg) {
  const t = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
}

/** Local geometry of an arc: 0 degrees at 12 o'clock, clockwise. */
function arcSegments(cx, cy, r, from, to) {
  const sweep = to > from ? 1 : 0;
  if (Math.abs(to - from) >= 360 - 1e-9) {
    const p0 = pointAt(cx, cy, r, from);
    const p1 = pointAt(cx, cy, r, from + 180);
    return { segs: [['M', ...p0], ['A', r, r, 0, 0, sweep, ...p1], ['A', r, r, 0, 0, sweep, ...p0], ['Z']], closed: true };
  }
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return { segs: [['M', ...pointAt(cx, cy, r, from)], ['A', r, r, 0, large, sweep, ...pointAt(cx, cy, r, to)]], closed: false };
}

/** Local segments of a shape (for paths and the duotone layer). */
function shapeSegments(shape) {
  switch (shape.kind) {
    case 'circle':
      return shapeToSegments(['circle', { cx: shape.cx, cy: shape.cy, r: shape.r }]);
    case 'ellipse':
      return shapeToSegments(['ellipse', { cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry }]);
    case 'rect':
      return shapeToSegments(['rect', { x: shape.x, y: shape.y, width: shape.w, height: shape.h, rx: shape.radius }]);
    case 'line':
      return [['M', shape.x1, shape.y1], ['L', shape.x2, shape.y2]];
    case 'polyline':
    case 'polygon': {
      const segs = shape.points.map(([x, y], k) => [k ? 'L' : 'M', x, y]);
      if (shape.kind === 'polygon') segs.push(['Z']);
      return segs;
    }
    case 'dot':
      return [['M', shape.x, shape.y], ['L', shape.x + 0.01, shape.y]];
    default:
      return shape.segs;
  }
}

function isClosedShape(shape) {
  if (['circle', 'ellipse', 'rect', 'polygon'].includes(shape.kind)) return true;
  if (shape.kind === 'path') {
    const subs = subpaths(shape.segs);
    return subs.length > 0 && subs.every((sp) => sp.closed);
  }
  return false;
}

/** The output element of a shape under a matrix, rounded to 2 decimals. */
function place(shape, m) {
  const [a, b, c, d] = m;
  const k = Math.sqrt(Math.abs(a * d - b * c));
  const aligned = Math.abs(b) < EPS && Math.abs(c) < EPS;
  const quarter = Math.abs(a) < EPS && Math.abs(d) < EPS;
  const asPath = () => ['path', { d: serializePath(transformSimilar(shapeSegments(shape), m), 2) }];
  switch (shape.kind) {
    case 'circle': {
      const [x, y] = apply(m, shape.cx, shape.cy);
      return ['circle', { cx: num(x), cy: num(y), r: num(shape.r * k) }];
    }
    case 'ellipse': {
      if (!aligned && !quarter) return asPath();
      const [x, y] = apply(m, shape.cx, shape.cy);
      const rx = (aligned ? shape.rx : shape.ry) * k;
      const ry = (aligned ? shape.ry : shape.rx) * k;
      return ['ellipse', { cx: num(x), cy: num(y), rx: num(rx), ry: num(ry) }];
    }
    case 'rect': {
      if (!aligned && !quarter) return asPath();
      const [x1, y1] = apply(m, shape.x, shape.y);
      const [x2, y2] = apply(m, shape.x + shape.w, shape.y + shape.h);
      const attrs = { x: num(Math.min(x1, x2)), y: num(Math.min(y1, y2)), width: num(Math.abs(x2 - x1)), height: num(Math.abs(y2 - y1)) };
      if (shape.radius > 0) attrs.rx = num(shape.radius * k);
      return ['rect', attrs];
    }
    case 'line': {
      const [x1, y1] = apply(m, shape.x1, shape.y1);
      const [x2, y2] = apply(m, shape.x2, shape.y2);
      return ['line', { x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2) }];
    }
    case 'polyline':
    case 'polygon':
      return [shape.kind, { points: pts(shape.points.map(([x, y]) => apply(m, x, y))) }];
    case 'dot': {
      const [x, y] = apply(m, shape.x, shape.y);
      const x0 = round2(x);
      const y0 = round2(y);
      return ['path', { d: serializePath([['M', x0, y0], ['L', x0 + 0.01, y0]], 2) }];
    }
    default:
      // Path data written by hand keeps its own commands when nothing moves it.
      if (shape.d !== undefined && m.every((v, i) => v === IDENTITY[i])) return ['path', { d: minifyPath(shape.d, 2) }];
      return asPath();
  }
}

function sides(box) {
  const out = [];
  const r = (v) => num(v);
  if (box.minX < 2 - 0.001) out.push(`left ${r(box.minX)}`);
  if (box.minY < 2 - 0.001) out.push(`top ${r(box.minY)}`);
  if (box.maxX > 22 + 0.001) out.push(`right ${r(box.maxX)}`);
  if (box.maxY > 22 + 0.001) out.push(`bottom ${r(box.maxY)}`);
  return out;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Compiles glyph script. Never throws on bad input. Returns
 * { ok, body, svg, icon, meta, errors, warnings }; body and svg are empty
 * strings when there is any error, and lintSvg(svg) is [] when ok.
 */
export function compileScript(source, { name = 'glyph' } = {}) {
  const src = String(source ?? '');
  const parsed = parseScript(src);
  const errors = [...parsed.errors];
  const warnings = [];
  const meta = { name: undefined, tags: [], category: undefined };
  const elements = [];
  const padding = new Map();
  let duotone = null;
  let made = 0;
  let tooMany = false;

  const warn = (tok, message) => warnings.push(errorAt(tok, message, 'warning'));

  function evaluate(expr, env) {
    switch (expr.type) {
      case 'num':
        return expr.value;
      case 'name': {
        if (env.has(expr.name)) return env.get(expr.name);
        const hint = suggestion(expr.name, [...env.keys()]);
        if (hint) fail(expr.tok, `unknown name "${expr.name}"${hint}`);
        if (COMMANDS[expr.name]) fail(expr.tok, `expected a number, found "${expr.name}" (put each command on its own line or after ";")`);
        fail(expr.tok, `expected a number, found "${expr.name}"`);
        return 0;
      }
      case 'unary': {
        const v = evaluate(expr.expr, env);
        return expr.op === '-' ? -v : v;
      }
      case 'binary': {
        const l = evaluate(expr.left, env);
        const r = evaluate(expr.right, env);
        let v;
        if (expr.op === '+') v = l + r;
        else if (expr.op === '-') v = l - r;
        else if (expr.op === '*') v = l * r;
        else {
          if (r === 0) fail(expr.tok, 'division by zero');
          v = l / r;
        }
        if (!Number.isFinite(v)) fail(expr.tok, 'the result is not a finite number');
        return v;
      }
      default:
        return 0;
    }
  }

  // Positional items before the first keyword, then each keyword with its values.
  function split(st) {
    const pos = [];
    const kws = [];
    let cur = null;
    for (const it of st.items) {
      if (it.kind === 'kw') {
        cur = { name: it.name, tok: it.tok, values: [] };
        kws.push(cur);
      } else if (cur) cur.values.push(it);
      else pos.push(it);
    }
    return { pos, kws };
  }

  // Checks that items are numbers and evaluates them.
  function numbers(items, ctx) {
    return items.map((it) => {
      if (it.kind !== 'expr') fail(it.tok, `expected a number, found ${describe(it.tok)}`);
      return evaluate(it.expr, ctx.env);
    });
  }

  // Bare words close to a keyword of the command are typos, not names.
  function typos(st, ctx) {
    const keywords = COMMANDS[st.cmd].keywords || [];
    if (!keywords.length) return;
    for (const it of st.items) {
      if (it.kind !== 'expr' || it.expr.type !== 'name' || ctx.env.has(it.expr.name)) continue;
      const kw = suggestion(it.expr.name, keywords);
      if (kw) fail(it.tok, `unknown word "${it.expr.name}"${kw}`);
    }
  }

  function count(label, names, items, afterTok) {
    const want = names.length;
    if (items.length < want) {
      const last = items.length ? items[items.length - 1].last : afterTok;
      failAfter(last, `${label} needs ${plural(want, 'number')} (${names.join(' ')}), got ${items.length}`);
    }
    if (items.length > want) {
      const extra = items[want];
      const word = extra.kind === 'expr' && extra.expr.type === 'name' && COMMANDS[extra.expr.name] ? `; put "${extra.expr.name}" on a new line` : '';
      fail(extra.tok, `${label} takes ${plural(want, 'number')} (${names.join(' ')}), got ${items.length}${word}`);
    }
  }

  function noKeywords(st, kws) {
    if (kws.length) fail(kws[0].tok, `${st.cmd} does not take "${kws[0].name}"`);
  }

  function positive(item, value, label) {
    if (!(value > 0)) fail(item.tok, `${label} must be positive, got ${num(value)}`);
  }

  function noteOf(ctx) {
    return ctx.notes.join(', ');
  }

  function recordPadding(st, box, ctx) {
    const out = sides(box);
    if (!out.length) return;
    const hit = padding.get(st);
    if (hit) hit.count++;
    else padding.set(st, { st, sides: out, note: noteOf(ctx), count: 1 });
  }

  function emit(st, shape, ctx) {
    if (++made > MAX_SHAPES) {
      tooMany = true;
      fail(st.tok, `the script makes more than ${MAX_SHAPES} shapes, use fewer copies`);
    }
    if (ctx.duotone) {
      if (!isClosedShape(shape)) fail(st.tok, 'duotone takes closed shapes only (circle, ellipse, rect, polygon or a closed path)');
      const segs = transformSimilar(shapeSegments(shape), ctx.matrix);
      recordPadding(st, segmentsBounds(segs), ctx);
      duotone.segs.push(...segs);
      duotone.parts++;
      return;
    }
    const node = place(shape, ctx.matrix);
    recordPadding(st, nodeBounds(node), ctx);
    elements.push({ node, st, note: noteOf(ctx) });
  }

  function shape(st, ctx) {
    typos(st, ctx);
    const { pos, kws } = split(st);
    const cmd = st.cmd;
    const spec = COMMANDS[cmd];
    switch (cmd) {
      case 'circle': {
        noKeywords(st, kws);
        count(cmd, spec.args, pos, st.tok);
        const [cx, cy, r] = numbers(pos, ctx);
        positive(pos[2], r, 'r');
        return emit(st, { kind: 'circle', cx, cy, r }, ctx);
      }
      case 'ellipse': {
        noKeywords(st, kws);
        count(cmd, spec.args, pos, st.tok);
        const [cx, cy, rx, ry] = numbers(pos, ctx);
        positive(pos[2], rx, 'rx');
        positive(pos[3], ry, 'ry');
        return emit(st, { kind: 'ellipse', cx, cy, rx, ry }, ctx);
      }
      case 'rect': {
        count(cmd, spec.args, pos, st.tok);
        const [x, y, w, h] = numbers(pos, ctx);
        positive(pos[2], w, 'the width');
        positive(pos[3], h, 'the height');
        let radius = 0;
        for (const kw of kws) {
          count('radius', ['r'], kw.values, kw.tok);
          [radius] = numbers(kw.values, ctx);
          if (radius < 0) fail(kw.values[0].tok, `radius must not be negative, got ${num(radius)}`);
          const max = Math.min(w, h) / 2;
          if (radius > max + 1e-9) {
            warn(kw.values[0].tok, `radius ${num(radius)} is larger than half the shorter side, using ${num(max)}`);
            radius = max;
          }
        }
        return emit(st, { kind: 'rect', x, y, w, h, radius }, ctx);
      }
      case 'line': {
        noKeywords(st, kws);
        count(cmd, spec.args, pos, st.tok);
        const [x1, y1, x2, y2] = numbers(pos, ctx);
        return emit(st, { kind: 'line', x1, y1, x2, y2 }, ctx);
      }
      case 'polyline':
      case 'polygon': {
        noKeywords(st, kws);
        const values = numbers(pos, ctx);
        const min = spec.points;
        if (values.length % 2) {
          const last = pos[pos.length - 1];
          fail(last.tok, `${cmd} needs x y pairs, got ${plural(values.length, 'number')}`);
        }
        if (values.length < min * 2) {
          const last = pos.length ? pos[pos.length - 1].last : st.tok;
          failAfter(last, `${cmd} needs at least ${min} points (${min * 2} numbers), got ${plural(values.length / 2, 'point')}`);
        }
        const points = [];
        for (let k = 0; k < values.length; k += 2) points.push([values[k], values[k + 1]]);
        return emit(st, { kind: cmd, points }, ctx);
      }
      case 'arc': {
        let cx;
        let cy;
        let r;
        let from;
        let to;
        if (kws.length) {
          count('arc', ['cx', 'cy', 'r'], pos, st.tok);
          [cx, cy, r] = numbers(pos, ctx);
          const got = {};
          for (const kw of kws) {
            if (got[kw.name] !== undefined) fail(kw.tok, `"${kw.name}" is given twice`);
            count(kw.name, ['angle'], kw.values, kw.tok);
            got[kw.name] = numbers(kw.values, ctx)[0];
          }
          if (got.from === undefined) failAfter(st.last, 'arc needs "from" and "to" angles, for example: arc 12 12 8 from -90 to 90');
          if (got.to === undefined) failAfter(st.last, 'arc needs a "to" angle, for example: arc 12 12 8 from -90 to 90');
          from = got.from;
          to = got.to;
        } else {
          count('arc', spec.args, pos, st.tok);
          [cx, cy, r, from, to] = numbers(pos, ctx);
        }
        positive(pos[2], r, 'r');
        if (Math.abs(to - from) < 1e-9) failAfter(st.last, 'arc needs two different angles');
        if (Math.abs(to - from) > 360 + 1e-9) {
          warn(st.tok, `the arc turns ${num(Math.abs(to - from))} degrees, drawing a full circle`);
          to = from + Math.sign(to - from) * 360;
        }
        const { segs, closed } = arcSegments(cx, cy, r, from, to);
        return emit(st, { kind: 'path', segs, closed }, ctx);
      }
      case 'path': {
        noKeywords(st, kws);
        if (pos.length !== 1 || pos[0].kind !== 'str') {
          const bad = pos.find((it) => it.kind !== 'str') || pos[1];
          if (!pos.length) failAfter(st.tok, 'path needs path data in quotes, for example: path "M4 12h16"');
          if (bad) fail(bad.tok, pos[0].kind === 'str' ? 'path takes one string of path data' : `path needs path data in quotes, found ${describe(bad.tok)}`);
        }
        const strTok = pos[0].tok;
        if (strTok.unterminated) return undefined;
        let segs;
        try {
          segs = parsePath(pos[0].value);
        } catch (err) {
          const m = /at position (\d+)/.exec(err.message);
          const at = m ? Number(m[1]) : 0;
          const message = /^path data /.test(err.message) ? err.message : `path data: ${err.message.replace(/ at position \d+ in path data$/, '')}`;
          throw new CompileFailure({ message, line: strTok.line, column: strTok.column + 1 + at, length: 1, severity: 'error' });
        }
        if (!segs.some((s) => s[0] !== 'M')) fail(strTok, 'the path draws nothing (it only moves)');
        return emit(st, { kind: 'path', segs, d: pos[0].value }, ctx);
      }
      case 'dot': {
        noKeywords(st, kws);
        count(cmd, spec.args, pos, st.tok);
        const [x, y] = numbers(pos, ctx);
        return emit(st, { kind: 'dot', x, y }, ctx);
      }
      default:
        fail(st.tok, `unknown command "${cmd}"`);
        return undefined;
    }
  }

  function block(st, ctx) {
    typos(st, ctx);
    const { pos, kws } = split(st);
    const body = st.body || [];
    const inner = (matrix, notes, extra = {}) => run(body, { ...ctx, env: new Map(ctx.env), matrix, notes, ...extra });
    switch (st.cmd) {
      case 'group': {
        if (pos.length) fail(pos[0].tok, `group takes move, rotate or scale before the block, found ${describe(pos[0].tok)}`);
        let local = IDENTITY;
        for (let k = 0; k < kws.length; k++) {
          const kw = kws[k];
          if (kw.name === 'around') fail(kw.tok, '"around" goes right after rotate or scale');
          let around = [12, 12];
          const next = kws[k + 1];
          if ((kw.name === 'rotate' || kw.name === 'scale') && next && next.name === 'around') {
            count('around', ['cx', 'cy'], next.values, next.tok);
            around = numbers(next.values, ctx);
            k++;
          }
          if (kw.name === 'move') {
            count('move', ['dx', 'dy'], kw.values, kw.tok);
            const [dx, dy] = numbers(kw.values, ctx);
            local = mul(translate(dx, dy), local);
          } else if (kw.name === 'rotate') {
            count('rotate', ['degrees'], kw.values, kw.tok);
            const [deg] = numbers(kw.values, ctx);
            local = mul(rotation(deg, around[0], around[1]), local);
          } else {
            count('scale', ['factor'], kw.values, kw.tok);
            const [f] = numbers(kw.values, ctx);
            if (!(f > 0)) fail(kw.values[0].tok, `scale must be positive, got ${num(f)} (use mirror to flip)`);
            local = mul(scaling(f, around[0], around[1]), local);
          }
        }
        return inner(mul(ctx.matrix, local), ctx.notes);
      }
      case 'mirror': {
        const axisItem = pos[0];
        if (!axisItem || axisItem.kind !== 'word') {
          if (!axisItem) failAfter(st.tok, 'mirror needs an axis: x, y or xy');
          fail(axisItem.tok, `mirror needs an axis: x, y or xy, found ${describe(axisItem.tok)}`);
        }
        if (pos.length > 1) fail(pos[1].tok, `mirror takes one axis, found ${describe(pos[1].tok)}`);
        const axis = axisItem.value;
        let ax = 12;
        let ay = 12;
        for (const kw of kws) {
          if (axis === 'xy' && kw.values.length === 2) [ax, ay] = numbers(kw.values, ctx);
          else {
            count('at', [axis === 'y' ? 'y' : 'x'], kw.values, kw.tok);
            const [v] = numbers(kw.values, ctx);
            ax = v;
            ay = v;
          }
        }
        const copies = axis === 'x' ? [IDENTITY, mirrorX(ax)] : axis === 'y' ? [IDENTITY, mirrorY(ay)] : [IDENTITY, mirrorX(ax), mirrorY(ay), mul(mirrorX(ax), mirrorY(ay))];
        copies.forEach((m, k) => {
          const notes = k ? [...ctx.notes, `copy ${k + 1} of the mirror at line ${st.tok.line}`] : ctx.notes;
          inner(mul(ctx.matrix, m), notes);
        });
        return undefined;
      }
      case 'repeat': {
        if (!pos.length) failAfter(st.tok, 'repeat needs a count, for example: repeat 8 { ... }');
        if (pos.length > 1) fail(pos[1].tok, `repeat takes one count, found ${describe(pos[1].tok)}`);
        const [n] = numbers(pos, ctx);
        if (!Number.isInteger(n) || n < 1 || n > 72) fail(pos[0].tok, `repeat needs a whole number from 1 to 72, got ${num(n)}`);
        let center = [12, 12];
        let step = 360 / n;
        const seen = new Set();
        for (const kw of kws) {
          if (seen.has(kw.name)) fail(kw.tok, `"${kw.name}" is given twice`);
          seen.add(kw.name);
          if (kw.name === 'around') {
            count('around', ['cx', 'cy'], kw.values, kw.tok);
            center = numbers(kw.values, ctx);
          } else {
            count('step', ['degrees'], kw.values, kw.tok);
            [step] = numbers(kw.values, ctx);
          }
        }
        for (let k = 0; k < n; k++) {
          const notes = k ? [...ctx.notes, `copy ${k + 1} of the repeat at line ${st.tok.line}`] : ctx.notes;
          inner(mul(ctx.matrix, rotation(k * step, center[0], center[1])), notes);
        }
        return undefined;
      }
      case 'duotone': {
        if (st.items.length) fail(st.items[0].tok, 'duotone takes no arguments, only a block of closed shapes');
        if (ctx.duotone) fail(st.tok, 'duotone cannot be nested in another duotone block');
        if (duotone && duotone.st !== st) fail(st.tok, `only one duotone block is allowed (the first one is at line ${duotone.st.tok.line})`);
        if (!duotone) duotone = { st, segs: [], parts: 0 };
        return inner(ctx.matrix, ctx.notes, { duotone: true });
      }
      default:
        fail(st.tok, `unknown command "${st.cmd}"`);
        return undefined;
    }
  }

  function directive(st) {
    const v = st.value.trim();
    if (st.cmd === 'name') {
      if (!KEBAB.test(v)) fail(st.valueTok, `name must be kebab-case (lowercase words joined by "-"), like "my-icon", got "${v}"`);
      meta.name = v;
    } else if (st.cmd === 'category') {
      if (!KEBAB.test(v)) fail(st.valueTok, `category must be one kebab-case word, like "weather", got "${v}"`);
      meta.category = v;
    } else {
      meta.tags = v.split(/[\s,]+/).filter(Boolean);
    }
  }

  function run(list, ctx) {
    for (const st of list) {
      if (tooMany) return;
      try {
        if (st.type === 'meta') directive(st);
        else if (st.type === 'let') ctx.env.set(st.name, evaluate(st.expr, ctx.env));
        else if (st.type === 'shape') shape(st, ctx);
        else block(st, ctx);
      } catch (err) {
        if (!(err instanceof CompileFailure)) throw err;
        errors.push(err.record);
      }
    }
  }

  run(parsed.statements, { env: new Map(), matrix: IDENTITY, notes: [], duotone: false });

  for (const p of padding.values()) {
    const extra = p.count - 1;
    const where = p.note ? ` in ${p.note}` : '';
    const more = extra > 0 ? `, and in ${extra} more ${extra === 1 ? 'copy' : 'copies'}` : '';
    errors.push(errorAt(p.st.tok, `shape leaves the 2 to 22 padding box (${p.sides.join(', ')})${where}${more}`));
  }
  if (duotone && !duotone.parts && !errors.length) warnings.push(errorAt(duotone.st.tok, 'the duotone block is empty', 'warning'));

  const nodes = [];
  const sources = [];
  if (duotone && duotone.parts) {
    nodes.push(['path', { class: 'gf-secondary', d: serializePath(duotone.segs, 2), fill: 'currentColor', stroke: 'none', opacity: '0.3' }]);
    sources.push({ st: duotone.st, note: '' });
  }
  for (const el of elements) {
    nodes.push(el.node);
    sources.push(el);
  }
  if (!errors.length) {
    if (!nodes.length) errors.push({ message: 'the script draws nothing', line: 1, column: 1, length: 1, severity: 'error' });
    else if (!elements.length) errors.push(errorAt(duotone.st.tok, 'the script has only a duotone layer, add stroke shapes too'));
  }

  let body = nodesToString(nodes);
  let svg = canonicalSvg(body);
  if (!errors.length) {
    for (const p of lintSvg(svg)) {
      const m = /#(\d+)/.exec(p.message);
      const source = m ? sources[Number(m[1]) - 1] : null;
      if (p.rule === 'padding' && source && padding.has(source.st)) continue;
      const message = p.message.replace(/^<\w+> #\d+:?\s*/, '');
      if (source) errors.push(errorAt(source.st.tok, `${message}${source.note ? ` (in ${source.note})` : ''}`));
      else errors.push({ message, line: 1, column: 1, length: 1, severity: 'error' });
    }
  }

  const seen = new Set();
  const unique = (list) =>
    list
      .filter((e) => {
        const key = `${e.line}:${e.column}:${e.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.line - b.line || a.column - b.column);
  const errs = unique(errors);
  const warns = unique(warnings);
  const ok = errs.length === 0;
  if (!ok) {
    body = '';
    svg = '';
  }
  const iconName = meta.name || name || 'glyph';
  return {
    ok,
    body,
    svg,
    icon: { name: iconName, body, tags: meta.tags, categories: [meta.category || DEFAULT_CATEGORY] },
    meta: { name: iconName, tags: meta.tags, category: meta.category || DEFAULT_CATEGORY },
    errors: errs,
    warnings: warns,
  };
}

/** Compiles glyph script to a lint passing SVG, or throws the first error. */
export function scriptToSvg(source, options) {
  const r = compileScript(source, options);
  if (!r.ok) {
    const e = r.errors[0];
    throw new GlyphScriptError(e.message, e.line, e.column, e.length);
  }
  return r.svg;
}

/**
 * Formats an error or a warning with the source line and a caret:
 *   file:3:1: unknown command "circel" (did you mean "circle"?)
 *     3 | circel 12 12 4
 *       | ^^^^^^
 */
export function formatError(source, error, { file } = {}) {
  const lines = String(source ?? '').split(/\r\n|\r|\n/);
  const line = Math.max(1, error.line || 1);
  const column = Math.max(1, error.column || 1);
  const text = lines[line - 1] ?? '';
  const label = error.severity === 'warning' ? 'warning: ' : '';
  const head = `${file ? `${file}:` : ''}${line}:${column}: ${label}${error.message}`;
  const gutter = String(line);
  const pad = text.slice(0, column - 1).replace(/[^\t]/g, ' ') + ' '.repeat(Math.max(0, column - 1 - text.length));
  const width = Math.max(1, Math.min(error.length || 1, Math.max(1, text.length - column + 1)));
  return `${head}\n  ${gutter} | ${text}\n  ${' '.repeat(gutter.length)} | ${pad}${'^'.repeat(width)}`;
}
