// Types of glyphfox/export: rasters and PNG, the animated favicon, CSS
// cursors, plotter output, STL and the usage scanner with subset builders.

/** Icon data: the shape of every icon object of glyphfox (and of a compiled glyph script). */
export interface IconData {
  name: string;
  body: string;
  tags: string[];
  categories: string[];
  solid?: unknown;
}

/** RGBA pixels, 4 bytes per pixel, rows from the top. */
export interface RasterImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Compressor used by the PNG writer: bytes in, a zlib stream out (for example deflateSync from node:zlib). */
export type Deflate = (bytes: Uint8Array) => Uint8Array;

export interface RasterOptions {
  /** Pixels (default 32). */
  size?: number;
  /** Hex, rgb() or a few names (default '#000000'). */
  color?: string;
  /** Weight axis, stroke width on the 24 grid (default 2). */
  weight?: number;
  absoluteWeight?: boolean;
  variant?: 'outline' | 'duotone' | 'solid';
  secondaryColor?: string;
  secondaryOpacity?: number;
  /** Square background color (default none). */
  background?: string | null;
  /** Corner radius of the background in pixels. */
  radius?: number;
  /** Halo color drawn under the icon, used for cursors. */
  outline?: string | null;
  /** Pixels added around strokes and fills by the halo (default 1.5). */
  outlineWidth?: number;
}

/** Parses a CSS color into [r, g, b, a] (0 to 255). */
export declare function parseColor(css: string): [number, number, number, number];
/** Rasterizes an icon with anti aliasing, without a canvas (Node and browsers). */
export declare function rasterize(icon: IconData, options?: RasterOptions): RasterImage;
/** Encodes RGBA pixels as a PNG file. Without `deflate` the data is stored uncompressed. */
export declare function encodePng(image: RasterImage, options?: { deflate?: Deflate }): Uint8Array;
/** rasterize plus encodePng. */
export declare function toPng(icon: IconData, options?: RasterOptions & { deflate?: Deflate }): Uint8Array;
/** Base64 data URI for bytes or a string. */
export declare function dataUri(bytes: Uint8Array | ArrayBuffer | string, type?: string): string;

export type FaviconAnimation = 'pulse' | 'spin' | 'draw' | 'pop' | 'wiggle' | 'bounce' | 'shake' | 'morph';
export declare const FAVICON_ANIMATIONS: FaviconAnimation[];

export interface FaviconOptions {
  /** Living state or 'morph' (default 'pulse'). */
  animate?: FaviconAnimation;
  /** Target icon of the morph animation. */
  morphTo?: IconData;
  /** Frames in one loop (default 24). */
  frames?: number;
  /** Animation length in ms (default: the preset's). */
  duration?: number;
  /** Icon color (default '#ff7a1a'). */
  color?: string;
  /** Rounded square under the icon (default none). */
  background?: string | null;
  /** Corner radius of the background in pixels at 32 px (default 7). */
  radius?: number;
  weight?: number;
  variant?: 'outline' | 'duotone' | 'solid';
}

export interface FaviconPlayer {
  start(): void;
  /** Stops and restores the static icon. */
  stop(): void;
  readonly playing: boolean;
  /** Resolves once every frame is rasterized. */
  ready: Promise<unknown>;
}

export interface FaviconRuntimeOptions {
  fps?: number;
  size?: number;
  loop?: boolean;
  /** Default: the prefers-reduced-motion media query. */
  reducedMotion?: boolean;
  autostart?: boolean;
  document?: unknown;
  Image?: unknown;
}

/** Standalone SVG strings, one per frame of one loop. */
export declare function faviconFrames(icon: IconData, options?: FaviconOptions): string[];
/** The static favicon (the fallback). */
export declare function faviconSvg(icon: IconData, options?: Pick<FaviconOptions, 'color' | 'background' | 'radius' | 'weight' | 'variant'>): string;
/** Plays frames (SVG strings or image URLs) on the tab icon through a canvas. */
export declare function animateFavicon(frames: string[], options?: FaviconRuntimeOptions): FaviconPlayer;
/** Source of a standalone ES module with the frames, exporting animateFavicon() and stopFavicon(). */
export declare function faviconRuntime(frames: string[], options?: { fps?: number; size?: number; loop?: boolean; autostart?: boolean }): string;
/** Files of the favicon kit. */
export declare function faviconKit(
  icon: IconData,
  options?: FaviconOptions & { fps?: number; loop?: boolean; autostart?: boolean; deflate?: Deflate },
): { 'favicon.svg': string; 'favicon-32.png': Uint8Array; 'favicon-animated.js': string; 'favicon.html': string };

export type HotspotPreset = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tl' | 'tr' | 'bl' | 'br';
export declare const HOTSPOTS: HotspotPreset[];
/** Hotspot in whole pixels for an image of `size` px: a preset, [x, y] or "x,y" on the 24 grid. */
export declare function resolveHotspot(hotspot?: HotspotPreset | [number, number] | string, size?: number): [number, number];

export interface CursorOptions {
  /** File and class name (default the icon name). */
  name?: string;
  hotspot?: HotspotPreset | [number, number] | string;
  /** Default '#111111'. */
  color?: string;
  /** Halo color (default '#ffffff', null for none). */
  outline?: string | null;
  outlineWidth?: number;
  weight?: number;
  variant?: 'outline' | 'duotone' | 'solid';
  /** CSS keyword after the image (default 'auto'). */
  fallback?: string;
  /** Embed the PNG files in the CSS as data URIs. */
  inline?: boolean;
  deflate?: Deflate;
}

/** A CSS cursor: NAME-32.png, NAME-64.png and NAME.css, the CSS text and the hotspot in 32 px space. */
export declare function cursorKit(icon: IconData, options?: CursorOptions): { files: Record<string, Uint8Array | string>; css: string; hotspot: [number, number] };

export interface PlotOptions {
  /** Millimetres across the 24 grid (default 50). */
  size?: number;
  /** Curve flattening tolerance in mm (default 0.05). */
  tolerance?: number;
  /** Join and order strokes for minimal pen travel (default true). */
  optimize?: boolean;
  /** Pen position before and after, in mm (default [0, 0]). */
  start?: [number, number];
}

export interface PlotPlan {
  /** Polylines in mm, in drawing order (SVG space, y down). */
  paths: Array<Array<[number, number]>>;
  lifts: number;
  draw: number;
  travel: number;
  travelBefore: number;
  size: number;
}

export interface GcodeOptions extends PlotOptions {
  /** Draw feed rate in mm/min (default 1500). */
  feed?: number;
  /** Travel feed rate in mm/min (default 3000). */
  travelFeed?: number;
  /** Default 'G0 Z5'. */
  penUp?: string | string[];
  /** Default 'G1 Z0 F500'. */
  penDown?: string | string[];
  /** Seconds to wait after each pen move (default 0). */
  dwell?: number;
  /** Offset in mm (default [0, 0]). */
  origin?: [number, number];
  /** Machine Y points up (default true). */
  flipY?: boolean;
  decimals?: number;
  header?: string | string[];
  footer?: string | string[];
}

/** Pen paths of an icon for a plotter: strokes only, joined and ordered. */
export declare function plotPaths(icon: IconData, options?: PlotOptions): PlotPlan;
/** Single line SVG in millimetres: one path per pen down, no fills. */
export declare function toPlotSvg(icon: IconData, options?: PlotOptions & { penWidth?: number }): string;
/** G-code for a pen plotter with feed rates and pen up and down commands. */
export declare function toGcode(icon: IconData, options?: GcodeOptions): string;

export interface StlOptions {
  /** Millimetres across the 24 grid (default 48). */
  size?: number;
  /** Millimetres (default 3). */
  thickness?: number;
  /** Millimetres (default 0, at most 0.9 of the thickness). */
  bevel?: number;
  bevelStyle?: 'chamfer' | 'round';
  variant?: 'outline' | 'solid';
  /** Grid cells per unit of the 24 grid, 2 to 16 (default 6). */
  resolution?: number;
  weight?: number;
}

export interface Mesh {
  positions: Float32Array;
  triangles: Uint32Array;
  triangleCount: number;
  size: number;
  thickness: number;
}

/** Watertight mesh of the extruded icon (Z up, millimetres). */
export declare function stlMesh(icon: IconData, options?: StlOptions): Mesh;
/** Binary STL (the default) or ASCII STL text. */
export declare function toStl(icon: IconData, options?: StlOptions & { format?: 'binary'; name?: string }): Uint8Array;
export declare function toStl(icon: IconData, options: StlOptions & { format: 'ascii'; name?: string }): string;
export declare function meshStats(mesh: Mesh): {
  triangles: number;
  vertices: number;
  watertight: boolean;
  volume: number;
  bounds: { min: [number, number, number]; max: [number, number, number] };
};

export type ScanVia = 'react' | 'vue' | 'svelte' | 'angular' | 'web-component' | 'html' | 'tailwind' | 'data' | 'js' | 'sprite';

export interface ScanLocation {
  file: string;
  line: number;
  column: number;
}

export interface ScanOccurrence extends ScanLocation {
  spec: string;
  names: string[];
  via: ScanVia;
  kind?: 'import' | 'use';
}

export interface ScanUnknown extends ScanLocation {
  name: string;
  spec?: string;
  via: ScanVia;
  suggestion?: string | null;
  kind?: string;
}

export interface ScanDynamic extends ScanLocation {
  via: ScanVia;
  code: string;
  message?: string;
}

export interface ScanA11y extends ScanLocation {
  spec: string;
  message: string;
}

export interface ScanResult {
  occurrences: ScanOccurrence[];
  unknown: ScanUnknown[];
  dynamic: ScanDynamic[];
  a11y: ScanA11y[];
}

export interface ScanReport extends ScanResult {
  files: number;
  /** Distinct base icon names: what a subset needs. */
  used: string[];
  /** Distinct specs, composites included. */
  specs: string[];
}

export declare const SCAN_EXTENSIONS: string[];
/** Finds glyphfox usage in one source text (JS, TS, JSX, Vue, Svelte, Angular, HTML). */
export declare function scanSource(text: string, options?: { file?: string; names?: Iterable<string> }): ScanResult;
/** Scans many files. */
export declare function scanFiles(files: Array<{ file: string; text: string }>, options?: { names?: Iterable<string> }): ScanReport;
/** ES module with the icon data of a subset (named exports, `icons` and a default export). */
export declare function subsetEsm(icons: IconData[], options?: { header?: string }): string;
/** SVG sprite of a subset: <use href="sprite.svg#gf-NAME">. */
export declare function subsetSprite(icons: IconData[]): string;
/** Human readable report. */
export declare function formatReport(report: ScanReport, options?: { color?: boolean }): string;
