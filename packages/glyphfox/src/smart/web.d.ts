/** <glyph-fox-smart kind="battery" value="0.4">: data icons and locale aware icons. */
export declare class GlyphFoxSmartElement extends HTMLElement {
  static readonly observedAttributes: string[];
}
/** <glyph-fox-status state="loading">: morphs on every state change. */
export declare class GlyphFoxStatusElement extends HTMLElement {
  static readonly observedAttributes: string[];
}
/** <glyph-fox-group animate="pop" stagger="80" trigger="hover">: staggers a preset across its children. */
export declare class GlyphFoxGroupElement extends HTMLElement {
  static readonly observedAttributes: string[];
}
export declare const SMART_ATTRIBUTES: Record<string, string>;
export declare function smartPropsFromAttributes(get: (name: string) => string | null): Record<string, unknown>;
/** Defines glyph-fox-smart, glyph-fox-status and glyph-fox-group (or your own tags). */
export declare function defineSmartElements(tags?: { smart?: string; status?: string; group?: string }): {
  smart: typeof GlyphFoxSmartElement;
  status: typeof GlyphFoxStatusElement;
  group: typeof GlyphFoxGroupElement;
} | null;

declare global {
  interface HTMLElementTagNameMap {
    'glyph-fox-smart': GlyphFoxSmartElement;
    'glyph-fox-status': GlyphFoxStatusElement;
    'glyph-fox-group': GlyphFoxGroupElement;
  }
}
