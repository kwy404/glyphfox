// StatusIcon: idle, loading, success and error, drawn on one circle so the
// morph engine can carry each state into the next. Loading spins once the
// morph has settled.

import { morphFrame } from '../core/controller.js';
import { nodesToString } from '../core/nodes.js';
import { renderSmart } from './render.js';

export const STATUS_STATES = ['idle', 'loading', 'success', 'error'];

const make = (state, body) => ({ name: `status-${state}`, body, tags: ['status', state], categories: ['smart'] });

/** Icon data of each state (stable objects, so morphs are prepared once). */
export const STATUS_ICONS = {
  idle: make('idle', '<circle cx="12" cy="12" r="10"/><path d="M12 12h.01"/>'),
  loading: make('loading', '<path d="M12 2A10 10 0 1 1 2 12"/>'),
  success: make('success', '<circle cx="12" cy="12" r="10"/><path d="M7.5 12l3 3 6-6"/>'),
  error: make('error', '<circle cx="12" cy="12" r="10"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>'),
};

export const STATUS_TITLES = { idle: 'Idle', loading: 'Loading', success: 'Success', error: 'Error' };

/** The canonical state for a value (unknown values are idle). */
export function statusState(state) {
  return STATUS_STATES.includes(state) ? state : 'idle';
}

/** Icon data for a state. */
export function statusIcon(state) {
  return STATUS_ICONS[statusState(state)];
}

/**
 * What to draw at morph progress `p` from state `from` to state `to`:
 * { icon, props } ready for renderSmart. `props.duration` and `delay` time
 * the morph, so they are not passed on; the loading spin uses `spinDuration`.
 */
export function statusView(from, to, p = 1, props = {}) {
  const state = statusState(to);
  const target = statusIcon(state);
  const source = from && statusState(from) !== state ? statusIcon(from) : null;
  const { duration: _duration, delay: _delay, spinDuration, ...rest } = props;
  const frame = source ? morphFrame(source, target, p, { variant: rest.variant }) : { icon: target, variant: rest.variant };
  const settled = !source || p >= 1;
  let animate = settled ? rest.animate : undefined;
  if (settled && animate === undefined && state === 'loading') animate = 'spin';
  const title = rest.title === 'auto' || rest.title === true ? STATUS_TITLES[state] : rest.title;
  return {
    icon: frame.icon,
    props: {
      ...rest,
      variant: frame.variant,
      animate,
      duration: animate === 'spin' ? spinDuration : undefined,
      title,
      class: [`gf-status gf-status-${state}`, rest.class].filter(Boolean).join(' '),
    },
  };
}

/**
 * Renders a state to SVG. With `from`, the SVG morphs from that state on
 * load with CSS only (no JavaScript), like toSvg with morphTo.
 */
export function statusSvg(state, options = {}) {
  const { from, ...props } = options;
  const to = statusState(state);
  if (from && STATUS_STATES.includes(from) && from !== to) {
    const { title, ...rest } = props;
    return nodesToString(
      renderSmart(statusIcon(from), {
        ...rest,
        title: title === 'auto' || title === true ? STATUS_TITLES[to] : title,
        morphTo: statusIcon(to),
        trigger: 'mount',
        class: [`gf-status gf-status-${to}`, rest.class].filter(Boolean).join(' '),
      }),
    );
  }
  const { icon, props: p } = statusView(null, to, 1, props);
  return nodesToString(renderSmart(icon, p));
}
