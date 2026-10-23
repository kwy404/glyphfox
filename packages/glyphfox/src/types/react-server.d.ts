import type { ReactElement, SVGProps } from 'react';
import type { IconData, IconProps, IconSpec, Layout } from '../index.js';

/** The shared glyphfox props plus every SVG attribute (className, style...). Event handlers need the client components. */
export type ServerGlyphProps = IconProps & Omit<SVGProps<SVGSVGElement>, keyof IconProps | 'ref'>;

/** Server component for icon data (`icon`) or any spec (`name`): every icon of the set is available. */
export declare function Icon(props: ServerGlyphProps & { icon?: IconData; name?: IconSpec; gap?: number }): ReactElement;
/** Server component that fuses 2 to 10 icons. */
export declare function Fusion(props: Omit<ServerGlyphProps, 'scale'> & { icons: Array<IconSpec | IconData>; layout?: Layout; gap?: number; scale?: number | number[]; offsets?: Array<[number, number]> }): ReactElement;
