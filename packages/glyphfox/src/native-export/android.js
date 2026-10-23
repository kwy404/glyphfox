// Android VectorDrawable XML, one res/drawable file per icon. Strokes keep
// their width (in viewport units, so they scale with the drawable), caps and
// joins, and never get a fill. Color comes from a tint, ?attr/colorControlNormal
// by default or any color attribute or resource, or from a baked hex color.

import { SITE, assertUnique, commentText, hex2, noColor, num, parseHex, pathData } from './shared.js';

export const ANDROID_TINT = '?attr/colorControlNormal';
const WHITE = '@android:color/white';
const JAVA_KEYWORDS = new Set(
  'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null'.split(' '),
);

/** A theme attribute (?attr/colorPrimary, ?android:attr/textColorPrimary) or a color resource (@color/brand). */
export const isColorReference = (v) => /^(\?(?:android:)?(?:attr\/)?[A-Za-z_][\w.]*|@(?:android:)?color\/[A-Za-z_][\w.]*)$/.test(String(v));

function androidHex(c) {
  const rgb = `${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return c.a < 1 ? `#${hex2(c.a * 255)}${rgb}` : `#${rgb}`;
}

/** Resource name for an icon: gf_ plus the name in snake case. */
export function androidResourceName(base, prefix = 'gf_') {
  const name = `${prefix}${base}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!/^[a-z][a-z0-9_]*$/.test(name) || JAVA_KEYWORDS.has(name)) throw new Error(`"${name}" is not a valid Android resource name; pick another --prefix`);
  return name;
}

/** { tint, stroke, fill } for the color options. */
export function androidPaint({ color, secondaryColor } = {}, notes = []) {
  if (noColor(color) || isColorReference(color)) {
    if (!noColor(secondaryColor)) notes.push('android: --secondary-color needs a hex --color; with a tint both layers take the tint color');
    return { tint: noColor(color) ? ANDROID_TINT : String(color), stroke: WHITE, fill: WHITE };
  }
  const main = parseHex(color);
  if (!main) throw new RangeError(`android takes a hex color or a color attribute such as ?attr/colorPrimary, got "${color}"`);
  let fill = androidHex(main);
  if (!noColor(secondaryColor)) {
    if (isColorReference(secondaryColor)) fill = String(secondaryColor);
    else {
      const second = parseHex(secondaryColor);
      if (!second) throw new RangeError(`android takes a hex secondary color or a color resource, got "${secondaryColor}"`);
      fill = androidHex(second);
    }
  }
  return { tint: null, stroke: androidHex(main), fill };
}

// One attribute per line, as Android Studio writes vector drawables.
function element(tag, attrs, pad, children) {
  const list = Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null);
  const head = `${pad}<${tag}` + list.map(([k, v], i) => (i === 0 && tag === 'vector' ? ' ' : `\n${pad}    `) + `${k}="${v}"`).join('');
  if (!children) return `${head} />`;
  return `${head}>\n${children.join('\n')}\n${pad}</${tag}>`;
}

/** One VectorDrawable document for the geometry of an icon. */
export function vectorDrawable(g, options = {}, notes = []) {
  const paint = androidPaint(options, notes);
  const grouped = Boolean(g.rotate || g.flipX || g.flipY);
  const pad = grouped ? '        ' : '    ';
  const paths = [];
  for (const f of g.fills) {
    paths.push(
      element(
        'path',
        {
          'android:pathData': pathData(f.segs),
          'android:fillColor': paint.fill,
          'android:fillAlpha': f.opacity < 1 ? num(f.opacity) : undefined,
          'android:fillType': f.evenOdd ? 'evenOdd' : undefined,
        },
        pad,
      ),
    );
  }
  for (const segs of g.strokes) {
    paths.push(
      element(
        'path',
        {
          'android:pathData': pathData(segs),
          'android:strokeColor': paint.stroke,
          'android:strokeWidth': num(g.strokeWidth),
          'android:strokeLineCap': g.cap,
          'android:strokeLineJoin': g.join,
        },
        pad,
      ),
    );
  }
  const body = grouped
    ? [
        element(
          'group',
          {
            'android:pivotX': '12',
            'android:pivotY': '12',
            'android:rotation': g.rotate ? num(g.rotate) : undefined,
            'android:scaleX': g.flipX ? '-1' : undefined,
            'android:scaleY': g.flipY ? '-1' : undefined,
          },
          '    ',
          paths,
        ),
      ]
    : paths;
  const root = element(
    'vector',
    {
      'xmlns:android': 'http://schemas.android.com/apk/res/android',
      'android:width': `${num(g.size)}dp`,
      'android:height': `${num(g.size)}dp`,
      'android:viewportWidth': '24',
      'android:viewportHeight': '24',
      'android:tint': paint.tint || undefined,
      'android:autoMirrored': g.mirror ? 'true' : undefined,
    },
    '',
    body,
  );
  return `<?xml version="1.0" encoding="utf-8"?>\n<!-- glyphfox ${commentText(g.spec)}, MIT license, ${SITE} -->\n${root}\n`;
}

/** Files for `glyphfox export android`: drawable/gf_NAME.xml. */
export function androidFiles(items, options = {}, notes = []) {
  const prefix = options.prefix === undefined || options.prefix === null || options.prefix === true ? 'gf_' : String(options.prefix);
  for (const it of items) it.resource = androidResourceName(it.base, prefix);
  assertUnique(items, (it) => it.resource, 'drawable');
  androidPaint(options, notes);
  const files = {};
  for (const it of items) files[`drawable/${it.resource}.xml`] = vectorDrawable(it.geometry, options);
  return files;
}
