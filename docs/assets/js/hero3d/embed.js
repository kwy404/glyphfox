// <glyphfox-3d>: a glyphfox icon rendered in 3D on any page.
//
//   <script type="module" src="https://kwy404.github.io/glyphfox/assets/js/hero3d/embed.js"></script>
//   <glyphfox-3d material="plastic" lighting="studio" color="#ff7a1a" turntable style="width:360px;height:270px">
//     <svg viewBox="0 0 24 24" ...>...</svg>
//   </glyphfox-3d>
//
// The SVG child (on the 24 grid) is the source of the shape and stays as the
// fallback when WebGL 2 or the network is not available. Attributes: variant,
// material, lighting, background, color, secondary, depth, bevel, weight,
// turntable and controls (drag to orbit, wheel to zoom).

import { hasWebGL, loadThree } from './loader.js';
import { Viewer } from './viewer.js';
import { iconFromSvg, iconParts } from './parts.js';

const NUMBERS = ['depth', 'bevel', 'weight'];
const STRINGS = ['variant', 'material', 'background', 'color', 'secondary'];
const CSS = `glyphfox-3d{display:block;position:relative;aspect-ratio:4/3}
glyphfox-3d>svg{position:absolute;inset:0;width:100%;height:100%;padding:18%;box-sizing:border-box}
glyphfox-3d.h3d-ready>svg{visibility:hidden}
glyphfox-3d .h3d-stage{position:absolute;inset:0;overflow:hidden;border-radius:inherit}
glyphfox-3d .h3d-bg,glyphfox-3d .h3d-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}`;

function injectCss() {
  if (document.querySelector('style[data-glyphfox-3d]')) return;
  const style = document.createElement('style');
  style.dataset.glyphfox3d = '';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

export class GlyphFox3D extends Base {
  static get observedAttributes() {
    return [...NUMBERS, ...STRINGS, 'lighting', 'turntable'];
  }

  settings() {
    const s = {};
    for (const k of STRINGS) if (this.hasAttribute(k)) s[k] = this.getAttribute(k);
    for (const k of NUMBERS) {
      const v = Number(this.getAttribute(k));
      if (this.hasAttribute(k) && Number.isFinite(v)) s[k] = v;
    }
    if (this.hasAttribute('lighting')) s.light = this.getAttribute('lighting');
    s.turntable = this.hasAttribute('turntable') && this.getAttribute('turntable') !== 'false';
    if (!this.hasAttribute('background')) s.background = 'transparent';
    return s;
  }

  connectedCallback() {
    injectCss();
    this.start();
  }

  async start() {
    if (this.viewer || this.loading) return;
    const svg = this.querySelector('svg');
    if (!svg || !hasWebGL()) return;
    this.loading = true;
    let THREE;
    try {
      THREE = await loadThree();
    } catch {
      this.loading = false;
      return;
    }
    if (!this.isConnected) {
      this.loading = false;
      return;
    }
    const stage = document.createElement('div');
    stage.className = 'h3d-stage';
    this.appendChild(stage);
    this.stage = stage;
    const label = this.getAttribute('label') || svg.getAttribute('aria-label') || (svg.querySelector('title') || {}).textContent || 'Icon in 3D';
    this.viewer = new Viewer(stage, THREE, { interactive: this.hasAttribute('controls'), label, settings: this.settings() });
    const icon = iconFromSvg(svg, label);
    this.viewer.setSource((variant) => iconParts(icon, variant));
    this.classList.add('h3d-ready');
    this.loading = false;
  }

  attributeChangedCallback() {
    if (this.viewer) this.viewer.set(this.settings());
  }

  disconnectedCallback() {
    if (this.viewer) this.viewer.dispose();
    this.viewer = null;
    if (this.stage) this.stage.remove();
    this.stage = null;
    this.classList.remove('h3d-ready');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('glyphfox-3d')) customElements.define('glyphfox-3d', GlyphFox3D);
