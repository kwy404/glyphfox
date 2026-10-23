import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { IconData, IconProps } from 'glyphfox';

/** Configuration for glyphfox in an Angular app. */
export interface GlyphFoxConfig {
  /** Icons available by name: a record such as { file: iconFile } or an array of icon data. */
  icons?: Record<string, IconData> | IconData[];
  /** Default props for every <gf-icon>. */
  defaults?: Partial<IconProps>;
}

/** Multi token holding every provided configuration. */
export const GLYPHFOX_CONFIG = new InjectionToken<GlyphFoxConfig[]>('GLYPHFOX_CONFIG');

/**
 * Registers icons (and optional defaults) for <gf-icon>. Pass only the icons
 * you use to keep the bundle small:
 *
 *   import { iconFile, iconCloud } from 'glyphfox';
 *   bootstrapApplication(App, { providers: [provideGlyphFox({ icons: [iconFile, iconCloud] })] });
 */
export function provideGlyphFox(config: GlyphFoxConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: GLYPHFOX_CONFIG, useValue: config, multi: true }]);
}

/** Shorthand for provideGlyphFox({ icons }). */
export function provideGlyphFoxIcons(icons: Record<string, IconData> | IconData[]): EnvironmentProviders {
  return provideGlyphFox({ icons });
}
