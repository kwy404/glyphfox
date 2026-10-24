// @vitest-environment jsdom
// Solid, Preact and Lit run the scripted triggers on the same trigger engine
// as React, Vue and Svelte: inView toggles gf-in, hover, focus and press take
// the animation over from the CSS (gf-js), parent triggers play from the
// nearest button or link, and frame timelines play per element. Imports go
// straight to this checkout's dist. Solid runs on its browser build, bundled
// by the esbuild CLI (the JS API does not run under jsdom), since the test
// runner resolves solid-js to the server build.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { h, render as preactRender } from 'preact';
import { act } from 'preact/test-utils';
import * as P from '../packages/glyphfox/dist/preact/index.js';
import * as L from '../packages/glyphfox/dist/lit/index.js';

const BEAT = {
  name: 'beat',
  duration: 600,
  easing: 'ease-in-out',
  frames: [
    { at: 0, element: 0, props: { transform: 'scale(1)' } },
    { at: 0.5, element: 0, props: { transform: 'scale(1.2)' } },
    { at: 1, element: 0, props: { transform: 'scale(1)' } },
    { at: 0.5, element: 'all', props: { opacity: 0.5 } },
  ],
};

let solidKit = null;
async function solidBrowser() {
  if (solidKit) return solidKit;
  mkdirSync(resolve('tmp'), { recursive: true });
  // tmp/ is ignored by git; the bundle is removed once it is loaded.
  const dir = mkdtempSync(join(resolve('tmp'), 'engine-solid-'));
  const entry = join(dir, 'entry.js');
  const heart = resolve('packages/glyphfox/dist/solid/icons/heart.js').split('\\').join('/');
  writeFileSync(entry, `export { HeartIcon } from ${JSON.stringify(heart)};\nexport { createComponent } from 'solid-js';\nexport { render } from 'solid-js/web';\n`);
  const cli = createRequire(import.meta.url).resolve('esbuild/bin/esbuild');
  // npm keeps bin/esbuild as a Node launcher on Windows and swaps in the
  // native binary elsewhere, so only the launcher goes through node.
  const launcher = readFileSync(cli).subarray(0, 2).toString() === '#!';
  const args = [entry, '--bundle', '--format=esm', '--platform=browser', '--conditions=browser', `--outfile=${join(dir, 'kit.js')}`, '--log-level=error'];
  const env = { ...process.env, NODE_PATH: resolve('node_modules') };
  if (launcher) execFileSync(process.execPath, [cli, ...args], { env });
  else execFileSync(cli, args, { env });
  solidKit = await import(/* @vite-ignore */ join(dir, 'kit.js').split('\\').join('/'));
  rmSync(dir, { recursive: true, force: true });
  try {
    rmdirSync(resolve('tmp')); // only when nothing else is in it
  } catch {}
  return solidKit;
}

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
  document.body.innerHTML = '';
  delete window.Element.prototype.animate;
  vi.unstubAllGlobals();
});

function fakeAnimate() {
  const calls = [];
  window.Element.prototype.animate = function animate(keyframes, timing) {
    calls.push('animate');
    return {
      el: this,
      keyframes,
      timing,
      playbackRate: 1,
      playState: 'running',
      currentTime: 0,
      effect: { updateTiming() {}, getComputedTiming: () => ({ currentIteration: 0 }) },
      reverse() {
        this.playbackRate = -this.playbackRate;
        calls.push('reverse');
      },
      play() {
        calls.push('play');
      },
      cancel() {
        this.playState = 'idle';
        calls.push('cancel');
      },
    };
  };
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  return calls;
}

function fakeObserver() {
  const seen = { el: null, cb: null };
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb) {
        seen.cb = cb;
      }
      observe(el) {
        seen.el = el;
      }
      disconnect() {
        seen.el = null;
      }
    },
  );
  return seen;
}

// Each framework mounts HeartIcon with props inside `host` and resolves to its <svg>.
const MOUNT = {
  solid: async (props, host) => {
    const { HeartIcon, createComponent, render } = await solidBrowser();
    cleanups.push(render(() => createComponent(HeartIcon, props), host));
    return host.querySelector('svg');
  },
  preact: async (props, host) => {
    act(() => preactRender(h(P.HeartIcon, props), host));
    cleanups.push(() => act(() => preactRender(null, host)));
    return host.querySelector('svg');
  },
  lit: async (props, host) => {
    L.defineIcons([L.HeartIcon]);
    const el = document.createElement('gf-heart');
    for (const [k, v] of Object.entries(props)) el[k === 'animate' ? 'animatePreset' : k] = v;
    host.appendChild(el);
    await el.updateComplete;
    return el.shadowRoot.querySelector('svg');
  },
};

for (const [fw, mount] of Object.entries(MOUNT)) {
  describe(`${fw}: trigger engine`, () => {
    it('toggles gf-in when the icon scrolls into view', async () => {
      const io = fakeObserver();
      const svg = await mount({ animate: 'pop', trigger: 'inView' }, document.body.appendChild(document.createElement('div')));
      expect(io.el).toBe(svg);
      io.cb([{ isIntersecting: true }]);
      expect(svg.classList.contains('gf-in')).toBe(true);
      io.cb([{ isIntersecting: false }]);
      expect(svg.classList.contains('gf-in')).toBe(false);
    });

    it('plays press from a parent button and reverses on release', async () => {
      const calls = fakeAnimate();
      const button = document.body.appendChild(document.createElement('button'));
      const svg = await mount({ animate: 'pop', trigger: 'press', triggerParent: true }, button);
      expect(svg.classList.contains('gf-js')).toBe(true);
      button.dispatchEvent(new window.Event('pointerdown'));
      expect(calls).toContain('animate');
      button.dispatchEvent(new window.Event('pointerup'));
      expect(calls).toContain('reverse');
    });

    it('plays a frame timeline per element on focus', async () => {
      const calls = fakeAnimate();
      const button = document.body.appendChild(document.createElement('button'));
      const svg = await mount({ animation: BEAT, trigger: 'focus', triggerParent: true }, button);
      expect(svg.classList.contains('gf-js')).toBe(true);
      button.matches = (sel) => sel === ':focus-visible' || window.Element.prototype.matches.call(button, sel);
      button.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
      expect(calls.filter((c) => c === 'animate')).toHaveLength(2);
    });

    it('leaves the CSS triggers alone and stays still when disabled', async () => {
      const calls = fakeAnimate();
      const io = fakeObserver();
      const still = await mount({ animate: 'pop', trigger: 'hover', disabled: true }, document.body.appendChild(document.createElement('div')));
      expect(still.classList.contains('gf-js')).toBe(false);
      const mounted = await mount({ animate: 'spin', trigger: 'mount' }, document.body.appendChild(document.createElement('div')));
      expect(mounted.classList.contains('gf-js')).toBe(false);
      expect(io.el).toBeNull();
      expect(calls).toHaveLength(0);
    });
  });
}
