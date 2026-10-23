// Trigger engine: plays the animations of a rendered icon on the Web
// Animations API for the triggers that need a script. inView toggles the
// gf-in class (the CSS plays it); hover, focus and press take the animation
// over from the CSS (gf-js) so that leaving plays it back smoothly, looping
// animations finish their round, and a disabled trigger stops everything.
// Reduced motion keeps every icon still.

import { ANIMATIONS, TRIGGER_PARENTS } from './animate.js';
import { reducedMotion } from './controller.js';
import { bool } from './render.js';
import { iconAnimation, iterationsOf, trackSelector, waapiKeyframes } from './timeline.js';

const NOOP = () => {};

function parentOf(el) {
  if (el.parentElement) return el.parentElement;
  const root = el.getRootNode ? el.getRootNode() : null;
  return root && root.host ? root.host : null;
}

/** The element whose hover, focus or press plays the icon. */
export function triggerElement(svg, triggerParent) {
  for (let e = parentOf(svg); e; e = parentOf(e)) {
    if (e.classList && e.classList.contains('gf-trigger')) return e;
    if (triggerParent && e.matches && e.matches(TRIGGER_PARENTS)) return e;
  }
  return parentOf(svg) || svg;
}

function isDisabled(el, props) {
  if (bool(props.disabled)) return true;
  return !!(el && el.matches && el.matches(':disabled,[aria-disabled="true"]'));
}

const num = (v, def) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? def : Math.max(0, Number(v)));

function presetTransform(v, used) {
  const tf = [];
  if (used.has('y')) tf.push(`translateY(${v.y ?? 0}px)`);
  if (used.has('r')) tf.push(`rotate(${v.r ?? 0}deg)`);
  if (used.has('s')) tf.push(`scale(${v.s ?? 1})`);
  return tf.join(' ');
}

/** Web Animations specs ({ el, keyframes, timing }) for a rendered icon. */
export function animationSpecs(svg, props = {}, icon = null) {
  const out = [];
  const tl = props.animation !== undefined && props.animation !== null && props.animation !== false ? iconAnimation(icon, props.animation) : null;
  if (tl) {
    const timing = { duration: num(props.duration, tl.duration), delay: num(props.delay, 0), iterations: iterationsOf(props.loop ?? tl.loop), easing: tl.easing };
    for (const tr of tl.tracks) {
      const el = svg.querySelector(trackSelector(tr));
      if (el) out.push({ el, keyframes: waapiKeyframes(tr), timing });
    }
    return out;
  }
  const name = props.animate;
  const p = ANIMATIONS[name];
  if (!p) return out;
  const dur = num(props.duration, p.duration);
  const del = num(props.delay, 0);
  const iterations = iterationsOf(props.loop ?? p.loop);
  if (name === 'draw') {
    const strokes = [...svg.querySelectorAll('.gf-anim > *')];
    const n = strokes.length;
    const each = n > 1 ? Math.round(dur * 0.62) : dur;
    const step = n > 1 ? (dur - each) / (n - 1) : 0;
    strokes.forEach((el, i) => {
      out.push({ el, keyframes: [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], timing: { duration: each, delay: Math.round(del + i * step), iterations, easing: p.easing } });
    });
    return out;
  }
  const el = svg.querySelector('.gf-anim');
  if (!el) return out;
  const used = new Set(p.frames.flatMap(([, v]) => Object.keys(v)));
  const keyframes = p.frames.map(([offset, v]) => {
    const k = { offset };
    if (used.has('y') || used.has('r') || used.has('s')) k.transform = presetTransform(v, used);
    if (used.has('o')) k.opacity = v.o ?? 1;
    return k;
  });
  out.push({ el, keyframes, timing: { duration: dur, delay: del, iterations, easing: p.easing } });
  return out;
}

const EVENTS = {
  hover: [['pointerenter'], ['pointerleave']],
  focus: [['focusin'], ['focusout']],
  press: [['pointerdown'], ['pointerup', 'pointerleave', 'pointercancel']],
};

/**
 * Attaches the trigger engine to a rendered icon. Returns a function that
 * detaches it. `icon` is the icon data (for its designed animation).
 */
export function attachTriggers(svg, props = {}, icon = null) {
  const trigger = props.trigger || 'mount';
  if (!svg || typeof window === 'undefined' || bool(props.disabled)) return NOOP;
  if (trigger === 'inView') {
    if (typeof IntersectionObserver !== 'function') {
      svg.classList.add('gf-in');
      return NOOP;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) svg.classList.toggle('gf-in', e.isIntersecting);
    }, { threshold: 0.3 });
    io.observe(svg);
    return () => io.disconnect();
  }
  if (!EVENTS[trigger] || reducedMotion() || typeof svg.animate !== 'function') return NOOP;
  const specs = animationSpecs(svg, props, icon);
  const target = triggerElement(svg, bool(props.triggerParent));
  if (!specs.length || !target) return NOOP;
  svg.classList.add('gf-js');
  let anims = null;
  const create = () =>
    specs.map((s) => {
      const a = s.el.animate(s.keyframes, { ...s.timing, fill: 'both' });
      a.onfinish = () => {
        // Back at the start (or a loop finished its round): return to the
        // still icon.
        if (a.playbackRate < 0 || s.timing.iterations === Infinity) a.cancel();
      };
      return a;
    });
  const forward = (e) => {
    if (isDisabled(target, props)) return;
    if (trigger === 'focus' && e && e.target && e.target.matches && !e.target.matches(':focus-visible')) return;
    if (!anims) {
      anims = create();
      return;
    }
    anims.forEach((a, i) => {
      if (specs[i].timing.iterations === Infinity) a.effect.updateTiming({ iterations: Infinity });
      if (a.playState === 'idle' || a.playState === 'finished') {
        a.playbackRate = 1;
        a.currentTime = 0;
        a.play();
      } else if (a.playbackRate < 0) a.reverse();
      else a.play();
    });
  };
  const backward = () => {
    if (!anims) return;
    anims.forEach((a, i) => {
      if (a.playState === 'idle') return;
      if (specs[i].timing.iterations === Infinity) {
        const t = a.effect.getComputedTiming();
        a.effect.updateTiming({ iterations: Math.floor(t.currentIteration || 0) + 1 });
      } else if (a.playbackRate > 0) a.reverse();
    });
  };
  const [on, off] = EVENTS[trigger];
  for (const ev of on) target.addEventListener(ev, forward);
  for (const ev of off) target.addEventListener(ev, backward);
  const keys = (e) => {
    if (e.key === ' ' || e.key === 'Enter') (e.type === 'keydown' ? forward : backward)();
  };
  if (trigger === 'press') {
    target.addEventListener('keydown', keys);
    target.addEventListener('keyup', keys);
  }
  return () => {
    for (const ev of on) target.removeEventListener(ev, forward);
    for (const ev of off) target.removeEventListener(ev, backward);
    target.removeEventListener('keydown', keys);
    target.removeEventListener('keyup', keys);
    if (anims) for (const a of anims) a.cancel();
    svg.classList.remove('gf-js');
  };
}
