import type { ClassList, CSSProperties, FunctionComponent } from '@qwik.dev/core';
import type { IconData, IconProps, IconSpec, Layout } from '../index.js';

/** The shared glyphfox props plus any SVG attribute (class, style, id, onClick$...). */
export type GlyphProps = IconProps & {
  class?: ClassList;
  style?: CSSProperties | string;
  [attribute: string]: unknown;
};
export type GlyphComponent = FunctionComponent<GlyphProps>;

export declare function createIcon(icon: IconData): GlyphComponent;
/** Registers icon data so `name`, `morphTo` and Fusion can use it (icon components register themselves). */
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
export declare const Icon: FunctionComponent<GlyphProps & { icon?: IconData; name?: IconSpec; gap?: number }>;
export declare const Fusion: FunctionComponent<GlyphProps & { icons: Array<IconSpec | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> }>;

/*COMPONENTS*/
