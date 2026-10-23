// Landing page: the hero swarm, scroll driven scenes and showcases.

import { $, $$, codeBlock, gf, has, loadIcons, pick, reduced, svg, t } from './app.js';

const FENN = ['M4 3l5 5h6l5-5 1 9-9 9-9-9z', 'M6.5 13.5 12 18l5.5-4.5'];
const EYES = [
  [9.5, 11.5],
  [14.5, 11.5],
];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outBack = (x) => {
  const c1 = 1.3;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

if (reduced) document.documentElement.classList.add('reduced');

// Hero: hundreds of icons flow into Fenn.

function iconPath(icon) {
  const nodes = gf.splitLayers(gf.iconNodes(icon)).primary;
  let d = '';
  for (const n of nodes) d += gf.geometry.serializePath(gf.geometry.shapeToSegments(n), 2);
  return new Path2D(d);
}

function fennTargets(count) {
  const polys = FENN.flatMap((d) => gf.geometry.flatten(gf.geometry.parsePath(d), 0.2));
  const eyeCount = 6;
  const n = Math.max(12, count - eyeCount);
  let total = 0;
  for (const p of polys) total += gf.geometry.polylineLength(p.points);
  const out = [];
  for (const p of polys) {
    const len = gf.geometry.polylineLength(p.points);
    const k = Math.max(3, Math.round((n * len) / total));
    const pts = gf.geometry.resample(p.points, k + (p.closed ? 1 : 0));
    if (p.closed) pts.pop();
    out.push(...pts);
  }
  for (let i = 0; i < eyeCount; i++) {
    const [ex, ey] = EYES[i % 2];
    const a = (i / eyeCount) * Math.PI * 2;
    out.push([ex + Math.cos(a) * 0.35, ey + Math.sin(a) * 0.35]);
  }
  return out;
}

function heroSwarm(icons) {
  const canvas = $('#swarm');
  const fenn = $('.hero-fenn');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pool = icons.filter((i) => !i.name.includes('chevron')).sort(() => Math.random() - 0.5);
  const paths = new Map();
  const pathOf = (icon) => {
    let p = paths.get(icon.name);
    if (!p) {
      p = iconPath(icon);
      paths.set(icon.name, p);
    }
    return p;
  };
  const targets = fennTargets(window.innerWidth < 700 ? 150 : 250);
  const parts = targets.map((tg, i) => {
    const a0 = Math.random() * Math.PI * 2;
    return {
      icon: pool[i % pool.length],
      tx: tg[0],
      ty: tg[1],
      a0,
      r0: 15 + Math.random() * 16,
      z: 0.4 + Math.random() * 1.6,
      spin: (Math.random() - 0.5) * 6,
      swirl: 1.4 + Math.random() * 1.6,
      delay: (i / targets.length) * 0.9 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      accent: i % 6 === 0,
      vx: 0,
      vy: 0,
      ox: 0,
      oy: 0,
    };
  });
  let W = 0;
  let H = 0;
  let dpr = 1;
  let colors = { text: '#f5f5f6', accent: '#ff7a1a' };
  const readColors = () => {
    colors = { text: css('--text') || '#fff', accent: css('--accent') || '#ff7a1a' };
  };
  readColors();
  new MutationObserver(() => {
    readColors();
    draw(performance.now());
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };
  resize();
  new ResizeObserver(() => {
    resize();
    draw(performance.now());
  }).observe(canvas);

  let pointer = null;
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer = [e.clientX - r.left, e.clientY - r.top];
    wake();
  });
  canvas.parentElement.addEventListener('pointerleave', () => {
    pointer = null;
  });

  const start = performance.now();
  const DUR = 1.9;
  let raf = 0;
  let visible = true;
  let lastActive = performance.now();
  let fennShown = false;

  function draw(now) {
    const time = reduced ? 1e6 : (now - start) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // The stage square sits inside the canvas (the canvas bleeds 8% around it).
    const side = W / 1.16;
    const unit = side / 24;
    const cx0 = W * (0.08 / 1.16);
    const cy0 = H * (0.08 / 1.16);
    const cxs = cx0 + side / 2;
    const cys = cy0 + side / 2;
    const base = unit * 0.9;
    let settled = true;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const pass of [false, true]) {
      ctx.strokeStyle = pass ? colors.accent : colors.text;
      for (const p of parts) {
        if (p.accent !== pass) continue;
        const local = clamp((time - p.delay) / DUR);
        if (local < 1) settled = false;
        const e = outBack(local);
        const tx = cx0 + p.tx * unit;
        const ty = cy0 + p.ty * unit;
        const tr = Math.hypot(tx - cxs, ty - cys);
        const ta = Math.atan2(ty - cys, tx - cxs);
        const ra = p.r0 * unit * 0.5;
        const ang = p.a0 + p.swirl * (1 - e) + (ta - p.a0) * Math.min(1, e);
        const rad = ra + (tr - ra) * e;
        let x = cxs + Math.cos(ang) * rad;
        let y = cys + Math.sin(ang) * rad;
        if (local >= 1 && !reduced) {
          x += Math.sin(time * 1.3 + p.phase) * unit * 0.06;
          y += Math.cos(time * 1.1 + p.phase) * unit * 0.06;
        }
        if (pointer && local >= 1) {
          const dx = x + p.ox - pointer[0];
          const dy = y + p.oy - pointer[1];
          const d = Math.hypot(dx, dy);
          const R = unit * 3.2;
          if (d < R && d > 0.01) {
            const f = (1 - d / R) * unit * 0.9;
            p.vx += (dx / d) * f * 0.12;
            p.vy += (dy / d) * f * 0.12;
          }
        }
        p.vx += -p.ox * 0.08;
        p.vy += -p.oy * 0.08;
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.ox += p.vx;
        p.oy += p.vy;
        if (Math.abs(p.ox) + Math.abs(p.oy) > 0.05) settled = false;
        x += p.ox;
        y += p.oy;
        const size = base * (1 + (1 - Math.min(1, e)) * p.z);
        const rot = p.spin * (1 - Math.min(1, e));
        const alpha = clamp(local * 3) * (local >= 1 ? (pass ? 1 : 0.78) : 0.9);
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        const k = (size / 24) * dpr;
        const c = Math.cos(rot) * k;
        const s = Math.sin(rot) * k;
        ctx.setTransform(c, s, -s, c, x * dpr - (c * 12 - s * 12), y * dpr - (s * 12 + c * 12));
        ctx.lineWidth = 2;
        ctx.stroke(pathOf(p.icon));
      }
    }
    ctx.globalAlpha = 1;
    if (!fennShown && time > DUR * 0.9) {
      fennShown = true;
      fenn.classList.add('on');
    }
    return settled;
  }

  function loop(now) {
    raf = 0;
    const settled = draw(now);
    if (!settled) lastActive = now;
    if (visible && (!settled || now - lastActive < 4000 || pointer)) raf = requestAnimationFrame(loop);
  }
  function wake() {
    lastActive = performance.now();
    if (!raf && visible && !reduced) raf = requestAnimationFrame(loop);
  }
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) wake();
  }).observe(canvas);
  if (reduced) {
    draw(performance.now());
    fenn.classList.add('on');
  } else wake();
}

// Scroll scenes.

const scenes = [];
function registerScene(el, update) {
  if (!el) return;
  const s = { el, update, active: false, last: -1 };
  scenes.push(s);
  if (reduced) {
    update(1);
    return;
  }
  new IntersectionObserver(
    (entries) => {
      s.active = entries[0].isIntersecting;
      if (s.active) tick();
    },
    { rootMargin: '200px 0px' },
  ).observe(el);
}
let ticking = false;
function tick() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = window.innerHeight;
    for (const s of scenes) {
      if (!s.active) continue;
      const r = s.el.getBoundingClientRect();
      const total = Math.max(1, s.el.offsetHeight - vh);
      const p = clamp((64 - r.top) / total);
      if (Math.abs(p - s.last) < 0.0005) continue;
      s.last = p;
      s.update(p);
    }
  });
}
if (!reduced) {
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
}

// Axes scene.

const NICE = ['home', 'search', 'settings', 'bell', 'heart', 'star', 'camera', 'mail', 'folder', 'cloud', 'lock', 'user', 'calendar', 'message-circle', 'image', 'music', 'play', 'map-pin', 'shopping-cart', 'sun', 'bookmark', 'send', 'trash', 'download', 'zap', 'gift', 'globe', 'compass', 'terminal', 'database', 'cpu', 'headphones', 'video', 'mic', 'phone', 'clock', 'file', 'package', 'layers', 'activity'];

function niceIcons(count, extra = []) {
  const list = [...new Set([...NICE, ...extra])].filter(has);
  return list.slice(0, count);
}

function axesScene() {
  const board = $('[data-board]');
  if (!board) return;
  const names = niceIcons(15);
  let state = { corners: '', variant: '' };
  const tiles = names.map(() => {
    const d = document.createElement('div');
    d.className = 'tile';
    board.appendChild(d);
    return d;
  });
  const paint = (corners, variant) => {
    names.forEach((n, i) => {
      tiles[i].innerHTML = svg(n, { size: 48, corners, variant });
    });
  };
  const out = (k) => $(`[data-out="${k}"]`);
  registerScene($('[data-scene="axes"]'), (p) => {
    const weight = p < 0.42 ? 1 + 2 * ease(p / 0.42) : p < 0.58 ? 3 - ease((p - 0.42) / 0.16) : 2;
    const corners = p >= 0.48 && p < 0.66 ? 'sharp' : 'round';
    const variant = reduced ? 'duotone' : p < 0.66 ? 'outline' : p < 0.83 ? 'duotone' : 'solid';
    if (corners !== state.corners || variant !== state.variant) {
      state = { corners, variant };
      paint(corners, variant);
    }
    for (const tile of tiles) {
      const s = tile.firstElementChild;
      if (s) s.setAttribute('stroke-width', String(Math.round(weight * 100) / 100));
    }
    const hot = Math.floor(p * tiles.length * 2.2) % tiles.length;
    tiles.forEach((tl, i) => tl.classList.toggle('hot', i === hot && !reduced));
    out('weight').textContent = weight.toFixed(2);
    out('corners').textContent = t(`corners.${corners}`);
    out('variant').textContent = t(`variant.${variant}`);
    const bar = $('[data-bar="weight"]');
    if (bar) bar.style.width = `${((weight - 1) / 2) * 100}%`;
  });
}

// Live playground.

function playground() {
  const form = $('[data-play]');
  const grid = $('[data-play-grid]');
  const code = $('[data-play-code]');
  if (!form) return;
  const names = niceIcons(24);
  const props = { weight: 2, size: 40, corners: 'round', variant: 'outline', color: '#ff7a1a' };
  let pending = false;
  const render = () => {
    pending = false;
    grid.innerHTML = names.map((n) => `<div class="tile" style="color:${props.color}">${svg(n, { ...props, color: undefined })}</div>`).join('');
    code.replaceChildren(codeBlock(gf.snippet('jsx', names[0], { ...props }), 'js', 'App.jsx'));
  };
  const schedule = () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(render);
    }
  };
  for (const input of $$('input[type=range]', form)) {
    const sync = () => {
      const min = Number(input.min);
      const max = Number(input.max);
      input.style.setProperty('--p', `${((Number(input.value) - min) / (max - min)) * 100}%`);
      props[input.name] = Number(input.value);
      const o = $(`[data-o="${input.name}"]`, form);
      if (o) o.textContent = input.value;
      schedule();
    };
    input.addEventListener('input', sync);
    sync();
  }
  for (const seg of $$('[data-seg]', form)) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
      props[seg.dataset.seg] = b.value;
      schedule();
    });
  }
  $('input[name=color]', form).addEventListener('input', (e) => {
    props.color = e.target.value;
    schedule();
  });
  render();
}

// Morph scene.

function morphScene() {
  const host = $('[data-morph-icon]');
  const label = $('[data-morph-label]');
  const list = $('[data-pairs]');
  if (!host) return;
  const pairs = gf.MORPH_PAIRS.map(([a, b]) => [a, b]).filter(([a, b]) => has(a) && has(b));
  if (!pairs.length) return;
  list.innerHTML = pairs.map(([a, b]) => `<li>${a} <span aria-hidden="true">&#8594;</span> ${b.replace('/solid', ' filled')}</li>`).join('');
  const items = $$('li', list);
  const resolved = pairs.map(([a, b]) => {
    const A = gf.resolveSpec(a, gf.lookupIcon);
    const B = gf.resolveSpec(b, gf.lookupIcon);
    return { a, b, A: A.icon, B: B.icon, va: A.variant, vb: B.variant };
  });
  let last = '';
  registerScene($('[data-scene="morph"]'), (p) => {
    const k = resolved.length;
    const x = Math.min(k - 1e-6, p * k);
    const i = Math.floor(x);
    const u = x - i;
    const m = reduced ? 1 : ease(clamp((u - 0.12) / 0.62));
    const r = resolved[i];
    const f = gf.morphFrame(r.A, r.B, m, { variant: r.va, targetVariant: r.vb });
    const key = `${i}:${m.toFixed(3)}`;
    if (key !== last) {
      last = key;
      host.innerHTML = gf.renderToString(f.icon, { size: 240, weight: 1.5, variant: f.variant, secondaryOpacity: f.variant === 'solid' ? 1 : undefined });
      label.textContent = `${r.a} → ${r.b.replace('/solid', ' filled')}`;
      items.forEach((li, j) => li.classList.toggle('on', j === i));
    }
  });
}

// Living states.

function living() {
  const grid = $('[data-living]');
  if (!grid) return;
  const presets = [
    ['draw', pick('activity', 'waveform', 'heart')],
    ['pop', pick('heart', 'star')],
    ['wiggle', pick('bell', 'gift', 'star')],
    ['spin', pick('loader-circle', 'refresh', 'settings')],
    ['pulse', pick('mic', 'radio', 'heart')],
    ['bounce', pick('arrow-down', 'download', 'chevron-down')],
    ['shake', pick('bell-ring', 'bell', 'phone')],
  ].filter(([, n]) => n);
  grid.innerHTML = presets
    .map(([preset, name]) => `<button class="living-card reveal" type="button" data-preset="${preset}" aria-label="${t('home.living.play')} ${preset}">${svg(name, { size: 64, animate: preset, trigger: 'state', variant: preset === 'pop' ? 'duotone' : undefined })}<b>${preset}</b><small>${name}</small></button>`)
    .join('');
  const play = (card) => {
    const s = card.querySelector('svg');
    s.classList.remove('gf-on');
    void s.getBoundingClientRect();
    s.classList.add('gf-on');
  };
  for (const card of $$('.living-card', grid)) {
    card.addEventListener('pointerenter', () => play(card));
    card.addEventListener('click', () => play(card));
    card.addEventListener('pointerleave', () => {
      const p = card.dataset.preset;
      if (p === 'spin' || p === 'pulse') card.querySelector('svg').classList.remove('gf-on');
    });
  }
  if (reduced) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const cards = $$('.living-card', grid);
        cards.forEach((c, i) =>
          setTimeout(() => {
            play(c);
            if (c.dataset.preset === 'spin' || c.dataset.preset === 'pulse') setTimeout(() => c.querySelector('svg').classList.remove('gf-on'), 2400);
          }, i * 140),
        );
      }
    },
    { threshold: 0.4 },
  );
  io.observe(grid);
  for (const el of $$('.reveal', grid)) el.classList.add('in');
}

// Modifiers scene and playground.

function modsScene() {
  const board = $('[data-mods-board]');
  if (!board) return;
  const combos = [
    ['file', 'check'],
    ['folder', 'plus'],
    ['cloud', 'sync'],
    ['user', 'lock'],
    ['calendar', 'clock'],
    ['mail', 'alert'],
    ['image', 'x'],
    ['bell', 'dot'],
  ].filter(([n]) => has(n));
  const tiles = combos.map(([n, m]) => {
    const d = document.createElement('div');
    d.className = 'tile';
    d.innerHTML = `${svg(n, { size: 48 })}<span>${n}</span>`;
    board.appendChild(d);
    return { el: d, n, m, on: false };
  });
  registerScene($('[data-scene="mods"]'), (p) => {
    tiles.forEach((tile, i) => {
      const on = reduced || p > 0.12 + i * 0.075;
      if (on === tile.on) return;
      tile.on = on;
      tile.el.innerHTML = `${svg(on ? `${tile.n}+${tile.m}` : tile.n, { size: 48 })}<span>${on ? `${tile.n}+${tile.m}` : tile.n}</span>`;
      if (on && !reduced) tile.el.animate([{ transform: 'scale(.92)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.22,1.2,.36,1)' });
    });
  });
}

function modsPlayground() {
  const prev = $('[data-mp-preview]');
  if (!prev) return;
  const bases = ['file', 'folder', 'cloud', 'user', 'calendar', 'mail', 'image', 'bell', 'heart', 'lock'].filter(has).slice(0, 8);
  const state = { base: bases[0], mod: 'check', corner: 'bottom-right' };
  const baseHost = $('[data-mp-base]');
  const modHost = $('[data-mp-mod]');
  const cornerHost = $('[data-mp-corner]');
  const codeHost = $('[data-mp-code]');
  baseHost.innerHTML = bases.map((b) => `<button class="chip" type="button" value="${b}" aria-pressed="${b === state.base}">${svg(b, { size: 14 })}${b}</button>`).join('');
  modHost.innerHTML = ['none', ...gf.MODIFIER_NAMES].map((m) => `<button class="chip" type="button" value="${m}" aria-pressed="${m === state.mod}">${m === 'none' ? t('mods.none') : m}</button>`).join('');
  cornerHost.innerHTML = [
    ['top-left', 'tl'],
    ['top-right', 'tr'],
    ['bottom-left', 'bl'],
    ['bottom-right', 'br'],
  ]
    .map(([c, s]) => `<button type="button" value="${c}" aria-pressed="${c === state.corner}" aria-label="${c}">${s}</button>`)
    .join('');
  const render = () => {
    const spec = state.mod === 'none' ? state.base : `${state.base}+${state.mod}@${{ 'top-left': 'tl', 'top-right': 'tr', 'bottom-left': 'bl', 'bottom-right': 'br' }[state.corner]}`;
    prev.innerHTML = `<div class="big">${svg(spec, { size: 180, weight: 1.5 })}</div><div class="mp-sizes">${[16, 24, 32, 48].map((s) => svg(spec, { size: s })).join('')}</div>`;
    const props = state.mod === 'none' ? {} : { modifier: state.mod, modifierCorner: state.corner === 'bottom-right' ? undefined : state.corner };
    codeHost.replaceChildren(codeBlock(gf.snippet('jsx', state.base, props), 'js', 'App.jsx'));
  };
  const wire = (host, key) =>
    host.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state[key] = b.value;
      for (const x of $$('button', host)) x.setAttribute('aria-pressed', String(x === b));
      render();
    });
  wire(baseHost, 'base');
  wire(modHost, 'mod');
  wire(cornerHost, 'corner');
  render();
}

// Fusion scene and gallery.

const FUSIONS = [
  ['cloud', 'lock', 'overlap'],
  ['file', 'check', 'badge'],
  ['shield', 'heart', 'inside'],
  ['message-circle', 'heart', 'overlap'],
  ['folder', 'search', 'overlap'],
  ['user', 'shield', 'badge'],
  ['shopping-cart', 'clock', 'badge'],
  ['calendar', 'bell', 'side'],
  ['image', 'file', 'overlap'],
];

function fusionScene() {
  const stage = $('[data-fusion-stage]');
  const caption = $('[data-fusion-caption]');
  if (!stage) return;
  const seq = FUSIONS.filter(([a, b]) => has(a) && has(b)).slice(0, 3);
  if (!seq.length) return;
  const built = seq.map(([a, b, layout]) => {
    const fused = gf.fuse([gf.lookupIcon(a), gf.lookupIcon(b)], { layout, weight: 1.5 });
    return { a, b, layout, fused };
  });
  const partEls = [0, 1].map(() => {
    const d = document.createElement('div');
    d.className = 'part';
    stage.appendChild(d);
    return d;
  });
  const fusedEl = document.createElement('div');
  fusedEl.className = 'fused';
  stage.appendChild(fusedEl);
  let current = -1;
  registerScene($('[data-scene="fusion"]'), (p) => {
    const k = built.length;
    const x = Math.min(k - 1e-6, p * k);
    const i = Math.floor(x);
    const u = reduced ? 1 : x - i;
    const f = built[i];
    if (i !== current) {
      current = i;
      partEls[0].innerHTML = svg(f.a, { size: 96, weight: 1.5 });
      partEls[1].innerHTML = svg(f.b, { size: 96, weight: 1.5 });
      fusedEl.innerHTML = gf.renderToString(f.fused, { size: 96, weight: 1.5 });
      caption.innerHTML = `<b>${f.a} &amp; ${f.b}</b> / ${f.layout}`;
    }
    const fly = ease(clamp(u / 0.5));
    const merge = clamp((u - 0.5) / 0.14);
    f.fused.parts.forEach((box, j) => {
      const el = partEls[j];
      const cx = ((box.x + box.size / 2 - 12) / 24) * 100;
      const cy = ((box.y + box.size / 2 - 12) / 24) * 100;
      const scale = (box.size / 20) * (70 / 46);
      const fromX = j === 0 ? -95 : 95;
      const fromY = j === 0 ? -30 : 30;
      const tx = fromX + (cx * (70 / 46) - fromX) * fly;
      const ty = fromY + (cy * (70 / 46) - fromY) * fly;
      const s = 1 + (scale - 1) * fly;
      const rot = (j === 0 ? -14 : 14) * (1 - fly);
      el.style.transform = `translate(${tx}%, ${ty}%) rotate(${rot}deg) scale(${s})`;
      el.style.opacity = String(1 - merge);
    });
    fusedEl.style.opacity = String(merge);
    fusedEl.style.transform = `scale(${0.94 + 0.06 * outBack(merge)})`;
  });
}

function gallery() {
  const host = $('[data-gallery]');
  if (!host) return;
  const items = FUSIONS.filter(([a, b]) => has(a) && has(b)).slice(0, 7);
  const orbit = niceIcons(10);
  const cards = items.map(([a, b, layout]) => ({ spec: `${a}&${b}:${layout}`, label: `${a} & ${b}`, layout }));
  if (orbit.length === 10) cards.push({ spec: `${orbit.join('&')}:orbit`, label: t('home.gallery.orbit'), layout: 'orbit' });
  host.innerHTML = cards
    .map((c) => `<a class="card gallery-card reveal" href="studio.html#fusion=${encodeURIComponent(c.spec)}"><div class="tile">${svg(c.spec, { size: 96 })}</div><b>${c.label}</b><small>${c.layout}</small></a>`)
    .join('');
  for (const el of $$('.reveal', host)) requestAnimationFrame(() => el.classList.add('in'));
}

// Studio card art, drawn from the icon geometry.

function studioArt() {
  const grid = (w, h, step) => {
    let s = '';
    for (let x = step; x < w; x += step) s += `<path d="M${x} 0V${h}"/>`;
    for (let y = step; y < h; y += step) s += `<path d="M0 ${y}H${w}"/>`;
    return `<g stroke="currentColor" stroke-opacity=".08" stroke-width=".5">${s}</g>`;
  };
  const inner = (spec, props = {}) => {
    const out = svg(spec, props);
    return out.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  };
  const group = (spec, x, y, s, props = {}, extra = '') => {
    const sw = props.weight || 2;
    return `<g transform="translate(${x} ${y}) scale(${s / 24})" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner(spec, props)}</g>`;
  };
  const accent = 'color:var(--accent)';
  const arts = {
    editor: () => {
      const name = pick('pencil', 'heart', 'star');
      const icon = gf.lookupIcon(name);
      const nodes = gf.splitLayers(gf.iconNodes(icon)).primary;
      let dots = '';
      for (const n of nodes) {
        for (const s of gf.geometry.shapeToSegments(n)) {
          if (s[0] === 'Z') continue;
          const x = s[s.length - 2];
          const y = s[s.length - 1];
          dots += `<rect x="${86 + x * 5.6 - 2.2}" y="${16 + y * 5.6 - 2.2}" width="4.4" height="4.4" rx="1" fill="var(--panel)" stroke="var(--accent)" stroke-width="1"/>`;
        }
      }
      return `<svg viewBox="0 0 320 200">${grid(320, 200, 11.2)}<rect x="97.2" y="27.2" width="112" height="112" fill="none" stroke="var(--accent)" stroke-opacity=".35" stroke-dasharray="3 3"/>${group(name, 86, 16, 134.4, { weight: 1.6 })}${dots}</svg>`;
    },
    foxify: () => {
      const name = pick('star', 'heart', 'cloud');
      const blob = gf.renderToString(gf.lookupIcon(name), { variant: 'solid' }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      return `<svg viewBox="0 0 320 200">${grid(320, 200, 20)}<g transform="translate(36 40) scale(5)" fill="currentColor" stroke="currentColor" stroke-width="2" opacity=".35">${blob}</g>${group('arrow-right', 146, 86, 28, { weight: 2 }, `style="${accent}"`)}${group(name, 194, 40, 120, { weight: 1.5 }, `style="${accent}"`)}</svg>`;
    },
    sketch: () => {
      const results = niceIcons(3, ['circle', 'sun', 'target']);
      return `<svg viewBox="0 0 320 200">${grid(320, 200, 20)}<path d="M70 104c-6-30 22-52 50-46 26 6 40 34 26 58-14 22-48 28-66 10-10-10-12-18-10-22" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>${results.map((n, i) => `<rect x="196" y="${26 + i * 52}" width="96" height="44" rx="10" fill="var(--panel)" stroke="currentColor" stroke-opacity=".12"/>${group(n, 206, 36 + i * 52, 24, { weight: 2 })}<rect x="240" y="${44 + i * 52}" width="${40 - i * 10}" height="6" rx="3" fill="currentColor" opacity=".18"/>`).join('')}</svg>`;
    },
    fusion: () => {
      const f = FUSIONS.find(([a, b]) => has(a) && has(b));
      return f ? `<svg viewBox="0 0 320 200">${grid(320, 200, 20)}${group(`${f[0]}&${f[1]}:${f[2]}`, 100, 20, 160, { weight: 1.5 }, `style="${accent}"`)}</svg>` : '';
    },
    brand: () => {
      const colors = ['#ff7a1a', '#7c5cff', '#16a34a', '#0ea5e9'];
      const names = niceIcons(8);
      return `<svg viewBox="0 0 320 200">${colors.map((c, i) => `<circle cx="${40 + i * 30}" cy="40" r="11" fill="${c}"/>`).join('')}${names.map((n, i) => group(n, 28 + (i % 4) * 70, 76 + Math.floor(i / 4) * 60, 40, { weight: 2.2, variant: i % 2 ? 'duotone' : 'outline' }, 'style="color:#7c5cff"')).join('')}</svg>`;
    },
    '3d': () => {
      const name = pick('heart', 'star', 'cloud');
      let layers = '';
      for (let k = 10; k >= 0; k--) {
        const shade = k === 0 ? 'var(--accent)' : `color-mix(in srgb, var(--accent) ${30 + (10 - k) * 4}%, #000)`;
        layers += group(name, 92 + k * 1.6, 14 + k * 1.6, 136, { weight: 2.4 }, `style="color:${shade}"`);
      }
      return `<svg viewBox="0 0 320 200"><defs><radialGradient id="g3" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="var(--accent)" stop-opacity=".18"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient></defs><rect width="320" height="200" fill="url(#g3)"/>${layers}</svg>`;
    },
  };
  for (const el of $$('[data-art]')) {
    const fn = arts[el.dataset.art];
    try {
      el.innerHTML = fn ? fn() : '';
    } catch {
      el.innerHTML = '';
    }
  }
}

// Frameworks.

const FRAMEWORKS = [
  ['React', 'js', `import { HomeIcon, Fusion, MorphIcon } from 'glyphfox/react';\n\nexport function Nav({ open }) {\n  return (\n    <>\n      <HomeIcon weight={1.5} />\n      <Fusion icons={['cloud', 'lock']} layout="overlap" />\n      <MorphIcon name={open ? 'x' : 'menu'} />\n    </>\n  );\n}`],
  ['Vue', 'js', `<script setup>\nimport { HomeIcon, Fusion } from 'glyphfox/vue';\n</script>\n\n<template>\n  <HomeIcon :size="32" variant="duotone" />\n  <Fusion :icons="['file', 'check']" layout="badge" />\n</template>`],
  ['Svelte', 'js', `<script>\n  import { HeartIcon } from 'glyphfox/svelte';\n  let liked = $state(false);\n</script>\n\n<HeartIcon animate="pop" trigger="state" active={liked} />`],
  ['Angular', 'js', `import { GlyphFoxIcon, provideGlyphFox } from 'glyphfox-angular';\nimport { icons } from 'glyphfox';\n\n// main.ts\nbootstrapApplication(App, { providers: [provideGlyphFox({ icons })] });\n\n// template\n<gf-icon name="file+check@tr" variant="duotone"></gf-icon>`],
  ['HTML', 'js', `<script src="https://cdn.jsdelivr.net/npm/glyphfox@1"></script>\n\n<glyph-fox name="home"></glyph-fox>\n<glyph-fox name="cloud&lock" layout="overlap"></glyph-fox>\n<glyph-fox name="menu" morph></glyph-fox>`],
  ['Tailwind', 'css', `@import "tailwindcss";\n@plugin "glyphfox/tailwind";\n\n/* <span class="gf-home text-2xl text-orange-500"></span> */\n/* <span class="gf-[file+check] gf-spin"></span> */`],
  ['CLI', 'sh', `npx glyphfox search arrow\nnpx glyphfox copy heart --format jsx --size 32\nnpx glyphfox fuse cloud lock --layout overlap --out cloud-lock.svg\nnpx glyphfox build home search file+check --type sprite --out public`],
];

function frameworks() {
  const tabs = $('[data-fw-tabs]');
  const host = $('[data-fw-code]');
  if (!tabs) return;
  tabs.innerHTML = FRAMEWORKS.map(([n], i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-i="${i}">${n}</button>`).join('');
  const show = (i) => {
    const [name, lang, code] = FRAMEWORKS[i];
    host.replaceChildren(codeBlock(code, lang, name));
    for (const b of $$('button', tabs)) b.setAttribute('aria-selected', String(Number(b.dataset.i) === i));
  };
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) show(Number(b.dataset.i));
  });
  show(0);
}

function countUp(total) {
  const el = $('[data-count]');
  if (!el) return;
  if (reduced) {
    el.textContent = String(total);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const k = clamp((now - start) / 1200);
    el.textContent = String(Math.round(total * ease(k)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

loadIcons().then(({ icons }) => {
  countUp(icons.length);
  frameworks();
  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
  heroSwarm(icons);
  later(() => {
    axesScene();
    morphScene();
    modsScene();
    fusionScene();
    tick();
  });
  later(() => {
    playground();
    living();
    modsPlayground();
    gallery();
    studioArt();
  });
});
