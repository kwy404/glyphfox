import type { ComputedRef, DefineComponent, Ref } from 'vue';
import type { IconData, IconProps, IconSpec, Layout, Variant } from '../index.js';

export type GlyphComponent = DefineComponent<IconProps>;

export declare const glyphProps: Record<keyof IconProps, unknown>;
export declare function createIcon(icon: IconData): GlyphComponent;
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
export declare const Icon: DefineComponent<IconProps & { icon?: IconData; name?: IconSpec; gap?: number }>;
export declare const Fusion: DefineComponent<IconProps & { icons: Array<IconSpec | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> }>;
export declare const MorphIcon: DefineComponent<IconProps & { icon?: IconData; name?: IconSpec }>;
/** Computed icon data that morphs whenever the spec (a ref, a getter or a value) changes. */
export declare function useMorph(
  spec: Ref<IconSpec | IconData | null | undefined> | (() => IconSpec | IconData | null | undefined) | IconSpec | IconData,
  options?: { duration?: number; delay?: number; weight?: number; size?: number | string },
): ComputedRef<{ icon: IconData; variant?: Variant } | null>;

/*COMPONENTS*/
