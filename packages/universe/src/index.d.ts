// Types of glyphfox-universe.

export type Style = 'outline' | 'solid' | 'duotone' | 'color';
export type LicenseKind = 'public-domain' | 'permissive' | 'attribution' | 'share-alike';

export interface LicenseInfo {
  spdx: string;
  title: string;
  url: string;
  kind: LicenseKind;
  attribution: boolean;
  file: string;
  set: string;
  setName: string;
  author: string;
  authorUrl: string;
}

export interface UniverseIcon {
  name: string;
  prefix: string;
  icon: string;
  body: string;
  left: number;
  top: number;
  width: number;
  height: number;
  viewBox: string;
  stroke: boolean;
  hidden: boolean;
  license: LicenseInfo | null;
}

export interface SetRecord {
  prefix: string;
  name: string;
  total: number;
  aliases: number;
  author: { name: string; url: string };
  license: { title: string; spdx: string; url: string; kind: LicenseKind; attribution: boolean; file?: string; source?: string };
  category: string;
  palette: boolean;
  height: number;
  version: string;
  styles: Record<Style, number>;
  brand: number;
  stroke: number;
  strokeWidth: number | null;
  samples: string[];
  cdn: boolean;
  npm: { name: string; version: string } | null;
}

export interface Catalog {
  format: number;
  source: { package: string; version: string };
  total: number;
  sets: number;
  list: SetRecord[];
  excluded: { prefix: string; name: string; total: number; license: string; reason: string }[];
  textExcluded: number;
}

export interface SvgOptions {
  size?: number | string;
  color?: string;
  secondaryColor?: string;
  secondaryOpacity?: number;
  weight?: number;
  absoluteWeight?: boolean;
  corners?: 'round' | 'sharp';
  rotate?: number;
  flipX?: boolean;
  flipY?: boolean;
  animate?: 'spin' | 'pulse' | 'draw';
  title?: string;
  class?: string;
  attrs?: Record<string, string | number>;
  idPrefix?: string;
}

export interface SearchOptions {
  limit?: number;
  sets?: string[];
  styles?: Style[];
  brand?: boolean;
  stroke?: boolean;
  licenses?: (LicenseKind | string)[];
}

export interface SearchResult {
  name: string;
  prefix: string;
  icon: string;
  style: Style;
  brand: boolean;
  stroke: boolean;
}

export interface OfflineBundle {
  sets: Record<string, Partial<SetRecord>>;
  icons: Record<string, { body: string; left?: number; top?: number; width?: number; height?: number }>;
}

export declare class UniverseIndex {
  constructor(raw: unknown, catalog?: Catalog | null);
  readonly total: number;
  readonly prefixes: string[];
  searchIds(query: string, options?: SearchOptions): Uint32Array;
  browse(options?: SearchOptions): Uint32Array;
  search(query: string, options?: SearchOptions): SearchResult[];
  entry(id: number): { id: number; prefix: string; name: string; index: number; style: Style; brand: boolean; stroke: boolean };
  find(prefix: string, name: string): number;
  categoriesOf(prefix: string, index: number): string[];
  aliasesOf(prefix: string, index: number): string[];
}

export declare const VERSION: string;
export declare const PREFIXES: string[];
export declare const STYLES: Style[];
export declare const TRADEMARK_NOTICE: string;
export declare function parseName(name: string): { prefix: string; name: string } | null;
export declare function isUniverseName(name: string): boolean;
export declare function configure(options?: { cdn?: string; dataUrl?: string | null; fetch?: typeof fetch; offline?: boolean; maxSets?: number; persist?: boolean; cacheName?: string; caches?: CacheStorage | null }): object;
export declare function clear(options?: { persistent?: boolean; memory?: boolean }): Promise<void>;
export declare function loadCatalog(): Promise<Catalog>;
export declare function loadIndex(): Promise<UniverseIndex>;
/** Preview strips: { concepts, sets: { prefix: { box: [left, top, width, height], icons: [name, body, flags, concept, box?][] } } }. */
export declare function loadPreviews(): Promise<{ concepts: string[]; sets: Record<string, { box: number[]; icons: [string, string, string, number, number[]?][] }> }>;
export declare function listSets(): Promise<SetRecord[]>;
export declare function getSet(prefix: string): Promise<SetRecord | null>;
export declare function loadSet(prefix: string): Promise<unknown>;
export declare function setUrl(set: SetRecord): string | null;
export declare function getIcon(name: string): Promise<UniverseIcon | null>;
export declare function getIcons(names: string[]): Promise<(UniverseIcon | null)[]>;
export declare function getIconSync(name: string): UniverseIcon | undefined;
export declare function registerIcons(bundle: OfflineBundle): void;
export declare function toSvg(name: string, options?: SvgOptions): Promise<string>;
export declare function toSvgSync(name: string, options?: SvgOptions): string;
export declare function iconToSvg(icon: UniverseIcon, options?: SvgOptions): string;
export declare function svgToDataUri(svg: string): string;
export declare function uniqueIds(body: string, prefix?: string): string;
export declare function search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
export declare function attributionFor(name: string): Promise<string>;
export declare function attributionLine(set: SetRecord, options?: { modified?: boolean }): string;
export declare function licenseOf(set: SetRecord): LicenseInfo | null;
export declare function licenseDecision(prefix: string, info: unknown): { allowed: boolean; spdx: string; kind: LicenseKind | null; attribution: boolean; reason: string };
export declare function checkCatalog(catalog: Catalog, options?: { files?: Set<string> }): string[];
