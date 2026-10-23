import type { FunctionComponent, JSX, Ref } from 'preact';
import type { IconData, IconProps, IconSpec, Layout, Variant } from '../index.js';

/** The shared glyphfox props plus every SVG attribute (class, style, onClick...). */
export type GlyphProps = IconProps & Omit<JSX.IntrinsicElements['svg'], keyof IconProps | 'ref'> & { ref?: Ref<SVGSVGElement> };
export type GlyphIconComponent = FunctionComponent<GlyphProps>;

export interface IconComponentProps extends GlyphProps {
  /** Icon data to render. */
  icon?: IconData;
  /** Any spec: "file", "file+check@tr", "cloud&lock:side", "heart/solid". */
  name?: IconSpec;
  /** Knockout gap for modifiers and fusions. */
  gap?: number;
}

export interface FusionProps extends Omit<GlyphProps, 'scale'> {
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
export declare const Icon: FunctionComponent<IconComponentProps>;
export declare const Fusion: FunctionComponent<FusionProps>;
export declare const MorphIcon: FunctionComponent<MorphIconProps>;
/** Icon data that morphs into the new icon whenever `spec` changes. */
export declare function useMorph(spec: IconSpec | IconData | null | undefined, options?: MorphOptions): { icon: IconData; variant?: Variant } | null;

/*COMPONENTS*/
