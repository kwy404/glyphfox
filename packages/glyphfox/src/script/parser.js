// Glyph script: the tokenizer and the parser. Glyph script is a tiny text
// language that draws icons on the 24 grid, one command per line:
//
//   circle 12 12 4
//   repeat 8 { line 12 2 12 4.5 }
//
// Arguments are separated by spaces or commas. Inside one argument the
// operators may have spaces around them (`12 - 4` is 8), but a sign right
// after a space and right before a number, a name or "(" starts a new
// argument (`12 -4` is two arguments). Every token keeps its line and
// column so errors can point at the exact place in the source.

/** Shape commands with their positional arguments and keywords. */
export const COMMANDS = {
  circle: { args: ['cx', 'cy', 'r'] },
  ellipse: { args: ['cx', 'cy', 'rx', 'ry'] },
  rect: { args: ['x', 'y', 'w', 'h'], keywords: ['radius'] },
  line: { args: ['x1', 'y1', 'x2', 'y2'] },
  polyline: { points: 2 },
  polygon: { points: 3 },
  arc: { args: ['cx', 'cy', 'r', 'from', 'to'], keywords: ['from', 'to'] },
  path: { string: true },
  dot: { args: ['x', 'y'] },
  group: { block: true, keywords: ['move', 'rotate', 'scale', 'around'] },
  mirror: { block: true, keywords: ['at'] },
  repeat: { block: true, keywords: ['around', 'step'] },
  duotone: { block: true },
};

const BLOCK_EXAMPLES = {
  group: 'group move 2 0 { ... }',
  mirror: 'mirror x { ... }',
  repeat: 'repeat 8 { ... }',
  duotone: 'duotone { circle 12 12 8 }',
};

/** Metadata directives: the rest of the line is their value. */
export const DIRECTIVES = ['name', 'tags', 'category'];

/** Keywords that appear after a command. */
export const KEYWORDS = ['radius', 'from', 'to', 'move', 'rotate', 'scale', 'around', 'at', 'step', 'x', 'y', 'xy'];

// Keywords that cannot be constant names (x, y and xy only matter right after mirror).
const RESERVED = KEYWORDS.filter((k) => k !== 'x' && k !== 'y' && k !== 'xy');

/** Every command and keyword name (for highlighting and suggestions). */
export const SCRIPT_COMMANDS = [...Object.keys(COMMANDS), 'let', ...DIRECTIVES, ...KEYWORDS];

const NUMBER = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const IDENT = /[A-Za-z_][A-Za-z0-9_]*/y;
const WORD_TAIL = /[A-Za-z0-9_.]*/y;

/** An error with a source position (1 based line and column). */
export class GlyphScriptError extends Error {
  constructor(message, line = 1, column = 1, length = 1) {
    super(message);
    this.name = 'GlyphScriptError';
    this.line = line;
    this.column = column;
    this.length = length;
  }
}

/** A plain error record at a token. */
export function errorAt(tok, message, severity = 'error') {
  return { message, line: tok.line, column: tok.column, length: Math.max(1, tok.length || 1), severity };
}

/** A plain error record right after a token (for missing arguments). */
export function errorAfter(tok, message, severity = 'error') {
  if (tok.type === 'end' || tok.type === 'eof') return errorAt(tok, message, severity);
  return { message, line: tok.line, column: tok.column + tok.length, length: 1, severity };
}

/** How a token reads in an error message. */
export function describe(tok) {
  if (!tok) return 'nothing';
  if (tok.type === 'eof') return 'the end of the script';
  if (tok.type === 'end') return tok.value === ';' ? '";"' : 'the end of the line';
  if (tok.type === 'str') return 'a string';
  return `"${tok.text}"`;
}

/** Optimal string alignment distance (a transposition costs one edit). */
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

/** The closest candidate within a small edit distance, or null. */
export function closest(word, candidates) {
  const w = String(word).toLowerCase();
  const limit = w.length <= 3 ? 1 : 2;
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const dist = editDistance(w, String(c).toLowerCase());
    if (dist < bestD && dist <= limit) {
      best = c;
      bestD = dist;
    }
  }
  return best;
}

/** Suffix for messages: ` (did you mean "x"?)` or an empty string. */
export function suggestion(word, candidates) {
  const c = closest(word, candidates);
  return c && c !== word ? ` (did you mean "${c}"?)` : '';
}

/**
 * Splits source text into tokens: num, ident, str, raw (directive value),
 * op (+ - * / ( ) =), { and }, end (a newline or ";") and a final eof.
 * Returns { tokens, errors }; unknown characters become errors.
 */
export function tokenize(source) {
  const src = String(source ?? '').replace(/^\uFEFF/, '');
  const tokens = [];
  const errors = [];
  const n = src.length;
  let i = 0;
  let line = 1;
  let col = 1;
  let space = true;
  let stmtStart = true;
  const push = (type, value, start, startCol, length, extra = {}) => {
    const tok = { type, value, text: src.slice(start, start + length), line, column: startCol, offset: start, length, spaceBefore: space, ...extra };
    tokens.push(tok);
    space = false;
    stmtStart = type === 'end' || type === '{' || type === '}';
    return tok;
  };
  const skipComment = () => {
    while (i < n && src[i] !== '\n' && src[i] !== '\r') {
      i++;
      col++;
    }
  };
  while (i < n) {
    const ch = src[i];
    if (ch === '\n' || ch === '\r') {
      push('end', '\n', i, col, 1);
      i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1;
      line++;
      col = 1;
      space = true;
      stmtStart = true;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === ',' || ch === '\f' || ch === '\v' || ch === '\u00A0') {
      i++;
      col++;
      space = true;
      continue;
    }
    if (ch === '#' || (ch === '/' && src[i + 1] === '/')) {
      skipComment();
      space = true;
      continue;
    }
    if (ch === ';') {
      push('end', ';', i, col, 1);
      i++;
      col++;
      space = true;
      continue;
    }
    NUMBER.lastIndex = i;
    const num = NUMBER.exec(src);
    if (num) {
      WORD_TAIL.lastIndex = i + num[0].length;
      const tail = WORD_TAIL.exec(src);
      const len = num[0].length + (tail ? tail[0].length : 0);
      if (tail && tail[0].length) push('bad', src.slice(i, i + len), i, col, len);
      else push('num', parseFloat(num[0]), i, col, len);
      i += len;
      col += len;
      continue;
    }
    IDENT.lastIndex = i;
    const id = IDENT.exec(src);
    if (id) {
      const word = id[0];
      const wasStart = stmtStart;
      push('ident', word, i, col, word.length);
      i += word.length;
      col += word.length;
      if (wasStart && DIRECTIVES.includes(word)) {
        // The value of a directive is the raw rest of the statement.
        while (i < n && (src[i] === ' ' || src[i] === '\t')) {
          i++;
          col++;
          space = true;
        }
        const start = i;
        const startCol = col;
        while (i < n && src[i] !== '\n' && src[i] !== '\r' && src[i] !== ';' && src[i] !== '}' && src[i] !== '#' && !(src[i] === '/' && src[i + 1] === '/')) {
          i++;
          col++;
        }
        const raw = src.slice(start, i);
        const trimmed = raw.replace(/\s+$/, '');
        push('raw', trimmed, start, startCol, trimmed.length);
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && src[j] !== ch && src[j] !== '\n' && src[j] !== '\r') j++;
      if (j >= n || src[j] !== ch) {
        errors.push({ message: `unterminated string, add the closing ${ch}`, line, column: col, length: 1, severity: 'error' });
        push('str', src.slice(i + 1, j), i, col, j - i, { unterminated: true });
        col += j - i;
        i = j;
        continue;
      }
      push('str', src.slice(i + 1, j), i, col, j - i + 1);
      col += j - i + 1;
      i = j + 1;
      continue;
    }
    if ('+-*/()='.includes(ch)) {
      push('op', ch, i, col, 1);
      i++;
      col++;
      continue;
    }
    if (ch === '{' || ch === '}') {
      push(ch, ch, i, col, 1);
      i++;
      col++;
      continue;
    }
    const cp = src.codePointAt(i);
    const len = cp > 0xffff ? 2 : 1;
    errors.push({ message: `unexpected character "${src.slice(i, i + len)}"`, line, column: col, length: 1, severity: 'error' });
    i += len;
    col += len;
    space = true;
  }
  tokens.push({ type: 'eof', value: '', text: '', line, column: col, offset: n, length: 1, spaceBefore: true });
  return { tokens, errors };
}

class ParseFailure extends Error {
  constructor(record) {
    super(record.message);
    this.record = record;
  }
}

const fail = (tok, message) => {
  throw new ParseFailure(errorAt(tok, message));
};
const failAfter = (tok, message) => {
  throw new ParseFailure(errorAfter(tok, message));
};

/**
 * Parses glyph script into statements. Returns { statements, errors }.
 * Statements:
 *   { type: 'shape', cmd, tok, items, last }
 *   { type: 'block', cmd, tok, items, body, open, close, last }
 *   { type: 'let', tok, name, nameTok, expr }
 *   { type: 'meta', cmd, tok, value, valueTok }
 * Items: { kind: 'expr', expr, tok, last } | { kind: 'kw', name, tok } |
 *        { kind: 'str', value, tok } | { kind: 'word', value, tok }.
 * Expressions: num, name, unary and binary nodes with their token.
 */
export function parseScript(source) {
  const { tokens, errors } = tokenize(source);
  let pos = 0;
  const peek = (k = 0) => tokens[Math.min(pos + k, tokens.length - 1)];
  const next = () => {
    const t = tokens[pos];
    if (pos < tokens.length - 1) pos++;
    return t;
  };
  const prev = () => tokens[Math.max(0, pos - 1)];
  const isEnd = (t) => t.type === 'end' || t.type === '}' || t.type === 'eof';
  const isOp = (t, v) => t.type === 'op' && t.value === v;
  const startsOperand = (t) => t.type === 'num' || t.type === 'ident' || isOp(t, '(');

  function parseExpr(single) {
    const add = (inParens) => {
      let left = mul(inParens);
      for (;;) {
        const op = peek();
        if (!(isOp(op, '+') || isOp(op, '-'))) return left;
        if (!inParens && !single && op.spaceBefore) {
          const after = peek(1);
          if (!after.spaceBefore && startsOperand(after)) return left;
        }
        next();
        const right = mul(inParens);
        left = { type: 'binary', op: op.value, left, right, tok: op };
      }
    };
    const mul = (inParens) => {
      let left = unary(inParens);
      for (;;) {
        const op = peek();
        if (!(isOp(op, '*') || isOp(op, '/'))) return left;
        next();
        const right = unary(inParens);
        left = { type: 'binary', op: op.value, left, right, tok: op };
      }
    };
    const unary = (inParens) => {
      const t = peek();
      if (isOp(t, '-') || isOp(t, '+')) {
        next();
        return { type: 'unary', op: t.value, expr: unary(inParens), tok: t };
      }
      return primary();
    };
    const primary = () => {
      const t = peek();
      if (t.type === 'num') {
        next();
        return { type: 'num', value: t.value, tok: t };
      }
      if (t.type === 'ident') {
        next();
        return { type: 'name', name: t.value, tok: t };
      }
      if (isOp(t, '(')) {
        next();
        const inner = add(true);
        const close = peek();
        if (!isOp(close, ')')) fail(close, `expected ")" to close the "(" at line ${t.line}, column ${t.column}, found ${describe(close)}`);
        next();
        return inner;
      }
      fail(t, `expected a number, found ${describe(t)}`);
      return null;
    };
    return add(false);
  }

  function skipStatement() {
    let depth = 0;
    for (;;) {
      const t = peek();
      if (t.type === 'eof') return;
      if (t.type === '{') {
        depth++;
        next();
        continue;
      }
      if (t.type === '}') {
        if (depth === 0) return;
        depth--;
        next();
        continue;
      }
      if (t.type === 'end' && depth === 0) {
        next();
        return;
      }
      next();
    }
  }

  function parseLet(tok) {
    const nameTok = next();
    if (nameTok.type !== 'ident') fail(nameTok, `let needs a name, found ${describe(nameTok)}`);
    if (COMMANDS[nameTok.value] || DIRECTIVES.includes(nameTok.value) || RESERVED.includes(nameTok.value) || nameTok.value === 'let') {
      fail(nameTok, `"${nameTok.value}" is a command or a keyword, pick another name`);
    }
    const eq = next();
    if (!isOp(eq, '=')) fail(eq, `expected "=" after "let ${nameTok.value}", found ${describe(eq)}`);
    if (isEnd(peek())) failAfter(eq, `let ${nameTok.value} needs a value`);
    const expr = parseExpr(true);
    const after = peek();
    if (!isEnd(after)) fail(after, `unexpected ${describe(after)} after the value of ${nameTok.value}`);
    return { type: 'let', tok, name: nameTok.value, nameTok, expr };
  }

  function parseDirective(tok) {
    const valueTok = peek().type === 'raw' ? next() : null;
    if (!valueTok || !valueTok.value) failAfter(tok, `${tok.value} needs a value`);
    return { type: 'meta', cmd: tok.value, tok, value: valueTok.value, valueTok };
  }

  function parseStatement() {
    const tok = next();
    if (tok.type === 'bad') fail(tok, `expected a command, found ${describe(tok)}`);
    if (tok.type !== 'ident') fail(tok, `expected a command, found ${describe(tok)}`);
    const cmd = tok.value;
    if (cmd === 'let') return parseLet(tok);
    if (DIRECTIVES.includes(cmd)) return parseDirective(tok);
    const spec = COMMANDS[cmd];
    if (!spec) fail(tok, `unknown command "${cmd}"${suggestion(cmd, [...Object.keys(COMMANDS), 'let', ...DIRECTIVES])}`);
    const items = [];
    const keywords = spec.keywords || [];
    let body = null;
    let open = null;
    let close = null;
    for (;;) {
      const t = peek();
      if (isEnd(t)) break;
      if (t.type === '{') {
        if (!spec.block) fail(t, `${cmd} does not take a block`);
        open = next();
        body = parseStatements(open);
        if (peek().type === '}') close = next();
        const after = peek();
        if (close && !isEnd(after)) fail(after, `unexpected ${describe(after)} after the block, start a new line`);
        break;
      }
      if (t.type === 'ident' && keywords.includes(t.value)) {
        next();
        items.push({ kind: 'kw', name: t.value, tok: t });
        continue;
      }
      if (cmd === 'mirror' && items.length === 0 && t.type === 'ident' && (t.value === 'x' || t.value === 'y' || t.value === 'xy')) {
        next();
        items.push({ kind: 'word', value: t.value, tok: t });
        continue;
      }
      if (t.type === 'str') {
        next();
        items.push({ kind: 'str', value: t.value, tok: t });
        continue;
      }
      if (t.type === 'bad') fail(t, `expected a number, found ${describe(t)}`);
      if (t.type === 'raw' || t.type === '}') fail(t, `unexpected ${describe(t)}`);
      const first = t;
      const expr = parseExpr(false);
      items.push({ kind: 'expr', expr, tok: first, last: prev() });
    }
    const last = prev();
    if (spec.block && !open) failAfter(last, `${cmd} needs a block, for example: ${BLOCK_EXAMPLES[cmd]}`);
    if (spec.block) return { type: 'block', cmd, tok, items, body, open, close, last };
    return { type: 'shape', cmd, tok, items, last };
  }

  // Reads statements until "}" (inside a block) or the end of the script.
  function parseStatements(open) {
    const list = [];
    for (;;) {
      const t = peek();
      if (t.type === 'eof') {
        if (open) errors.push(errorAt(open, `missing "}" for the block opened at line ${open.line}, column ${open.column}`));
        return list;
      }
      if (t.type === 'end') {
        next();
        continue;
      }
      if (t.type === '}') {
        if (open) return list;
        errors.push(errorAt(t, 'unexpected "}" (no block is open)'));
        next();
        continue;
      }
      try {
        list.push(parseStatement());
      } catch (err) {
        if (!(err instanceof ParseFailure)) throw err;
        errors.push(err.record);
        skipStatement();
      }
    }
  }

  const statements = parseStatements(null);
  errors.sort((a, b) => a.line - b.line || a.column - b.column);
  return { statements, errors };
}
