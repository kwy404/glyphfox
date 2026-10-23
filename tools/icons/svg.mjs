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
];

// Root attributes, in canonical order, with their only accepted values.
export const ROOT_ATTRS = [
  ['xmlns', 'http://www.w3.org/2000/svg'],
  ['width', '24'],
  ['height', '24'],
  ['viewBox', '0 0 24 24'],
  ['fill', 'none'],
  ['stroke', 'currentColor'],
  ['stroke-width', '2'],
  ['stroke-linecap', 'round'],
  ['stroke-linejoin', 'round'],
];

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

export function serializeSvg(svg) {
  const head = ROOT_ATTRS.map(([k, v]) => `${k}="${v}"`).join(' ');
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
