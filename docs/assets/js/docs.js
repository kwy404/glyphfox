// Docs page: copy buttons, live demos, the syntax table and a scrollspy.

import { $, $$, copy, gf, has, loadIcons, pick, reduced, svg, t } from './app.js';

function codeCopy() {
  for (const block of $$('.code')) {
    const btn = $('.copy', block);
    const pre = $('pre', block);
    if (btn && pre) btn.addEventListener('click', () => copy(pre.textContent));
  }
}

function figure(markup, caption, attrs = '') {
  return `<figure ${attrs}>${markup}<figcaption>${caption}</figcaption></figure>`;
}

function demos() {
  for (const cell of $$('[data-render]')) {
    try {
      cell.innerHTML = svg(cell.dataset.render, { size: 28 });
    } catch {
      cell.textContent = '';
    }
  }
  const web = $('[data-demo="web"]');
  if (web) {
    gf.defineGlyphFox();
    web.innerHTML = [
      ['home', ''],
      ['file+check', 'weight="1.5"'],
      ['cloud&amp;lock', 'layout="overlap"'],
      ['heart', 'variant="duotone" secondary-color="#ff7a1a"'],
      ['menu', 'morph'],
    ]
      .filter(([n]) => has(n.replace('&amp;', '&')))
      .map(([n, a]) => figure(`<glyph-fox name="${n}" size="40" ${a}></glyph-fox>`, `${n.replace('&amp;', '&')}${a.includes('morph') ? ' (click)' : ''}`, a.includes('morph') ? 'class="clickable" data-toggle-morph' : ''))
      .join('');
    const toggle = $('[data-toggle-morph]', web);
    if (toggle) {
      toggle.addEventListener('click', () => {
        const el = $('glyph-fox', toggle);
        el.setAttribute('name', el.getAttribute('name') === 'menu' ? 'x' : 'menu');
      });
    }
  }
  const axes = $('[data-demo="axes"]');
  if (axes) {
    const name = pick('search', 'home', 'heart');
    const cells = [];
    for (const w of [1, 1.5, 2, 2.5, 3]) cells.push(figure(svg(name, { size: 40, weight: w }), `weight ${w}`));
    cells.push(figure(svg(name, { size: 40, corners: 'sharp' }), 'sharp'));
    for (const v of ['duotone', 'solid']) cells.push(figure(svg(pick('folder', 'file', 'heart'), { size: 40, variant: v }), v));
    for (const s of [12, 16]) cells.push(figure(svg(name, { size: s }), `${s}px optical`));
    axes.innerHTML = cells.join('');
  }
  const morph = $('[data-demo="morph"]');
  if (morph) {
    const pairs = gf.MORPH_PAIRS.filter(([a, b]) => has(a) && has(b)).slice(0, 6);
    morph.innerHTML = pairs.map(([a, b], i) => figure(svg(a, { size: 40 }), `${a} / ${b.replace('/solid', ' filled')}`, `class="clickable" data-pair="${i}" tabindex="0" role="button"`)).join('');
    for (const fig of $$('[data-pair]', morph)) {
      const [a, b] = pairs[Number(fig.dataset.pair)];
      const A = gf.resolveSpec(a, gf.lookupIcon);
      const B = gf.resolveSpec(b, gf.lookupIcon);
      let p = 0;
      let on = false;
      let cancel = () => {};
      const draw = () => {
        const f = gf.morphFrame(A.icon, B.icon, p, { variant: A.variant, targetVariant: B.variant });
        fig.firstElementChild.outerHTML = gf.renderToString(f.icon, { size: 40, variant: f.variant });
      };
      const flip = () => {
        on = !on;
        cancel();
        cancel = gf.tween(p, on ? 1 : 0, { duration: 420 }, (v) => {
          p = v;
          draw();
        });
      };
      fig.addEventListener('click', flip);
      fig.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      });
    }
  }
  const fusion = $('[data-demo="fusion"]');
  if (fusion) {
    const sets = {
      overlap: ['cloud', 'lock'],
      side: ['cloud', 'lock'],
      stack: ['file', 'check'],
      grid: ['heart', 'star', 'bell', 'cloud'],
      orbit: ['home', 'heart', 'star', 'bell', 'cloud', 'lock', 'file'],
      badge: ['folder', 'search'],
      inside: ['shield', 'heart'],
    };
    fusion.innerHTML = gf.LAYOUTS.map((l) => {
      const list = sets[l].filter(has);
      if (list.length < 2) return '';
      return figure(svg(`${list.join('&')}:${l}`, { size: 48 }), l);
    }).join('');
  }
  const living = $('[data-demo="living"]');
  if (living) {
    const icons = { draw: pick('activity', 'heart'), pop: pick('heart', 'star'), wiggle: pick('bell', 'star'), spin: pick('loader-circle', 'refresh'), pulse: pick('mic', 'heart'), bounce: pick('arrow-down', 'download'), shake: pick('bell-ring', 'bell') };
    living.innerHTML = gf.ANIMATION_NAMES.filter((a) => icons[a])
      .map((a) => `<figure>${svg(icons[a], { size: 40, animate: a, trigger: 'hover' })}<figcaption>${a}</figcaption></figure>`)
      .join('');
  }
  const mods = $('[data-demo="modifiers"]');
  if (mods) {
    const base = pick('file', 'folder', 'cloud');
    mods.innerHTML = gf.MODIFIER_NAMES.map((m) => figure(svg(`${base}+${m}`, { size: 40 }), m)).join('');
  }
  if (reduced) return;
}

function scrollspy() {
  const links = $$('.docs-nav a');
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links) a.classList.toggle('on', a === map.get(e.target.id));
      }
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );
  for (const s of $$('.docs-main section[id]')) io.observe(s);
}

codeCopy();
scrollspy();
loadIcons().then(demos);
void t;
