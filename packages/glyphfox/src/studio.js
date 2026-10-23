// Entry of docs/vendor/glyphfox.js, the engine bundle used by the studio
// site (icon data is loaded separately from docs/data/icons.json).

export * from './core/index.js';
export { lintSvg, lintBody, canonicalSvg } from './core/lint.js';
export { foxify, parseTransform } from './core/foxify.js';
export { parseXml } from './core/xml.js';
export { replaceGlyphs } from './core/runtime.js';
export { GlyphFoxElement, defineGlyphFox } from './web/element.js';
export { toDataUri } from './core/formats.js';
export * as geometry from './core/geometry.js';
