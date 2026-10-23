// Glyph script: tokenizer, parser, compiler, errors and the examples.
import { describe, expect, it } from 'vitest';
import { EXAMPLES, GlyphScriptError, SCRIPT_COMMANDS, compileScript, formatError, parseScript, scriptToSvg, tokenize } from '../packages/glyphfox/src/script/index.js';
import { lintSvg } from '../packages/glyphfox/src/core/lint.js';
import { parseBody } from '../packages/glyphfox/src/core/nodes.js';

const nodes = (src) => {
  const r = compileScript(src);
  expect(r.errors, src).toEqual([]);
  return parseBody(r.body);
};
const firstError = (src) => compileScript(src).errors[0];
const at = (src) => {
  const e = firstError(src);
  return e && [e.line, e.column, e.message];
};

describe('glyph script tokenizer', () => {
  it('splits a signed number after a space into a new argument', () => {
    const args = (src) => parseScript(`circle ${src}`).statements[0].items.length;
    expect(args('12 -4 3')).toBe(3);
    expect(args('12 - 4 3')).toBe(2);
    expect(args('12-4 3')).toBe(2);
    expect(args('(12 -4) 3')).toBe(2);
    expect(args('12, 4, 3')).toBe(3);
    const t = tokenize('12 -4').tokens;
    expect(t.map((x) => x.type)).toEqual(['num', 'op', 'num', 'eof']);
    expect(t[1].spaceBefore).toBe(true);
    expect(t[2].spaceBefore).toBe(false);
  });

  it('keeps line and column for every token and skips comments', () => {
    const { tokens } = tokenize('# note\n  circle 12 12 4 // tail\nline');
    const circle = tokens.find((x) => x.value === 'circle');
    expect([circle.line, circle.column, circle.length]).toEqual([2, 3, 6]);
    const line = tokens.find((x) => x.value === 'line');
    expect([line.line, line.column]).toEqual([3, 1]);
    expect(tokens.some((x) => x.text === 'tail' || x.text === 'note')).toBe(false);
  });

  it('evaluates expressions and scoped constants', () => {
    expect(nodes('let r = 2+3*4/6\ncircle 12 12 r')[0][1].r).toBe('4');
    expect(nodes('let r = (1 + 2) * 2\ncircle 12 12 r - 1')[0][1].r).toBe('5');
    expect(nodes('let a = 6\ncircle 12 12 -a + 10')[0][1].r).toBe('4');
    expect(nodes('let x = 10\ncircle x+2 x+2 x/5')[0][1]).toEqual({ cx: '12', cy: '12', r: '2' });
    const scoped = compileScript('group {\n  let r = 3\n  circle 12 12 r\n}\ncircle 12 12 r');
    expect(scoped.errors[0]).toMatchObject({ line: 5, column: 14 });
  });

  it('lists the commands and keywords', () => {
    for (const w of ['circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'arc', 'path', 'dot', 'group', 'mirror', 'repeat', 'duotone', 'let', 'radius', 'around', 'step']) {
      expect(SCRIPT_COMMANDS, w).toContain(w);
    }
  });
});

describe('glyph script commands', () => {
  it('draws every shape', () => {
    const body = nodes(`circle 12 12 4
ellipse 12 12 6 3
rect 3 5 18 14 radius 2
rect 4 4 4 4
line 4 12 20 12
polyline 4 8, 12 16, 20 8
polygon 12 3 21 20 3 20
arc 12 12 8 from 0 to 90
path "M4 12h16"
dot 9 12`);
    expect(body.map((n) => n[0])).toEqual(['circle', 'ellipse', 'rect', 'rect', 'line', 'polyline', 'polygon', 'path', 'path', 'path']);
    expect(body[2][1]).toEqual({ x: '3', y: '5', width: '18', height: '14', rx: '2' });
    expect(body[3][1].rx).toBeUndefined();
    expect(body[5][1].points).toBe('4,8 12,16 20,8');
    expect(body[7][1].d).toBe('M12 4a8 8 0 0 1 8 8');
    expect(body[8][1].d).toBe('M4 12h16');
    expect(nodes('path "M4 12.004 h16"')[0][1].d).toBe('M4 12h16');
    expect(nodes('group move 0 1 { path "M4 12h16" }')[0][1].d).toBe('M4 13H20');
    expect(body[9][1].d).toBe('M9 12h.01');
  });

  it('measures arcs from twelve o clock, clockwise', () => {
    expect(nodes('arc 12 12 8 90 0')[0][1].d).toBe('M20 12A8 8 0 0 0 12 4');
    expect(nodes('arc 12 12 8 from -90 to 90')[0][1].d).toBe('M4 12a8 8 0 0 1 16 0');
    expect(nodes('arc 12 12 8 from 0 to 270')[0][1].d).toBe('M12 4A8 8 0 1 1 4 12');
    const full = nodes('arc 12 12 8 from 0 to 360')[0][1].d;
    expect(full).toBe('M12 4a8 8 0 0 1 0 16A8 8 0 0 1 12 4z');
    const over = compileScript('arc 12 12 8 0 400');
    expect(over.ok).toBe(true);
    expect(over.warnings[0].message).toContain('full circle');
  });

  it('applies group transforms in the written order', () => {
    expect(nodes('group move 4 0 rotate 90 { dot 12 8 }')[0][1].d).toBe('M16 16h.01');
    expect(nodes('group rotate 90 move 4 0 { dot 12 8 }')[0][1].d).toBe('M20 12h.01');
    expect(at('group rotate 90 move 4 0 { dot 12 6 }')[2]).toBe('shape leaves the 2 to 22 padding box (right 22.01)');
    expect(nodes('group rotate 90 { dot 12 4 }')[0][1].d).toBe('M20 12h.01');
    expect(nodes('group scale 0.5 { circle 12 12 8 }')[0][1]).toEqual({ cx: '12', cy: '12', r: '4' });
    expect(nodes('group scale 2 around 4 4 { circle 6 6 1 }')[0][1]).toEqual({ cx: '8', cy: '8', r: '2' });
    expect(nodes('group rotate 90 around 8 8 { dot 8 4 }')[0][1].d).toBe('M12 8h.01');
  });

  it('keeps primitives where the transform allows and arcs exact elsewhere', () => {
    expect(nodes('group rotate 90 { rect 4 8 16 8 radius 2 }')[0]).toEqual(['rect', { x: '8', y: '4', width: '8', height: '16', rx: '2' }]);
    expect(nodes('group rotate 90 { ellipse 12 12 6 3 }')[0]).toEqual(['ellipse', { cx: '12', cy: '12', rx: '3', ry: '6' }]);
    const rotated = nodes('group rotate 45 { ellipse 12 12 6 3 }')[0];
    expect(rotated[0]).toBe('path');
    expect(rotated[1].d).toMatch(/[aA]6 3 45 0 1/);
    const rect = nodes('group rotate 30 { rect 8 8 8 8 radius 1 }')[0];
    expect(rect[0]).toBe('path');
    expect(rect[1].d).toMatch(/[aA]1 1 0 0 1/);
    expect(nodes('group rotate 30 { circle 12 8 2 }')[0][0]).toBe('circle');
  });

  it('mirrors across x, y and both, with a custom axis', () => {
    expect(nodes('mirror x at 10 { dot 6 8 }').map((n) => n[1].d)).toEqual(['M6 8h.01', 'M14 8h.01']);
    expect(nodes('mirror y { dot 6 8 }').map((n) => n[1].d)).toEqual(['M6 8h.01', 'M6 16h.01']);
    expect(nodes('mirror xy at 11 13 { dot 6 8 }').map((n) => n[1].d)).toEqual(['M6 8h.01', 'M16 8h.01', 'M6 18h.01', 'M16 18h.01']);
    const arcs = nodes('mirror x { arc 6 12 3 from 0 to 90 }').map((n) => n[1].d);
    expect(arcs[0]).toBe('M6 9a3 3 0 0 1 3 3');
    expect(arcs[1]).toBe('M18 9a3 3 0 0 0-3 3');
    expect(nodes('mirror x { polyline 4 4 8 8 }')[1][1].points).toBe('20,4 16,8');
  });

  it('repeats around a center with a count and a step', () => {
    expect(nodes('repeat 4 { dot 12 4 }').map((n) => n[1].d)).toEqual(['M12 4h.01', 'M20 12h.01', 'M12 20h.01', 'M4 12h.01']);
    expect(nodes('repeat 3 step 30 { dot 12 4 }').map((n) => n[1].d)).toEqual(['M12 4h.01', 'M16 5.07h.01', 'M18.93 8h.01']);
    expect(nodes('repeat 2 around 8 8 { dot 8 4 }').map((n) => n[1].d)).toEqual(['M8 4h.01', 'M8 12h.01']);
    expect(nodes('repeat 1 { circle 12 12 4 }').length).toBe(1);
    expect(nodes('repeat 2 { repeat 2 { dot 12 4 } }').length).toBe(4);
  });

  it('merges duotone shapes into the first element', () => {
    const body = nodes('circle 12 12 8\nduotone {\n  circle 12 12 8\n  rect 8 8 8 8\n}');
    expect(body[0][0]).toBe('path');
    expect(body[0][1]).toEqual({ class: 'gf-secondary', d: 'M12 4a8 8 0 0 1 0 16A8 8 0 0 1 12 4zM8 8h8v8H8z', fill: 'currentColor', stroke: 'none', opacity: '0.3' });
    expect(body[1][0]).toBe('circle');
    expect(lintSvg(compileScript('circle 12 12 8\nduotone { circle 12 12 8 }').svg)).toEqual([]);
    expect(nodes('repeat 2 { duotone { circle 12 7 2 } }\nline 4 4 8 8')[0][1].d.match(/[Mm]/g).length).toBe(2);
  });

  it('rounds every number to 2 decimals', () => {
    expect(nodes('circle 12.3456 12 4.0049')[0][1]).toEqual({ cx: '12.35', cy: '12', r: '4' });
    const r = compileScript('repeat 7 { line 12 3 12 5.333 }\ngroup rotate 13 { ellipse 12 12 5.555 2.222 }');
    expect(r.ok).toBe(true);
    for (const v of r.body.match(/-?\d*\.\d+/g)) expect(v.split('.')[1].length, v).toBeLessThanOrEqual(2);
    expect(lintSvg(r.svg)).toEqual([]);
  });

  it('reads the metadata directives', () => {
    const r = compileScript('name my-sun\ntags weather, day light\ncategory weather\ncircle 12 12 4');
    expect(r.icon).toEqual({ name: 'my-sun', body: '<circle cx="12" cy="12" r="4"/>', tags: ['weather', 'day', 'light'], categories: ['weather'] });
    expect(r.meta).toEqual({ name: 'my-sun', tags: ['weather', 'day', 'light'], category: 'weather' });
    const plain = compileScript('circle 12 12 4', { name: 'dot-ring' });
    expect(plain.icon.name).toBe('dot-ring');
    expect(plain.icon.categories).toEqual(['shapes']);
    expect(compileScript('circle 12 12 4').icon.name).toBe('glyph');
  });

  it('returns a canonical lint passing SVG', () => {
    const r = compileScript('circle 12 12 4');
    expect(r.ok).toBe(true);
    expect(r.svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n  <circle cx="12" cy="12" r="4"/>\n</svg>\n');
    expect(lintSvg(r.svg)).toEqual([]);
    expect(scriptToSvg('circle 12 12 4')).toBe(r.svg);
  });
});

describe('glyph script errors', () => {
  it('points at the exact line and column', () => {
    expect(at('circel 12 12 4')).toEqual([1, 1, 'unknown command "circel" (did you mean "circle"?)']);
    expect(at('circle 12 12')).toEqual([1, 13, 'circle needs 3 numbers (cx cy r), got 2']);
    expect(at('circle 12 12 4 5')).toEqual([1, 16, 'circle takes 3 numbers (cx cy r), got 4']);
    expect(at('circle 12 12 abc')).toEqual([1, 14, 'expected a number, found "abc"']);
    expect(at('let r = 4\ncircle 12 12 rr')).toEqual([2, 14, 'unknown name "rr" (did you mean "r"?)']);
    expect(at('circle 12 12 4/0')).toEqual([1, 15, 'division by zero']);
    expect(at('circle 12 12 0')).toEqual([1, 14, 'r must be positive, got 0']);
    expect(at('rect 3 3 18 18 raduis 2')).toEqual([1, 16, 'unknown word "raduis" (did you mean "radius"?)']);
    expect(at('rect 3 3 0 4')).toEqual([1, 10, 'the width must be positive, got 0']);
    expect(at('polyline 4 4 8 8 9')).toEqual([1, 18, 'polyline needs x y pairs, got 5 numbers']);
    expect(at('polygon 4 4 8 8')).toEqual([1, 16, 'polygon needs at least 3 points (6 numbers), got 2 points']);
    expect(at('polyline 4 4')).toEqual([1, 13, 'polyline needs at least 2 points (4 numbers), got 1 point']);
    expect(at('path "M4 4 L x"')).toEqual([1, 14, 'path data: expected a number']);
    expect(at('path "M4 4"')).toEqual([1, 6, 'the path draws nothing (it only moves)']);
    expect(at('path 4')).toEqual([1, 6, 'path needs path data in quotes, found "4"']);
    expect(at('repeat 8 {\n  line 12 2 12 4\n')).toEqual([1, 10, 'missing "}" for the block opened at line 1, column 10']);
    expect(at('line 4 4 8 8\n}')).toEqual([2, 1, 'unexpected "}" (no block is open)']);
    expect(at('circle 1 12 4')).toEqual([1, 1, 'shape leaves the 2 to 22 padding box (left -3)']);
    expect(at('')).toEqual([1, 1, 'the script draws nothing']);
    expect(at('# just a comment')).toEqual([1, 1, 'the script draws nothing']);
    expect(at('circle 12 12 4 circle 1 2 3')).toEqual([1, 16, 'circle takes 3 numbers (cx cy r), got 7; put "circle" on a new line']);
    expect(at('repeat 2.5 { circle 12 12 4 }')).toEqual([1, 8, 'repeat needs a whole number from 1 to 72, got 2.5']);
    expect(at('repeat 8')).toEqual([1, 9, 'repeat needs a block, for example: repeat 8 { ... }']);
    expect(at('mirror { line 4 4 8 8 }')).toEqual([1, 7, 'mirror needs an axis: x, y or xy']);
    expect(at('mirror z { line 4 4 8 8 }')).toEqual([1, 8, 'mirror needs an axis: x, y or xy, found "z"']);
    expect(at('group move 2 { circle 12 12 4 }')).toEqual([1, 13, 'move needs 2 numbers (dx dy), got 1']);
    expect(at('group scale -1 { circle 12 12 4 }')).toEqual([1, 13, 'scale must be positive, got -1 (use mirror to flip)']);
    expect(at('arc 12 12 8 from 0')).toEqual([1, 19, 'arc needs a "to" angle, for example: arc 12 12 8 from -90 to 90']);
    expect(at('arc 12 12 8 10 10')).toEqual([1, 18, 'arc needs two different angles']);
    expect(at('circle 12 12 4 {\n}')).toEqual([1, 16, 'circle does not take a block']);
    expect(at('name My Icon\ncircle 12 12 4')).toEqual([1, 6, 'name must be kebab-case (lowercase words joined by "-"), like "my-icon", got "My Icon"']);
    expect(at('circle 12 12 4px')).toEqual([1, 14, 'expected a number, found "4px"']);
    expect(at('path "M4 4')).toEqual([1, 6, 'unterminated string, add the closing "']);
    expect(at('circle (12 12 4')).toEqual([1, 12, 'expected ")" to close the "(" at line 1, column 8, found "12"']);
    expect(at('let 5 = 3')).toEqual([1, 5, 'let needs a name, found "5"']);
    expect(at('circle 12 12 4; line 1 1')).toEqual([1, 25, 'line needs 4 numbers (x1 y1 x2 y2), got 2']);
    expect(at('circle 12 12 @')[0]).toBe(1);
  });

  it('checks the duotone layer', () => {
    expect(at('duotone {\n  line 4 4 8 8\n}\ncircle 12 12 4')).toEqual([2, 3, 'duotone takes closed shapes only (circle, ellipse, rect, polygon or a closed path)']);
    expect(at('duotone { circle 12 12 4 }\nduotone { circle 12 12 3 }\ncircle 12 12 8')).toEqual([2, 1, 'only one duotone block is allowed (the first one is at line 1)']);
    expect(at('duotone { duotone { circle 12 12 4 } }\ncircle 12 12 8')).toEqual([1, 11, 'duotone cannot be nested in another duotone block']);
    expect(at('duotone {\n  circle 12 12 8\n}')).toEqual([1, 1, 'the script has only a duotone layer, add stroke shapes too']);
    expect(compileScript('duotone { path "M4 4h8v8z" }\ncircle 12 12 8').ok).toBe(true);
    expect(at('duotone { path "M4 4h8v8" }\ncircle 12 12 8')[2]).toContain('closed shapes only');
  });

  it('names the copy of a repeat or a mirror that leaves the box', () => {
    expect(at('repeat 4 {\n  circle 12 3 1.5\n}')).toEqual([2, 3, 'shape leaves the 2 to 22 padding box (top 1.5), and in 3 more copies']);
    expect(at('repeat 2 around 8 12 {\n  dot 16 12\n}')).toEqual([2, 3, 'shape leaves the 2 to 22 padding box (left 0) in copy 2 of the repeat at line 1']);
    expect(at('mirror x at 4 {\n  line 4 6 7 6\n}')).toEqual([2, 3, 'shape leaves the 2 to 22 padding box (left 1) in copy 2 of the mirror at line 1']);
  });

  it('names every level of nested copies', () => {
    const e = firstError('mirror x at 4 {\n  repeat 2 around 6 12 {\n    dot 5 12\n  }\n}');
    expect(e).toMatchObject({ line: 3, column: 5, length: 3 });
    expect(e.message).toBe('shape leaves the 2 to 22 padding box (left 1) in copy 2 of the mirror at line 1, copy 2 of the repeat at line 2');
  });

  it('maps lint problems back to the command', () => {
    expect(at('line 4 4 8 8\ncircle 12 12 0.004')).toEqual([2, 1, 'r must be positive']);
    expect(at('line 4 4 8 8\nrect 4 4 0.001 8')).toEqual([2, 1, 'width and height must be positive']);
  });

  it('reads Windows line endings and directives inside one line blocks', () => {
    expect(at('circle 12 12 4\r\ncircle 12 12\r\n')).toEqual([2, 13, 'circle needs 3 numbers (cx cy r), got 2']);
    const r = compileScript('group { name ring }\ncircle 12 12 4');
    expect(r.ok).toBe(true);
    expect(r.icon.name).toBe('ring');
  });

  it('collects several errors with recovery', () => {
    const r = compileScript('circel 1 2 3\ncircle 12 12\nline 1 2 3 4 5\ncircle 12 12 4\nrect 1 2 3');
    expect(r.ok).toBe(false);
    expect(r.errors.map((e) => e.line)).toEqual([1, 2, 3, 5]);
    expect(r.body).toBe('');
    expect(r.svg).toBe('');
    expect(compileScript('repeat 8 { circle 12 12 q }').errors.length).toBe(1);
  });

  it('limits the number of shapes', () => {
    const r = compileScript('repeat 72 {\n  repeat 72 { dot 12 4 }\n}');
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain('more than 2000 shapes');
  });

  it('never throws on odd input', () => {
    for (const src of [null, undefined, 42, '}}}{{{', '{', ')(', '"', '=', 'let', 'let a', 'let a =', 'name', 'tags', '\u0000', 'circle -', 'circle ((((', 'repeat { }', 'group around 1 2 { dot 12 12 }', 'path ""', 'mirror xy at 1 2 3 { dot 12 12 }']) {
      expect(() => compileScript(src), String(src)).not.toThrow();
      expect(compileScript(src).ok, String(src)).toBe(false);
    }
  });

  it('formats an error with the source line and a caret', () => {
    const src = 'circle 12 12 4\n\ncircel 12 12 4';
    const r = compileScript(src);
    expect(formatError(src, r.errors[0], { file: 'sun.gfs' })).toBe('sun.gfs:3:1: unknown command "circel" (did you mean "circle"?)\n  3 | circel 12 12 4\n    | ^^^^^^');
    expect(formatError('circle 12 12', compileScript('circle 12 12').errors[0])).toBe('1:13: circle needs 3 numbers (cx cy r), got 2\n  1 | circle 12 12\n    |             ^');
    const warn = compileScript('rect 3 3 10 10 radius 8').warnings[0];
    expect(formatError('rect 3 3 10 10 radius 8', warn)).toMatch(/^1:23: warning: radius 8 is larger than half the shorter side, using 5\n/);
    expect(formatError('\tcircle 1 2', { line: 1, column: 9, length: 1, message: 'x' }).split('\n')[2]).toBe('    | \t       ^');
  });

  it('throws a GlyphScriptError from scriptToSvg', () => {
    try {
      scriptToSvg('circle 12 12\n');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(GlyphScriptError);
      expect(err).toBeInstanceOf(Error);
      expect([err.line, err.column, err.length]).toEqual([1, 13, 1]);
      expect(err.message).toBe('circle needs 3 numbers (cx cy r), got 2');
    }
  });
});

describe('glyph script examples', () => {
  it('has at least six examples that compile lint clean', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length);
    for (const ex of EXAMPLES) {
      const r = compileScript(ex.source);
      expect(r.errors, ex.id).toEqual([]);
      expect(r.warnings, ex.id).toEqual([]);
      expect(lintSvg(r.svg), ex.id).toEqual([]);
      expect(r.icon.name, ex.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(ex.title, ex.id).toBeTruthy();
    }
  });

  it('shows every feature across the examples', () => {
    const all = EXAMPLES.map((e) => e.source).join('\n');
    for (const w of ['repeat', 'mirror', 'group', 'arc', 'path', 'dot', 'duotone', 'radius', 'let', 'ellipse', 'polyline']) expect(all, w).toMatch(new RegExp(`\\b${w}\\b`));
  });
});
