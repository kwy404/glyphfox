// Small orbit controls: drag to orbit, wheel or pinch to zoom, arrow keys
// to orbit and plus or minus to zoom when the canvas has focus, double click
// or 0 to reset. Inertia is skipped under prefers-reduced-motion.

const TAU = Math.PI * 2;

export class OrbitRig {
  constructor(camera, element, { reduced = () => false, onChange = () => {} } = {}) {
    this.camera = camera;
    this.el = element;
    this.reduced = reduced;
    this.onChange = onChange;
    this.home = { theta: 0.42, phi: Math.PI / 2 - 0.2, zoom: 1 };
    this.theta = this.home.theta;
    this.phi = this.home.phi;
    this.zoom = 1;
    this.distance = 60;
    this.vTheta = 0;
    this.vPhi = 0;
    this.pointers = new Map();
    this.pinch = 0;
    this.dragging = false;
    this.handlers = [];
    this.bind();
    this.apply();
  }

  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.handlers.push(() => target.removeEventListener(type, fn, opts));
  }

  bind() {
    const el = this.el;
    el.style.touchAction = 'none';
    this.on(el, 'pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      el.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      this.dragging = true;
      this.vTheta = 0;
      this.vPhi = 0;
      if (this.pointers.size === 2) this.pinch = this.spread();
      this.onChange();
    });
    this.on(el, 'pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const cur = [e.clientX, e.clientY];
      this.pointers.set(e.pointerId, cur);
      if (this.pointers.size === 2) {
        const s = this.spread();
        if (this.pinch > 0 && s > 0) this.setZoom(this.zoom * (this.pinch / s));
        this.pinch = s;
        return;
      }
      const h = Math.max(1, el.clientHeight);
      const dTheta = (-(cur[0] - prev[0]) / h) * Math.PI;
      const dPhi = (-(cur[1] - prev[1]) / h) * Math.PI;
      this.rotate(dTheta, dPhi);
      this.vTheta = dTheta * 60;
      this.vPhi = dPhi * 60;
    });
    const up = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = 0;
      if (!this.pointers.size) {
        this.dragging = false;
        if (this.reduced()) {
          this.vTheta = 0;
          this.vPhi = 0;
        }
        this.onChange();
      }
    };
    this.on(el, 'pointerup', up);
    this.on(el, 'pointercancel', up);
    this.on(
      el,
      'wheel',
      (e) => {
        e.preventDefault();
        this.setZoom(this.zoom * Math.exp(e.deltaY * 0.0012));
      },
      { passive: false },
    );
    this.on(el, 'dblclick', () => this.reset());
    this.on(el, 'keydown', (e) => {
      const k = e.key;
      const step = e.shiftKey ? 0.35 : 0.12;
      if (k === 'ArrowLeft') this.rotate(step, 0);
      else if (k === 'ArrowRight') this.rotate(-step, 0);
      else if (k === 'ArrowUp') this.rotate(0, step);
      else if (k === 'ArrowDown') this.rotate(0, -step);
      else if (k === '+' || k === '=') this.setZoom(this.zoom / 1.12);
      else if (k === '-' || k === '_') this.setZoom(this.zoom * 1.12);
      else if (k === '0' || k === 'Home') this.reset();
      else return;
      e.preventDefault();
    });
  }

  spread() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  rotate(dTheta, dPhi) {
    this.theta = (this.theta + dTheta) % TAU;
    this.phi = Math.min(Math.PI - 0.15, Math.max(0.15, this.phi + dPhi));
    this.apply();
  }

  setZoom(z) {
    this.zoom = Math.min(2.6, Math.max(0.45, z));
    this.apply();
  }

  reset() {
    this.theta = this.home.theta;
    this.phi = this.home.phi;
    this.zoom = this.home.zoom;
    this.vTheta = 0;
    this.vPhi = 0;
    this.apply();
  }

  apply() {
    const r = this.distance * this.zoom;
    const sp = Math.sin(this.phi);
    this.camera.position.set(r * sp * Math.sin(this.theta), r * Math.cos(this.phi), r * sp * Math.cos(this.theta));
    this.camera.lookAt(0, 0, 0);
    this.onChange();
  }

  /** Advances inertia; returns true while the view is still moving. */
  update(dt) {
    if (this.dragging) return true;
    if (Math.abs(this.vTheta) < 1e-3 && Math.abs(this.vPhi) < 1e-3) return false;
    this.rotate(this.vTheta * dt, this.vPhi * dt);
    const k = Math.pow(0.02, dt);
    this.vTheta *= k;
    this.vPhi *= k;
    return true;
  }

  dispose() {
    for (const off of this.handlers) off();
    this.handlers = [];
  }
}
