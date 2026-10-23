// IconGroup: plays one living state preset across several icons with a
// stagger. Icons rendered by the group get their own delay; for any other
// children a scoped stylesheet animates each direct child element.

import { ANIMATIONS, TRIGGERS } from '../core/animate.js';
import { hash } from '../core/nodes.js';

export const GROUP_TRIGGERS = TRIGGERS;

const num = (v, def) => {
  const n = Number(v);
  return v !== undefined && v !== null && v !== '' && Number.isFinite(n) && n >= 0 ? n : def;
};

/**
 * Delay in ms of each of `count` items. `from` orders the wave: "start"
 * (default), "end" or "center".
 */
export function staggerDelays(count, { stagger = 60, delay = 0, from = 'start' } = {}) {
  const n = Math.max(0, Math.floor(Number(count)) || 0);
  const s = num(stagger, 60);
  const d = num(delay, 0);
  const rank = (i) => (from === 'end' ? n - 1 - i : from === 'center' ? Math.abs(i - (n - 1) / 2) : i);
  return Array.from({ length: n }, (_, i) => Math.round(d + rank(i) * s));
}

/** Props for each of `count` icons in a group: { animate, trigger, active, delay, duration, loop }. */
export function groupProps(count, { animate = 'pop', stagger, delay, from, trigger = 'mount', active, duration, loop } = {}) {
  const trig = TRIGGERS.includes(trigger) ? trigger : 'mount';
  return staggerDelays(count, { stagger, delay, from }).map((d) => {
    const p = { animate, trigger: trig, delay: d };
    if (trig === 'state') p.active = active;
    if (duration !== undefined && duration !== null && duration !== '') p.duration = duration;
    if (loop !== undefined && loop !== null) p.loop = loop;
    return p;
  });
}

const pct = (o) => `${Math.round(o * 1000) / 10}%`;

function frameCss(frames) {
  const used = new Set();
  for (const [, v] of frames) for (const k of Object.keys(v)) used.add(k);
  return frames
    .map(([o, v]) => {
      const tf = [];
      if (used.has('y')) tf.push(`translateY(${((v.y ?? 0) / 24) * 100}%)`);
      if (used.has('r')) tf.push(`rotate(${v.r ?? 0}deg)`);
      if (used.has('s')) tf.push(`scale(${v.s ?? 1})`);
      const parts = [];
      if (tf.length) parts.push(`transform:${tf.join(' ')}`);
      if (used.has('o')) parts.push(`opacity:${v.o ?? 1}`);
      return `${pct(o)}{${parts.join(';')}}`;
    })
    .join('');
}

/**
 * Scoped stylesheet that staggers a preset across the direct children of an
 * element with `className` (for children the group does not render itself).
 * Covers the first `count` children (default 24). Returns { className, css }.
 */
export function groupCss({ animate = 'pop', stagger, delay, from, trigger = 'mount', duration, loop, count = 24 } = {}) {
  const p = ANIMATIONS[animate];
  if (!p) return null;
  const trig = TRIGGERS.includes(trigger) ? trigger : 'mount';
  const dur = Math.round(num(duration, p.duration));
  const lp = loop === undefined || loop === null ? p.loop : loop;
  const iter = lp === true || lp === 'true' || lp === Infinity ? 'infinite' : Number(lp) >= 1 ? String(Math.floor(Number(lp))) : '1';
  const n = Math.max(1, Math.min(200, Math.floor(Number(count)) || 24));
  const delays = staggerDelays(n, { stagger, delay, from });
  const className = 'gf-g' + hash([animate, trig, dur, iter, delays.join(',')].join('|'));
  const scopes = trig === 'hover' ? [[`.${className}:hover`]] : trig === 'state' ? [[`.${className}.gf-on`]] : trig === 'click' ? [[`.${className}[data-gf-run="1"]`], [`.${className}[data-gf-run="2"]`]] : [[`.${className}`]];
  const draw = animate === 'draw';
  const target = draw ? '>* :is(path,circle,rect,line,polyline,polygon,ellipse)' : '>*';
  let css = '';
  scopes.forEach((sels, k) => {
    const name = `${className}-k${k}`;
    css += draw ? `@keyframes ${name}{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}` : `@keyframes ${name}{${frameCss(p.frames)}}`;
    const S = (tail) => sels.map((s) => `${s}${tail}`).join(',');
    css += `${S(target)}{${draw ? 'stroke-dasharray:100;' : ''}animation:${name} ${dur}ms ${p.easing} 0ms ${iter} both}`;
    delays.forEach((d, i) => {
      if (d > 0) css += `${S(draw ? `>:nth-child(${i + 1}) :is(path,circle,rect,line,polyline,polygon,ellipse)` : `>:nth-child(${i + 1})`)}{animation-delay:${d}ms}`;
    });
  });
  if (!draw) css += `.${className}>*{transform-origin:${p.origin ? `${(p.origin[0] / 24) * 100}% ${(p.origin[1] / 24) * 100}%` : '50% 50%'}}`;
  css += `@media (prefers-reduced-motion:reduce){.${className}>*,.${className}>* *{animation:none!important}}`;
  return { className, css };
}

/** Next value of the click replay attribute (data-gf-run), like the icons use. */
export function nextRun(run) {
  return run === '1' ? '2' : '1';
}
