// Smart icons page: live data icons, currency per locale, right to left
// mirroring, the contrast bump, StatusIcon and IconGroup.

import { $, $$, copy, gf, loadIcons } from './app.js';

const figure = (markup, caption, attrs = '') => `<figure ${attrs}>${markup}<figcaption>${caption}</figcaption></figure>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function codeCopy() {
  for (const block of $$('.code')) {
    const btn = $('.copy', block);
    const pre = $('pre', block);
    if (btn && pre) btn.addEventListener('click', () => copy(pre.textContent));
  }
}

function pressed(btn, on) {
  btn.setAttribute('aria-pressed', String(on));
}

function dataDemo() {
  const root = $('[data-demo="data"]');
  const range = $('[data-smart="value"]');
  const out = $('[data-smart-o="value"]');
  const charging = $('[data-smart="charging"]');
  if (!root || !range) return;
  const draw = () => {
    const v = Number(range.value) / 100;
    out.textContent = `${range.value}%`;
    const on = charging.getAttribute('aria-pressed') === 'true';
    root.innerHTML = [
      ['battery', { charging: on }],
      ['signal', {}],
      ['wifi', {}],
      ['volume', {}],
      ['progress', { label: true }],
      ['thermometer', {}],
    ]
      .map(([kind, o]) => figure(gf.smartSvg(kind, { value: v, size: 44, title: 'auto', ...o }), kind))
      .join('');
  };
  range.addEventListener('input', draw);
  charging.addEventListener('click', () => {
    pressed(charging, charging.getAttribute('aria-pressed') !== 'true');
    draw();
  });
  draw();
}

function timeDemo() {
  const root = $('[data-demo="time"]');
  if (!root) return;
  root.innerHTML = [
    ['<glyph-fox-smart kind="calendar" tick size="44" title="auto"></glyph-fox-smart>', 'today'],
    ['<glyph-fox-smart kind="calendar" date="2026-12-25" locale="ar-EG" size="44" title="auto"></glyph-fox-smart>', 'ar-EG'],
    ['<glyph-fox-smart kind="clock" tick seconds size="44" title="auto"></glyph-fox-smart>', 'now, ticking'],
    ['<glyph-fox-smart kind="clock" time="09:30" size="44" title="auto"></glyph-fox-smart>', '09:30'],
  ]
    .map(([m, c]) => figure(m, c))
    .join('');
}

function filesDemo() {
  const root = $('[data-demo="files"]');
  const ext = $('[data-smart="ext"]');
  const out = $('[data-smart-o="count"]');
  if (!root || !ext) return;
  let count = 3;
  const draw = () => {
    out.textContent = String(count);
    const e = ext.value.trim() || 'pdf';
    root.innerHTML = [
      figure(gf.smartSvg('file', { ext: e, size: 44, title: 'auto' }), esc(e.slice(0, 4).toLowerCase())),
      figure(gf.smartSvg('file', { filename: 'notes.md', size: 44, title: 'auto' }), 'notes.md'),
      figure(gf.smartSvg('badge', { count, size: 44, title: 'auto' }), `count ${count}`),
      figure(gf.smartSvg('badge', { count, icon: 'mail', max: 9, size: 44, title: 'auto' }), 'mail, max 9'),
      figure(gf.smartSvg('badge', { dot: true, icon: 'message-circle', size: 44, title: 'auto' }), 'dot'),
    ].join('');
  };
  ext.addEventListener('input', draw);
  $('[data-smart="minus"]').addEventListener('click', () => {
    count = Math.max(0, count - 1);
    draw();
  });
  $('[data-smart="plus"]').addEventListener('click', () => {
    count = Math.min(999, count + 1);
    draw();
  });
  $('[data-smart="many"]').addEventListener('click', () => {
    count = 120;
    draw();
  });
  draw();
}

function currencyDemo() {
  const root = $('[data-demo="currency"]');
  if (!root) return;
  const mine = (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';
  const locales = ['pt-BR', 'en-US', 'de-DE', 'ja-JP', 'zh-CN', 'en-GB', 'es-MX', 'hi-IN'];
  const list = [...new Set([mine, ...locales])];
  root.innerHTML = list
    .map((l) => {
      const info = gf.currencyInfo({ locale: l });
      return figure(gf.smartSvg('currency', { locale: l, size: 44, title: 'auto' }), `${esc(l)}${l === mine ? ' (you)' : ''}<br>${esc(info.symbol)} ${esc(info.currency || '')}`);
    })
    .join('');
}

const ARROWS = ['arrow-right', 'chevron-right', 'chevrons-right', 'undo', 'reply', 'send', 'log-out', 'list'];

function rtlDemo() {
  const root = $('[data-demo="rtl"]');
  if (!root) return;
  const row = (caption, markup, dir) => `<p class="smart-caption">${caption}</p><div class="demo"${dir ? ` dir="${dir}"` : ''}>${markup}</div>`;
  const icons = (o) => ARROWS.filter(gf.lookupIcon).map((n) => figure(gf.smartSvg(n, { size: 36, ...o }), n)).join('');
  root.innerHTML = [row('locale="en"', icons({ locale: 'en' })), row('locale="ar"', icons({ locale: 'ar' })), row('inside dir="rtl", no locale: the page decides', icons({}), 'rtl')].join('');
  const list = $('[data-demo="directional"]');
  if (list) list.innerHTML = [...gf.DIRECTIONAL_ICONS].filter(gf.lookupIcon).map((n) => `<li>${esc(n)}</li>`).join('');
}

function contrastDemo() {
  const root = $('[data-demo="contrast"]');
  if (!root) return;
  const items = [
    ['battery', { value: 0.35 }],
    ['wifi', { value: 0.5 }],
    ['badge', { count: 8 }],
    ['file', { ext: 'csv' }],
  ];
  root.innerHTML = items
    .flatMap(([kind, o]) => [figure(gf.smartSvg(kind, { ...o, size: 44, contrast: 'off' }), `${kind}, off`), figure(gf.smartSvg(kind, { ...o, size: 44, contrast: 'more' }), `${kind}, more`)])
    .join('');
}

function statusDemo() {
  const root = $('[data-demo="status"]');
  const seg = $('[data-smart="states"]');
  const run = $('[data-smart="run"]');
  if (!root || !seg) return;
  root.innerHTML = [
    figure('<glyph-fox-status state="idle" size="48" title="auto"></glyph-fox-status>', 'outline'),
    figure('<glyph-fox-status state="idle" size="48" variant="duotone"></glyph-fox-status>', 'duotone'),
    figure('<glyph-fox-status state="idle" size="48" weight="1.5" duration="700"></glyph-fox-status>', 'weight 1.5, 700 ms'),
  ].join('');
  const icons = $$('glyph-fox-status', root);
  const set = (state) => {
    for (const el of icons) el.setAttribute('state', state);
    for (const b of $$('button', seg)) pressed(b, b.dataset.state === state);
  };
  for (const b of $$('button', seg)) b.addEventListener('click', () => set(b.dataset.state));
  let timers = [];
  let ok = true;
  run.addEventListener('click', () => {
    for (const t of timers) clearTimeout(t);
    set('loading');
    timers = [
      setTimeout(() => {
        set(ok ? 'success' : 'error');
        ok = !ok;
      }, 1800),
      setTimeout(() => set('idle'), 4200),
    ];
  });
}

const PRESETS = ['pop', 'draw', 'bounce', 'wiggle', 'shake', 'pulse'];
const ROW = ['home', 'search', 'bell', 'heart', 'mail', 'calendar', 'settings', 'user'];

function groupDemo() {
  const root = $('[data-demo="group"]');
  const hover = $('[data-demo="group-hover"]');
  const seg = $('[data-smart="presets"]');
  const replay = $('[data-smart="replay"]');
  if (!root || !seg) return;
  let preset = 'pop';
  const names = ROW.filter(gf.lookupIcon);
  const draw = () => {
    root.innerHTML = `<glyph-fox-group animate="${preset}" stagger="70">${names.map((n) => `<glyph-fox name="${n}" size="32"></glyph-fox>`).join('')}<glyph-fox-smart kind="battery" value="0.8" size="32"></glyph-fox-smart></glyph-fox-group>`;
  };
  seg.innerHTML = PRESETS.map((p) => `<button type="button" aria-pressed="${p === preset}" data-preset="${p}">${p}</button>`).join('');
  for (const b of $$('button', seg)) {
    b.addEventListener('click', () => {
      preset = b.dataset.preset;
      for (const x of $$('button', seg)) pressed(x, x === b);
      draw();
    });
  }
  replay.addEventListener('click', draw);
  draw();
  if (hover) hover.innerHTML = `<glyph-fox-group animate="bounce" stagger="50" trigger="hover">${names.map((n) => `<glyph-fox name="${n}" size="32"></glyph-fox>`).join('')}</glyph-fox-group>`;
}

codeCopy();
loadIcons().then(() => {
  gf.defineGlyphFox();
  gf.defineSmartElements();
  dataDemo();
  timeDemo();
  filesDemo();
  currencyDemo();
  rtlDemo();
  contrastDemo();
  statusDemo();
  groupDemo();
});
