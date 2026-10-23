// License policy and set metadata rules of glyphfox universe. The build uses
// it to decide which sets ship, and the runtime and the tests use it to check
// every set again.

/** SPDX ids that allow redistribution and modification, by kind. */
export const LICENSE_KINDS = {
  'CC0-1.0': 'public-domain',
  Unlicense: 'public-domain',
  MIT: 'permissive',
  ISC: 'permissive',
  '0BSD': 'permissive',
  'BSD-2-Clause': 'permissive',
  'BSD-3-Clause': 'permissive',
  'Apache-2.0': 'permissive',
  Zlib: 'permissive',
  'CC-BY-3.0': 'attribution',
  'CC-BY-4.0': 'attribution',
  'CC-BY-SA-3.0': 'share-alike',
  'CC-BY-SA-4.0': 'share-alike',
  'OFL-1.1': 'share-alike',
  'MPL-2.0': 'share-alike',
  'GPL-2.0-only': 'share-alike',
  'GPL-2.0-or-later': 'share-alike',
  'GPL-3.0-only': 'share-alike',
  'GPL-3.0-or-later': 'share-alike',
  'LGPL-2.1-or-later': 'share-alike',
  'LGPL-3.0-or-later': 'share-alike',
};

/** Deprecated or loose SPDX spellings found in set metadata. */
const SPDX_ALIASES = {
  'GPL-2.0': 'GPL-2.0-only',
  'GPL-2.0+': 'GPL-2.0-or-later',
  'GPL-3.0': 'GPL-3.0-only',
  'GPL-3.0+': 'GPL-3.0-or-later',
  'LGPL-2.1+': 'LGPL-2.1-or-later',
  'LGPL-3.0+': 'LGPL-3.0-or-later',
  CC0: 'CC0-1.0',
  'Apache 2.0': 'Apache-2.0',
};

/** Human readable names of the license kinds. */
export const KIND_LABELS = {
  'public-domain': 'Public domain',
  permissive: 'Permissive',
  attribution: 'Attribution',
  'share-alike': 'Share alike',
};

/** Sets that never ship, whatever their metadata says. */
export const DENIED = {
  'sf-symbols': 'Apple SF Symbols are proprietary',
};

/** Licenses with a visible attribution duty (credit the author where the icon is used). */
export const needsAttribution = (spdx) => /^CC-BY-/.test(spdx || '');

export function normalizeSpdx(spdx) {
  const s = String(spdx || '').trim();
  return SPDX_ALIASES[s] || s;
}

/**
 * Decides whether a set may ship. `info` is the Iconify set info
 * ({ name, author, license: { title, spdx, url } }).
 * Returns { allowed, spdx, kind, attribution, reason }.
 */
export function licenseDecision(prefix, info) {
  const lic = (info && info.license) || {};
  const spdx = normalizeSpdx(lic.spdx);
  const deny = (reason) => ({ allowed: false, spdx, kind: null, attribution: false, reason });
  if (DENIED[prefix]) return deny(DENIED[prefix]);
  const who = `${(info && info.name) || ''} ${(info && info.author && info.author.name) || ''}`;
  if (/\bSF Symbols\b|^\s*Apple\b|\bApple Inc\b/i.test(who)) return deny('Apple icons are proprietary');
  if (!spdx && !lic.title) return deny('no license in the set metadata');
  if (!spdx) return deny(`license "${lic.title}" has no SPDX id`);
  if (/-NC-|-NC$|-ND-|-ND$/.test(spdx)) return deny(`${spdx} does not allow commercial use or modification`);
  const kind = LICENSE_KINDS[spdx];
  if (!kind) return deny(`${spdx} is not on the list of open licenses`);
  return { allowed: true, spdx, kind, attribution: needsAttribution(spdx), reason: '' };
}

/** Sets shown first in the browser, in this order; the rest follow by name. */
export const FEATURED = [
  'material-symbols',
  'mdi',
  'fluent',
  'lucide',
  'tabler',
  'ph',
  'carbon',
  'bi',
  'heroicons',
  'ri',
  'fa7-solid',
  'fa7-regular',
  'fa7-brands',
  'simple-icons',
  'ic',
  'material-symbols-light',
  'ion',
  'ant-design',
  'octicon',
  'codicon',
  'feather',
  'solar',
  'mingcute',
  'iconoir',
  'hugeicons',
  'icon-park-outline',
  'tdesign',
  'clarity',
  'uil',
  'boxicons',
  'radix-icons',
  'akar-icons',
  'streamline',
  'logos',
  'devicon',
  'skill-icons',
  'vscode-icons',
  'fluent-color',
  'fluent-emoji-flat',
  'noto',
  'twemoji',
  'openmoji',
  'flag',
  'circle-flags',
  'game-icons',
];

/** Brand and logo sets (their icons are trademarks of their owners). */
export const BRAND_SETS = new Set([
  'simple-icons',
  'logos',
  'cib',
  'bxl',
  'fa-brands',
  'fa6-brands',
  'fa7-brands',
  'entypo-social',
  'brandico',
  'devicon',
  'devicon-line',
  'devicon-original',
  'devicon-plain',
  'skill-icons',
  'thesvg',
  'thesvg-color',
  'token',
  'token-branded',
  'cryptocurrency',
  'cryptocurrency-color',
  'selfhst',
  'streamline-logos',
  'arcticons',
  'nonicons',
  'unjs',
]);

/** Default style of the icons of a set when the name and the drawing give no hint. */
export const SET_STYLE = {
  'fa-regular': 'outline',
  'fa6-regular': 'outline',
  'fa7-regular': 'outline',
  'fa-solid': 'solid',
  'fa6-solid': 'solid',
  'fa7-solid': 'solid',
  'icon-park-outline': 'outline',
  'icon-park-solid': 'solid',
  'icon-park-twotone': 'duotone',
  'duo-icons': 'duotone',
  'heroicons-outline': 'outline',
  'heroicons-solid': 'solid',
  'mdi-light': 'outline',
  uil: 'outline',
  uit: 'outline',
  uis: 'solid',
  uim: 'duotone',
  bx: 'outline',
  bxs: 'solid',
  la: 'outline',
  carbon: 'outline',
  codicon: 'outline',
  octicon: 'outline',
  'fluent-mdl2': 'outline',
  'simple-line-icons': 'outline',
  'pepicons-pencil': 'outline',
  'pepicons-print': 'outline',
  ei: 'outline',
  et: 'outline',
  il: 'outline',
  'radix-icons': 'outline',
  gg: 'outline',
  prime: 'outline',
  pajamas: 'outline',
  oui: 'outline',
  'gravity-ui': 'outline',
  tdesign: 'outline',
  clarity: 'outline',
  'streamline-freehand': 'outline',
};

/** Theme labels whose meaning differs from the usual reading, per set. */
export const THEME_STYLE = {
  ph: { Bold: 'outline', Thin: 'outline', Light: 'outline', Regular: 'outline' },
};

export const STYLES = ['outline', 'solid', 'duotone', 'color'];
