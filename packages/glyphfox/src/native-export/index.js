// Native exports: the glyphfox icons as Android VectorDrawable XML, Jetpack
// Compose ImageVector code, an iOS asset catalog, SwiftUI helpers and Flutter
// assets with a Dart constants file. Every function returns a map of
// relative file paths to contents; the CLI (`glyphfox export`) writes them.

import { androidFiles } from './android.js';
import { composeFiles } from './compose.js';
import { iosFiles, swiftuiFiles } from './apple.js';
import { flutterFiles } from './flutter.js';
import { baseName, iconGeometry } from './shared.js';

export const NATIVE_TARGETS = ['android', 'compose', 'ios', 'swiftui', 'flutter'];

const BUILDERS = { android: androidFiles, compose: composeFiles, ios: iosFiles, swiftui: swiftuiFiles, flutter: flutterFiles };

/**
 * Exports icon specs for a native target.
 * Options: the shared props (size, color, secondaryColor, secondaryOpacity,
 * weight, absoluteWeight, corners, variant, rotate, flipX, flipY, mirrorRtl,
 * modifier, modifierCorner) plus prefix (android, ios), package (compose),
 * rendering (ios, swiftui), catalog (ios, swiftui) and assets (flutter).
 * Returns { target, count, files: { path: text }, notes }.
 */
export function exportNative(target, specs, options = {}) {
  const build = Object.prototype.hasOwnProperty.call(BUILDERS, target) ? BUILDERS[target] : null;
  if (!build) throw new RangeError(`unknown export target "${target}" (use ${NATIVE_TARGETS.join(', ')})`);
  const list = [...new Set((Array.isArray(specs) ? specs : [specs]).map((s) => String(s).trim()).filter(Boolean))];
  if (!list.length) throw new Error('no icons to export');
  const items = list.map((spec) => ({ spec, base: baseName(spec), geometry: iconGeometry(spec, options) }));
  const notes = [];
  if (options.animate || options.morphTo) notes.push('animations and morphs stay on the web; native exports are static');
  const files = build(items, options, notes);
  return { target, count: items.length, files, notes };
}

export { iconGeometry, baseName, pathData, svgDocument } from './shared.js';
export { vectorDrawable, androidResourceName, isColorReference, ANDROID_TINT } from './android.js';
export { imageVectorFile, glyphFoxObject, kotlinName, pathCalls } from './compose.js';
export { swiftFile, swiftCase, xcodeJson } from './apple.js';
export { dartFile, dartName } from './flutter.js';
