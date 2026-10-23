// glyphfox/script: glyph script, a tiny text language that draws icons on
// the 24 grid. compileScript turns it into an icon body that passes the
// icon lint, with errors that point at the line and column.

export { tokenize, parseScript, GlyphScriptError, SCRIPT_COMMANDS, COMMANDS as SCRIPT_SHAPES } from './parser.js';
export { compileScript, scriptToSvg, formatError, transformSimilar } from './compiler.js';
export { EXAMPLES } from './examples.js';
