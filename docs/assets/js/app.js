// Shared runtime of the studio site: engine, icon data, language, theme,
// navigation, copy and download helpers, code highlighting and reveals.

import * as gf from '../../vendor/glyphfox.js';
import { dict } from './i18n.js';

export { gf };

/** Display names of the copy formats. */
export const FORMAT_LABELS = { svg: 'SVG', jsx: 'JSX', vue: 'Vue', svelte: 'Svelte', angular: 'Angular', html: 'Web', tailwind: 'Tailwind', cdn: 'CDN', datauri: 'Data URI' };

export const lang = document.documentElement.lang === 'pt-BR' ? 'pt-BR' : 'en';
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Translated string for a key, with {name} placeholders. */
export function t(key, vars) {
  let s = (dict[lang] && dict[lang][key]) ?? dict.en[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

/** Link to a page in the current language. */
export function href(page) {
  return page;
}

let dataPromise = null;

/** Loads docs/data/icons.json once and registers every icon with the engine. */
export function loadIcons() {
  if (!dataPromise) {
    dataPromise = fetch(new URL('../../data/icons.json', import.meta.url))
      .then((r) => r.json())
      .then((d) => {
        const icons = d.icons.map(([name, body, tags, categories, solid]) => ({ name, body, tags, categories, solid }));
        gf.registerIcons(icons);
        const byName = new Map(icons.map((i) => [i.name, i]));
        gf.setIconLoader(async (name) => byName.get(name) || null);
        return { version: d.version, icons, byName };
      });
  }
  return dataPromise;
}

/** Renders any spec to SVG markup (names must be loaded). */
export function svg(spec, props = {}) {
  const weight = gf.strokeWidth(props);
  const { icon, variant } = gf.resolveSpec(spec, gf.lookupIcon, { weight, gap: props.gap });
  let morphTo = props.morphTo;
  let morphVariant;
  if (typeof morphTo === 'string' && morphTo) {
    const r = gf.resolveSpec(morphTo, gf.lookupIcon, { weight, gap: props.gap });
    morphTo = r.icon;
    morphVariant = r.variant;
  }
  return gf.renderToString(icon, { ...props, variant: props.variant ?? variant, morphTo, morphVariant });
}

/** True when every name of a spec is in the set. */
export function has(spec) {
  try {
    return gf.parseSpec(spec).names.every((n) => gf.lookupIcon(n));
  } catch {
    return false;
  }
}

/** First spec of a list whose icons all exist. */
export function pick(...specs) {
  return specs.find(has) || null;
}

// Toast.
let toastEl = null;
let toastTimer = 0;
export function toast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  const check = gf.lookupIcon('check') ? svg('check', { size: 18, weight: 2.5 }) : '';
  toastEl.innerHTML = `${check}<span></span>`;
  toastEl.querySelector('span').textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

/** Copies text and shows a toast. */
export async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      // nothing else to try
    }
    ta.remove();
  }
  toast(label || t('toast.copied'));
}

/** Saves a Blob or a string as a file. */
export function download(data, filename, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Code highlighting (small and fast; enough for the snippets on this site).
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const JS_KEYWORDS = /\b(import|from|export|default|const|let|var|function|return|if|else|new|await|async|class|extends|for|of|in|true|false|null|undefined|type|interface)\b/;

export function highlight(code, language = 'js') {
  const rules =
    language === 'sh'
      ? [
          ['c', /#[^\n]*/y],
          ['s', /'[^']*'|"[^"]*"/y],
          ['k', /\b(npx|npm|glyphfox|pnpm|yarn)\b/y],
          ['a', /--?[\w-]+/y],
        ]
      : language === 'css'
        ? [
            ['c', /\/\*[\s\S]*?\*\//y],
            ['s', /'[^']*'|"[^"]*"/y],
            ['k', /@[\w-]+/y],
            ['t', /\.[\w-]+(?:\\.[\w-]*)*/y],
            ['a', /[\w-]+(?=\s*:)/y],
            ['n', /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|s|ms)?\b/y],
          ]
        : [
            ['c', /\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/y],
            ['s', /`(?:[^`\\]|\\.)*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/y],
            ['t', /<\/?[A-Za-z][\w.-]*|\/?>/y],
            ['k', new RegExp(JS_KEYWORDS.source, 'y')],
            ['a', /[@:]?[A-Za-z_$][\w$-]*(?==)/y],
            ['n', /\b\d+(?:\.\d+)?\b/y],
          ];
  let out = '';
  let i = 0;
  let plain = '';
  outer: while (i < code.length) {
    for (const [cls, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0].length) {
        if (plain) {
          out += esc(plain);
          plain = '';
        }
        out += `<span class="tok-${cls}">${esc(m[0])}</span>`;
        i += m[0].length;
        continue outer;
      }
    }
    plain += code[i++];
  }
  if (plain) out += esc(plain);
  return out;
}

/** Fills every <pre data-lang> on the page with highlighted code. */
export function highlightAll(root = document) {
  for (const pre of $$('pre[data-lang]', root)) {
    if (pre.dataset.done) continue;
    pre.innerHTML = highlight(pre.textContent, pre.dataset.lang);
    pre.dataset.done = '1';
  }
}

/** A code block element with a copy button. */
export function codeBlock(code, language = 'js', label = '') {
  const wrap = document.createElement('div');
  wrap.className = 'code';
  wrap.innerHTML = `<div class="code-head"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(label)}</span><button class="copy" type="button">${t('action.copy')}</button></div><pre></pre>`;
  const pre = wrap.querySelector('pre');
  pre.innerHTML = highlight(code, language);
  wrap.querySelector('.copy').addEventListener('click', () => copy(code));
  return wrap;
}

// Theme.
function setupTheme() {
  const btn = $('[data-theme-toggle]');
  if (!btn) return;
  const paint = () => {
    const light = document.documentElement.dataset.theme === 'light';
    btn.setAttribute('aria-pressed', String(light));
    btn.setAttribute('aria-label', light ? t('theme.dark') : t('theme.light'));
    const name = light ? pick('moon', 'circle') : pick('sun', 'circle');
    if (name) btn.innerHTML = svg(name, { size: 18, weight: 2 });
  };
  btn.addEventListener('click', () => {
    const light = document.documentElement.dataset.theme !== 'light';
    if (light) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem('gf-theme', light ? 'light' : 'dark');
    } catch {
      // private mode
    }
    paint();
  });
  loadIcons().then(paint);
}

// Mobile navigation with a menu to x morph.
function setupNav() {
  const btn = $('[data-menu-toggle]');
  const nav = $('.nav');
  if (!btn || !nav) return;
  let open = false;
  let p = 0;
  let cancel = () => {};
  const draw = () => {
    const menu = gf.lookupIcon('menu');
    const x = gf.lookupIcon('x');
    if (!menu || !x) return;
    const f = gf.morphFrame(menu, x, p);
    btn.innerHTML = gf.renderToString(f.icon, { size: 20 });
  };
  btn.addEventListener('click', () => {
    open = !open;
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    cancel();
    cancel = gf.tween(p, open ? 1 : 0, { duration: 320 }, (v) => {
      p = v;
      draw();
    });
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && open) btn.click();
  });
  loadIcons().then(draw);
}

function setupReveal() {
  const els = $$('.reveal');
  if (!els.length) return;
  if (reduced || !('IntersectionObserver' in window)) {
    for (const el of els) el.classList.add('in');
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  for (const el of els) io.observe(el);
}

function setupCopyButtons() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (b) copy(b.getAttribute('data-copy'));
  });
}

export function start() {
  setupTheme();
  setupNav();
  setupReveal();
  setupCopyButtons();
  highlightAll();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
