// Reading icons from Iconify JSON sets: aliases (with their rotations and
// flips), set defaults and the transformations baked into the body.

const DIMS = ['left', 'top', 'width', 'height'];

/**
 * The raw icon `name` of an Iconify set, following aliases. Returns
 * { body, left, top, width, height, rotate, hFlip, vFlip, hidden } or null.
 */
export function iconData(set, name) {
  if (!set || !set.icons) return null;
  const aliases = set.aliases || {};
  const own = {};
  let rotate = 0;
  let hFlip = false;
  let vFlip = false;
  let hidden = false;
  let current = name;
  for (let depth = 0; depth < 8; depth++) {
    const icon = set.icons[current];
    const item = icon || aliases[current];
    if (!item) return null;
    rotate += item.rotate || 0;
    if (item.hFlip) hFlip = !hFlip;
    if (item.vFlip) vFlip = !vFlip;
    if (item.hidden) hidden = true;
    for (const k of DIMS) if (item[k] !== undefined && own[k] === undefined) own[k] = item[k];
    if (icon) {
      return {
        body: icon.body,
        left: own.left ?? set.left ?? 0,
        top: own.top ?? set.top ?? 0,
        width: own.width ?? set.width ?? 16,
        height: own.height ?? set.height ?? 16,
        rotate: ((rotate % 4) + 4) % 4,
        hFlip,
        vFlip,
        hidden,
      };
    }
    current = item.parent;
  }
  return null;
}

/** Applies the quarter turns and flips of an icon to its body and box, as Iconify does. */
export function bakeTransforms(data) {
  const box = { left: data.left, top: data.top, width: data.width, height: data.height };
  let body = data.body;
  let rotation = data.rotate || 0;
  const transforms = [];
  if (data.hFlip) {
    if (data.vFlip) rotation += 2;
    else {
      transforms.push(`translate(${box.width + box.left} ${0 - box.top})`, 'scale(-1 1)');
      box.top = box.left = 0;
    }
  } else if (data.vFlip) {
    transforms.push(`translate(${0 - box.left} ${box.height + box.top})`, 'scale(1 -1)');
    box.top = box.left = 0;
  }
  rotation = ((rotation % 4) + 4) % 4;
  if (rotation === 1) {
    const c = box.height / 2 + box.top;
    transforms.unshift(`rotate(90 ${c} ${c})`);
  } else if (rotation === 2) {
    transforms.unshift(`rotate(180 ${box.width / 2 + box.left} ${box.height / 2 + box.top})`);
  } else if (rotation === 3) {
    const c = box.width / 2 + box.left;
    transforms.unshift(`rotate(-90 ${c} ${c})`);
  }
  if (rotation % 2 === 1) {
    [box.left, box.top] = [box.top, box.left];
    [box.width, box.height] = [box.height, box.width];
  }
  if (transforms.length) body = `<g transform="${transforms.join(' ')}">${body}</g>`;
  return { body, ...box };
}

/** Names of the visible icons of a set (no aliases, no hidden icons). */
export function visibleNames(set) {
  return Object.keys((set && set.icons) || {}).filter((n) => !set.icons[n].hidden);
}
