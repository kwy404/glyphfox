// Shared helpers for the glyphfox icon tools: a strict parser for the icon
// SVG subset, the canonical serializer and exact geometry bounds.
// Plain Node (20 or newer), no dependencies.

export const GRID = 24;
export const PADDING = 2;
export const SECONDARY_CLASS = 'gf-secondary';

export const CATEGORIES = [
  'arrows',
  'interface',
  'navigation',
  'files',
  'communication',
  'media',
  'devices',
  'development',
  'data',
  'commerce',
  'finance',
  'weather',
  'nature',
  'maps',
  'people',
  'security',
  'text',
  'shapes',
  'symbols',
  'animals',
  'gaming',
  'space',
  'music',
  'food',
  'sports',
  'travel',
];

// Icon collections: the base set lives in icons/, the signature collections
// in subfolders. Each has its own grid and padding box.
export const COLLECTIONS = {
  base: { dir: '', grid: 24, padding: 2 },
  display: { dir: 'display', grid: 48, padding: 4 },
  animated: { dir: 'animated', grid: 24, padding: 2, animation: true },
  isometric: { dir: 'isometric', grid: 24, padding: 2 },
};

// Names the packages reserve for animation classes.
export const RESERVED_NAMES = ['spin', 'pulse', 'pop', 'wiggle', 'bounce', 'shake', 'draw'];

// Root attributes, in canonical order, with their only accepted values.
export function rootAttrs(grid = GRID) {
  return [
    ['xmlns', 'http://www.w3.org/2000/svg'],
    ['width', String(grid)],
    ['height', String(grid)],
    ['viewBox', `0 0 ${grid} ${grid}`],
    ['fill', 'none'],
    ['stroke', 'currentColor'],
    ['stroke-width', '2'],
    ['stroke-linecap', 'round'],
    ['stroke-linejoin', 'round'],
  ];
}
export const ROOT_ATTRS = rootAttrs(GRID);

// Geometry attributes per element, in canonical order.
export const ELEMENTS = {
  path: { attrs: ['d'], required: ['d'] },
  circle: { attrs: ['cx', 'cy', 'r'], required: ['cx', 'cy', 'r'] },
  ellipse: { attrs: ['cx', 'cy', 'rx', 'ry'], required: ['cx', 'cy', 'rx', 'ry'] },
  rect: { attrs: ['x', 'y', 'width', 'height', 'rx'], required: ['x', 'y', 'width', 'height'] },
  line: { attrs: ['x1', 'y1', 'x2', 'y2'], required: ['x1', 'y1', 'x2', 'y2'] },
  polyline: { attrs: ['points'], required: ['points'] },
  polygon: { attrs: ['points'], required: ['points'] },
};

// Extra attributes of the optional duotone layer, in canonical order.
export const SECONDARY_ATTRS = ['class', 'fill', 'stroke', 'opacity'];
export const SECONDARY_OPACITY = '0.3';

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export class SvgError extends Error {}

// Parses the icon subset of SVG: one <svg> root whose children are empty
// shape elements. Anything else (text, comments, nesting) is an error.
export function parseSvg(text) {
  let i = 0;
  const n = text.length;
  const fail = (msg) => {
    const line = text.slice(0, i).split('\n').length;
    throw new SvgError(`${msg} (line ${line})`);
  };
  const skipWs = () => {
    while (i < n && /\s/.test(text[i])) i++;
  };
  const tagRe = /<(\/?)([A-Za-z][A-Za-z0-9:_.-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  const readTag = () => {
    skipWs();
    if (i >= n) return null;
    if (text[i] !== '<') fail('unexpected text content');
    tagRe.lastIndex = i;
    const m = tagRe.exec(text);
    if (!m) {
      if (text.startsWith('<!--', i)) fail('comments are not allowed');
      if (text.startsWith('<?', i) || text.startsWith('<!', i)) fail('prolog and doctype are not allowed');
      fail('malformed tag');
    }
    i = tagRe.lastIndex;
    const attrs = new Map();
    const attrRe = /\s+([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = attrRe.exec(m[3]))) {
      const name = a[1];
      const value = a[2] !== undefined ? a[2] : a[3];
      if (attrs.has(name)) fail(`duplicate attribute "${name}"`);
      if (/[<&]/.test(value)) fail(`attribute "${name}" contains markup or entities`);
      attrs.set(name, value);
    }
    return { close: m[1] === '/', name: m[2], attrs, selfClosing: m[4] === '/' };
  };

  const root = readTag();
  if (!root || root.close || root.name !== 'svg') fail('the file must start with an <svg> element');
  if (root.selfClosing) fail('the <svg> element is empty');
  const children = [];
  for (;;) {
    const tag = readTag();
    if (!tag) fail('missing </svg>');
    if (tag.close) {
      if (tag.name !== 'svg') fail(`unexpected </${tag.name}>`);
      break;
    }
    if (!tag.selfClosing) {
      const end = readTag();
      if (!end || !end.close || end.name !== tag.name) fail(`<${tag.name}> must be empty (nested content is not allowed)`);
    }
    children.push({ name: tag.name, attrs: tag.attrs });
  }
  skipWs();
  if (i < n) fail('content after </svg>');
  return { attrs: root.attrs, children };
}

export function serializeSvg(svg, grid = GRID) {
  const head = rootAttrs(grid)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  const lines = [`<svg ${head}>`];
  for (const el of svg.children) lines.push(`  ${serializeElement(el)}`);
  lines.push('</svg>');
  return lines.join('\n') + '\n';
}

export function serializeElement(el) {
  const spec = ELEMENTS[el.name];
  const order = [];
  if (el.attrs.has('class')) order.push('class');
  if (spec) order.push(...spec.attrs);
  for (const k of SECONDARY_ATTRS) if (k !== 'class') order.push(k);
  const keys = [...order.filter((k) => el.attrs.has(k)), ...[...el.attrs.keys()].filter((k) => !order.includes(k))];
  return `<${el.name}${keys.map((k) => ` ${k}="${el.attrs.get(k)}"`).join('')}/>`;
}

export function isNumber(s) {
  return typeof s === 'string' && NUMBER_RE.test(s.trim()) && s.trim() === s;
}

export function decimals(s) {
  const m = /\.(\d+)/.exec(s.replace(/[eE].*$/, ''));
  return m ? m[1].length : 0;
}

// ---------------------------------------------------------------- path data

const CMD_ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

// Tokenizes and parses path data into absolute segments.
// Returns { segments, numbers } where numbers lists every numeric token.
export function parsePath(d) {
  let i = 0;
  const n = d.length;
  const numbers = [];
  const skip = () => {
    while (i < n && /[\s,]/.test(d[i])) i++;
  };
  const numRe = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
  const readNumber = () => {
    skip();
    numRe.lastIndex = i;
    const m = numRe.exec(d);
    if (!m) throw new SvgError(`path data: expected a number at offset ${i}`);
    i = numRe.lastIndex;
    numbers.push(m[0]);
    return parseFloat(m[0]);
  };
  const readFlag = () => {
    skip();
    if (d[i] === '0' || d[i] === '1') return d[i++] === '1' ? 1 : 0;
    throw new SvgError(`path data: expected an arc flag at offset ${i}`);
  };
  const atNumber = () => {
    skip();
    return i < n && /[0-9+\-.]/.test(d[i]);
  };

  const segments = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let prevCmd = '';
  let lastCtrl = null; // reflected control point source for S and T
  skip();
  if (i < n && !/[Mm]/.test(d[i])) throw new SvgError('path data must start with a moveto');
  while (true) {
    skip();
    if (i >= n) break;
    const c = d[i];
    if (!/[MmZzLlHhVvCcSsQqTtAa]/.test(c)) throw new SvgError(`path data: unexpected "${c}" at offset ${i}`);
    i++;
    const up = c.toUpperCase();
    const rel = c !== up;
    if (up === 'Z') {
      segments.push({ type: 'L', x0: cx, y0: cy, x: sx, y: sy, close: true });
      cx = sx;
      cy = sy;
      prevCmd = 'Z';
      lastCtrl = null;
      continue;
    }
    let first = true;
    do {
      if (!first && !atNumber()) break;
      let cmd = up;
      if (up === 'M' && !first) cmd = 'L';
      switch (cmd) {
        case 'M': {
          let x = readNumber();
          let y = readNumber();
          if (rel) {
            x += cx;
            y += cy;
          }
          cx = sx = x;
          cy = sy = y;
          segments.push({ type: 'M', x, y });
          lastCtrl = null;
          break;
        }
        case 'L': {
          let x = readNumber();
          let y = readNumber();
          if (rel) {
            x += cx;
            y += cy;
          }
          segments.push({ type: 'L', x0: cx, y0: cy, x, y });
          cx = x;
          cy = y;
          lastCtrl = null;
          break;
        }
        case 'H': {
          let x = readNumber();
          if (rel) x += cx;
          segments.push({ type: 'L', x0: cx, y0: cy, x, y: cy });
          cx = x;
          lastCtrl = null;
          break;
        }
        case 'V': {
          let y = readNumber();
          if (rel) y += cy;
          segments.push({ type: 'L', x0: cx, y0: cy, x: cx, y });
          cy = y;
          lastCtrl = null;
          break;
        }
        case 'C':
        case 'S': {
          let x1;
          let y1;
          if (cmd === 'C') {
            x1 = readNumber();
            y1 = readNumber();
            if (rel) {
              x1 += cx;
              y1 += cy;
            }
          } else if (lastCtrl && lastCtrl.kind === 'C') {
            x1 = 2 * cx - lastCtrl.x;
            y1 = 2 * cy - lastCtrl.y;
          } else {
            x1 = cx;
            y1 = cy;
          }
          let x2 = readNumber();
          let y2 = readNumber();
          let x = readNumber();
          let y = readNumber();
          if (rel) {
            x2 += cx;
            y2 += cy;
            x += cx;
            y += cy;
          }
          segments.push({ type: 'C', x0: cx, y0: cy, x1, y1, x2, y2, x, y });
          lastCtrl = { kind: 'C', x: x2, y: y2 };
          cx = x;
          cy = y;
          break;
        }
        case 'Q':
        case 'T': {
          let x1;
          let y1;
          if (cmd === 'Q') {
            x1 = readNumber();
            y1 = readNumber();
            if (rel) {
              x1 += cx;
              y1 += cy;
            }
          } else if (lastCtrl && lastCtrl.kind === 'Q') {
            x1 = 2 * cx - lastCtrl.x;
            y1 = 2 * cy - lastCtrl.y;
          } else {
            x1 = cx;
            y1 = cy;
          }
          let x = readNumber();
          let y = readNumber();
          if (rel) {
            x += cx;
            y += cy;
          }
          segments.push({ type: 'Q', x0: cx, y0: cy, x1, y1, x, y });
          lastCtrl = { kind: 'Q', x: x1, y: y1 };
          cx = x;
          cy = y;
          break;
        }
        case 'A': {
          const rx = readNumber();
          const ry = readNumber();
          const rot = readNumber();
          const large = readFlag();
          const sweep = readFlag();
          let x = readNumber();
          let y = readNumber();
          if (rel) {
            x += cx;
            y += cy;
          }
          if (rx < 0 || ry < 0) throw new SvgError('path data: negative arc radius');
          segments.push({ type: 'A', x0: cx, y0: cy, rx, ry, rot, large, sweep, x, y });
          cx = x;
          cy = y;
          lastCtrl = null;
          break;
        }
        default:
          throw new SvgError(`path data: unsupported command ${cmd}`);
      }
      prevCmd = cmd;
      first = false;
    } while (CMD_ARGS[up] > 0);
  }
  void prevCmd;
  return { segments, numbers };
}

// ------------------------------------------------------------------- bounds

function emptyBox() {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function addPoint(box, x, y) {
  if (x < box.minX) box.minX = x;
  if (y < box.minY) box.minY = y;
  if (x > box.maxX) box.maxX = x;
  if (y > box.maxY) box.maxY = y;
}

function quadRoots(a, b, c) {
  const eps = 1e-12;
  if (Math.abs(a) < eps) {
    if (Math.abs(b) < eps) return [];
    return [-c / b];
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const s = Math.sqrt(disc);
  return [(-b + s) / (2 * a), (-b - s) / (2 * a)];
}

function cubicAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

export function arcCenter(seg) {
  const { x0: x1, y0: y1, x: x2, y: y2, large, sweep } = seg;
  let rx = Math.abs(seg.rx);
  let ry = Math.abs(seg.ry);
  if (x1 === x2 && y1 === y2) return null;
  if (rx === 0 || ry === 0) return null;
  const phi = (seg.rot * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  let num = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p;
  if (num < 0) num = 0;
  const den = rx2 * y1p * y1p + ry2 * x1p * x1p;
  let coef = den === 0 ? 0 : Math.sqrt(num / den);
  if (large === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  else if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  return { cx, cy, rx, ry, phi, theta1, dtheta };
}

function arcPoint(a, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const cp = Math.cos(a.phi);
  const sp = Math.sin(a.phi);
  return [a.cx + a.rx * cp * c - a.ry * sp * s, a.cy + a.rx * sp * c + a.ry * cp * s];
}

function inSweep(a, theta) {
  const tau = 2 * Math.PI;
  const norm = (v) => ((v % tau) + tau) % tau;
  if (a.dtheta >= 0) return norm(theta - a.theta1) <= a.dtheta + 1e-12;
  return norm(a.theta1 - theta) <= -a.dtheta + 1e-12;
}

export function segmentBounds(seg, box) {
  if (seg.type === 'M') {
    addPoint(box, seg.x, seg.y);
    return;
  }
  addPoint(box, seg.x0, seg.y0);
  addPoint(box, seg.x, seg.y);
  if (seg.type === 'C') {
    for (const axis of ['x', 'y']) {
      const p0 = seg[`${axis}0`];
      const p1 = seg[`${axis}1`];
      const p2 = seg[`${axis}2`];
      const p3 = seg[axis];
      const a = p3 - 3 * p2 + 3 * p1 - p0;
      const b = 2 * (p2 - 2 * p1 + p0);
      const c = p1 - p0;
      for (const t of quadRoots(a, b, c)) {
        if (t > 0 && t < 1) {
          const tx = cubicAt(seg.x0, seg.x1, seg.x2, seg.x, t);
          const ty = cubicAt(seg.y0, seg.y1, seg.y2, seg.y, t);
          addPoint(box, tx, ty);
        }
      }
    }
  } else if (seg.type === 'Q') {
    for (const axis of ['x', 'y']) {
      const p0 = seg[`${axis}0`];
      const p1 = seg[`${axis}1`];
      const p2 = seg[axis];
      const den = p0 - 2 * p1 + p2;
      if (Math.abs(den) > 1e-12) {
        const t = (p0 - p1) / den;
        if (t > 0 && t < 1) {
          const mt = 1 - t;
          const tx = mt * mt * seg.x0 + 2 * mt * t * seg.x1 + t * t * seg.x;
          const ty = mt * mt * seg.y0 + 2 * mt * t * seg.y1 + t * t * seg.y;
          addPoint(box, tx, ty);
        }
      }
    }
  } else if (seg.type === 'A') {
    const a = arcCenter(seg);
    if (!a) return;
    const sp = Math.sin(a.phi);
    const cp = Math.cos(a.phi);
    const tx = Math.atan2(-a.ry * sp, a.rx * cp);
    const ty = Math.atan2(a.ry * cp, a.rx * sp);
    for (const t of [tx, tx + Math.PI, ty, ty + Math.PI]) {
      if (inSweep(a, t)) addPoint(box, ...arcPoint(a, t));
    }
    // Conservative cross check: sample the arc densely as well.
    const steps = 64;
    for (let k = 1; k < steps; k++) addPoint(box, ...arcPoint(a, a.theta1 + (a.dtheta * k) / steps));
  }
}

export function parsePoints(s) {
  const nums = s.trim().split(/[\s,]+/).filter(Boolean);
  if (nums.length < 4 || nums.length % 2) throw new SvgError('points must hold at least two x,y pairs');
  for (const v of nums) if (!NUMBER_RE.test(v)) throw new SvgError(`points: "${v}" is not a number`);
  const pts = [];
  for (let k = 0; k < nums.length; k += 2) pts.push([parseFloat(nums[k]), parseFloat(nums[k + 1])]);
  return { pts, numbers: nums };
}

// Exact bounding box of the center line of one element.
export function elementBounds(el) {
  const box = emptyBox();
  const num = (k, def = 0) => (el.attrs.has(k) ? parseFloat(el.attrs.get(k)) : def);
  switch (el.name) {
    case 'path': {
      const { segments } = parsePath(el.attrs.get('d'));
      for (const seg of segments) segmentBounds(seg, box);
      break;
    }
    case 'circle': {
      const r = num('r');
      addPoint(box, num('cx') - r, num('cy') - r);
      addPoint(box, num('cx') + r, num('cy') + r);
      break;
    }
    case 'ellipse': {
      addPoint(box, num('cx') - num('rx'), num('cy') - num('ry'));
      addPoint(box, num('cx') + num('rx'), num('cy') + num('ry'));
      break;
    }
    case 'rect': {
      addPoint(box, num('x'), num('y'));
      addPoint(box, num('x') + num('width'), num('y') + num('height'));
      break;
    }
    case 'line': {
      addPoint(box, num('x1'), num('y1'));
      addPoint(box, num('x2'), num('y2'));
      break;
    }
    case 'polyline':
    case 'polygon': {
      for (const [x, y] of parsePoints(el.attrs.get('points')).pts) addPoint(box, x, y);
      break;
    }
    default:
      break;
  }
  return box;
}

export function readIconFile(text) {
  return parseSvg(stripBom(text));
}

export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// ---------------------------------------------------------------- animation
//
// Designed animations live in the JSON sidecar as a frame timeline, the
// format packages/glyphfox/src/core/timeline.js plays:
//
//   "animation": {
//     "name": "swing",               kebab-case name of the motion
//     "duration": 900,               one run in milliseconds (200 to 10000)
//     "easing": "ease-in-out",       timing between frames (optional)
//     "loop": false,                 true, false or a number of runs (optional)
//     "origin": [12, 3],             transform origin in grid units (optional, default [12, 12])
//     "frames": [
//       { "at": 0, "element": 0, "props": { "transform": "rotate(0deg)" } },
//       { "at": 0.3, "element": 0, "props": { "transform": "rotate(12deg)" }, "easing": "ease-out" },
//       { "at": 1, "element": 0, "props": { "transform": "rotate(0deg)" } }
//     ]
//   }
//
// element is the index of a drawn element (the duotone layer is not counted),
// "all" for the whole icon or "secondary" for the duotone layer. props takes
// transform (translate in px, which are grid units, rotate in deg, scale),
// opacity, strokeDashoffset (0 drawn to 1 hidden, the element is drawn with
// pathLength 1) and d (path data with the same commands as the element). A
// frame easing applies from that frame to the next one. Every track starts at
// 0, ends at 1 and keeps the same transform functions in every frame, so CSS,
// the Web Animations API and frame export all interpolate it the same way.

const EASING_RE =
  /^(linear|ease|ease-in|ease-out|ease-in-out|steps\(\d+(,\s*(start|end|jump-start|jump-end|jump-none|jump-both))?\)|cubic-bezier\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\))$/;
const TIMELINE_KEYS = ['name', 'duration', 'easing', 'loop', 'origin', 'frames'];
const FRAME_KEYS = ['at', 'element', 'props', 'easing'];
const PROP_KEYS = ['transform', 'opacity', 'strokeDashoffset', 'd'];
const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const LEN = '-?(?:\\d+\\.?\\d*|\\.\\d+)';
const FN_RE = new RegExp(`\\s*(translate|rotate|scale)\\(([^()]*)\\)\\s*`, 'y');
const PX_RE = new RegExp(`^${LEN}px$`);
const DEG_RE = new RegExp(`^${LEN}deg$`);
const NUM_RE = new RegExp(`^${LEN}$`);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPair = (v) => Array.isArray(v) && v.length === 2 && v.every(isNum);

// Reads a CSS transform made of translate(), rotate() and scale().
export function parseTransform(text) {
  const list = [];
  let pos = 0;
  const s = String(text);
  while (pos < s.length) {
    FN_RE.lastIndex = pos;
    const m = FN_RE.exec(s);
    if (!m) throw new Error(`cannot read transform "${s}"`);
    const fn = m[1];
    const args = m[2].split(',').map((a) => a.trim());
    let vals;
    if (fn === 'translate') {
      if (args.length < 1 || args.length > 2 || !args.every((a) => PX_RE.test(a))) throw new Error(`translate() takes one or two px lengths in "${s}"`);
      vals = [parseFloat(args[0]), args.length > 1 ? parseFloat(args[1]) : 0];
    } else if (fn === 'rotate') {
      if (args.length !== 1 || !DEG_RE.test(args[0])) throw new Error(`rotate() takes an angle in deg in "${s}"`);
      vals = [parseFloat(args[0])];
    } else {
      if (args.length < 1 || args.length > 2 || !args.every((a) => NUM_RE.test(a))) throw new Error(`scale() takes one or two numbers in "${s}"`);
      vals = [parseFloat(args[0]), args.length > 1 ? parseFloat(args[1]) : parseFloat(args[0])];
    }
    list.push({ fn, vals, arity: args.length });
    pos = FN_RE.lastIndex;
  }
  if (!list.length) throw new Error('empty transform');
  return list;
}

const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
const IDENTITY = [1, 0, 0, 1, 0, 0];

// Matrix of a parsed transform applied about an origin, as CSS does with
// transform-box: view-box.
export function transformMatrix(list, origin = [GRID / 2, GRID / 2]) {
  let m = [1, 0, 0, 1, origin[0], origin[1]];
  for (const { fn, vals } of list) {
    if (fn === 'translate') m = mul(m, [1, 0, 0, 1, vals[0], vals[1]]);
    else if (fn === 'rotate') {
      const r = (vals[0] * Math.PI) / 180;
      m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]);
    } else m = mul(m, [vals[0], 0, 0, vals[1], 0, 0]);
  }
  return mul(m, [1, 0, 0, 1, -origin[0], -origin[1]]);
}

const applyMatrix = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// Value of one numeric or transform property of a track at progress t
// (linear between frames, enough for the canvas check).
function trackValue(frames, key, t) {
  const withP = frames.filter((f) => f.props && f.props[key] !== undefined);
  if (!withP.length) return undefined;
  let i = 0;
  while (i < withP.length - 2 && t > withP[i + 1].at) i++;
  const a = withP[i];
  const b = withP[Math.min(i + 1, withP.length - 1)];
  const span = b.at - a.at;
  const u = span > 0 ? Math.max(0, Math.min(1, (t - a.at) / span)) : 0;
  if (key === 'transform') {
    const la = a.parsed;
    const lb = b.parsed;
    if (!la || !lb) return null;
    return la.map((fa, k) => ({ fn: fa.fn, vals: fa.vals.map((v, j) => v + (lb[k].vals[j] - v) * u) }));
  }
  return a.props[key] + (b.props[key] - a.props[key]) * u;
}

// Returns a list of problems with an animation timeline.
export function animationProblems(anim, svg, grid = GRID) {
  const out = [];
  if (!anim || typeof anim !== 'object' || Array.isArray(anim)) return ['animation must be an object'];
  for (const k of Object.keys(anim)) if (!TIMELINE_KEYS.includes(k)) out.push(`animation: unknown key "${k}"`);
  if (typeof anim.name !== 'string' || !NAME_RE.test(anim.name)) out.push('animation.name must be a kebab-case name');
  if (!Number.isInteger(anim.duration) || anim.duration < 200 || anim.duration > 10000) {
    out.push('animation.duration must be a whole number of milliseconds from 200 to 10000');
  }
  if (anim.easing !== undefined && !(typeof anim.easing === 'string' && EASING_RE.test(anim.easing))) out.push(`animation.easing "${anim.easing}" is not a supported easing`);
  if (anim.loop !== undefined && typeof anim.loop !== 'boolean' && !(Number.isInteger(anim.loop) && anim.loop >= 1 && anim.loop <= 100)) {
    out.push('animation.loop must be true, false or a whole number of runs from 1 to 100');
  }
  if (anim.origin !== undefined && !(isPair(anim.origin) && anim.origin.every((v) => v >= 0 && v <= grid))) out.push('animation.origin must be [x, y] inside the grid');
  const origin = isPair(anim.origin) ? anim.origin : [grid / 2, grid / 2];
  if (!Array.isArray(anim.frames) || !anim.frames.length) {
    out.push('animation.frames must be a non-empty array');
    return out;
  }
  const drawn = svg.children.filter((c) => !c.attrs.has('class'));
  const secondary = svg.children.find((c) => c.attrs.has('class'));
  const tracks = new Map();
  anim.frames.forEach((fr, n) => {
    const where = `animation.frames[${n}]`;
    if (!fr || typeof fr !== 'object' || Array.isArray(fr)) {
      out.push(`${where} must be an object`);
      return;
    }
    for (const k of Object.keys(fr)) if (!FRAME_KEYS.includes(k)) out.push(`${where}: unknown key "${k}"`);
    if (!isNum(fr.at) || fr.at < 0 || fr.at > 1) out.push(`${where}.at must be a number from 0 to 1`);
    else if (decimals(String(fr.at)) > 3) out.push(`${where}.at has more than 3 decimals`);
    let key;
    if (fr.element === 'all' || fr.element === 'secondary') key = fr.element;
    else if (Number.isInteger(fr.element) && fr.element >= 0 && fr.element < drawn.length) key = fr.element;
    else {
      out.push(`${where}.element must be the index of a drawn element, "all" or "secondary"`);
      return;
    }
    if (key === 'secondary' && !secondary) out.push(`${where}: the icon has no duotone layer`);
    if (fr.easing !== undefined && !(typeof fr.easing === 'string' && EASING_RE.test(fr.easing))) out.push(`${where}.easing "${fr.easing}" is not a supported easing`);
    const props = fr.props;
    if (!props || typeof props !== 'object' || Array.isArray(props) || !Object.keys(props).length) {
      out.push(`${where}.props must be an object with at least one property`);
      return;
    }
    for (const k of Object.keys(props)) if (!PROP_KEYS.includes(k)) out.push(`${where}.props: unknown property "${k}" (use ${PROP_KEYS.join(', ')})`);
    const entry = { at: fr.at, props, parsed: null, where };
    if (props.transform !== undefined) {
      try {
        entry.parsed = parseTransform(props.transform);
      } catch (err) {
        out.push(`${where}.props.transform: ${err.message}`);
      }
    }
    if (props.opacity !== undefined && !(isNum(props.opacity) && props.opacity >= 0 && props.opacity <= 1)) out.push(`${where}.props.opacity must be from 0 to 1`);
    if (props.strokeDashoffset !== undefined) {
      if (!(isNum(props.strokeDashoffset) && props.strokeDashoffset >= 0 && props.strokeDashoffset <= 1)) out.push(`${where}.props.strokeDashoffset must be from 0 (drawn) to 1 (hidden)`);
      if (typeof key !== 'number') out.push(`${where}: strokeDashoffset needs a drawn element`);
    }
    if (props.d !== undefined) {
      const target = typeof key === 'number' ? drawn[key] : key === 'secondary' ? secondary : null;
      if (!target || target.name !== 'path') out.push(`${where}: d needs a path element`);
      else {
        try {
          const a = parsePath(String(props.d)).segments.map((s) => s.type).join('');
          const b = parsePath(target.attrs.get('d')).segments.map((s) => s.type).join('');
          if (a !== b) out.push(`${where}.props.d must use the same commands as the element`);
          const box = elementBounds({ name: 'path', attrs: new Map([['d', String(props.d)]]) });
          if (box.minX < 1 - 1e-6 || box.minY < 1 - 1e-6 || box.maxX > grid - 1 + 1e-6 || box.maxY > grid - 1 + 1e-6) out.push(`${where}.props.d leaves the canvas`);
        } catch (err) {
          out.push(`${where}.props.d: ${err.message}`);
        }
      }
    }
    if (!tracks.has(key)) tracks.set(key, []);
    tracks.get(key).push(entry);
  });
  // tracks: ordered, complete and interpolable
  for (const [key, frames] of tracks) {
    const label = typeof key === 'number' ? `element ${key}` : `"${key}"`;
    for (let i = 1; i < frames.length; i++) if (!(frames[i].at > frames[i - 1].at)) out.push(`${label}: frames must be listed in growing "at" order`);
    if (frames[0].at !== 0) out.push(`${label}: the first frame needs at 0`);
    if (frames[frames.length - 1].at !== 1) out.push(`${label}: the last frame needs at 1`);
    const shapes = frames.filter((f) => f.parsed).map((f) => f.parsed.map((p) => `${p.fn}/${p.arity}`).join(' '));
    if (new Set(shapes).size > 1) out.push(`${label}: every frame needs the same transform functions (${[...new Set(shapes)].join(' | ')})`);
    for (const p of PROP_KEYS) {
      const withP = frames.filter((f) => f.props[p] !== undefined);
      if (withP.length && (withP[0].at !== 0 || withP[withP.length - 1].at !== 1)) out.push(`${label}: ${p} needs a value at 0 and at 1`);
    }
    if (frames.length < 2) out.push(`${label}: a track needs at least two frames`);
  }
  if (out.length) return out;
  // Every visible pose, including the ones between frames, keeps the stroke on
  // the canvas (one grid unit of margin). Nearly transparent poses may leave it.
  const times = [...new Set(anim.frames.map((f) => f.at))].sort((a, b) => a - b);
  const samples = [];
  for (let i = 0; i < times.length; i++) {
    samples.push(times[i]);
    if (i + 1 < times.length) for (let s = 1; s < 8; s++) samples.push(times[i] + ((times[i + 1] - times[i]) * s) / 8);
  }
  const pose = (k, t) => {
    const frames = tracks.get(k);
    if (!frames) return { m: IDENTITY, o: 1 };
    const tf = trackValue(frames, 'transform', t);
    const o = trackValue(frames, 'opacity', t);
    return { m: tf ? transformMatrix(tf, origin) : IDENTITY, o: o === undefined ? 1 : o };
  };
  const targets = drawn.map((el, i) => ({ el, key: i }));
  if (secondary) targets.push({ el: secondary, key: 'secondary' });
  for (const { el, key } of targets) {
    if (!tracks.has(key) && !tracks.has('all')) continue;
    let points;
    try {
      points = elementPoints(el);
    } catch {
      continue;
    }
    for (const t of samples) {
      const all = pose('all', t);
      const own = pose(key, t);
      if (all.o * own.o < 0.35) continue;
      const m = mul(all.m, own.m);
      const off = points.some((p) => {
        const [x, y] = applyMatrix(m, p);
        return x < 1 - 1e-6 || y < 1 - 1e-6 || x > grid - 1 + 1e-6 || y > grid - 1 + 1e-6;
      });
      if (off) {
        out.push(`the pose near at ${Math.round(t * 100) / 100} moves ${typeof key === 'number' ? `element ${key}` : 'the duotone layer'} off the canvas`);
        return out;
      }
    }
  }
  return out;
}

// Points along the outline of one element, for pose checks.
export function elementPoints(el) {
  const pts = [];
  const num = (k, def = 0) => (el.attrs.has(k) ? parseFloat(el.attrs.get(k)) : def);
  const ring = (cx, cy, rx, ry) => {
    for (let k = 0; k < 48; k++) pts.push([cx + rx * Math.cos((k / 48) * 2 * Math.PI), cy + ry * Math.sin((k / 48) * 2 * Math.PI)]);
  };
  switch (el.name) {
    case 'circle':
      ring(num('cx'), num('cy'), num('r'), num('r'));
      break;
    case 'ellipse':
      ring(num('cx'), num('cy'), num('rx'), num('ry'));
      break;
    case 'rect': {
      const x = num('x');
      const y = num('y');
      const w = num('width');
      const h = num('height');
      const rx = Math.min(num('rx', num('ry')), w / 2);
      const ry = Math.min(num('ry', num('rx')), h / 2);
      if (!rx || !ry) {
        pts.push([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
        break;
      }
      // rounded corners: quarter ellipses around the four corner centers
      for (const [cx, cy, a0] of [
        [x + w - rx, y + ry, -90],
        [x + w - rx, y + h - ry, 0],
        [x + rx, y + h - ry, 90],
        [x + rx, y + ry, 180],
      ]) {
        for (let k = 0; k <= 8; k++) {
          const a = ((a0 + (90 * k) / 8) * Math.PI) / 180;
          pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
        }
      }
      break;
    }
    case 'line':
      pts.push([num('x1'), num('y1')], [num('x2'), num('y2')]);
      break;
    case 'polyline':
    case 'polygon':
      pts.push(...parsePoints(el.attrs.get('points')).pts);
      break;
    case 'path':
      for (const s of parsePath(el.attrs.get('d')).segments) {
        if (s.type === 'M') {
          pts.push([s.x, s.y]);
          continue;
        }
        for (let k = 1; k <= 16; k++) {
          const t = k / 16;
          if (s.type === 'L') pts.push([s.x0 + (s.x - s.x0) * t, s.y0 + (s.y - s.y0) * t]);
          else if (s.type === 'C') pts.push([cubicAt(s.x0, s.x1, s.x2, s.x, t), cubicAt(s.y0, s.y1, s.y2, s.y, t)]);
          else if (s.type === 'Q') {
            const mt = 1 - t;
            pts.push([mt * mt * s.x0 + 2 * mt * t * s.x1 + t * t * s.x, mt * mt * s.y0 + 2 * mt * t * s.y1 + t * t * s.y]);
          } else if (s.type === 'A') {
            const a = arcCenter(s);
            pts.push(a ? arcPoint(a, a.theta1 + a.dtheta * t) : [s.x, s.y]);
          }
        }
      }
      break;
    default:
      break;
  }
  return pts;
}

function inline(v) {
  return Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v);
}

// Canonical sidecar text: categories and tags one per line, animation frames
// one per line so diffs stay readable.
export function canonicalJson(data) {
  const list = (key, arr) => `  "${key}": [\n${arr.map((v) => `    ${JSON.stringify(v)}`).join(',\n')}\n  ]`;
  const parts = [list('categories', data.categories), list('tags', data.tags)];
  if (data.animation && typeof data.animation === 'object') {
    const a = data.animation;
    const head = [];
    for (const k of ['name', 'duration', 'easing', 'loop', 'origin']) if (a[k] !== undefined) head.push(`    "${k}": ${inline(a[k])}`);
    const frames = (Array.isArray(a.frames) ? a.frames : []).map((fr) => {
      const fields = [];
      for (const k of ['at', 'element']) if (fr && fr[k] !== undefined) fields.push(`"${k}": ${JSON.stringify(fr[k])}`);
      if (fr && fr.props && typeof fr.props === 'object') {
        const keys = [...PROP_KEYS.filter((k) => fr.props[k] !== undefined), ...Object.keys(fr.props).filter((k) => !PROP_KEYS.includes(k))];
        fields.push(`"props": { ${keys.map((k) => `"${k}": ${JSON.stringify(fr.props[k])}`).join(', ')} }`);
      }
      if (fr && fr.easing !== undefined) fields.push(`"easing": ${JSON.stringify(fr.easing)}`);
      for (const k of Object.keys(fr || {})) if (!FRAME_KEYS.includes(k)) fields.push(`"${k}": ${JSON.stringify(fr[k])}`);
      return `      { ${fields.join(', ')} }`;
    });
    head.push(`    "frames": [\n${frames.join(',\n')}\n    ]`);
    for (const k of Object.keys(a)) if (!TIMELINE_KEYS.includes(k)) head.push(`    "${k}": ${JSON.stringify(a[k])}`);
    parts.push(`  "animation": {\n${head.join(',\n')}\n  }`);
  }
  return `{\n${parts.join(',\n')}\n}\n`;
}
