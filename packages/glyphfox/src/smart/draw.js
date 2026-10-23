// Smart data icons. Each kind draws an icon body on the 24 grid from data
// (a level, a date, a time, a count, a locale), with the same stroke, caps
// and padding as the rest of the set. The result is ordinary icon data, so
// every shared prop (size, color, weight, variant, animate...) applies.

import { trimNodes } from '../core/compose.js';
import { hash, iconNodes, nodesToString, splitLayers } from '../core/nodes.js';
import { strokeWidth } from '../core/render.js';
import { currencyInfo, resolveLocale } from './locale.js';

const r2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const OFF = 0.3;
const TAU = Math.PI * 2;
const FONT = 'ui-sans-serif,system-ui,sans-serif';

function bool(v) {
  if (v === '' || v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  const s = String(v).toLowerCase();
  return s !== 'false' && s !== '0' && s !== 'no';
}

/**
 * Level from 0 to 1 for a value. Values run from min (0) to max (1); a value
 * above 1 without a max is read as a percentage. `fallback` is used when no
 * value is given.
 */
export function fraction({ value, min, max } = {}, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const v = Number(value);
  if (!Number.isFinite(v)) return fallback;
  let lo = min === undefined || min === null || min === '' ? 0 : Number(min);
  if (!Number.isFinite(lo)) lo = 0;
  let hi = max === undefined || max === null || max === '' ? (v > 1 && lo === 0 ? 100 : 1) : Number(max);
  if (!Number.isFinite(hi) || hi === lo) hi = lo + 1;
  return clamp((v - lo) / (hi - lo), 0, 1);
}

/** Font weight of labels for a stroke width: heavier strokes, heavier text. */
export function labelWeight(sw) {
  return String(clamp(Math.round((300 + sw * 200) / 100) * 100, 400, 900));
}

function text(content, x, y, size, sw, extra = {}) {
  return [
    'text',
    { class: 'gf-text', x: r2(x), y: r2(y), 'font-size': r2(size), 'font-weight': labelWeight(sw), 'font-family': FONT, 'text-anchor': 'middle', fill: 'currentColor', stroke: 'none', ...extra },
    String(content),
  ];
}

function mask(id, children) {
  return ['defs', {}, [['mask', { id, maskUnits: 'userSpaceOnUse', x: '0', y: '0', width: '24', height: '24' }, [['rect', { x: '0', y: '0', width: '24', height: '24', fill: '#fff', stroke: 'none' }], ...children]]]];
}

const off = (node) => [node[0], { class: 'gf-off', ...node[1], opacity: OFF }];
const path = (d, attrs) => ['path', attrs ? { ...attrs, d } : { d }];

function percent(f, locale) {
  try {
    return new Intl.NumberFormat(resolveLocale(locale), { style: 'percent', maximumFractionDigits: 0 }).format(f);
  } catch {
    return `${Math.round(f * 100)}%`;
  }
}

function integer(n, locale) {
  try {
    return new Intl.NumberFormat(resolveLocale(locale), { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

/** A Date for a date input: Date, timestamp, "YYYY-MM-DD" (local) or any Date string. Defaults to now. */
export function toDate(input) {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return new Date(input.getTime());
  if (typeof input === 'number' && Number.isFinite(input)) return new Date(input);
  if (typeof input === 'string' && input.trim()) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input.trim());
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** { hours, minutes, seconds } for a time input: Date, timestamp, "HH:MM[:SS]" or an object. Defaults to now. */
export function toTime(input) {
  if (input && typeof input === 'object' && !(input instanceof Date)) {
    return { hours: Number(input.hours) || 0, minutes: Number(input.minutes) || 0, seconds: Number(input.seconds) || 0 };
  }
  if (typeof input === 'string') {
    const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(input);
    if (m) return { hours: Number(m[1]), minutes: Number(m[2]), seconds: Number(m[3] || 0) };
  }
  const d = input === undefined || input === null || input === '' ? new Date() : toDate(input);
  return { hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds() };
}

const BATTERY = { x: 2, y: 6, width: 17, height: 12, rx: 2 };
const BOLT = 'M11.5 9 9.5 12h3l-2 3';
const SIGNAL = [
  [4, 17],
  [9, 13],
  [14, 9],
  [19, 4],
];
const WIFI = ['M8.82 15.32A4.5 4.5 0 0 1 15.18 15.32', 'M5.99 12.49A8.5 8.5 0 0 1 18.01 12.49', 'M3.16 9.66A12.5 12.5 0 0 1 20.84 9.66'];
const SPEAKER = 'M3 10a1 1 0 0 1 1-1h3l5-4.5v15L7 15H4a1 1 0 0 1-1-1Z';
const WAVES = ['M15.18 8.82A4.5 4.5 0 0 1 15.18 15.18', 'M18.01 5.99A8.5 8.5 0 0 1 18.01 18.01'];
const TUBE = 'M9 13V5a3 3 0 0 1 6 0v8a5 5 0 1 1-6 0Z';
const PAGE = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z';
const BELL = {
  name: 'bell',
  body: '<path class="gf-secondary" d="M4 16c1.2-1.2 2-2.9 2-5V9a6 6 0 0 1 12 0v2c0 2.1.8 3.8 2 5Z" fill="currentColor" stroke="none" opacity="0.3"/><path d="M4 16c1.2-1.2 2-2.9 2-5V9a6 6 0 0 1 12 0v2c0 2.1.8 3.8 2 5Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  tags: [],
  categories: [],
};

/** Strokes of each currency glyph. */
export const CURRENCY_PATHS = {
  dollar: ['M12 2v20', 'M17 6.5H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H6.5'],
  euro: ['M17.95 7.05A7 7 0 1 0 17.95 16.95', 'M4 10h9', 'M4 14h9'],
  pound: ['M17 20H7c1.6-1 2.5-2.7 2.5-5V8.5a4 4 0 0 1 7.6-1.8', 'M6 13h8'],
  yen: ['M6 3l6 7.5 6-7.5', 'M12 10.5V21', 'M8 14.5h8', 'M8 18.5h8'],
  real: ['M3 19V5h4a3 3 0 0 1 0 6H3', 'M7 11l3 8', 'M17 4.5v15', 'M20.25 7.5h-4.5a2.25 2.25 0 0 0 0 4.5h2.5a2.25 2.25 0 0 1 0 4.5h-4.5'],
  generic: ['M12 7a5 5 0 1 1 0 10a5 5 0 1 1 0-10Z', 'M5 5l3.4 3.4', 'M19 5l-3.4 3.4', 'M5 19l3.4-3.4', 'M19 19l-3.4-3.4'],
};

const KINDS = {
  battery(o, sw) {
    const f = fraction(o, 1);
    const charging = bool(o.charging);
    const nodes = [
      ['rect', { class: 'gf-secondary', ...BATTERY, fill: 'currentColor', stroke: 'none', opacity: 0.3 }],
      ['rect', { ...BATTERY }],
      path('M19 10h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2'),
    ];
    const inset = sw / 2 + 1.25;
    const x0 = 2 + inset;
    const x1 = 19 - inset;
    const y0 = 6 + inset;
    const y1 = 18 - inset;
    if (f > 0 && x1 > x0 && y1 > y0) {
      const bar = ['rect', { class: 'gf-level', x: r2(x0), y: r2(y0), width: r2(Math.max(1, (x1 - x0) * f)), height: r2(y1 - y0), rx: 1, fill: 'currentColor', stroke: 'none' }];
      if (charging) {
        const cut = path(BOLT, { fill: 'none', stroke: '#000', 'stroke-width': r2(sw + 2), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        const id = 'gf-k' + hash(nodesToString([bar, cut]));
        nodes.unshift(mask(id, [cut]));
        bar[1].mask = `url(#${id})`;
      }
      nodes.push(bar);
    }
    if (charging) nodes.push(path(BOLT, { class: 'gf-bolt' }));
    const classes = [];
    if (f <= 0.2) classes.push('gf-low');
    if (f >= 0.999) classes.push('gf-full');
    if (charging) classes.push('gf-charging');
    return { nodes, classes, title: `Battery ${percent(f, o.locale)}${charging ? ', charging' : ''}`, data: { level: f } };
  },

  signal(o) {
    const f = fraction(o, 1);
    const on = Math.round(f * SIGNAL.length);
    const nodes = SIGNAL.map(([x, top], k) => (k < on ? path(`M${x} 20V${top}`) : off(path(`M${x} 20V${top}`))));
    return { nodes, classes: on === 0 ? ['gf-empty'] : on === SIGNAL.length ? ['gf-full'] : [], title: `Signal ${on} of ${SIGNAL.length}`, data: { level: f, bars: on } };
  },

  wifi(o) {
    const f = fraction(o, 1);
    const on = Math.round(f * WIFI.length);
    const nodes = [...WIFI.map((d, k) => (k < on ? path(d) : off(path(d)))), path('M12 18.5h.01')];
    return { nodes, classes: on === 0 ? ['gf-empty'] : on === WIFI.length ? ['gf-full'] : [], title: `Wi-Fi ${on} of ${WIFI.length}`, data: { level: f, bars: on } };
  },

  volume(o) {
    const f = fraction(o, 1);
    const muted = bool(o.muted) || f <= 0;
    const nodes = [path(SPEAKER, { class: 'gf-secondary', fill: 'currentColor', stroke: 'none', opacity: 0.3 }), path(SPEAKER)];
    if (muted) nodes.push(path('M16 9.5l5 5'), path('M21 9.5l-5 5'));
    else {
      const on = Math.ceil(f * WAVES.length);
      WAVES.forEach((d, k) => nodes.push(k < on ? path(d) : off(path(d))));
    }
    return { nodes, classes: muted ? ['gf-muted'] : [], title: muted ? 'Muted' : `Volume ${percent(f, o.locale)}`, data: { level: muted ? 0 : f } };
  },

  progress(o, sw) {
    const f = fraction(o, 0);
    const nodes = [['circle', { class: 'gf-off gf-track', cx: 12, cy: 12, r: 10, opacity: OFF }]];
    if (f >= 0.9995) nodes.push(['circle', { class: 'gf-level', cx: 12, cy: 12, r: 10 }]);
    else if (f > 0) {
      const a = f * TAU;
      nodes.push(path(`M12 2A10 10 0 ${f > 0.5 ? 1 : 0} 1 ${r2(12 + 10 * Math.sin(a))} ${r2(12 - 10 * Math.cos(a))}`, { class: 'gf-level' }));
    }
    if (o.label !== undefined && o.label !== null && o.label !== false) {
      const t = typeof o.label === 'string' && o.label !== '' && o.label !== 'true' ? o.label.slice(0, 4) : integer(Math.round(f * 100), o.locale);
      const size = t.length >= 4 ? 5 : t.length === 3 ? 6.25 : 7.5;
      nodes.push(text(t, 12, 12 + size * 0.36, size, sw));
    }
    return { nodes, classes: f >= 0.9995 ? ['gf-full'] : [], title: percent(f, o.locale), data: { level: f } };
  },

  thermometer(o, sw) {
    const f = fraction(o, 0.5);
    const nodes = [path(TUBE, { class: 'gf-secondary', fill: 'currentColor', stroke: 'none', opacity: 0.3 }), path(TUBE)];
    const gap = 0.75;
    const col = clamp(6 - sw - 2 * gap, 0.75, 3);
    const bulb = clamp(5 - sw / 2 - gap, 1, 3.5);
    nodes.push(['circle', { class: 'gf-level', cx: 12, cy: 17, r: r2(bulb), fill: 'currentColor', stroke: 'none' }]);
    const top = 2 + sw / 2 + gap + col / 2;
    const low = 17 - bulb;
    if (f > 0 && low > top) nodes.push(path(`M12 17V${r2(low - f * (low - top))}`, { class: 'gf-level', 'stroke-width': r2(col) }));
    let title = `Temperature ${percent(f, o.locale)}`;
    if (o.value !== undefined && o.value !== null && o.value !== '' && Number.isFinite(Number(o.value)) && (o.unit || o.max !== undefined)) {
      let v = String(Number(o.value));
      try {
        v = new Intl.NumberFormat(resolveLocale(o.locale), { maximumFractionDigits: 1 }).format(Number(o.value));
      } catch {
        /* keep the plain number */
      }
      title = `Temperature ${v}${o.unit ? ' ' + o.unit : ''}`;
    }
    return { nodes, classes: f >= 0.75 ? ['gf-hot'] : f <= 0.25 ? ['gf-cold'] : [], title, data: { level: f } };
  },

  calendar(o, sw) {
    const date = toDate(o.date);
    const locale = resolveLocale(o.locale);
    let day = String(date.getDate());
    let title = date.toDateString();
    try {
      day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date);
      title = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
    } catch {
      /* plain digits */
    }
    const size = day.length > 2 ? 6.5 : 8;
    const nodes = [
      path('M5 4h14a2 2 0 0 1 2 2v4H3V6a2 2 0 0 1 2-2Z', { class: 'gf-secondary', fill: 'currentColor', stroke: 'none', opacity: 0.3 }),
      ['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }],
      path('M3 10h18'),
      path('M8 2v4'),
      path('M16 2v4'),
      text(day, 12, 16 + size * 0.36, size, sw),
    ];
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { nodes, classes: [], title, data: { date: iso, day } };
  },

  clock(o, sw) {
    const t = toTime(o.time);
    const seconds = bool(o.seconds);
    const hand = (len, deg) => {
      const a = (deg * Math.PI) / 180;
      return `M12 12L${r2(12 + len * Math.sin(a))} ${r2(12 - len * Math.cos(a))}`;
    };
    const nodes = [
      ['circle', { class: 'gf-secondary', cx: 12, cy: 12, r: 10, fill: 'currentColor', stroke: 'none', opacity: 0.3 }],
      ['circle', { cx: 12, cy: 12, r: 10 }],
      path(hand(4.5, ((t.hours % 12) + t.minutes / 60) * 30), { class: 'gf-hour' }),
      path(hand(7, (t.minutes + t.seconds / 60) * 6), { class: 'gf-minute' }),
    ];
    if (seconds) nodes.push(path(hand(7.5, t.seconds * 6), { class: 'gf-second', 'stroke-width': r2(Math.max(0.75, sw * 0.5)) }));
    const d = new Date(2000, 0, 1, t.hours, t.minutes, t.seconds);
    let title = `${t.hours}:${String(t.minutes).padStart(2, '0')}`;
    try {
      title = new Intl.DateTimeFormat(resolveLocale(o.locale), seconds ? { timeStyle: 'medium' } : { timeStyle: 'short' }).format(d);
    } catch {
      /* plain time */
    }
    const time = `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
    return { nodes, classes: [], title, data: { time } };
  },

  file(o, sw) {
    let ext = o.ext;
    if ((ext === undefined || ext === null || ext === '') && o.filename) {
      const m = /\.([^./\\]+)$/.exec(String(o.filename));
      ext = m ? m[1] : '';
    }
    ext = String(ext || '')
      .replace(/^\./, '')
      .toUpperCase()
      .slice(0, 4);
    const nodes = [path(PAGE, { class: 'gf-secondary', fill: 'currentColor', stroke: 'none', opacity: 0.3 }), path(PAGE), path('M14 2v4a2 2 0 0 0 2 2h4')];
    if (ext) {
      const size = [7, 7, 6.5, 5.5, 4.5][ext.length];
      nodes.push(text(ext, 12, 15 + size * 0.36, size, sw));
    }
    const safe = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
    return { nodes, classes: safe ? [`gf-ext-${safe}`] : [], title: ext ? `${ext} file` : 'File', data: { ext } };
  },

  badge(o, sw, ctx) {
    const base = ctx.base || BELL;
    const { secondary, primary } = splitLayers(iconNodes(base));
    const raw = o.count !== undefined && o.count !== null && o.count !== '' ? o.count : o.value;
    const count = Math.max(0, Math.floor(Number(raw)) || 0);
    const dot = bool(o.dot);
    if (!count && !dot) return { nodes: [...(secondary ? [secondary] : []), ...primary], classes: [], title: 'No notifications', data: { count: 0 } };
    const gap = 0.75;
    const nodes = [];
    let x0;
    let x1;
    let cy;
    let r;
    let bubble;
    if (dot && !count) {
      r = 3;
      x0 = x1 = 19;
      cy = 5;
      bubble = ['circle', { class: 'gf-badge', cx: 19, cy: 5, r: 3, fill: 'currentColor', stroke: 'none', color: o.badgeColor }];
    } else {
      const cap = Number(o.max) >= 1 ? Math.floor(Number(o.max)) : 99;
      const label = count > cap ? `${integer(cap, o.locale)}+` : integer(count, o.locale);
      const size = label.length >= 3 ? 5 : 6.25;
      r = 4;
      const w = Math.min(20, Math.max(2 * r, label.length * size * 0.6 + 3));
      cy = 2 + r;
      x1 = 22 - r;
      x0 = 22 - w + r;
      const t = text(label, 22 - w / 2, cy + size * 0.36, size, sw, { fill: '#000' });
      const id = 'gf-n' + hash(nodesToString([t]) + '|' + w);
      nodes.push(mask(id, [t]));
      bubble = ['rect', { class: 'gf-badge', x: r2(22 - w), y: r2(cy - r), width: r2(w), height: r2(2 * r), rx: r, fill: 'currentColor', stroke: 'none', mask: `url(#${id})`, color: o.badgeColor }];
    }
    const reach = r + sw / 2 + gap;
    const excluded = ([x, y]) => {
      const cx = clamp(x, x0, x1);
      return (x - cx) * (x - cx) + (y - cy) * (y - cy) < reach * reach;
    };
    nodes.push(...trimNodes(primary, excluded), bubble);
    return { nodes, classes: ['gf-has-badge'], title: count === 1 ? '1 notification' : count ? `${count} notifications` : 'New notifications', data: { count } };
  },

  currency(o) {
    const info = currencyInfo({ locale: o.locale, currency: o.currency });
    const nodes = CURRENCY_PATHS[info.glyph].map((d) => path(d));
    return { nodes, classes: [`gf-currency-${info.glyph}`], title: info.name, data: { ...info } };
  },
};

/** Every smart data icon kind. */
export const SMART_KINDS = Object.keys(KINDS);

const ALIASES = { notification: 'badge', notifications: 'badge', count: 'badge', temperature: 'thermometer', date: 'calendar', time: 'clock', ring: 'progress' };

/** The canonical kind for a name or alias, or null. */
export function smartKind(kind) {
  const k = ALIASES[kind] || kind;
  return Object.prototype.hasOwnProperty.call(KINDS, k) ? k : null;
}

/**
 * Draws a smart data icon. Returns icon data with an extra `smart` field:
 * { kind, title, classes, ...data }. `base` is the icon under a badge.
 */
export function drawSmart(kind, options = {}, base = null) {
  const k = smartKind(kind);
  if (!k) throw new RangeError(`unknown smart icon "${kind}" (use ${SMART_KINDS.join(', ')})`);
  const sw = strokeWidth(options);
  const { nodes, classes = [], title, data } = KINDS[k](options, sw, { base });
  return {
    name: `smart-${k}`,
    body: nodesToString(nodes),
    tags: ['smart', k],
    categories: ['smart'],
    solid: null,
    smart: { kind: k, title, classes, ...data },
  };
}

/** Milliseconds until a live kind changes (clock: next second or minute, calendar: next midnight), or null. */
export function nextChange(kind, options = {}, now = Date.now()) {
  const k = smartKind(kind);
  if (k === 'clock' && (options.time === undefined || options.time === null || options.time === '')) {
    const step = bool(options.seconds) ? 1000 : 60000;
    return step - (now % step) + 5;
  }
  if (k === 'calendar' && (options.date === undefined || options.date === null || options.date === '')) {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now + 50;
  }
  return null;
}
