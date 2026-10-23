import type { Component } from 'svelte';
import type { IconData, IconProps, IconSpec, Layout, Variant } from '../index.js';

/** The shared glyphfox props plus any SVG attribute (class, style, onclick...). */
export type GlyphProps = IconProps & { class?: string; style?: string; [attribute: string]: unknown };

export declare const Icon: Component<GlyphProps & { icon?: IconData; name?: IconSpec; gap?: number }>;
export declare const Fusion: Component<GlyphProps & { icons: Array<IconSpec | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> }>;
export declare const MorphIcon: Component<GlyphProps & { icon?: IconData; name?: IconSpec }>;
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
/** A store that morphs whenever set(spec) is called; read $store.icon. */
export declare function morphStore(
  initial?: IconSpec | IconData | null,
  options?: { duration?: number; delay?: number; weight?: number; size?: number | string },
): { set(spec: IconSpec | IconData): void; subscribe(run: (value: { icon: IconData; variant?: Variant } | null) => void): () => void };

// smart icons hook (src/smart): SmartIcon, StatusIcon and IconGroup.
export * from '../smart/svelte/index.js';

/*COMPONENTS*/
