import type { IconData, IconProps, IconSpec, Layout } from '../index.js';

/** Named arguments: the shared glyphfox props plus class, style and any SVG attribute. */
export type GlyphArgs = IconProps & {
  class?: string;
  style?: string | Record<string, string | number>;
  [attribute: string]: unknown;
};

/** Trusted markup returned by the helpers (Glimmer renders it like htmlSafe). */
export declare class GlyphMarkup {
  constructor(html: string);
  readonly html: string;
  toHTML(): string;
  toString(): string;
}

/** A helper for one icon: {{FileIcon size=20}}. */
export type GlyphHelper = (named?: GlyphArgs) => GlyphMarkup;

export declare function createIcon(icon: IconData): GlyphHelper;
/** Registers icon data so specs, morphTo and Fusion can use it (icon helpers register themselves). */
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
/** {{Glyph "file+check@tr" variant="duotone"}} */
export declare function Glyph(spec: IconSpec | IconData, named?: GlyphArgs & { gap?: number }): GlyphMarkup;
export declare function Glyph(named: GlyphArgs & { name?: IconSpec; icon?: IconData; gap?: number }): GlyphMarkup;
/** {{Fusion "cloud" "lock" layout="overlap"}} */
export declare function Fusion(...args: Array<IconSpec | IconData | (GlyphArgs & { icons?: Array<IconSpec | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> })>): GlyphMarkup;

/*COMPONENTS*/
