// Single file CDN build: every icon, the <glyph-fox> element, the
// data-glyph runtime and a global `glyphfox` API.

import * as api from '../api.js';
import { icons } from '../registry.js';
import { registerIcons } from '../core/lookup.js';
import { GlyphFoxElement, defineGlyphFox } from './element.js';

registerIcons(icons);
defineGlyphFox();

const glyphfox = { ...api, GlyphFoxElement, defineGlyphFox };
if (typeof window !== 'undefined') {
  window.glyphfox = glyphfox;
  const run = () => api.replaceGlyphs(document, { observe: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}

export default glyphfox;
