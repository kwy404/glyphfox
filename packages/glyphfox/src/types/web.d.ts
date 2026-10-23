/** The <glyph-fox> element. Attributes: name, layout, gap, morph and every shared prop in kebab-case. */
export declare class GlyphFoxElement extends HTMLElement {
  static readonly observedAttributes: string[];
}
/** Defines the element (default tag glyph-fox) and returns its class. */
export declare function defineGlyphFox(tag?: string): typeof GlyphFoxElement | null;

declare global {
  interface HTMLElementTagNameMap {
    'glyph-fox': GlyphFoxElement;
  }
}
