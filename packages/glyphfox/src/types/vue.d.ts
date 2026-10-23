import type { ComputedRef, DefineComponent, Ref } from 'vue';
import type { IconData, IconProps, IconSpec, Layout, Variant } from '../index.js';

/**
 * The shared props for Vue. Icon specs are plain strings here: Vue's prop
 * inference cannot expand the full icon name union.
 */
export type VueIconProps = Omit<IconProps, 'morphTo'> & { morphTo?: string | IconData | null };
export type GlyphComponent = DefineComponent<VueIconProps>;

export declare const glyphProps: Record<keyof IconProps, unknown>;
export declare function createIcon(icon: IconData): GlyphComponent;
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
export declare const Icon: DefineComponent<VueIconProps & { icon?: IconData; name?: string; gap?: number }>;
export declare const Fusion: DefineComponent<VueIconProps & { icons: Array<string | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> }>;
export declare const MorphIcon: DefineComponent<VueIconProps & { icon?: IconData; name?: string }>;
/** Computed icon data that morphs whenever the spec (a ref, a getter or a value) changes. */
export declare function useMorph(
  spec: Ref<IconSpec | IconData | null | undefined> | (() => IconSpec | IconData | null | undefined) | IconSpec | IconData,
  options?: { duration?: number; delay?: number; weight?: number; size?: number | string },
): ComputedRef<{ icon: IconData; variant?: Variant } | null>;

// smart icons hook (src/smart): SmartIcon, StatusIcon and IconGroup.
export * from '../smart/vue.js';

/*COMPONENTS*/
