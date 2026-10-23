// Locale aware icons: the currency glyph for a locale (symbol from Intl),
// right to left mirroring of directional icons and the weight bump used
// under prefers-contrast: more.

// No imports from core/render.js: render.js calls directionProps, so this
// module stays a leaf.
function bool(v) {
  if (v === '' || v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  const s = String(v).toLowerCase();
  return s !== 'false' && s !== '0' && s !== 'no';
}

/** Icons that point along the reading direction: they mirror in right to left layouts. */
export const DIRECTIONAL_ICONS = new Set([
  'arrow-left',
  'arrow-right',
  'arrow-up-left',
  'arrow-up-right',
  'arrow-down-left',
  'arrow-down-right',
  'chevron-left',
  'chevron-right',
  'chevrons-left',
  'chevrons-right',
  'chevron-first',
  'chevron-last',
  'circle-arrow-left',
  'circle-arrow-right',
  'corner-down-left',
  'corner-down-right',
  'corner-up-left',
  'corner-up-right',
  'undo',
  'redo',
  'reply',
  'reply-all',
  'forward',
  'send',
  'log-in',
  'log-out',
  'external-link',
  'indent',
  'outdent',
  'list',
  'wrap-text',
  'backspace',
  'sidebar-left',
  'sidebar-right',
]);

/** Adds names to the directional set (for your own icons). */
export function registerDirectional(names) {
  for (const n of [].concat(names || [])) if (n) DIRECTIONAL_ICONS.add(String(n));
}

const baseName = (name) => String(name || '').split(/[+@/]/)[0];

/** True for a directional icon (by name, a name+modifier spec, or icon data). */
export function isDirectional(iconOrName) {
  if (!iconOrName) return false;
  if (typeof iconOrName === 'object') {
    if (iconOrName.morph) return isDirectional(iconOrName.morph.from);
    if (iconOrName.directional !== undefined) return Boolean(iconOrName.directional);
    return isDirectional(iconOrName.name);
  }
  const name = String(iconOrName);
  if (name.includes('&') || name.includes('>')) return false;
  return DIRECTIONAL_ICONS.has(baseName(name));
}

const RTL_SCRIPTS = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo', 'Adlm', 'Rohg', 'Mand', 'Samr', 'Mend', 'Yezi']);
const RTL_LANGUAGES = new Set(['ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'ji', 'dv', 'ckb', 'syr', 'nqo', 'arc', 'rhg', 'mzn', 'glk', 'lrc', 'bal', 'bqi']);

/** True when a locale is written right to left (ar, he, fa, ur...). */
export function isRtlLocale(locale) {
  if (!locale) return false;
  const tag = String(locale).replace(/_/g, '-');
  try {
    const loc = new Intl.Locale(tag);
    const info = typeof loc.getTextInfo === 'function' ? loc.getTextInfo() : loc.textInfo;
    if (info && info.direction) return info.direction === 'rtl';
    const script = loc.script || (typeof loc.maximize === 'function' ? loc.maximize().script : undefined);
    if (script) return RTL_SCRIPTS.has(script);
    return RTL_LANGUAGES.has(loc.language);
  } catch {
    return RTL_LANGUAGES.has(tag.toLowerCase().split('-')[0]);
  }
}

const hasDocument = () => typeof document !== 'undefined' && document && document.documentElement;

/**
 * Text direction for icon rendering: an explicit `dir`, else the `locale`,
 * else the element (computed style), else the document. Returns "rtl" or "ltr".
 */
export function textDirection({ dir, locale, element } = {}) {
  if (dir === 'rtl' || dir === 'ltr') return dir;
  if (locale) return isRtlLocale(locale) ? 'rtl' : 'ltr';
  if (element && typeof getComputedStyle === 'function') {
    try {
      const d = getComputedStyle(element).direction;
      if (d === 'rtl' || d === 'ltr') return d;
    } catch {
      /* not an element */
    }
  }
  if (hasDocument()) {
    const d = document.dir || document.documentElement.getAttribute('dir');
    if (d === 'rtl') return 'rtl';
  }
  return 'ltr';
}

/**
 * Mirroring props for an icon. Directional icons mirror in right to left
 * contexts by default: with a `locale` or `dir` prop the decision is made
 * now (flipX), otherwise the `mirrorRtl` CSS follows the document. An
 * explicit mirrorRtl={false} turns it off. Other icons are left alone.
 */
export function directionProps(icon, props = {}) {
  if (!props || !isDirectional(icon)) return props;
  if (props.mirrorRtl !== undefined && props.mirrorRtl !== null && !bool(props.mirrorRtl)) return props;
  if (props.dir === 'rtl' || props.dir === 'ltr' || props.locale) {
    const rtl = textDirection({ dir: props.dir, locale: props.locale }) === 'rtl';
    return { ...props, mirrorRtl: false, flipX: rtl ? !bool(props.flipX) : props.flipX };
  }
  if (props.mirrorRtl === undefined || props.mirrorRtl === null) return { ...props, mirrorRtl: true };
  return props;
}

/** The locale to use: the given one, else the document language, else the runtime default. */
export function resolveLocale(locale) {
  if (locale) return String(locale).replace(/_/g, '-');
  if (hasDocument()) {
    const lang = document.documentElement.getAttribute('lang');
    if (lang) return lang;
  }
  if (typeof navigator !== 'undefined' && navigator && navigator.language) return navigator.language;
  try {
    return new Intl.NumberFormat().resolvedOptions().locale;
  } catch {
    return 'en-US';
  }
}

const EURO_REGIONS = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK', 'GP', 'MQ', 'GF', 'RE', 'YT', 'PM', 'BL', 'MF', 'AX'];
const DOLLAR_REGIONS = ['US', 'PR', 'EC', 'SV', 'PA', 'TL', 'GU', 'VI', 'AS', 'MP', 'FM', 'MH', 'PW', 'BQ', 'TC', 'VG', 'ZW'];

/** Currency for each region (the ones without an entry use the generic glyph). */
export const REGION_CURRENCY = {
  ...Object.fromEntries(EURO_REGIONS.map((r) => [r, 'EUR'])),
  ...Object.fromEntries(DOLLAR_REGIONS.map((r) => [r, 'USD'])),
  BR: 'BRL',
  GB: 'GBP',
  IM: 'GBP',
  JE: 'GBP',
  GG: 'GBP',
  JP: 'JPY',
  CN: 'CNY',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  MX: 'MXN',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  UY: 'UYU',
  HK: 'HKD',
  SG: 'SGD',
  TW: 'TWD',
  IN: 'INR',
  KR: 'KRW',
  CH: 'CHF',
  LI: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  TR: 'TRY',
  ZA: 'ZAR',
  IL: 'ILS',
  SA: 'SAR',
  AE: 'AED',
  EG: 'EGP',
  NG: 'NGN',
  RU: 'RUB',
  UA: 'UAH',
  TH: 'THB',
  VN: 'VND',
  ID: 'IDR',
  PH: 'PHP',
  MY: 'MYR',
};

/** ISO currency code for a locale, from its region ("pt-BR" gives "BRL"), or undefined. */
export function currencyForLocale(locale) {
  try {
    const loc = new Intl.Locale(resolveLocale(locale));
    const region = loc.region || (typeof loc.maximize === 'function' ? loc.maximize().region : undefined);
    return region ? REGION_CURRENCY[region] : undefined;
  } catch {
    return undefined;
  }
}

/** The currency glyphs glyphfox draws. */
export const CURRENCY_GLYPHS = ['real', 'euro', 'yen', 'pound', 'dollar', 'generic'];

function glyphFor(symbol, currency) {
  const s = String(symbol || '');
  const c = String(currency || '').toUpperCase();
  if (c === 'BRL' || /^R\$/.test(s)) return 'real';
  if (c === 'EUR' || s.includes('€')) return 'euro';
  if (c === 'GBP' || s.includes('£')) return 'pound';
  if (c === 'JPY' || c === 'CNY' || /[¥￥元円]/.test(s)) return 'yen';
  if (s.includes('$')) return 'dollar';
  return 'generic';
}

/**
 * Currency details for a locale (or an explicit ISO code): { locale,
 * currency, symbol, glyph, name }. The symbol comes from Intl.NumberFormat,
 * the glyph is one of CURRENCY_GLYPHS.
 */
export function currencyInfo({ locale, currency } = {}) {
  const loc = resolveLocale(locale);
  const code = currency ? String(currency).toUpperCase() : currencyForLocale(loc);
  let symbol = '¤';
  let name;
  if (code) {
    try {
      const part = new Intl.NumberFormat(loc, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0)
        .find((p) => p.type === 'currency');
      if (part) symbol = part.value;
    } catch {
      symbol = code;
    }
    try {
      name = new Intl.DisplayNames([loc], { type: 'currency' }).of(code);
    } catch {
      name = code;
    }
  }
  return { locale: loc, currency: code, symbol, glyph: code ? glyphFor(symbol, code) : 'generic', name: name || 'Currency' };
}

/** The extra stroke width (grid units) used under prefers-contrast: more. */
export const CONTRAST_BUMP = 0.5;

/** True when the user asks for more contrast. */
export function prefersMoreContrast() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-contrast: more)').matches;
  } catch {
    return false;
  }
}

/** Calls `onChange(more)` when the contrast preference changes. Returns an unsubscribe function. */
export function watchContrast(onChange) {
  if (typeof matchMedia !== 'function') return () => {};
  let mq;
  try {
    mq = matchMedia('(prefers-contrast: more)');
  } catch {
    return () => {};
  }
  const fn = () => onChange(mq.matches);
  if (mq.addEventListener) mq.addEventListener('change', fn);
  else if (mq.addListener) mq.addListener(fn);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', fn);
    else if (mq.removeListener) mq.removeListener(fn);
  };
}
