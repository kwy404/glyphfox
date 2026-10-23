import type { IconData, IconProps, IconSpec, Layout } from '../index.js';

/** The shared glyphfox props plus any SVG attribute (class, style, id, aria-*, data-*). */
export type GlyphProps = IconProps & {
  class?: string;
  style?: string | Record<string, string | number>;
  [attribute: string]: unknown;
};
/** An Astro component taking Props. */
export type AstroComponent<Props> = (props: Props) => any;

/** Any spec: <Icon name="file+check@tr" />. Every icon of the set is available on the server. */
export declare const Icon: AstroComponent<GlyphProps & { icon?: IconData; name?: IconSpec; gap?: number }>;
/** <Fusion icons={['cloud', 'lock']} layout="overlap" />. */
export declare const Fusion: AstroComponent<GlyphProps & { icons: Array<IconSpec | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> }>;

/*COMPONENTS*/
