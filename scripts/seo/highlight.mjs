// Build time code highlighting for the guide and icon pages, with the same
// rules and token classes as the site runtime (docs/assets/js/app.js), so
// the pages need no script to color their code.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const JS_KEYWORDS = /\b(import|from|export|default|const|let|var|function|return|if|else|new|await|async|class|extends|for|of|in|true|false|null|undefined|type|interface)\b/;

const RULES = {
  sh: [
    ['c', /#[^\n]*/y],
    ['s', /'[^']*'|"[^"]*"/y],
    ['k', /\b(npx|npm|glyphfox|pnpm|yarn)\b/y],
    ['a', /--?[\w-]+/y],
  ],
  css: [
    ['c', /\/\*[\s\S]*?\*\//y],
    ['s', /'[^']*'|"[^"]*"/y],
    ['k', /@[\w-]+/y],
    ['t', /\.[\w-]+(?:\\.[\w-]*)*/y],
    ['a', /[\w-]+(?=\s*:)/y],
    ['n', /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|s|ms)?\b/y],
  ],
  js: [
    ['c', /\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/y],
    ['s', /`(?:[^`\\]|\\.)*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/y],
    ['t', /<\/?[A-Za-z][\w.-]*|\/?>/y],
    ['k', new RegExp(JS_KEYWORDS.source, 'y')],
    ['a', /[@:]?[A-Za-z_$][\w$-]*(?==)/y],
    ['n', /\b\d+(?:\.\d+)?\b/y],
  ],
};

export function highlight(code, language = 'js') {
  const rules = RULES[language] || RULES.js;
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
