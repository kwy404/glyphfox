import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react';
import type { IconData, IconProps, IconSpec, Layout, Variant } from '../index.js';

/** The shared glyphfox props plus any react-native-svg Svg prop (style, onPress, testID...). */
export type GlyphProps = IconProps & {
  style?: unknown;
  children?: ReactNode;
  onPress?: (event: unknown) => void;
  onPressIn?: (event: unknown) => void;
  onPressOut?: (event: unknown) => void;
  testID?: string;
  accessibilityLabel?: string;
  [prop: string]: unknown;
};
export type GlyphIconComponent = ForwardRefExoticComponent<GlyphProps & RefAttributes<unknown>>;

export interface MorphOptions {
  duration?: number;
  delay?: number;
  weight?: number;
  size?: number | string;
  gap?: number;
}

export declare function createIcon(icon: IconData): GlyphIconComponent;
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
export declare const Icon: ForwardRefExoticComponent<GlyphProps & { icon?: IconData; name?: IconSpec; gap?: number } & RefAttributes<unknown>>;
export declare const Fusion: ForwardRefExoticComponent<GlyphProps & { icons: Array<IconSpec | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> } & RefAttributes<unknown>>;
export declare const MorphIcon: ForwardRefExoticComponent<GlyphProps & { icon?: IconData; name?: IconSpec } & RefAttributes<unknown>>;
/** Icon data that morphs into the new icon whenever `spec` changes. */
export declare function useMorph(spec: IconSpec | IconData | null | undefined, options?: MorphOptions): { icon: IconData; variant?: Variant } | null;

/*COMPONENTS*/
