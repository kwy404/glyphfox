// Solid style: finds the closed outer shapes of an icon (they get filled) and
// the strokes that lie inside them (they become knockout lines in the fill).

import { distToPolylines, flattenNode, isClosedNode, pointInPolygon, polygonArea } from './geometry.js';
import { iconNodes, splitLayers } from './nodes.js';

function inside(pt, shape) {
  let c = false;
  for (const p of shape.polys) if (pointInPolygon(pt, p.points)) c = !c;
  return c;
}

function samples(shape) {
  const pts = [];
  for (const p of shape.polys) for (const q of p.points) pts.push(q);
  return pts;
}

/**
 * Returns { fill, knock } with indices into `primary`, or null when the icon
 * has no closed shape to fill.
 */
export function analyzeSolid(primary) {
  const info = primary.map((node, i) => {
    let polys = [];
    try {
      polys = flattenNode(node, 0.3);
    } catch {
      polys = [];
    }
    const closed = polys.length > 0 && isClosedNode(node) && polys.every((p) => p.closed);
    let area = 0;
    if (closed) for (const p of polys) area = Math.max(area, Math.abs(polygonArea(p.points)));
    return { i, node, polys, closed, area };
  });
  const closed = info.filter((x) => x.closed && x.area > 2.5);
  const containedIn = (a, b) => {
    const pts = samples(a);
    if (!pts.length) return false;
    let k = 0;
    for (const pt of pts) if (inside(pt, b) || distToPolylines(pt, b.polys) < 0.05) k++;
    return k / pts.length >= 0.9;
  };
  const outer = closed.filter((a) => !closed.some((b) => b !== a && b.area > a.area && containedIn(a, b)));
  if (!outer.length) return null;
  const fill = outer.map((x) => x.i);
  const knock = [];
  for (const x of info) {
    if (fill.includes(x.i)) continue;
    const pts = samples(x);
    if (!pts.length) continue;
    let k = 0;
    for (const pt of pts) {
      if (outer.some((o) => inside(pt, o) || distToPolylines(pt, o.polys) < 0.6)) k++;
    }
    if (k / pts.length >= 0.85) knock.push(x.i);
  }
  return { fill, knock };
}

const layerCache = new WeakMap();

/**
 * Fill groups and stroke list used to render the solid style of an icon:
 * { groups: [{ fill: nodes, mask: nodes }], strokes: nodes } or null.
 * Uses the indices computed at build time when present.
 */
export function solidLayers(icon) {
  if (icon.layers && icon.layers.solid !== undefined) return icon.layers.solid;
  if (layerCache.has(icon)) return layerCache.get(icon);
  const { primary } = splitLayers(iconNodes(icon));
  let info = icon.solid;
  if (info === undefined) {
    const a = analyzeSolid(primary);
    info = a ? [a.fill, a.knock] : null;
  }
  let out = null;
  if (info && info[0] && info[0].length) {
    const [fill, knock = []] = info;
    out = {
      groups: [{ fill: fill.map((i) => primary[i]).filter(Boolean), mask: knock.map((i) => primary[i]).filter(Boolean) }],
      strokes: primary.filter((_, i) => !knock.includes(i)),
    };
  }
  layerCache.set(icon, out);
  return out;
}
