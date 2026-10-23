// Tailwind CSS plugin (v3 and v4). Classes render icons as a CSS mask in
// currentColor, so text color, size and opacity utilities apply:
//   gf-file            an icon (1em square)
//   gf-file+check      with a modifier badge (corners: gf-[file+check@tr])
//   gf-[cloud&lock]    a fusion (any layout: gf-[cloud&lock:side])
//   gf-file/solid      axes after the slash: solid, duotone, sharp, w1.5 (joined with -)
//   gf-spin gf-pulse gf-pop gf-wiggle gf-bounce gf-shake   animations
//
// v3: plugins: [require('glyphfox/tailwind')] or glyphfox({ prefix, combos })
// v4: @plugin "glyphfox/tailwind";

import { icons } from '../registry.js';
import { MODIFIER_NAMES } from '../core/compose.js';
import { toDataUri } from '../core/formats.js';
import { renderToString } from '../core/render.js';
import { resolveSpec } from '../core/spec.js';

const lookup = (n) => (Object.prototype.hasOwnProperty.call(icons, n) ? icons[n] : null);

/** Parses the axes after the slash: solid, duotone, outline, sharp, round, w2.5. */
export function parseAxes(modifier, defaults = {}) {
  const axes = { ...defaults };
  if (!modifier) return axes;
  for (const tok of String(modifier).split(/[-_,\s]+/)) {
    if (tok === 'outline' || tok === 'duotone' || tok === 'solid') axes.variant = tok;
    else if (tok === 'sharp' || tok === 'round') axes.corners = tok;
    else if (/^w\d*\.?\d+$/.test(tok)) axes.weight = Number(tok.slice(1));
  }
  return axes;
}

/** Data URI for a spec rendered with axes (used as the mask image). */
export function maskUrl(spec, axes = {}) {
  const weight = axes.weight ?? 2;
  const { icon, variant } = resolveSpec(spec, lookup, { weight });
  const svg = renderToString(icon, { variant: variant || axes.variant, corners: axes.corners, weight, decorative: true })
    .replace(/ class="[^"]*"/, '')
    .replace(/ aria-hidden="true"/, '');
  return toDataUri(svg);
}

function iconRule(spec, axes, size) {
  const url = `url("${maskUrl(spec, axes)}")`;
  return {
    display: 'inline-block',
    width: size,
    height: size,
    'flex-shrink': '0',
    'vertical-align': '-0.125em',
    'background-color': 'currentColor',
    '-webkit-mask-image': url,
    'mask-image': url,
    '-webkit-mask-repeat': 'no-repeat',
    'mask-repeat': 'no-repeat',
    '-webkit-mask-position': 'center',
    'mask-position': 'center',
    '-webkit-mask-size': '100% 100%',
    'mask-size': '100% 100%',
  };
}

const ANIMATION_CSS = {
  spin: ['1s linear infinite', { to: { transform: 'rotate(360deg)' } }],
  pulse: ['1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite', { '50%': { transform: 'scale(0.88)', opacity: '0.5' } }],
  pop: ['0.52s cubic-bezier(0.34, 1.56, 0.64, 1) both', { '0%': { transform: 'scale(0.55)', opacity: '0' } }],
  wiggle: [
    '0.72s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
    { '18%': { transform: 'rotate(-13deg)' }, '36%': { transform: 'rotate(11deg)' }, '54%': { transform: 'rotate(-7deg)' }, '72%': { transform: 'rotate(4deg)' } },
  ],
  bounce: ['0.9s cubic-bezier(0.33, 0, 0.25, 1) both', { '28%': { transform: 'translateY(-18%)' }, '50%': { transform: 'translateY(0)' }, '66%': { transform: 'translateY(-7%)' } }],
  shake: [
    '0.95s ease-in-out both',
    { '8%': { transform: 'rotate(15deg)' }, '18%': { transform: 'rotate(-13deg)' }, '28%': { transform: 'rotate(10deg)' }, '38%': { transform: 'rotate(-8deg)' }, '48%': { transform: 'rotate(5deg)' }, '68%': { transform: 'rotate(1.5deg)' }, '78%': { transform: 'rotate(0)' } },
  ],
};

function list(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(/[\s,]+/)
    .filter(Boolean);
}

function createHandler(options = {}) {
  const prefix = options.prefix || 'gf';
  const size = options.size || '1em';
  const defaults = parseAxes('', {
    variant: options.variant,
    corners: options.corners,
    weight: options.weight === undefined ? undefined : Number(options.weight),
  });
  const values = {};
  for (const name of Object.keys(icons)) {
    values[name] = name;
    for (const m of MODIFIER_NAMES) values[`${name}+${m}`] = `${name}+${m}`;
  }
  for (const c of list(options.combos)) values[c] = c;
  return function glyphfoxHandler({ matchUtilities, addUtilities }) {
    matchUtilities(
      {
        [prefix]: (value, extra) => {
          try {
            return iconRule(String(value).trim(), parseAxes(extra && extra.modifier, defaults), size);
          } catch {
            return {};
          }
        },
      },
      { values, modifiers: 'any' },
    );
    const utils = {};
    const names = [];
    for (const [name, [timing, frames]] of Object.entries(ANIMATION_CSS)) {
      utils[`@keyframes ${prefix}-${name}`] = frames;
      utils[`.${prefix}-${name}`] = { animation: `${prefix}-${name} ${timing}`, ...(name === 'shake' ? { 'transform-origin': '50% 10%' } : {}) };
      names.push(`.${prefix}-${name}`);
    }
    utils['@media (prefers-reduced-motion: reduce)'] = { [names.join(', ')]: { animation: 'none' } };
    addUtilities(utils);
  };
}

/** The plugin, shaped like tailwindcss/plugin withOptions so v3 and v4 both accept it. */
function glyphfox(options = {}) {
  return { __options: options, handler: createHandler(options), config: {} };
}
glyphfox.__isOptionsFunction = true;
glyphfox.__pluginFunction = createHandler;
glyphfox.__configFunction = () => ({});

export default glyphfox;
export { glyphfox };
