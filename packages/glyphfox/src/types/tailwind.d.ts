export interface GlyphfoxTailwindOptions {
  /** Class prefix. Default "gf". */
  prefix?: string;
  /** Icon box size. Default 1em, so text-* utilities size the icon. */
  size?: string;
  /** Default axes for every icon class. */
  variant?: 'outline' | 'duotone' | 'solid';
  corners?: 'round' | 'sharp';
  weight?: number;
  /** Extra specs to expose as classes, such as "cloud&lock" or "file+check@tr". */
  combos?: string[] | string;
}

interface TailwindPlugin {
  handler: (api: unknown) => void;
  config: Record<string, unknown>;
}

interface GlyphfoxPlugin {
  (options?: GlyphfoxTailwindOptions): TailwindPlugin;
  __isOptionsFunction: true;
}

declare const glyphfox: GlyphfoxPlugin;
export default glyphfox;
export { glyphfox };
export declare function parseAxes(modifier?: string, defaults?: { variant?: string; corners?: string; weight?: number }): { variant?: string; corners?: string; weight?: number };
export declare function maskUrl(spec: string, axes?: { variant?: string; corners?: string; weight?: number }): string;
