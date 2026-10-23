// Types of glyphfox/script: glyph script, a tiny text language that draws
// icons on the 24 grid and compiles them into SVG that passes the icon lint.

/** Icon data: the shape of every icon object of glyphfox. */
export interface IconData {
  name: string;
  body: string;
  tags: string[];
  categories: string[];
  solid?: unknown;
}

/** An error or a warning with its place in the source (1 based). */
export interface ScriptDiagnostic {
  message: string;
  line: number;
  column: number;
  /** Characters to underline. */
  length: number;
  severity: 'error' | 'warning';
}

/** Metadata from the name, tags and category directives. */
export interface ScriptMeta {
  name?: string;
  tags?: string[];
  category?: string;
  [key: string]: unknown;
}

export interface CompileResult {
  /** True when there are no errors: svg then passes the icon lint. */
  ok: boolean;
  /** The markup inside <svg>. */
  body: string;
  /** The canonical SVG file text. */
  svg: string;
  /** Icon data, ready for toSvg, fuse and every exporter. */
  icon: IconData;
  meta: ScriptMeta;
  errors: ScriptDiagnostic[];
  warnings: ScriptDiagnostic[];
}

/** Compiles a glyph script. Never throws: problems come back in errors. */
export declare function compileScript(source: string, options?: { name?: string }): CompileResult;

/** Compiles a glyph script to a lint passing SVG, or throws the first error as a GlyphScriptError. */
export declare function scriptToSvg(source: string, options?: { name?: string }): string;

/** A diagnostic as text: file:line:column, the message and the source line with a caret. */
export declare function formatError(source: string, error: ScriptDiagnostic, options?: { file?: string }): string;

/** An error with a source position. */
export declare class GlyphScriptError extends Error {
  constructor(message: string, line?: number, column?: number, length?: number);
  line: number;
  column: number;
  length: number;
}

/** A token with its place in the source. */
export interface ScriptToken {
  type: string;
  value: unknown;
  text: string;
  line: number;
  column: number;
  offset: number;
  length: number;
}

/** Splits source text into tokens. */
export declare function tokenize(source: string): { tokens: ScriptToken[]; errors: ScriptDiagnostic[] };

/** Parses source text into statements. */
export declare function parseScript(source: string): { statements: unknown[]; errors: ScriptDiagnostic[] };

/** Every command and keyword (for highlighting and suggestions). */
export declare const SCRIPT_COMMANDS: string[];

/** The commands with their positional arguments and keywords. */
export declare const SCRIPT_SHAPES: Record<string, { args?: string[]; keywords?: string[]; points?: number; string?: boolean; block?: boolean }>;

/** Applies a similarity matrix [a, b, c, d, e, f] to absolute path segments, keeping arcs exact. */
export declare function transformSimilar(segs: Array<Array<string | number>>, matrix: [number, number, number, number, number, number]): Array<Array<string | number>>;

/** Playground examples, each one an original drawing that passes the icon lint. */
export declare const EXAMPLES: Array<{ id: string; title: string; source: string }>;
