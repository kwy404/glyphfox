// Plotter panel: the pen paths of an icon in drawing order with the pen up
// travel drawn dashed, stats before and after the ordering, the G-code with
// the chosen feed rates and pen commands, and the downloads.

import { $, codeBlock, download, t, toast } from '../app.js';
import { plotPaths, toGcode, toPlotSvg } from '../../../vendor/glyphfox-labs.js';
import { esc, sourceControl, statsHtml } from './shared.js';

const PREVIEW_LINES = 40;
const state = { size: 50, feed: 1500, travelFeed: 3000, penUp: 'G0 Z5', penDown: 'G1 Z0 F500', optimize: true };
let src;

const n2 = (v) => String(Math.round(v * 100) / 100);
const mm = (v) => `${(Math.round(v * 10) / 10).toFixed(1)} mm`;

function options() {
  return { size: state.size, optimize: state.optimize, feed: state.feed, travelFeed: state.travelFeed, penUp: state.penUp, penDown: state.penDown };
}

function preview(plan) {
  const s = plan.size;
  const m = s * 0.05;
  const pen = s * 0.014;
  const pathD = (pts) => pts.map(([x, y], k) => `${k ? 'L' : 'M'}${n2(x)} ${n2(y)}`).join('');
  let travel = 'M0 0';
  for (const pts of plan.paths) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    travel += `L${n2(a[0])} ${n2(a[1])}M${n2(b[0])} ${n2(b[1])}`;
  }
  travel += 'L0 0';
  const starts = plan.paths.map((pts) => `<circle class="start" cx="${n2(pts[0][0])}" cy="${n2(pts[0][1])}" r="${n2(pen * 0.9)}"/>`).join('');
  const strokes = plan.paths.map((pts) => `<path class="pen" d="${pathD(pts)}" stroke-width="${n2(pen)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n2(-m)} ${n2(-m)} ${n2(s + 2 * m)} ${n2(s + 2 * m)}" aria-hidden="true"><rect x="0" y="0" width="${n2(s)}" height="${n2(s)}" fill="none" stroke="rgba(17,12,6,.12)" stroke-width="${n2(pen * 0.4)}"/>${strokes}<path class="travel" d="${travel}" stroke-width="${n2(pen * 0.45)}" stroke-dasharray="${n2(s * 0.018)} ${n2(s * 0.018)}"/>${starts}</svg>`;
}

function render() {
  const icon = src.icon();
  const stage = $('[data-pl-stage]');
  if (!icon) {
    stage.innerHTML = '';
    $('[data-pl-stats]').innerHTML = '';
    $('[data-pl-code]').replaceChildren();
    return;
  }
  let plan;
  let gcode;
  try {
    plan = plotPaths(icon, options());
    gcode = toGcode(icon, options());
  } catch (err) {
    stage.innerHTML = `<p class="lab-error">${esc(t('labs.error', { message: err.message }))}</p>`;
    return;
  }
  stage.innerHTML = preview(plan);
  const saved = plan.travelBefore > 0 ? Math.round((1 - plan.travel / plan.travelBefore) * 100) : 0;
  $('[data-pl-stats]').innerHTML = statsHtml([
    [t('labs.plotter.strokes'), String(plan.lifts)],
    [t('labs.plotter.draw'), mm(plan.draw)],
    [t('labs.plotter.travel'), mm(plan.travel), saved > 0 ? t('labs.plotter.saved', { p: saved }) : ''],
  ]);
  const lines = gcode.trimEnd().split('\n');
  const shown = lines.slice(0, PREVIEW_LINES);
  if (lines.length > PREVIEW_LINES) shown.push(`; ${t('labs.plotter.more', { n: lines.length - PREVIEW_LINES })}`);
  $('[data-pl-code]').replaceChildren(codeBlock(shown.join('\n'), 'js', `${src.name()}.gcode`));
}

export function init() {
  src = sourceControl('plotter', render);
  for (const key of ['size', 'feed', 'travelFeed']) {
    const input = $(`[data-pl="${key}"]`);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      if (!(v > 0)) return;
      state[key] = v;
      render();
    });
  }
  for (const key of ['penUp', 'penDown']) {
    const input = $(`[data-pl="${key}"]`);
    input.addEventListener('change', () => {
      state[key] = input.value.trim();
      render();
    });
  }
  $('[data-pl="optimize"]').addEventListener('change', (e) => {
    state.optimize = e.target.checked;
    render();
  });
  for (const b of document.querySelectorAll('[data-pl-act]')) {
    b.addEventListener('click', () => {
      const icon = src.icon();
      if (!icon) return;
      try {
        if (b.dataset.plAct === 'gcode') download(toGcode(icon, options()), `${src.name()}.gcode`, 'text/plain');
        else download(toPlotSvg(icon, options()), `${src.name()}-plot.svg`, 'image/svg+xml');
        toast(t('toast.downloaded'));
      } catch (err) {
        toast(t('labs.error', { message: err.message }));
      }
    });
  }
  render();
}
