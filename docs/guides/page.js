// Guide and icon pages: theme, menu, copy and download. Written by scripts/seo.
const ICONS = {"sun":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.18\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"glyphfox glyphfox-sun\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 4L12 2\"/><path d=\"M17.66 6.34L19.07 4.93\"/><path d=\"M20 12L22 12\"/><path d=\"M17.66 17.66L19.07 19.07\"/><path d=\"M12 20L12 22\"/><path d=\"M6.34 17.66L4.93 19.07\"/><path d=\"M4 12L2 12\"/><path d=\"M6.34 6.34L4.93 4.93\"/></svg>","moon":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.18\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"glyphfox glyphfox-moon\" aria-hidden=\"true\"><path d=\"M11.44 3.5A9 9 0 1 0 20.46 13.34A7 7 0 0 1 11.44 3.5Z\"/></svg>","menu":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.112\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"glyphfox glyphfox-menu\" aria-hidden=\"true\"><path d=\"M4 6h16\"/><path d=\"M4 12h16\"/><path d=\"M4 18h16\"/></svg>","x":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.112\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"glyphfox glyphfox-x\" aria-hidden=\"true\"><path d=\"M6 6l12 12\"/><path d=\"M18 6L6 18\"/></svg>","check":"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.18\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"glyphfox glyphfox-check\" aria-hidden=\"true\"><path d=\"M5 13l4 4L19 7\"/></svg>"};
const root = document.documentElement;
const body = document.body;
let toastEl = null;
let toastTimer = 0;

function toast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.innerHTML = ICONS.check + '<span></span>';
    body.appendChild(toastEl);
  }
  toastEl.querySelector('span').textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      // nothing else to try
    }
    ta.remove();
  }
  toast(body.dataset.copied || 'Copied');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.code .copy');
  if (btn) {
    const pre = btn.closest('.code').querySelector('pre');
    if (pre) copy(pre.textContent);
    return;
  }
  const dl = e.target.closest('[data-download]');
  if (dl) {
    const pre = document.querySelector('#snip-svg pre');
    if (!pre) return;
    const url = URL.createObjectURL(new Blob([pre.textContent + '\n'], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = dl.dataset.download;
    body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
});

const themeBtn = document.querySelector('[data-theme-toggle]');
if (themeBtn) {
  const paint = () => {
    const light = root.dataset.theme === 'light';
    themeBtn.setAttribute('aria-pressed', String(light));
    themeBtn.setAttribute('aria-label', light ? body.dataset.themeDark : body.dataset.themeLight);
    themeBtn.innerHTML = light ? ICONS.moon : ICONS.sun;
  };
  themeBtn.addEventListener('click', () => {
    const light = root.dataset.theme !== 'light';
    if (light) root.dataset.theme = 'light';
    else delete root.dataset.theme;
    try {
      localStorage.setItem('gf-theme', light ? 'light' : 'dark');
    } catch {
      // private mode
    }
    paint();
  });
  paint();
}

const menuBtn = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('.nav');
if (menuBtn && nav) {
  let open = false;
  menuBtn.addEventListener('click', () => {
    open = !open;
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.innerHTML = open ? ICONS.x : ICONS.menu;
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && open) menuBtn.click();
  });
}
