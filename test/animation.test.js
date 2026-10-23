// @vitest-environment jsdom
// Designed animations (frame timelines per element), the CSS fallback for
// every trigger and the trigger engine on the Web Animations API.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachTriggers, getIcon, iconNames, normalizeTimeline, renderToString, sampleTimeline, timelineCss, toSvg } from 'glyphfox';
import 'glyphfox/web';

const BEAT = {
  name: 'beat',
  duration: 600,
  easing: 'ease-in-out',
  frames: [
    { at: 0.5, element: 0, props: { transform: 'scale(1.2)' } },
    { at: 0, element: 0, props: { transform: 'scale(1)', opacity: 1 } },
    { at: 1, element: 0, props: { transform: 'scale(1)' } },
    { at: 0.5, element: 'all', props: { opacity: 0.5 } },
  ],
};
const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('timelines', () => {
  it('normalizes frames into sorted tracks with both ends filled', () => {
    const tl = normalizeTimeline(BEAT);
    expect(tl.tracks.map((t) => t.element)).toEqual(['0', 'all']);
    const kf = tl.tracks[0].keyframes;
    expect(kf.map((k) => k.offset)).toEqual([0, 0.5, 1]);
    expect(kf[2].opacity).toBe(1);
    const all = tl.tracks[1].keyframes;
    expect(all[0]).toMatchObject({ offset: 0, opacity: 0.5 });
    expect(all[all.length - 1]).toMatchObject({ offset: 1, opacity: 0.5 });
    expect(normalizeTimeline(JSON.stringify(BEAT)).duration).toBe(600);
    expect(normalizeTimeline({ frames: [] })).toBeNull();
    expect(normalizeTimeline('not json')).toBeNull();
  });

  it('samples the timeline for frame export', () => {
    const tl = normalizeTimeline({ duration: 1000, easing: 'linear', frames: [{ at: 0, element: 0, props: { transform: 'scale(1)', strokeDashoffset: 1 } }, { at: 1, element: 0, props: { transform: 'scale(2)', strokeDashoffset: 0 } }] });
    const [s] = sampleTimeline(tl, 500);
    expect(s.transform).toBe('scale(1.5)');
    expect(s.strokeDashoffset).toBeCloseTo(0.5);
    expect(sampleTimeline(tl, 5000)[0].transform).toBe('scale(2)');
  });

  it('writes CSS for every trigger', () => {
    const tl = normalizeTimeline(BEAT);
    const css = (trigger, extra = {}) => timelineCss(tl, { trigger, ...extra }).css;
    expect(css('mount')).toMatch(/\.gf-t[0-9a-z]+ \.gf-e0\{animation:gf-t[0-9a-z]+-0 600ms ease-in-out 0ms 1 both\}/);
    expect(css('hover')).toMatch(/:not\(\.gf-js\):hover \.gf-e0/);
    expect(css('hover')).toContain('.gf-trigger:hover');
    expect(css('focus')).toContain(':focus-visible');
    expect(css('press')).toContain(':active');
    expect(css('inView')).toMatch(/\.gf-t[0-9a-z]+\.gf-in \.gf-e0/);
    expect(css('state')).toMatch(/\.gf-on \.gf-e0/);
    expect(css('loop')).toContain(' infinite both');
    expect(css('click')).toContain('[data-gf-run="2"]');
    expect(css('hover', { triggerParent: true })).toContain(':is(a,button,label,summary');
    const any = css('mount');
    expect(any).toContain('prefers-reduced-motion:reduce');
    expect(any).toContain(':is(:disabled,[aria-disabled="true"])');
  });

  it('plays the designed animations of the icon set', () => {
    const animated = iconNames.filter((n) => getIcon(n).animation);
    expect(animated.length).toBeGreaterThan(20);
    for (const name of animated.slice(0, 60)) {
      const svg = toSvg(name, { animation: true });
      expect(svg, name).toMatch(/@keyframes gf-t/);
    }
    const still = iconNames.find((n) => !getIcon(n).animation);
    expect(toSvg(still, { animation: true })).not.toContain('<style');
    expect(toSvg('heart', { animation: BEAT, animate: 'spin' })).not.toContain('gf-spin');
    expect(toSvg('heart', { animation: BEAT, disabled: true })).not.toContain('<style');
  });

  it('samples a designed animation into static styles for export', () => {
    const svg = renderToString(getIcon('heart'), { animation: BEAT, frame: 300 });
    expect(svg).not.toContain('<style');
    expect(svg).toContain('transform:scale(1.2)');
    expect(svg).toContain('transform-origin:12px 12px');
  });

  it('plays the designed animation in the web component', async () => {
    const name = iconNames.find((n) => getIcon(n).animation);
    const el = document.createElement('glyph-fox');
    el.setAttribute('name', name);
    el.setAttribute('animation', '');
    document.body.appendChild(el);
    await wait(30);
    expect(el.shadowRoot.querySelector('svg style').textContent).toMatch(/@keyframes gf-t/);
  });
});

function fakeAnimate() {
  const calls = [];
  const proto = window.Element.prototype;
  proto.animate = function animate(keyframes, timing) {
    const a = {
      el: this,
      keyframes,
      timing,
      playbackRate: 1,
      playState: 'running',
      currentTime: 0,
      effect: { updateTiming: vi.fn(), getComputedTiming: () => ({ currentIteration: 0 }) },
      reverse() {
        this.playbackRate = -this.playbackRate;
        calls.push('reverse');
      },
      play() {
        this.playState = 'running';
        calls.push('play');
      },
      cancel() {
        this.playState = 'idle';
        calls.push('cancel');
      },
    };
    calls.push('animate');
    return a;
  };
  return calls;
}

describe('trigger engine', () => {
  it('toggles gf-in when the icon scrolls into view', () => {
    let cb;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(fn) {
          cb = fn;
        }
        observe() {}
        disconnect() {}
      },
    );
    document.body.innerHTML = toSvg('heart', { animate: 'pop', trigger: 'inView' });
    const svg = document.querySelector('svg');
    const stop = attachTriggers(svg, { animate: 'pop', trigger: 'inView' });
    cb([{ isIntersecting: true }]);
    expect(svg.classList.contains('gf-in')).toBe(true);
    cb([{ isIntersecting: false }]);
    expect(svg.classList.contains('gf-in')).toBe(false);
    stop();
  });

  it('plays on hover and reverses smoothly on leave, from a parent trigger', () => {
    const calls = fakeAnimate();
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    document.body.innerHTML = `<a href="#x" class="link"><span>${toSvg('heart', { animate: 'wiggle', trigger: 'hover', triggerParent: true })}</span></a>`;
    const svg = document.querySelector('svg');
    const link = document.querySelector('a');
    const stop = attachTriggers(svg, { animate: 'wiggle', trigger: 'hover', triggerParent: true });
    expect(svg.classList.contains('gf-js')).toBe(true);
    link.dispatchEvent(new window.Event('pointerenter'));
    expect(calls).toContain('animate');
    link.dispatchEvent(new window.Event('pointerleave'));
    expect(calls).toContain('reverse');
    stop();
    expect(svg.classList.contains('gf-js')).toBe(false);
    expect(calls).toContain('cancel');
  });

  it('does nothing when disabled, on a disabled parent or with reduced motion', () => {
    const calls = fakeAnimate();
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    document.body.innerHTML = `<button disabled>${toSvg('heart', { animate: 'pop', trigger: 'hover', triggerParent: true })}</button>`;
    const svg = document.querySelector('svg');
    attachTriggers(svg, { animate: 'pop', trigger: 'hover', triggerParent: true });
    document.querySelector('button').dispatchEvent(new window.Event('pointerenter'));
    expect(calls).not.toContain('animate');
    expect(attachTriggers(svg, { animate: 'pop', trigger: 'hover', disabled: true })()).toBeUndefined();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    document.body.innerHTML = toSvg('heart', { animate: 'pop', trigger: 'press' });
    const still = document.querySelector('svg');
    attachTriggers(still, { animate: 'pop', trigger: 'press' });
    expect(still.classList.contains('gf-js')).toBe(false);
  });

  it('plays a designed animation per element on focus', () => {
    const calls = fakeAnimate();
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    document.body.innerHTML = `<button>${toSvg('heart', { animation: BEAT, trigger: 'focus' })}</button>`;
    const svg = document.querySelector('svg');
    const button = document.querySelector('button');
    attachTriggers(svg, { animation: BEAT, trigger: 'focus' }, getIcon('heart'));
    button.matches = (sel) => sel === ':focus-visible' || window.Element.prototype.matches.call(button, sel);
    button.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    expect(calls.filter((c) => c === 'animate')).toHaveLength(2);
  });
});
