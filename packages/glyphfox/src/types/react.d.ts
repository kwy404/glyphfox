import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';
import type { IconData, IconProps, IconSpec, Layout, Variant } from '../index.js';

/** The shared glyphfox props plus every SVG attribute (className, style, onClick...). */
export type GlyphProps = IconProps & Omit<SVGProps<SVGSVGElement>, keyof IconProps | 'ref'>;
export type GlyphIconComponent = ForwardRefExoticComponent<GlyphProps & RefAttributes<SVGSVGElement>>;

export interface IconComponentProps extends GlyphProps {
  /** Icon data to render. */
  icon?: IconData;
  /** Any spec: "file", "file+check@tr", "cloud&lock:side", "heart/solid". */
  name?: IconSpec;
  /** Knockout gap for modifiers and fusions. */
  gap?: number;
}

export interface FusionProps extends GlyphProps {
  /** 2 to 10 icons (names, specs or icon data). */
  icons: Array<IconSpec | IconData>;
  layout?: Layout;
  gap?: number;
  scale?: number | number[];
  offsets?: Array<[number, number]>;
}

export interface MorphIconProps extends GlyphProps {
  icon?: IconData;
  name?: IconSpec;
}

export interface MorphOptions {
  duration?: number;
  delay?: number;
  weight?: number;
  size?: number | string;
  gap?: number;
}

export declare function createIcon(icon: IconData): GlyphIconComponent;
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
export declare const Icon: ForwardRefExoticComponent<IconComponentProps & RefAttributes<SVGSVGElement>>;
export declare const Fusion: ForwardRefExoticComponent<FusionProps & RefAttributes<SVGSVGElement>>;
export declare const MorphIcon: ForwardRefExoticComponent<MorphIconProps & RefAttributes<SVGSVGElement>>;
/** Icon data that morphs into the new icon whenever `spec` changes. */
export declare function useMorph(spec: IconSpec | IconData | null | undefined, options?: MorphOptions): { icon: IconData; variant?: Variant } | null;

/*COMPONENTS*/
