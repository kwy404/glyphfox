// Icon editor on the 24 grid: pen (bezier), line, polyline, rect, rounded
// rect, circle, ellipse and arc tools, snapping, node editing, move,
// undo and redo, SVG import (normalized by Fox-ify), live lint, previews
// in context and the local collection.

import { $, $$, copy, download, gf, svg, t, toast } from './app.js';
import * as collection from './collection.js';

const G = gf.geometry;
const TOOLS = [
  ['select', 'V', 'cursor', 'editor.tool.select'],
  ['pen', 'P', 'pencil', 'editor.tool.pen'],
  ['line', 'L', 'minus', 'editor.tool.line'],
  ['polyline', 'Y', 'activity', 'editor.tool.polyline'],
  ['rect', 'R', 'square', 'editor.tool.rect'],
  ['rrect', 'U', 'app-window', 'editor.tool.rrect'],
  ['circle', 'C', 'circle', 'editor.tool.circle'],
  ['ellipse', 'E', 'disc', 'editor.tool.ellipse'],
  ['arc', 'A', 'rotate-cw', 'editor.tool.arc'],
];

const r2 = (v) => Math.round(v * 100) / 100;
let el;
let shapes = [];
let selected = -1;
let tool = 'pen';
let step = 0.5;
let history = [];
let hIndex = -1;
let draft = null;
let drag = null;
let hover = null;
let editing = null;
let categories = ['shapes'];

function snap(v) {
  return step ? Math.round(v / step) * step : r2(v);
}

function toPoint(e) {
  const pt = el.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(el.getScreenCTM().inverse());
  return [snap(p.x), snap(p.y)];
}

// Shapes and nodes.

function nodeOfShape(s) {
  const extra = s.secondary ? { class: 'gf-secondary' } : {};
  const tail = s.secondary ? { fill: 'currentColor', stroke: 'none', opacity: '0.3' } : {};
  switch (s.type) {
    case 'line':
      return ['line', { ...extra, x1: r2(s.x1), y1: r2(s.y1), x2: r2(s.x2), y2: r2(s.y2), ...tail }];
    case 'polyline':
      return [s.closed ? 'polygon' : 'polyline', { ...extra, points: s.points.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' '), ...tail }];
    case 'rect': {
      const a = { ...extra, x: r2(s.x), y: r2(s.y), width: r2(s.w), height: r2(s.h) };
      if (s.rx > 0) a.rx = r2(Math.min(s.rx, s.w / 2, s.h / 2));
      return ['rect', { ...a, ...tail }];
    }
    case 'circle':
      return ['circle', { ...extra, cx: r2(s.cx), cy: r2(s.cy), r: r2(s.r), ...tail }];
    case 'ellipse':
      return ['ellipse', { ...extra, cx: r2(s.cx), cy: r2(s.cy), rx: r2(s.rx), ry: r2(s.ry), ...tail }];
    default:
      return ['path', { ...extra, d: G.serializePath(s.segs, 2), ...tail }];
  }
}

function shapeOfNode(node) {
  const [tag, a] = node;
  const n = (k) => Number(a[k]) || 0;
  const secondary = a.class === 'gf-secondary';
  const pts = () =>
    String(a.points || '')
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .reduce((acc, v, i, arr) => (i % 2 ? acc : acc.concat([[v, arr[i + 1]]])), []);
  switch (tag) {
    case 'line':
      return { type: 'line', x1: n('x1'), y1: n('y1'), x2: n('x2'), y2: n('y2'), secondary };
    case 'polyline':
    case 'polygon':
      return { type: 'polyline', points: pts(), closed: tag === 'polygon', secondary };
    case 'rect':
      return { type: 'rect', x: n('x'), y: n('y'), w: n('width'), h: n('height'), rx: n('rx'), secondary };
    case 'circle':
      return { type: 'circle', cx: n('cx'), cy: n('cy'), r: n('r'), secondary };
    case 'ellipse':
      return { type: 'ellipse', cx: n('cx'), cy: n('cy'), rx: n('rx'), ry: n('ry'), secondary };
    case 'path':
      return { type: 'path', segs: G.parsePath(a.d || ''), secondary };
    default:
      return null;
  }
}

export function bodyOf(list = shapes) {
  const ordered = [...list].sort((a, b) => Number(Boolean(b.secondary)) - Number(Boolean(a.secondary)));
  return gf.nodesToString(ordered.map(nodeOfShape));
}

function setBody(body) {
  shapes = gf
    .parseBody(body)
    .map(shapeOfNode)
    .filter(Boolean);
  selected = -1;
}

function translate(s, dx, dy) {
  switch (s.type) {
    case 'line':
      s.x1 += dx;
      s.y1 += dy;
      s.x2 += dx;
      s.y2 += dy;
      break;
    case 'polyline':
      s.points = s.points.map(([x, y]) => [x + dx, y + dy]);
      break;
    case 'rect':
      s.x += dx;
      s.y += dy;
      break;
    case 'circle':
    case 'ellipse':
      s.cx += dx;
      s.cy += dy;
      break;
    default:
      s.segs = G.transformSegments(s.segs, [1, 0, 0, 1, dx, dy]);
  }
}

/** Editable handles of a shape: [{ x, y, kind, set(x, y) }]. */
function handles(s) {
  const out = [];
  switch (s.type) {
    case 'line':
      out.push({ x: s.x1, y: s.y1, set: (x, y) => ((s.x1 = x), (s.y1 = y)) });
      out.push({ x: s.x2, y: s.y2, set: (x, y) => ((s.x2 = x), (s.y2 = y)) });
      break;
    case 'polyline':
      s.points.forEach((p, i) => out.push({ x: p[0], y: p[1], set: (x, y) => (s.points[i] = [x, y]) }));
      break;
    case 'rect': {
      const corner = (fx, fy) => ({
        x: s.x + fx * s.w,
        y: s.y + fy * s.h,
        set: (x, y) => {
          const x0 = fx ? s.x : s.x + s.w;
          const y0 = fy ? s.y : s.y + s.h;
          s.x = Math.min(x, x0);
          s.y = Math.min(y, y0);
          s.w = Math.max(0.25, Math.abs(x - x0));
          s.h = Math.max(0.25, Math.abs(y - y0));
        },
      });
      out.push(corner(0, 0), corner(1, 0), corner(0, 1), corner(1, 1));
      out.push({ x: s.x + Math.min(s.rx || 0, s.w / 2), y: s.y, kind: 'ctrl', set: (x) => (s.rx = Math.max(0, Math.min(x - s.x, s.w / 2, s.h / 2))) });
      break;
    }
    case 'circle':
      out.push({ x: s.cx, y: s.cy, set: (x, y) => ((s.cx = x), (s.cy = y)) });
      out.push({ x: s.cx + s.r, y: s.cy, kind: 'ctrl', set: (x, y) => (s.r = Math.max(0.25, Math.hypot(x - s.cx, y - s.cy))) });
      break;
    case 'ellipse':
      out.push({ x: s.cx, y: s.cy, set: (x, y) => ((s.cx = x), (s.cy = y)) });
      out.push({ x: s.cx + s.rx, y: s.cy, kind: 'ctrl', set: (x) => (s.rx = Math.max(0.25, Math.abs(x - s.cx))) });
      out.push({ x: s.cx, y: s.cy + s.ry, kind: 'ctrl', set: (x, y) => (s.ry = Math.max(0.25, Math.abs(y - s.cy))) });
      break;
    default: {
      const segs = s.segs;
      segs.forEach((seg, i) => {
        const t0 = seg[0];
        if (t0 === 'Z') return;
        const n = seg.length;
        out.push({
          x: seg[n - 2],
          y: seg[n - 1],
          set: (x, y) => {
            const dx = x - seg[n - 2];
            const dy = y - seg[n - 1];
            seg[n - 2] = x;
            seg[n - 1] = y;
            if (t0 === 'C') {
              seg[3] += dx;
              seg[4] += dy;
            }
            const next = segs[i + 1];
            if (next && next[0] === 'C') {
              next[1] += dx;
              next[2] += dy;
            }
          },
        });
        if (t0 === 'C') {
          const prev = i > 0 ? segs[i - 1] : null;
          const p0 = prev ? [prev[prev.length - 2], prev[prev.length - 1]] : null;
          out.push({ x: seg[1], y: seg[2], kind: 'ctrl', from: p0, set: (x, y) => ((seg[1] = x), (seg[2] = y)) });
          out.push({ x: seg[3], y: seg[4], kind: 'ctrl', from: [seg[5], seg[6]], set: (x, y) => ((seg[3] = x), (seg[4] = y)) });
        } else if (t0 === 'Q') {
          out.push({ x: seg[1], y: seg[2], kind: 'ctrl', set: (x, y) => ((seg[1] = x), (seg[2] = y)) });
        }
      });
    }
  }
  return out;
}

// History.

function commit() {
  const snap0 = JSON.stringify(shapes);
  if (history[hIndex] === snap0) return;
  history = history.slice(0, hIndex + 1);
  history.push(snap0);
  if (history.length > 200) history.shift();
  hIndex = history.length - 1;
  persistDraft();
}

function undo() {
  if (hIndex <= 0) return;
  hIndex--;
  shapes = JSON.parse(history[hIndex]);
  selected = Math.min(selected, shapes.length - 1);
  render();
}

function redo() {
  if (hIndex >= history.length - 1) return;
  hIndex++;
  shapes = JSON.parse(history[hIndex]);
  render();
}

function persistDraft() {
  try {
    sessionStorage.setItem('gf-editor-draft', JSON.stringify({ shapes, name: $('[data-ed-name]').value }));
  } catch {
    // ignore
  }
}

// Drawing tools.

function circleThrough(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const sa = a[0] * a[0] + a[1] * a[1];
  const sb = b[0] * b[0] + b[1] * b[1];
  const sc = c[0] * c[0] + c[1] * c[1];
  const x = (sa * (b[1] - c[1]) + sb * (c[1] - a[1]) + sc * (a[1] - b[1])) / d;
  const y = (sa * (c[0] - b[0]) + sb * (a[0] - c[0]) + sc * (b[0] - a[0])) / d;
  return { x, y, r: Math.hypot(a[0] - x, a[1] - y) };
}

function arcShape(a, b, p) {
  const c = circleThrough(a, b, p);
  if (!c || c.r > 200) return { type: 'path', segs: [['M', a[0], a[1]], ['L', b[0], b[1]]] };
  const TAU = Math.PI * 2;
  const ang = (q) => Math.atan2(q[1] - c.y, q[0] - c.x);
  const norm = (v) => ((v % TAU) + TAU) % TAU;
  const ab = norm(ang(b) - ang(a));
  const ap = norm(ang(p) - ang(a));
  const sweep = ap < ab ? 1 : 0;
  const delta = sweep ? ab : TAU - ab;
  const large = delta > Math.PI ? 1 : 0;
  return { type: 'path', segs: [['M', a[0], a[1]], ['A', r2(c.r), r2(c.r), 0, large, sweep, b[0], b[1]]] };
}

function penSegs(d) {
  const a = d.anchors;
  const segs = [['M', a[0].x, a[0].y]];
  const link = (p, q) => {
    if (p.out || q.in) {
      const c1 = p.out || [p.x, p.y];
      const c2 = q.in || [q.x, q.y];
      segs.push(['C', c1[0], c1[1], c2[0], c2[1], q.x, q.y]);
    } else segs.push(['L', q.x, q.y]);
  };
  for (let i = 1; i < a.length; i++) link(a[i - 1], a[i]);
  if (d.closed && a.length > 2) {
    link(a[a.length - 1], a[0]);
    segs.push(['Z']);
  }
  return segs;
}

function draftShape() {
  if (!draft) return null;
  const { type, a, b } = draft;
  switch (type) {
    case 'line':
      return { type: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
    case 'rect':
    case 'rrect': {
      const w = Math.abs(b[0] - a[0]);
      const h = Math.abs(b[1] - a[1]);
      return { type: 'rect', x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w, h, rx: type === 'rrect' ? Math.min(2, w / 2, h / 2) : 0 };
    }
    case 'circle':
      return { type: 'circle', cx: a[0], cy: a[1], r: Math.hypot(b[0] - a[0], b[1] - a[1]) };
    case 'ellipse':
      return { type: 'ellipse', cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, rx: Math.abs(b[0] - a[0]) / 2, ry: Math.abs(b[1] - a[1]) / 2 };
    case 'polyline':
      return { type: 'polyline', points: [...draft.points, b], closed: false };
    case 'arc':
      return draft.b2 ? arcShape(draft.a, draft.b2, b) : { type: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
    case 'pen': {
      const tmp = { anchors: [...draft.anchors], closed: false };
      if (!draft.down && b) tmp.anchors = [...tmp.anchors, { x: b[0], y: b[1] }];
      return tmp.anchors.length > 1 ? { type: 'path', segs: penSegs(tmp) } : null;
    }
    default:
      return null;
  }
}

function finishDraft() {
  if (!draft) return;
  let s = null;
  if (draft.type === 'pen') {
    if (draft.anchors.length > 1) s = { type: 'path', segs: penSegs(draft) };
  } else if (draft.type === 'polyline') {
    if (draft.points.length > 1) s = { type: 'polyline', points: draft.points, closed: false };
  }
  draft = null;
  if (s) {
    shapes.push(s);
    selected = shapes.length - 1;
    commit();
  }
  render();
}

function valid(s) {
  if (!s) return false;
  if (s.type === 'line') return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 0.01;
  if (s.type === 'rect') return s.w > 0.1 && s.h > 0.1;
  if (s.type === 'circle') return s.r > 0.1;
  if (s.type === 'ellipse') return s.rx > 0.1 && s.ry > 0.1;
  return true;
}

// Rendering.

let gridMarkup = '';
function buildGrid() {
  let g = '<g class="grid-layer">';
  for (let i = 0; i <= 24; i += 0.5) {
    const cls = i % 1 === 0 ? 'grid1' : 'grid2';
    g += `<path class="${cls}" d="M${i} 0V24M0 ${i}H24"/>`;
  }
  g += '<path class="center" d="M12 0V24M0 12H24"/><rect class="pad" x="2" y="2" width="20" height="20" rx=".4"/></g>';
  gridMarkup = g;
}

function render() {
  if (!el) return;
  const nodes = shapes.map(nodeOfShape);
  let content = '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  shapes.forEach((s, i) => {
    const [tag, attrs] = nodes[i];
    const cls = ['shape', i === selected ? 'selected' : '', s.secondary ? 'gf-secondary' : ''].filter(Boolean).join(' ');
    content += gf.nodesToString([tag, { ...attrs, class: cls, 'data-i': String(i) }]);
  });
  const d = draftShape();
  if (d && valid(d)) content += gf.nodesToString(nodeOfShape(d)).replace(/^<(\w+)/, '<$1 class="ghost"');
  content += '</g><g fill="none" stroke="transparent" stroke-width="1.4">';
  shapes.forEach((s, i) => {
    if (s.secondary) return;
    content += gf.nodesToString(nodes[i]).replace(/^<(\w+)/, `<$1 data-i="${i}" style="pointer-events:stroke"`);
  });
  content += '</g>';
  if (selected >= 0 && shapes[selected] && tool === 'select') {
    const hs = handles(shapes[selected]);
    let lines = '';
    let dots = '';
    hs.forEach((h, k) => {
      if (h.kind === 'ctrl' && h.from) lines += `<path class="ctrl-line" d="M${h.from[0]} ${h.from[1]}L${h.x} ${h.y}"/>`;
      dots += h.kind === 'ctrl' ? `<circle class="handle ctrl" data-h="${k}" cx="${h.x}" cy="${h.y}" r=".28"/>` : `<rect class="handle" data-h="${k}" x="${h.x - 0.3}" y="${h.y - 0.3}" width=".6" height=".6" rx=".1"/>`;
    });
    content += lines + dots;
  }
  if (draft && draft.type === 'pen') {
    content += draft.anchors.map((a) => `<rect class="handle" x="${a.x - 0.25}" y="${a.y - 0.25}" width=".5" height=".5" rx=".1"/>`).join('');
  }
  if (hover && tool !== 'select') content += `<circle class="cursor-dot" cx="${hover[0]}" cy="${hover[1]}" r=".18"/>`;
  el.innerHTML = gridMarkup + content;
  el.classList.toggle('select', tool === 'select');
  renderSide();
}

let sideTimer = 0;
function renderSide() {
  clearTimeout(sideTimer);
  sideTimer = setTimeout(() => {
    const body = bodyOf();
    const problems = shapes.length ? gf.lintBody(body) : [];
    const lint = $('[data-ed-lint]');
    if (!shapes.length) lint.innerHTML = `<li>${t('editor.lint.empty')}</li>`;
    else if (!problems.length) lint.innerHTML = `<li class="ok">${t('editor.lint.ok')}</li>`;
    else lint.innerHTML = problems.map((p) => `<li class="bad" data-msg="${p.message.replace(/"/g, '&quot;')}"><b>${p.rule}</b> <span>${p.message.replace(/</g, '&lt;')}</span></li>`).join('');
    const icon = { name: 'preview', body, tags: [], categories: [] };
    const draw = (props) => (shapes.length ? gf.renderToString(icon, props) : '');
    $('[data-ed-preview]').innerHTML = `
      <div class="sizes dark">${[16, 20, 24, 32, 48].map((s) => draw({ size: s })).join('')}</div>
      <div class="sizes light">${[16, 20, 24, 32, 48].map((s) => draw({ size: s })).join('')}</div>
      <div class="variants">${['outline', 'duotone', 'solid'].map((v) => `<div>${draw({ size: 40, variant: v })}<span>${v}</span></div>`).join('')}</div>
      <div class="context"><span class="fake-btn">${draw({ size: 18, weight: 2.25 })}${t('editor.ctx.button')}</span><span class="fake-row">${draw({ size: 20 })}<span>${$('[data-ed-name]').value || 'my-icon'}</span></span></div>`;
  }, 60);
}

// Pointer handling.

function onDown(e) {
  if (e.button > 0) return;
  el.setPointerCapture(e.pointerId);
  const p = toPoint(e);
  if (tool === 'select') {
    const h = e.target.closest('[data-h]');
    if (h && selected >= 0) {
      drag = { kind: 'handle', index: Number(h.dataset.h), moved: false };
      return;
    }
    const sh = e.target.closest('[data-i]');
    if (sh) {
      selected = Number(sh.dataset.i);
      drag = { kind: 'move', last: p, moved: false };
    } else {
      selected = -1;
      drag = null;
    }
    render();
    return;
  }
  if (tool === 'pen') {
    if (!draft) draft = { type: 'pen', anchors: [], closed: false };
    const first = draft.anchors[0];
    if (first && draft.anchors.length > 2 && Math.hypot(p[0] - first.x, p[1] - first.y) < 0.6) {
      draft.closed = true;
      finishDraft();
      return;
    }
    draft.anchors.push({ x: p[0], y: p[1] });
    draft.down = p;
    render();
    return;
  }
  if (tool === 'polyline') {
    if (!draft) draft = { type: 'polyline', points: [], a: p, b: p };
    draft.points.push(p);
    draft.b = p;
    render();
    return;
  }
  if (tool === 'arc') {
    if (!draft) draft = { type: 'arc', a: p, b: p };
    else if (!draft.b2) draft.b2 = p;
    else {
      const s = arcShape(draft.a, draft.b2, p);
      draft = null;
      shapes.push(s);
      selected = shapes.length - 1;
      commit();
    }
    render();
    return;
  }
  draft = { type: tool, a: p, b: p };
  render();
}

function onMove(e) {
  const p = toPoint(e);
  hover = p;
  if (drag && selected >= 0) {
    const s = shapes[selected];
    if (drag.kind === 'handle') {
      const h = handles(s)[drag.index];
      if (h) h.set(p[0], p[1]);
      drag.moved = true;
    } else if (drag.kind === 'move') {
      const dx = p[0] - drag.last[0];
      const dy = p[1] - drag.last[1];
      if (dx || dy) {
        translate(s, dx, dy);
        drag.last = p;
        drag.moved = true;
      }
    }
    render();
    return;
  }
  if (draft) {
    if (draft.type === 'pen' && draft.down && e.buttons & 1) {
      const a = draft.anchors[draft.anchors.length - 1];
      if (Math.hypot(p[0] - a.x, p[1] - a.y) > 0.3) {
        a.out = p;
        a.in = [2 * a.x - p[0], 2 * a.y - p[1]];
      }
    }
    draft.b = p;
  }
  render();
}

function onUp() {
  if (drag) {
    if (drag.moved) commit();
    drag = null;
    return;
  }
  if (!draft) return;
  if (draft.type === 'pen') {
    draft.down = null;
    return;
  }
  if (draft.type === 'polyline' || draft.type === 'arc') return;
  const s = draftShape();
  draft = null;
  if (valid(s)) {
    shapes.push(s);
    selected = shapes.length - 1;
    commit();
  }
  render();
}

function setTool(name) {
  if (draft) finishDraft();
  tool = name;
  for (const b of $$('[data-ed-tools] button')) b.setAttribute('aria-pressed', String(b.dataset.tool === name));
  $('[data-ed-hint]').textContent = t(`editor.hint.${name}`);
  render();
}

function action(name) {
  switch (name) {
    case 'undo':
      undo();
      break;
    case 'redo':
      redo();
      break;
    case 'delete':
      if (selected >= 0) {
        shapes.splice(selected, 1);
        selected = -1;
        commit();
        render();
      }
      break;
    case 'clear':
      shapes = [];
      selected = -1;
      draft = null;
      commit();
      render();
      break;
    case 'secondary': {
      if (selected < 0) return;
      const s = shapes[selected];
      const on = !s.secondary;
      for (const x of shapes) x.secondary = false;
      s.secondary = on;
      commit();
      render();
      break;
    }
    case 'save': {
      if (!shapes.length) return;
      const entry = collection.save({
        id: editing,
        name: $('[data-ed-name]').value,
        body: bodyOf(),
        tags: $('[data-ed-tags]')
          .value.split(',')
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
        categories: [$('[data-ed-cat]').value],
        source: 'editor',
      });
      editing = entry.id;
      $('[data-ed-name]').value = entry.name;
      toast(t('toast.saved'));
      break;
    }
    case 'new':
      editing = null;
      shapes = [];
      selected = -1;
      $('[data-ed-name]').value = 'my-icon';
      $('[data-ed-tags]').value = '';
      commit();
      render();
      break;
    case 'import':
      $('[data-ed-file]').click();
      break;
    case 'download':
      if (shapes.length) download(gf.canonicalSvg(bodyOf()), `${collection.slug($('[data-ed-name]').value)}.svg`, 'image/svg+xml');
      break;
    case 'copy':
      if (shapes.length) copy(gf.canonicalSvg(bodyOf()));
      break;
    default:
      break;
  }
}

/** Opens a body (or an icon spec) in the editor. */
export function openBody(body, { name = 'my-icon', tags = [], category, id = null } = {}) {
  setBody(body);
  editing = id;
  $('[data-ed-name]').value = name;
  $('[data-ed-tags]').value = tags.join(', ');
  if (category) {
    const sel = $('[data-ed-cat]');
    if (![...sel.options].some((o) => o.value === category)) sel.insertAdjacentHTML('beforeend', `<option>${category}</option>`);
    sel.value = category;
  }
  history = [];
  hIndex = -1;
  commit();
  setTool('select');
}

export function importSvgText(text) {
  const r = gf.foxify(text);
  if (!r.body) {
    toast(t('foxify.nothing'));
    return;
  }
  openBody(r.body, { name: 'imported' });
  toast(t('editor.imported'));
}

export function initEditor(data) {
  el = $('[data-ed-canvas]');
  categories = [...new Set(data.icons.flatMap((i) => i.categories))].sort();
  $('[data-ed-cat]').innerHTML = categories.map((c) => `<option ${c === 'shapes' ? 'selected' : ''}>${c}</option>`).join('');
  $('[data-ed-tools]').innerHTML = TOOLS.map(([name, key, icon, label]) => `<button type="button" data-tool="${name}" aria-pressed="false" aria-label="${t(label)} (${key})" title="${t(label)} (${key})">${gf.lookupIcon(icon) ? svg(icon, { size: 20 }) : name[0].toUpperCase()}<kbd>${key}</kbd></button>`).join('');
  buildGrid();
  $('[data-ed-tools]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setTool(b.dataset.tool);
  });
  $('[data-ed-snap]').addEventListener('change', (e) => {
    step = Number(e.target.value);
  });
  for (const b of $$('[data-ed]')) b.addEventListener('click', () => action(b.dataset.ed));
  $('[data-ed-file]').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (f) importSvgText(await f.text());
    e.target.value = '';
  });
  $('[data-ed-lint]').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-msg]');
    if (!li) return;
    const m = /#(\d+)/.exec(li.dataset.msg);
    if (m) {
      const ordered = [...shapes.keys()].sort((a, b) => Number(Boolean(shapes[b].secondary)) - Number(Boolean(shapes[a].secondary)));
      selected = ordered[Number(m[1]) - 1] ?? -1;
      setTool('select');
    }
  });
  $('[data-ed-name]').addEventListener('input', () => renderSide());
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointerleave', () => {
    hover = null;
    if (!drag) render();
  });
  el.addEventListener('dblclick', () => finishDraft());
  document.addEventListener('keydown', (e) => {
    if (!el.closest('[data-panel]') || el.closest('[data-panel]').hidden) return;
    if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'd' && selected >= 0) {
      e.preventDefault();
      const copyShape = JSON.parse(JSON.stringify(shapes[selected]));
      translate(copyShape, 1, 1);
      shapes.push(copyShape);
      selected = shapes.length - 1;
      commit();
      render();
      return;
    }
    if (e.key === 'Enter' || e.key === 'Escape') {
      if (draft) {
        if (e.key === 'Escape' && draft.type !== 'pen' && draft.type !== 'polyline') draft = null;
        finishDraft();
      } else if (e.key === 'Escape') {
        selected = -1;
        render();
      }
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected >= 0) {
      e.preventDefault();
      action('delete');
      return;
    }
    if (e.key.startsWith('Arrow') && selected >= 0) {
      e.preventDefault();
      const d = (step || 0.25) * (e.shiftKey ? 4 : 1);
      translate(shapes[selected], e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0);
      commit();
      render();
      return;
    }
    if (ctrl || e.altKey) return;
    const match = TOOLS.find((x) => x[1].toLowerCase() === e.key.toLowerCase());
    if (match) setTool(match[0]);
  });
  let restored = false;
  try {
    const d = JSON.parse(sessionStorage.getItem('gf-editor-draft') || 'null');
    if (d && Array.isArray(d.shapes) && d.shapes.length) {
      shapes = d.shapes;
      $('[data-ed-name]').value = d.name || 'my-icon';
      restored = true;
    }
  } catch {
    // ignore
  }
  if (!restored) {
    const start = gf.lookupIcon('heart') ? 'heart' : data.icons[0].name;
    setBody(gf.lookupIcon(start).body);
    $('[data-ed-name]').value = `${start}-remix`;
  }
  commit();
  setTool('select');
}
