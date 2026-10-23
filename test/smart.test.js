// Smart icons in the core: data icons, locale aware icons, the contrast
// bump, StatusIcon and IconGroup. Imports the built package of this
// checkout by path.
import { describe, expect, it } from 'vitest';
import * as gf from '../packages/glyphfox/dist/index.js';
import * as core from '../packages/glyphfox/dist/core/index.js';
import { nodeBounds } from '../packages/glyphfox/dist/core/geometry.js';
import { parseBody } from '../packages/glyphfox/dist/core/nodes.js';
import { checkDefault } from './fixtures/props.js';

const { SMART_KINDS, smartIcon, smartSvg, statusSvg, groupSvg } = gf;
const count = (s, re) => (s.match(re) || []).length;
const svgOpen = (s) => /<svg[^>]*>/.exec(s)[0];

/** Every shape of a body stays in the 2 to 22 box, the rule of the icon lint (text is checked by its anchor). */
function inPadding(body) {
  for (const node of parseBody(body)) {
    if (node[0] === 'defs') continue;
    if (node[0] === 'text') {
      const x = Number(node[1].x);
      const y = Number(node[1].y);
      if (x < 2 || x > 22 || y < 2 || y > 22) return `text ${x},${y}`;
      continue;
    }
    const b = nodeBounds(node);
    if (b.minX < 1.99 || b.minY < 1.99 || b.maxX > 22.01 || b.maxY > 22.01) return `${node[0]} ${JSON.stringify(b)}`;
  }
  return true;
}

describe('smart data icons', () => {
  it('draws every kind on the 24 grid with the shared props', () => {
    expect(SMART_KINDS).toEqual(['battery', 'signal', 'wifi', 'volume', 'progress', 'thermometer', 'calendar', 'clock', 'file', 'badge', 'currency']);
    for (const kind of SMART_KINDS) {
      const icon = smartIcon(kind, { value: 0.5, count: 3, ext: 'pdf', date: '2026-10-23', time: '10:10' });
      expect(icon.name).toBe(`smart-${kind}`);
      expect(icon.smart.kind).toBe(kind);
      expect(icon.smart.title.length, kind).toBeGreaterThan(0);
      expect(inPadding(icon.body), kind).toBe(true);
      const svg = smartSvg(kind, { value: 0.5, size: 32, color: '#ff7a1a', weight: 1.5 });
      expect(svgOpen(svg)).toMatch(/width="32"[^>]*height="32"/);
      expect(svgOpen(svg)).toContain('color="#ff7a1a"');
      expect(svgOpen(svg)).toContain(`glyphfox-smart-${kind}`);
    }
    expect(() => smartIcon('nope')).toThrow(/unknown smart icon/);
    expect(smartIcon('notification', { count: 2 }).smart.kind).toBe('badge');
  });

  it('fills the battery to the level and draws the charging bolt with a knockout', () => {
    const width = (v) => Number(/class="gf-level"[^>]*width="([\d.]+)"/.exec(smartIcon('battery', { value: v }).body)[1]);
    expect(width(1)).toBeGreaterThan(width(0.5));
    expect(width(0.5)).toBeCloseTo(width(1) / 2, 1);
    expect(smartIcon('battery', { value: 0 }).body).not.toContain('gf-level');
    expect(smartIcon('battery', { value: 42, max: 100 }).smart.level).toBeCloseTo(0.42);
    expect(smartIcon('battery', { value: 42 }).smart.level).toBeCloseTo(0.42);
    const charging = smartSvg('battery', { value: 0.8, charging: true });
    expect(charging).toContain('<mask');
    expect(charging).toContain('gf-bolt');
    expect(svgOpen(charging)).toContain('gf-charging');
    expect(svgOpen(smartSvg('battery', { value: 0.1 }))).toContain('gf-low');
    expect(smartIcon('battery', { value: 0.42, locale: 'en-US' }).smart.title).toBe('Battery 42%');
  });

  it('lights signal bars, wifi arcs and volume waves by level', () => {
    expect(count(smartIcon('signal', { value: 0.75 }).body, /gf-off/g)).toBe(1);
    expect(count(smartIcon('signal', { value: 3, max: 4 }).body, /gf-off/g)).toBe(1);
    expect(count(smartIcon('signal', { value: 0 }).body, /gf-off/g)).toBe(4);
    expect(count(smartIcon('wifi', { value: 1 }).body, /gf-off/g)).toBe(0);
    expect(count(smartIcon('wifi', { value: 0.34 }).body, /gf-off/g)).toBe(2);
    expect(count(smartIcon('volume', { value: 0.3 }).body, /gf-off/g)).toBe(1);
    expect(smartIcon('volume', { value: 0 }).smart.title).toBe('Muted');
    expect(smartIcon('volume', { value: 0.8, muted: true }).body).toContain('M16 9.5l5 5');
  });

  it('draws the progress ring arc and an optional label', () => {
    expect(smartIcon('progress', { value: 0.25 }).body).toContain('A10 10 0 0 1 22 12');
    expect(smartIcon('progress', { value: 0.75 }).body).toContain('A10 10 0 1 1 2 12');
    expect(smartIcon('progress', { value: 1 }).body).toMatch(/<circle class="gf-level"/);
    expect(smartIcon('progress', { value: 0 }).body).not.toContain('gf-level');
    expect(smartIcon('progress', { value: 0.42, label: true, locale: 'en' }).body).toMatch(/<text[^>]*>42<\/text>/);
    expect(smartIcon('progress', { value: 0.5, label: 'OK' }).body).toMatch(/<text[^>]*>OK<\/text>/);
  });

  it('maps real values on the thermometer', () => {
    const top = (o) => Number(/d="M12 17V([\d.]+)"/.exec(smartIcon('thermometer', o).body)[1]);
    expect(top({ value: 30, min: -10, max: 40 })).toBeLessThan(top({ value: 0, min: -10, max: 40 }));
    expect(smartIcon('thermometer', { value: -10, min: -10, max: 40 }).body).not.toContain('M12 17V');
    expect(smartIcon('thermometer', { value: 21.5, min: -10, max: 40, unit: '°C', locale: 'en' }).smart.title).toBe('Temperature 21.5 °C');
    expect(smartIcon('thermometer', { value: 39, min: -10, max: 40 }).smart.classes).toContain('gf-hot');
  });

  it('shows the date on the calendar with the digits of the locale', () => {
    expect(smartIcon('calendar', { date: '2026-10-23', locale: 'en-US' }).body).toMatch(/<text[^>]*>23<\/text>/);
    expect(smartIcon('calendar', { date: new Date(2026, 0, 5), locale: 'en-US' }).smart.date).toBe('2026-01-05');
    expect(smartIcon('calendar', { date: '2026-10-23', locale: 'ar-EG' }).body).toContain('\u0662\u0663');
    expect(smartIcon('calendar', { date: '2026-10-23', locale: 'en-US' }).smart.title).toBe('October 23, 2026');
    expect(smartIcon('calendar').smart.day).toBe(String(new Date().getDate()));
  });

  it('sets the clock hands for a time, the current time by default', () => {
    const at = (time, seconds) => smartIcon('clock', { time, seconds }).body;
    expect(at('03:00')).toContain('class="gf-hour" d="M12 12L16.5 12"');
    expect(at('03:00')).toContain('class="gf-minute" d="M12 12L12 5"');
    expect(at('12:30:15', true)).toContain('class="gf-second"');
    expect(at({ hours: 9, minutes: 45 })).toContain('class="gf-minute" d="M12 12L5 12"');
    expect(smartIcon('clock').smart.time).toMatch(/^\d\d:\d\d:\d\d$/);
    expect(gf.nextChange('clock', { seconds: true }, 1000)).toBe(1005);
    expect(gf.nextChange('clock', { time: '10:00' })).toBeNull();
    expect(gf.nextChange('calendar', {}, new Date(2026, 9, 23, 23, 59, 0).getTime())).toBe(60050);
  });

  it('labels files with their extension', () => {
    expect(smartIcon('file', { ext: '.pdf' }).body).toMatch(/<text[^>]*>PDF<\/text>/);
    expect(smartIcon('file', { filename: 'notes.final.docx' }).body).toMatch(/<text[^>]*>DOCX<\/text>/);
    expect(smartIcon('file', { ext: 'markdown' }).smart.ext).toBe('MARK');
    expect(smartIcon('file').body).not.toContain('<text');
    expect(svgOpen(smartSvg('file', { ext: 'js' }))).toContain('gf-ext-js');
  });

  it('puts a count badge on the bell (or any icon) with a knockout gap', () => {
    const one = smartIcon('badge', { count: 3 });
    expect(one.body).toMatch(/<text[^>]*>3<\/text>/);
    expect(one.body).toContain('<mask');
    expect(one.body).toContain('class="gf-badge"');
    expect(smartIcon('badge', { count: 120 }).body).toMatch(/>99\+<\/text>/);
    expect(smartIcon('badge', { count: 12, max: 9 }).body).toMatch(/>9\+<\/text>/);
    expect(smartIcon('badge', { count: 0 }).body).not.toContain('gf-badge');
    expect(smartIcon('badge', { dot: true }).body).toMatch(/<circle class="gf-badge"/);
    expect(smartIcon('badge', { count: 1 }).smart.title).toBe('1 notification');
    const mail = smartIcon('badge', { count: 2, icon: 'mail' });
    expect(mail.body).not.toBe(smartIcon('badge', { count: 2 }).body);
    expect(smartIcon('badge', { count: 2, icon: gf.getIcon('mail') }).body).toBe(mail.body);
    expect(smartSvg('badge', { count: 5, badgeColor: '#e5484d' })).toContain('color="#e5484d"');
  });

  it('keeps plain icons simple: the contrast rule only rides on smart icons', () => {
    checkDefault(gf.toSvg('file'));
    const svg = smartSvg('battery', { value: 0.5 });
    expect(svg).toContain('@media (prefers-contrast:more){.gf-hc250{stroke-width:2.5}');
    expect(svgOpen(svg)).toContain('gf-hc250');
    const more = smartSvg('battery', { value: 0.5, contrast: 'more' });
    expect(svgOpen(more)).toContain('stroke-width="2.5"');
    expect(more).not.toContain('prefers-contrast');
    expect(smartSvg('battery', { value: 0.5, contrast: 'off' })).not.toContain('prefers-contrast');
    expect(smartSvg('signal', { weight: 3 })).toContain('.gf-hc350{stroke-width:3.5}');
  });

  it('describes the data with title="auto"', () => {
    const svg = smartSvg('battery', { value: 0.5, locale: 'en-US', title: 'auto' });
    expect(svg).toContain('<title>Battery 50%</title>');
    expect(svgOpen(svg)).toContain('role="img"');
    expect(svgOpen(smartSvg('battery', { value: 0.5 }))).toContain('aria-hidden="true"');
  });
});

describe('locale aware icons', () => {
  it('picks the currency symbol of the locale from Intl', () => {
    const glyph = (o) => gf.currencyInfo(o).glyph;
    expect(glyph({ locale: 'pt-BR' })).toBe('real');
    expect(glyph({ locale: 'de-DE' })).toBe('euro');
    expect(glyph({ locale: 'fr' })).toBe('euro');
    expect(glyph({ locale: 'ja-JP' })).toBe('yen');
    expect(glyph({ locale: 'en-GB' })).toBe('pound');
    expect(glyph({ locale: 'en-US' })).toBe('dollar');
    expect(glyph({ locale: 'es-MX' })).toBe('dollar');
    expect(glyph({ locale: 'hi-IN' })).toBe('generic');
    expect(glyph({ locale: 'en-US', currency: 'EUR' })).toBe('euro');
    expect(gf.currencyInfo({ locale: 'pt-BR' })).toMatchObject({ currency: 'BRL', symbol: 'R$' });
    expect(gf.currencyForLocale('en-IE')).toBe('EUR');
    expect(smartSvg('currency', { locale: 'pt-BR' })).toContain('gf-currency-real');
    expect(smartIcon('currency', { locale: 'ja-JP' }).body).toContain(gf.CURRENCY_PATHS.yen[0]);
    expect(smartIcon('currency', { locale: 'en-GB' }).body).toContain(gf.CURRENCY_PATHS.pound[0]);
    expect(smartIcon('currency', { locale: 'en-US', currency: 'XYZ' }).smart.glyph).toBe('generic');
    for (const g of gf.CURRENCY_GLYPHS) expect(inPadding(gf.CURRENCY_PATHS[g].map((d) => `<path d="${d}"/>`).join('')), g).toBe(true);
  });

  it('knows right to left locales', () => {
    for (const l of ['ar', 'ar-EG', 'he-IL', 'fa-IR', 'ur', 'yi']) expect(gf.isRtlLocale(l), l).toBe(true);
    for (const l of ['en', 'pt-BR', 'ja', 'ar-Latn', '', undefined]) expect(gf.isRtlLocale(l), String(l)).toBe(false);
    expect(gf.textDirection({ locale: 'he' })).toBe('rtl');
    expect(gf.textDirection({ dir: 'ltr', locale: 'he' })).toBe('ltr');
    expect(gf.textDirection()).toBe('ltr');
  });

  it('mirrors directional icons automatically in right to left documents', () => {
    const arrow = gf.toSvg('arrow-right');
    expect(svgOpen(arrow)).toContain('gf-rtl');
    expect(arrow).toContain(':dir(rtl)');
    expect(svgOpen(gf.toSvg('chevron-left+check'))).toContain('gf-rtl');
    expect(svgOpen(gf.toSvg('home'))).not.toContain('gf-rtl');
    expect(svgOpen(gf.toSvg('arrow-right', { mirrorRtl: false }))).not.toContain('gf-rtl');
    expect(gf.isDirectional('undo')).toBe(true);
    expect(gf.isDirectional('play')).toBe(false);
    gf.registerDirectional('my-arrow');
    expect(gf.isDirectional('my-arrow')).toBe(true);
  });

  it('mirrors directional icons for a right to left locale or dir', () => {
    const ar = gf.toSvg('arrow-right', { locale: 'ar' });
    expect(ar).toContain('transform="matrix(-1 0 0 1 24 0)"');
    expect(svgOpen(ar)).not.toContain('gf-rtl');
    expect(gf.toSvg('arrow-right', { locale: 'en' })).not.toContain('matrix(-1');
    expect(gf.toSvg('arrow-right', { dir: 'rtl', flipX: true })).not.toContain('matrix(-1');
    expect(smartSvg('send', { locale: 'he' })).toContain('matrix(-1 0 0 1 24 0)');
    expect(smartSvg('home', { locale: 'he' })).not.toContain('matrix(-1');
  });
});

describe('StatusIcon (core)', () => {
  it('draws each state and spins while loading', () => {
    expect(gf.STATUS_STATES).toEqual(['idle', 'loading', 'success', 'error']);
    const loading = statusSvg('loading');
    expect(loading).toContain('@keyframes gf-spin');
    expect(svgOpen(loading)).toContain('gf-status-loading');
    expect(statusSvg('success')).not.toContain('gf-spin');
    expect(statusSvg('error', { title: 'auto' })).toContain('<title>Error</title>');
    expect(svgOpen(statusSvg('nope'))).toContain('gf-status-idle');
  });

  it('morphs between states with the morph engine', () => {
    const mid = gf.statusView('loading', 'success', 0.5);
    expect(mid.icon.name).toBe('status-loading>status-success');
    expect(mid.props.animate).toBeUndefined();
    expect(gf.statusView('loading', 'success', 1).icon).toBe(gf.STATUS_ICONS.success);
    expect(gf.statusView('success', 'loading', 1).props.animate).toBe('spin');
    const css = statusSvg('success', { from: 'loading', duration: 300 });
    expect(css).toContain('d:path("M');
    expect(css).toMatch(/300ms/);
    expect(svgOpen(css)).toContain('gf-status-success');
  });
});

describe('IconGroup (core)', () => {
  it('staggers delays', () => {
    expect(gf.staggerDelays(4, { stagger: 50 })).toEqual([0, 50, 100, 150]);
    expect(gf.staggerDelays(3, { stagger: 50, delay: 100, from: 'end' })).toEqual([200, 150, 100]);
    expect(gf.staggerDelays(3, { stagger: 50, from: 'center' })).toEqual([50, 0, 50]);
  });

  it('renders a group with one preset and staggered delays', () => {
    const html = groupSvg(['home', 'file', { kind: 'battery', value: 0.5 }], { animate: 'pop', stagger: 80, size: 32 });
    expect(html.startsWith('<span class="glyphfox-group" role="group">')).toBe(true);
    expect(count(html, /<svg /g)).toBe(3);
    expect(count(html, /width="32"/g)).toBe(3);
    for (const d of [0, 80, 160]) expect(html).toMatch(new RegExp(`animation:gf-pop 520ms [^;}]* ${d}ms`));
    expect(html).toContain('glyphfox-smart-battery');
    const hover = groupSvg(['home', 'heart'], { animate: 'wiggle', trigger: 'hover' });
    expect(hover).toMatch(/:hover>\.gf-a[0-9a-z]+ \.gf-anim/);
    const state = groupSvg(['home'], { animate: 'pulse', trigger: 'state', active: true });
    expect(state).toContain('gf-on');
    const titled = groupSvg(['home', 'file'], { title: 'Tools' });
    expect(titled).toContain('role="group" aria-label="Tools"');
    expect(titled).not.toContain('<title>');
  });

  it('builds a stylesheet for children it does not render', () => {
    const { className, css } = gf.groupCss({ animate: 'bounce', stagger: 100, trigger: 'hover', count: 3 });
    expect(className).toMatch(/^gf-g[0-9a-z]+$/);
    expect(css).toContain(`.${className}:hover>*{animation:`);
    expect(css).toContain(`>:nth-child(3){animation-delay:200ms}`);
    expect(css).toContain('prefers-reduced-motion');
    expect(gf.groupCss({ animate: 'draw' }).css).toContain('stroke-dasharray:100');
    expect(gf.groupCss({ animate: 'nope' })).toBeNull();
  });
});

describe('glyphfox/core', () => {
  it('exposes the smart functions without icon data', () => {
    for (const k of ['smartIcon', 'smartSvg', 'statusSvg', 'groupSvg', 'currencyInfo', 'isRtlLocale', 'renderSmart', 'createSmart']) expect(typeof core[k], k).toBe('function');
    expect(core.smartSvg('wifi', { value: 0.5 })).toContain('glyphfox-smart-wifi');
    core.registerIcons([gf.getIcon('mail')]);
    expect(core.smartIcon('badge', { count: 2, icon: 'mail' }).body).toBe(smartIcon('badge', { count: 2, icon: 'mail' }).body);
  });
});
