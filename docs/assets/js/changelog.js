// Renders data/changelog.md (a copy of CHANGELOG.md) with a tiny Markdown subset.

import { $ } from './app.js';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function markdown(md) {
  const out = [];
  let list = false;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const li = /^\s*[-*] (.*)$/.exec(line);
    if (li) {
      if (!list) {
        out.push('<ul>');
        list = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (list) {
      out.push('</ul>');
      list = false;
    }
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) {
      if (h[1].length === 1) continue;
      out.push(`<h${h[1].length}>${inline(h[2].replace(/^\[([^\]]+)\]/, '$1'))}</h${h[1].length}>`);
    } else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('\n');
}

fetch(new URL('../../data/changelog.md', import.meta.url))
  .then((r) => r.text())
  .then((md) => {
    $('[data-log]').innerHTML = markdown(md);
  })
  .catch(() => {
    $('[data-log]').innerHTML = '<p><a href="https://github.com/kwy404/glyphfox/blob/main/CHANGELOG.md">CHANGELOG.md</a></p>';
  });
