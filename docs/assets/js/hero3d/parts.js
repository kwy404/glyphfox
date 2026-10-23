// Icon data to the polylines the 3D view extrudes, per style:
// outline (every stroke), solid (closed shapes filled, knockout lines cut out)
// and duotone (strokes in front of a recessed plate made of the duotone layer
// or of the closed shapes).

import * as gf from '../../../vendor/glyphfox.js';

const STEP = 0.2;

function flat(node) {
  try {
    return gf.geometry.flattenNode(node, STEP);
  } catch {
    return [];
  }
}

const filled = (node) => (typeof gf.isFilledNode === 'function' ? gf.isFilledNode(node) : false);

/**
 * Finds an icon by name or spec. Fusions ("cloud&lock:overlap") and
 * modifiers ("file+check") resolve through the engine when it has them.
 * Returns { icon, variant } or null.
 */
export function resolveIcon(spec, weight = 2) {
  const s = String(spec || '').trim();
  if (!s) return null;
  if (typeof gf.resolveSpec === 'function') {
    try {
      const r = gf.resolveSpec(s, gf.lookupIcon, { weight });
      if (r && r.icon) return { icon: r.icon, variant: r.variant };
    } catch {
      return null;
    }
  }
  const icon = gf.lookupIcon(s);
  return icon ? { icon, variant: undefined } : null;
}

/** Icon data from the markup of an SVG on the 24 grid (used by the embed). */
export function iconFromSvg(svgEl, name = 'icon') {
  return { name, body: svgEl.innerHTML, tags: [], categories: [] };
}

/** Polylines of an icon for a style: { strokes, areas, knocks, plate }. */
export function iconParts(icon, variant = 'outline') {
  const { secondary, primary } = gf.splitLayers(gf.iconNodes(icon));
  let strokeNodes = primary;
  const areaNodes = [];
  const knockNodes = [];
  const plateNodes = [];
  if (variant === 'solid' && typeof gf.solidLayers === 'function') {
    const sl = gf.solidLayers(icon);
    if (sl) {
      strokeNodes = sl.strokes;
      for (const g of sl.groups) {
        areaNodes.push(...g.fill);
        knockNodes.push(...(g.mask || []));
      }
    }
  } else if (variant === 'duotone') {
    if (secondary) plateNodes.push(secondary);
    else if (typeof gf.solidLayers === 'function') {
      const sl = gf.solidLayers(icon);
      if (sl) for (const g of sl.groups) plateNodes.push(...g.fill);
    }
  }
  const strokes = [];
  const areas = [];
  for (const node of strokeNodes) {
    if (filled(node)) areas.push(flat(node));
    else strokes.push(...flat(node));
  }
  for (const node of areaNodes) areas.push(flat(node));
  return {
    strokes,
    areas: areas.filter((a) => a.length),
    knocks: knockNodes.flatMap(flat),
    plate: plateNodes.map(flat).filter((a) => a.length),
  };
}
