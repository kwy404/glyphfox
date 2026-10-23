import type { LitElement } from 'lit';
import type { AnimationName, Corners, IconData, IconProps, IconSpec, Layout, ModifierCorner, ModifierName, Trigger, Variant } from '../index.js';

/** Base class of every glyphfox Lit element; each shared prop is a reactive property (attribute in kebab-case). */
export declare class GlyphElement extends LitElement {
  /** Tag used by defineIcons: gf-NAME, gf-glyph, gf-fusion or gf-morph. */
  static tagName: string;
  /** Icon data drawn by the class (set for the icon classes). */
  static icon?: IconData;
  size?: number | string;
  color?: string;
  secondaryColor?: string;
  secondaryOpacity?: number;
  weight?: number;
  absoluteWeight?: boolean;
  corners?: Corners;
  variant?: Variant;
  rotate?: number;
  flipX?: boolean;
  flipY?: boolean;
  mirrorRtl?: boolean;
  /** The animate attribute (animate is a method of every element, so the property is named animation). */
  animation?: AnimationName;
  trigger?: Trigger;
  active?: boolean;
  duration?: number;
  delay?: number;
  loop?: boolean | number;
  modifier?: ModifierName;
  modifierCorner?: ModifierCorner;
  morphTo?: IconSpec | IconData | null;
  decorative?: boolean;
  /** Any spec: "file", "file+check@tr", "cloud&lock:side", "heart/solid". */
  name?: IconSpec;
  /** Icon data to render (property only). */
  icon?: IconData;
  /** Knockout gap for modifiers and fusions. */
  gap?: number;
  /** The shared props currently set on the element. */
  glyphProps(): IconProps;
}

export type GlyphElementClass = typeof GlyphElement;

/** <gf-glyph name="file+check@tr">: any spec. */
export declare class Icon extends GlyphElement {}
/** <gf-fusion icons="cloud,lock" layout="overlap">: 2 to 10 icons fused into one. */
export declare class Fusion extends GlyphElement {
  icons?: Array<IconSpec | IconData> | string;
  layout?: Layout;
  scale?: number | number[];
  offsets?: Array<[number, number]>;
}
/** <gf-morph name="menu">: morphs whenever the name changes. */
export declare class MorphIcon extends GlyphElement {}

export declare function createIcon(icon: IconData): GlyphElementClass;
export declare function registerIcons(icons: IconData[] | Record<string, IconData>): void;
/** Defines custom elements for the classes (gf-NAME, or PREFIX-NAME with { prefix }). */
export declare function defineIcons(list: GlyphElementClass | GlyphElementClass[], options?: { prefix?: string }): void;

declare global {
  interface HTMLElementTagNameMap {
    'gf-glyph': Icon;
    'gf-fusion': Fusion;
    'gf-morph': MorphIcon;
  }
}

/*COMPONENTS*/
