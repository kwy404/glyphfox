// Framework neutral helpers for the interactive props: splitting props,
// tweening the morph progress and deciding where a morph should go.

import { easing } from './animate.js';
import { createMorph } from './morph.js';
import { PROPS } from './render.js';

export const PROP_SET = new Set(PROPS);
export const MORPH_EASE = easing('cubic-bezier(.65,0,.35,1)');

/** Splits an object into the shared glyph props and everything else. */
export function splitProps(input) {
  const glyph = {};
  const rest = {};
  for (const k in input) {
    if (PROP_SET.has(k)) glyph[k] = input[k];
    else rest[k] = input[k];
  }
  return { glyph, rest };
}

export function reducedMotion() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const raf = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(() => cb(now()), 16));
const caf = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

/**
 * Tweens a value from `from` to `to`, calling onFrame(value) every frame.
 * Returns a cancel function. Reduced motion jumps to the end.
 */
export function tween(from, to, { duration = 450, delay = 0 } = {}, onFrame) {
  if (from === to) return () => {};
  const dur = Math.max(0, Number(duration) || 0);
  if (reducedMotion() || dur === 0) {
    onFrame(to);
    return () => {};
  }
  const span = dur * Math.abs(to - from);
  const start = now() + Math.max(0, Number(delay) || 0);
  let id = 0;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const k = Math.min(1, Math.max(0, (now() - start) / span));
    onFrame(from + (to - from) * k);
    if (k < 1) id = raf(tick);
  };
  id = raf(tick);
  return () => {
    stopped = true;
    caf(id);
  };
}

/** Morph goal (0 shows the icon, 1 shows the morphTo target) for a trigger. */
export function morphGoal(trigger, { active, hovered, toggled, mounted }) {
  switch (trigger) {
    case 'hover':
      return hovered ? 1 : 0;
    case 'click':
      return toggled ? 1 : 0;
    case 'state':
      return active ? 1 : 0;
    default:
      return mounted ? 1 : 0;
  }
}

/**
 * What to draw for morph progress p: { icon, variant }. The exact icon at 0,
 * the exact target (with its own style when the spec sets one) at 1, and an
 * interpolated frame in between.
 */
export function morphFrame(base, target, p, { variant, targetVariant } = {}) {
  if (!target || p <= 0) return { icon: base, variant };
  if (p >= 1) return { icon: target, variant: targetVariant || variant };
  const m = createMorph(base, target, { fromVariant: variant, toVariant: targetVariant || variant });
  return { icon: m.frame(MORPH_EASE(p)), variant };
}
