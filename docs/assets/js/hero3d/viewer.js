// The 3D view: outlines extruded with a rounded bevel, five material presets,
// five lighting presets (each with its own reflection environment), a
// backdrop layer, orbit controls, a turntable, PNG export at any scale and
// careful cleanup. Shared by the studio panel and the <glyphfox-3d> element.

import { loadThree } from './loader.js';
import { outlineParts } from './outline.js';
import { OrbitRig } from './controls.js';
import { paintBackground } from './backgrounds.js';

export const MATERIALS = ['clay', 'plastic', 'metal', 'glass', 'neon'];
export const LIGHTS = ['studio', 'soft', 'dramatic', 'sunset', 'cyber'];
export const DEFAULTS = Object.freeze({
  variant: 'outline',
  material: 'plastic',
  light: 'studio',
  background: 'glow',
  color: '#ff7a1a',
  secondary: '#ffd0a6',
  depth: 2.5,
  bevel: 0.25,
  weight: 2,
  turntable: true,
});

const SPIN = 0.6;
const MAX_RATIO = 2;
const MAX_PIXELS = 2.4e6;
const FOV = 30;

const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
/** True when the visitor asked for reduced motion (read live, it can change). */
export const prefersReduced = () => !!(motion && motion.matches);

// Lighting presets: a reflection room (gradient sphere plus emissive panels:
// color, intensity, width, height, x, y, z) and a few direct lights.
const LIGHTING = {
  studio: {
    exposure: 1,
    env: 1,
    room: [0x34343a, 0x0e0e10],
    panels: [
      [0xffffff, 8, 16, 12, -16, 16, 20],
      [0xffffff, 2.5, 12, 20, 24, 2, 12],
      [0xffffff, 7, 30, 3, 0, 10, -26],
      [0xffffff, 0.6, 40, 40, 0, -30, 0],
      [0xffffff, 1.6, 30, 18, 0, 6, 34],
    ],
    lights: [
      [0xffffff, 2, -10, 14, 18],
      [0xffffff, 0.5, 14, -4, 10],
    ],
  },
  soft: {
    exposure: 0.95,
    env: 1.1,
    room: [0xeef0f5, 0x55575e],
    panels: [[0xffffff, 2.2, 50, 50, 0, 40, 0]],
    lights: [[0xffffff, 0.9, 0, 20, 12]],
  },
  dramatic: {
    exposure: 1.05,
    env: 1,
    room: [0x0b0b0e, 0x050506],
    panels: [
      [0xffffff, 14, 4, 30, -22, 4, 10],
      [0xffffff, 9, 3, 26, 20, 6, -20],
      [0xffffff, 0.35, 30, 18, 0, 4, 34],
    ],
    lights: [[0xffffff, 2.8, -16, 8, 8]],
  },
  sunset: {
    exposure: 1,
    env: 1,
    room: [0x3b2140, 0x1a0f12],
    panels: [
      [0xff8a3d, 10, 18, 8, -20, 4, 16],
      [0x6c63ff, 3.5, 16, 16, 22, 8, 6],
      [0xff5f6d, 2, 60, 6, 0, -4, -30],
      [0xffb27a, 1.4, 30, 16, 0, 6, 34],
    ],
    lights: [
      [0xffa060, 2.2, -14, 6, 16],
      [0x7c6cff, 0.9, 16, 6, 6],
    ],
  },
  cyber: {
    exposure: 1,
    env: 1,
    room: [0x0d0b1a, 0x05040a],
    panels: [
      [0xff2bd6, 12, 3, 30, -20, 2, 12],
      [0x16e0ff, 12, 3, 30, 20, 2, 12],
      [0x7b5cff, 3, 30, 6, 0, 26, 0],
      [0x8a6cff, 0.9, 30, 16, 0, 6, 34],
    ],
    lights: [
      [0xff3ddc, 1.6, -16, 6, 12],
      [0x22e4ff, 1.6, 16, 6, 12],
    ],
  },
};

const hexRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  const n = m ? parseInt(m[1], 16) : 0xff7a1a;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** CSS filter that makes the neon material glow in the live view. */
export function glowFilter(color) {
  const [r, g, b] = hexRgb(color);
  return `drop-shadow(0 0 3px rgba(${r},${g},${b},.9)) drop-shadow(0 0 12px rgba(${r},${g},${b},.6)) drop-shadow(0 0 30px rgba(${r},${g},${b},.4))`;
}

/** The same glow drawn into a 2D context (shadow only passes). */
function drawGlow(ctx, img, w, h, color, px) {
  const [r, g, b] = hexRgb(color);
  const off = w + 64;
  ctx.save();
  for (const [blur, a] of [
    [3, 0.9],
    [12, 0.6],
    [30, 0.4],
  ]) {
    ctx.shadowColor = `rgba(${r},${g},${b},${a})`;
    ctx.shadowBlur = blur * px;
    ctx.shadowOffsetX = off;
    ctx.drawImage(img, -off, 0, w, h);
  }
  ctx.restore();
}

/** Smooth vertex normals that keep creases sharper than about 53 degrees. */
function creasedNormals(T, geo, crease = 0.6) {
  const pos = geo.attributes.position.array;
  const count = pos.length / 3;
  const faces = Math.floor(count / 3);
  const fn = new Float32Array(faces * 3);
  for (let f = 0; f < faces; f++) {
    const i = f * 9;
    const ux = pos[i + 3] - pos[i];
    const uy = pos[i + 4] - pos[i + 1];
    const uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i];
    const vy = pos[i + 7] - pos[i + 1];
    const vz = pos[i + 8] - pos[i + 2];
    fn[f * 3] = uy * vz - uz * vy;
    fn[f * 3 + 1] = uz * vx - ux * vz;
    fn[f * 3 + 2] = ux * vy - uy * vx;
  }
  const q = (v) => Math.round(v * 1000) + 32768;
  const keys = new Float64Array(count);
  const groups = new Map();
  for (let v = 0; v < count; v++) {
    const k = (q(pos[v * 3]) * 65536 + q(pos[v * 3 + 1])) * 65536 + q(pos[v * 3 + 2]);
    keys[v] = k;
    const g = groups.get(k);
    if (g) g.push(v);
    else groups.set(k, [v]);
  }
  const normals = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    const f = (v / 3) | 0;
    const ax = fn[f * 3];
    const ay = fn[f * 3 + 1];
    const az = fn[f * 3 + 2];
    const al = Math.hypot(ax, ay, az) || 1;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (const w of groups.get(keys[v])) {
      const g = (w / 3) | 0;
      const bx = fn[g * 3];
      const by = fn[g * 3 + 1];
      const bz = fn[g * 3 + 2];
      const bl = Math.hypot(bx, by, bz) || 1;
      if ((bx * ax + by * ay + bz * az) / (al * bl) >= crease) {
        sx += bx;
        sy += by;
        sz += bz;
      }
    }
    const l = Math.hypot(sx, sy, sz) || 1;
    normals[v * 3] = sx / l;
    normals[v * 3 + 1] = sy / l;
    normals[v * 3 + 2] = sz / l;
  }
  geo.setAttribute('normal', new T.BufferAttribute(normals, 3));
}

export class Viewer {
  /** Loads three.js and creates a viewer inside `host`. */
  static async create(host, options) {
    const THREE = await loadThree();
    return new Viewer(host, THREE, options);
  }

  constructor(host, THREE, { interactive = true, label = 'Icon rendered in 3D', settings = {} } = {}) {
    const T = THREE;
    this.T = T;
    this.host = host;
    this.settings = { ...DEFAULTS, ...settings };
    this.parts = null;
    this.outlines = null;
    this.outlineKey = '';
    this.raf = 0;
    this.last = 0;
    this.dirty = true;
    this.shown = true;
    this.onScreen = true;
    this.meshes = [];
    this.mats = [];
    this.textures = {};
    this.envRT = null;
    this.bgTexture = null;
    this.cssW = 1;
    this.cssH = 1;
    this.ratio = 1;
    this.loop = this.loop.bind(this);

    this.bg = document.createElement('canvas');
    this.bg.className = 'h3d-bg';
    this.bg.setAttribute('aria-hidden', 'true');
    host.appendChild(this.bg);

    const r = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    r.toneMapping = T.NeutralToneMapping ?? T.ACESFilmicToneMapping;
    r.outputColorSpace = T.SRGBColorSpace;
    this.renderer = r;
    this.canvas = r.domElement;
    this.canvas.className = 'h3d-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', label);
    if (interactive) this.canvas.tabIndex = 0;
    host.appendChild(this.canvas);

    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(FOV, 4 / 3, 1, 1000);
    this.model = new T.Group();
    this.scene.add(this.model);
    this.lights = new T.Group();
    this.scene.add(this.lights);
    this.pmrem = new T.PMREMGenerator(r);
    this.rig = new OrbitRig(this.camera, interactive ? this.canvas : document.createElement('div'), { reduced: prefersReduced, onChange: () => this.requestRender() });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.io = new IntersectionObserver((entries) => {
      this.onScreen = entries[entries.length - 1].isIntersecting;
      if (this.onScreen) this.requestRender();
    });
    this.io.observe(host);
    this.onVisibility = () => {
      if (!document.hidden) this.requestRender();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onMotion = () => this.requestRender();
    if (motion && motion.addEventListener) motion.addEventListener('change', this.onMotion);
    // three.js restores its own resources after a lost context; the
    // reflection room and the backdrop texture are drawn again here.
    this.onRestore = () => {
      this.envRT = null;
      this.applyLight();
      if (this.bgTexture) this.bgTexture.dispose();
      this.bgTexture = null;
      this.paintBg();
    };
    this.canvas.addEventListener('webglcontextrestored', this.onRestore);

    this.applyLight();
    this.applyMaterial();
    this.resize();
  }

  // Settings.

  /** Updates settings and rebuilds only what they touch. */
  set(next = {}) {
    const prev = this.settings;
    const s = { ...prev, ...next };
    this.settings = s;
    if (s.light !== prev.light) this.applyLight();
    if (s.material !== prev.material || s.color !== prev.color || s.secondary !== prev.secondary) this.applyMaterial();
    else if (s.material === 'glass' && s.depth !== prev.depth) for (const m of this.mats) m.thickness = s.depth * 0.6;
    if (s.background !== prev.background || (s.background === 'glow' && s.color !== prev.color) || s.material !== prev.material) this.paintBg();
    if (s.variant !== prev.variant && this.source) this.parts = this.source(s.variant);
    if (s.variant !== prev.variant || s.weight !== prev.weight || s.bevel !== prev.bevel) this.rebuild(true);
    else if (s.depth !== prev.depth) this.rebuild(false);
    this.requestRender();
  }

  /** Sets the geometry source: a function from style to icon parts. */
  setSource(source) {
    this.source = source;
    this.parts = source(this.settings.variant);
    this.rebuild(true);
  }

  bevelSize() {
    const r = this.settings.weight / 2;
    return Math.max(0, Math.min(this.settings.bevel, r * 0.6, this.settings.depth / 2.2));
  }

  rebuild(outline) {
    if (!this.parts) return;
    const bevel = this.bevelSize();
    const key = `${this.settings.weight}|${bevel}`;
    if (outline || !this.outlines || key !== this.outlineKey) {
      this.outlines = outlineParts(this.parts, { radius: this.settings.weight / 2, inset: bevel });
      this.outlineKey = key;
    }
    this.buildMeshes();
  }

  // Geometry.

  extrude(shapes, depth, bevel, center) {
    const T = this.T;
    const [cx, cy] = center;
    const v = ([x, y]) => new T.Vector2(x - cx, cy - y);
    const list = shapes.map(({ outer, holes }) => {
      const shape = new T.Shape(outer.map(v));
      for (const h of holes) shape.holes.push(new T.Path(h.map(v)));
      return shape;
    });
    const bevelled = bevel > 0.01;
    const inner = Math.max(0.02, depth - (bevelled ? 2 * bevel : 0));
    const geo = new T.ExtrudeGeometry(list, {
      depth: inner,
      steps: 1,
      curveSegments: 4,
      bevelEnabled: bevelled,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: 0,
      bevelSegments: bevelled ? 4 : 0,
    });
    geo.translate(0, 0, -inner / 2);
    creasedNormals(T, geo);
    return geo;
  }

  clearMeshes() {
    for (const m of this.meshes) {
      this.model.remove(m);
      m.geometry.dispose();
    }
    this.meshes = [];
  }

  buildMeshes() {
    const T = this.T;
    this.clearMeshes();
    const o = this.outlines;
    if (!o || !o.box || (!o.main.length && !o.plate.length)) {
      this.requestRender();
      return;
    }
    const center = [(o.box.minX + o.box.maxX) / 2, (o.box.minY + o.box.maxY) / 2];
    const depth = this.settings.depth;
    const bevel = this.bevelSize();
    if (o.main.length) this.meshes.push(new T.Mesh(this.extrude(o.main, depth, bevel, center), this.mats[0]));
    if (o.plate.length) {
      const pd = Math.max(0.3, depth * 0.4);
      const geo = this.extrude(o.plate, pd, Math.min(bevel, pd / 3), center);
      geo.translate(0, 0, -(depth - pd) / 2 + 0.03);
      this.meshes.push(new T.Mesh(geo, this.mats[1]));
    }
    for (const m of this.meshes) this.model.add(m);
    this.requestRender();
  }

  // Materials.

  brushed() {
    if (this.textures.brushed) return this.textures.brushed;
    const T = this.T;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, 512, 512);
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 2400; k++) {
      const y = rnd() * 512;
      const x = rnd() * 512;
      const len = 80 + rnd() * 360;
      const g = Math.round(96 + rnd() * 110);
      ctx.fillStyle = `rgba(${g},${g},${g},${0.15 + rnd() * 0.3})`;
      const hgt = 0.5 + rnd() * 1.5;
      ctx.fillRect(x, y, len, hgt);
      ctx.fillRect(x - 512, y, len, hgt);
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(0.12, 0.12);
    tex.colorSpace = T.NoColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.brushed = tex;
    return tex;
  }

  makeMaterial(kind, color) {
    const T = this.T;
    const c = new T.Color(color);
    const white = new T.Color(0xffffff);
    switch (kind) {
      case 'clay':
        return new T.MeshPhysicalMaterial({ color: c, roughness: 0.86, metalness: 0, sheen: 0.6, sheenRoughness: 0.85, sheenColor: c.clone().lerp(white, 0.55), specularIntensity: 0.3 });
      case 'metal':
        return new T.MeshPhysicalMaterial({ color: c.clone().lerp(white, 0.12), metalness: 1, roughness: 0.55, roughnessMap: this.brushed(), anisotropy: 0.8, anisotropyRotation: 0 });
      case 'glass':
        // A light tint so the backdrop still shows through in every channel,
        // and a faint inner glow so the glass reads on dark backdrops too.
        return new T.MeshPhysicalMaterial({
          color: c.clone().lerp(white, 0.7),
          metalness: 0,
          roughness: 0.16,
          transmission: 1,
          thickness: this.settings.depth * 0.6,
          ior: 1.45,
          attenuationColor: c.clone().lerp(white, 0.4),
          attenuationDistance: 5,
          specularIntensity: 1,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          iridescence: 0.3,
          iridescenceIOR: 1.3,
          emissive: c,
          emissiveIntensity: 0.1,
          envMapIntensity: 2,
          dispersion: 1,
        });
      case 'neon':
        return new T.MeshPhysicalMaterial({ color: c.clone().multiplyScalar(0.5), emissive: c, emissiveIntensity: 1.25, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
      default:
        return new T.MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, specularIntensity: 0.7 });
    }
  }

  applyMaterial() {
    for (const m of this.mats) m.dispose();
    const s = this.settings;
    this.mats = [this.makeMaterial(s.material, s.color), this.makeMaterial(s.material, s.secondary)];
    if (this.meshes[0]) this.meshes[0].material = this.mats[0];
    if (this.meshes[1]) this.meshes[1].material = this.mats[1];
    this.scene.environmentIntensity = (LIGHTING[s.light] || LIGHTING.studio).env * (s.material === 'neon' ? 0.6 : 1);
    this.canvas.style.filter = s.material === 'neon' ? glowFilter(s.color) : '';
    this.requestRender();
  }

  // Lighting.

  applyLight() {
    const T = this.T;
    const preset = LIGHTING[this.settings.light] || LIGHTING.studio;
    const room = new T.Scene();
    const sphere = new T.SphereGeometry(60, 48, 24);
    const top = new T.Color(preset.room[0]);
    const bottom = new T.Color(preset.room[1]);
    const pos = sphere.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      c.copy(bottom).lerp(top, (pos.getY(i) / 60 + 1) / 2);
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    sphere.setAttribute('color', new T.BufferAttribute(cols, 3));
    room.add(new T.Mesh(sphere, new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true })));
    for (const [color, intensity, w, h, x, y, z] of preset.panels) {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      room.add(m);
    }
    const rt = this.pmrem.fromScene(room, 0.04, 0.1, 100);
    room.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (this.envRT) this.envRT.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = preset.env * (this.settings.material === 'neon' ? 0.6 : 1);
    for (const l of [...this.lights.children]) {
      this.lights.remove(l);
      l.dispose?.();
    }
    for (const [color, intensity, x, y, z] of preset.lights) {
      const l = new T.DirectionalLight(color, intensity);
      l.position.set(x, y, z);
      this.lights.add(l);
    }
    this.renderer.toneMappingExposure = preset.exposure;
    this.requestRender();
  }

  // Backdrop.

  paintBg() {
    const s = this.settings;
    const w = Math.max(1, Math.round(this.cssW * this.ratio));
    const h = Math.max(1, Math.round(this.cssH * this.ratio));
    if (this.bg.width !== w || this.bg.height !== h) {
      this.bg.width = w;
      this.bg.height = h;
      // Texture storage is immutable once uploaded, so a new size needs a new texture.
      if (this.bgTexture) this.bgTexture.dispose();
      this.bgTexture = null;
    }
    paintBackground(this.bg.getContext('2d'), w, h, s.background, s.color);
    // Glass refracts what is behind it, so it gets the backdrop as a scene background.
    if (s.material === 'glass' && s.background !== 'transparent') {
      if (!this.bgTexture) {
        this.bgTexture = new this.T.CanvasTexture(this.bg);
        this.bgTexture.colorSpace = this.T.SRGBColorSpace;
      }
      this.bgTexture.needsUpdate = true;
      this.scene.background = this.bgTexture;
    } else this.scene.background = null;
    this.requestRender();
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.cssW = w;
    this.cssH = h;
    this.ratio = Math.max(0.5, Math.min(MAX_RATIO, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / (w * h))));
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.rig.distance = 15 / Math.tan((FOV / 2) * (Math.PI / 180)) / Math.min(1, aspect);
    this.rig.apply();
    this.paintBg();
    this.dirty = true;
    this.renderNow();
  }

  // Loop.

  spinning() {
    return this.settings.turntable && !prefersReduced() && !this.rig.dragging;
  }

  get running() {
    return this.shown && this.onScreen && !document.hidden;
  }

  requestRender() {
    this.dirty = true;
    if (!this.raf && this.running && this.renderer) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  renderNow() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  loop(now) {
    this.raf = 0;
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    let moving = this.rig.update(dt);
    if (this.spinning()) {
      this.model.rotation.y = (this.model.rotation.y + dt * SPIN) % (Math.PI * 2);
      moving = true;
    }
    if (moving || this.dirty) this.renderNow();
    if (moving) this.raf = requestAnimationFrame(this.loop);
  }

  /** Starts or stops rendering (the studio calls it when the tab changes). */
  setShown(shown) {
    this.shown = shown;
    if (shown) {
      this.resize();
      this.requestRender();
    } else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  resetView() {
    this.rig.reset();
    this.model.rotation.y = 0;
    this.requestRender();
  }

  // Export.

  /** Renders the current view at `scale` times its CSS size into a PNG Blob. */
  toBlob(scale = 1, { transparent = true } = {}) {
    const r = this.renderer;
    const s = this.settings;
    const gl = r.getContext();
    const limit = Math.min(8192, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096, (gl.getParameter(gl.MAX_VIEWPORT_DIMS) || [4096])[0]);
    let W = Math.round(this.cssW * scale);
    let H = Math.round(this.cssH * scale);
    const k = Math.min(1, limit / Math.max(W, H));
    W = Math.max(1, Math.floor(W * k));
    H = Math.max(1, Math.floor(H * k));
    const background = this.scene.background;
    if (transparent) this.scene.background = null;
    const ratio = r.getPixelRatio();
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.render(this.scene, this.camera);
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');
    if (!transparent) paintBackground(ctx, W, H, s.background, s.color);
    if (s.material === 'neon') drawGlow(ctx, this.canvas, W, H, s.color, W / this.cssW);
    ctx.drawImage(this.canvas, 0, 0, W, H);
    this.scene.background = background;
    r.setPixelRatio(ratio);
    r.setSize(this.cssW, this.cssH, false);
    this.renderNow();
    return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
  }

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestore);
    if (motion && motion.removeEventListener) motion.removeEventListener('change', this.onMotion);
    this.rig.dispose();
    this.clearMeshes();
    for (const m of this.mats) m.dispose();
    for (const t of Object.values(this.textures)) t.dispose();
    if (this.bgTexture) this.bgTexture.dispose();
    if (this.envRT) this.envRT.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
    this.bg.remove();
    this.renderer = null;
  }
}
