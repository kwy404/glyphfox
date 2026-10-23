import type { Accessor, Component, JSX } from 'solid-js';
import type { IconData, IconProps, IconSpec, Layout, Variant } from '../index.js';

/** The shared glyphfox props plus every SVG attribute (class, style, ref, onClick...). */
export type GlyphProps = IconProps & Omit<JSX.SvgSVGAttributes<SVGSVGElement>, keyof IconProps>;
export type GlyphComponent = Component<GlyphProps>;

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

export declare function createIcon(icon: IconData): GlyphComponent;
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
export declare const Icon: Component<IconComponentProps>;
export declare const Fusion: Component<FusionProps>;
export declare const MorphIcon: Component<MorphIconProps>;
/** Accessor of icon data that morphs into the new icon whenever the spec accessor changes. */
export declare function useMorph(spec: Accessor<IconSpec | IconData | null | undefined> | IconSpec | IconData, options?: MorphOptions): Accessor<{ icon: IconData; variant?: Variant } | null>;

/*COMPONENTS*/
