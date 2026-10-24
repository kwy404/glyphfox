// glyphfox/core: the rendering engine without icon data.
import type { AnimationName, AnimationTimeline, FuseOptions, IconData, IconNode, IconSource, IconProps, IconSpec, Layout, ModifierCorner, ModifierName, Morph, SvgOptions, Trigger, Variant } from '../index.js';

// smart icons hook (src/smart)
export * from '../smart/index.js';

export declare const PROPS: Array<keyof IconProps>;
export declare const DEFAULTS: Readonly<Partial<IconProps>>;
export declare const VARIANTS: Variant[];
export declare const CORNER_STYLES: Array<'round' | 'sharp'>;
export declare const MODIFIERS: Record<ModifierName, IconNode[]>;
export declare const MODIFIER_NAMES: ModifierName[];
export declare const LAYOUTS: Layout[];
export declare const CORNERS: Array<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'>;
export declare const ANIMATION_NAMES: AnimationName[];
export declare const TRIGGERS: Trigger[];
export declare const ATTRIBUTES: Record<keyof IconProps, string>;
export declare const MORPH_PAIRS: Array<[string, string]>;

export declare function renderIcon(icon: IconData, props?: SvgOptions & { run?: string | null; frame?: number; class?: string }): IconNode;
export declare function renderToString(icon: IconData, props?: SvgOptions): string;
export declare function strokeWidth(props?: Pick<IconProps, 'size' | 'weight' | 'absoluteWeight'>): number;
export declare function sizeToPx(size: number | string | undefined): number | null;
export declare function bool(value: unknown): boolean;
export declare function normalizeCorner(corner?: string): 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
export declare function withModifier(icon: IconData, modifier: ModifierName, corner?: ModifierCorner, options?: { weight?: number; gap?: number }): IconData;
export declare function fuse(icons: IconData[], options?: FuseOptions): IconData;
export declare function createMorph(from: IconData, to: IconData, options?: { fromVariant?: Variant; toVariant?: Variant }): Morph;
export declare function parseSpec(spec: string): { names: string[]; layout?: Layout; modifier?: ModifierName; corner?: string; variant?: Variant };
export declare function isComposite(spec: unknown): boolean;
export declare function resolveSpec(spec: IconSpec | IconData, lookup: (name: string) => IconData | null, options?: { weight?: number; gap?: number }): { icon: IconData; variant?: Variant };
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
export declare function lookupIcon(name: string): IconData | null;
/** The collections shipped with the package and their grids. */
export declare const COLLECTIONS: Readonly<{ display: 48; isometric: 24 }>;
/** Drawing grid of an icon: 24, or its grid. */
export declare function gridOfIcon(icon: IconData): number;
export declare function loadIcon(name: string): Promise<IconData | null>;
export declare function setIconLoader(loader: (name: string) => Promise<IconData | null>): void;
export declare function registerIconSource(prefix: string, source: IconSource | null): void;
export declare function hasIconSource(prefix: string): boolean;
export declare function splitProps<T extends Record<string, unknown>>(props: T): { glyph: IconProps; rest: Record<string, unknown> };
export declare function reducedMotion(): boolean;
export declare function tween(from: number, to: number, options: { duration?: number; delay?: number }, onFrame: (value: number) => void): () => void;
export declare function morphGoal(trigger: Trigger, state: { active?: boolean; hovered?: boolean; toggled?: boolean; mounted?: boolean }): 0 | 1;
export declare function morphFrame(base: IconData, target: IconData | null | undefined, progress: number, options?: { variant?: Variant; targetVariant?: Variant }): { icon: IconData; variant?: Variant };
export declare function propsFromAttributes(get: (name: string) => string | null, prefix?: string): IconProps;
export declare function nodesToString(node: IconNode | IconNode[]): string;
export declare function parseBody(body: string): IconNode[];
export declare function animationCss(spec: { animate: AnimationName; trigger?: Trigger; duration?: number; delay?: number; loop?: boolean | number; count?: number }): { className: string; css: string } | null;
export declare function frameState(spec: { animate: AnimationName; duration?: number; delay?: number; loop?: boolean | number; count?: number }, t: number): unknown;
export declare function componentName(name: string): string;
export declare function snippet(format: string, spec: string, props?: IconProps, options?: { svg?: string; version?: string }): string;
export declare function toDataUri(svg: string): string;
export declare function analyzeSolid(nodes: IconNode[]): { fill: number[]; knock: number[] } | null;

/** A timeline normalized into tracks of keyframes per element. */
export interface NormalizedTimeline {
  name: string;
  duration: number;
  easing: string;
  loop: boolean | number;
  origin: [number, number];
  tracks: Array<{ element: string; keyframes: Array<Record<string, unknown> & { offset: number }> }>;
}
/** Plays the animations of a rendered icon for the triggers that need a script (inView, and hover, focus and press with a smooth reverse). Returns a function that detaches it. */
export declare function attachTriggers(svg: Element, props?: IconProps, icon?: IconData | null): () => void;
/** Validates a designed animation (object or JSON). Null when it has no usable frame. */
export declare function normalizeTimeline(timeline: AnimationTimeline | string): NormalizedTimeline | null;
/** State of every track at a time in ms, for frame export. */
export declare function sampleTimeline(timeline: NormalizedTimeline, t: number, options?: { duration?: number; delay?: number; loop?: boolean | number }): Array<{ element: string; transform?: string; opacity?: number; strokeDashoffset?: number; d?: string }>;
/** Scoped CSS that plays a timeline with a trigger. */
export declare function timelineCss(timeline: NormalizedTimeline, options?: { trigger?: Trigger; triggerParent?: boolean; duration?: number; delay?: number; loop?: boolean | number }): { className: string; css: string };
