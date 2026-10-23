// Types of the smart icons (data icons, locale aware icons, StatusIcon, IconGroup).
import type { AnimationName, IconData, IconNode, SvgOptions, Trigger } from '../index.js';

export type SmartKind = 'battery' | 'signal' | 'wifi' | 'volume' | 'progress' | 'thermometer' | 'calendar' | 'clock' | 'file' | 'badge' | 'currency';
export type SmartKindAlias = 'notification' | 'notifications' | 'count' | 'temperature' | 'date' | 'time' | 'ring';
export type StatusState = 'idle' | 'loading' | 'success' | 'error';
export type CurrencyGlyph = 'real' | 'euro' | 'yen' | 'pound' | 'dollar' | 'generic';
/** "auto" follows prefers-contrast: more (default), "more" always bumps, "off" never. */
export type ContrastMode = 'auto' | 'more' | 'off' | boolean;
export type DateInput = Date | number | string;
export type TimeInput = Date | number | string | { hours: number; minutes?: number; seconds?: number };

/** Options of the smart icons, on top of the shared props. */
export interface SmartOptions {
  /** Level: 0 to 1, a percentage (above 1 without max) or a real value between min and max. */
  value?: number | string;
  min?: number | string;
  /** Top of the value range. For badges: the largest count shown before "+" (default 99). */
  max?: number | string;
  /** Battery: draws a bolt. */
  charging?: boolean;
  /** Volume: draws the muted speaker. */
  muted?: boolean;
  /** Progress: shows the percentage (true) or a short text inside the ring. */
  label?: boolean | string;
  /** Thermometer: unit for the accessible title, such as "°C". */
  unit?: string;
  /** Calendar: the date shown (default today). */
  date?: DateInput;
  /** Clock: the time shown (default now). */
  time?: TimeInput;
  /** Clock: draws the second hand. */
  seconds?: boolean;
  /** Clock and calendar without time or date: follow the real time. */
  tick?: boolean;
  /** File: the extension label (up to 4 characters). */
  ext?: string;
  /** File: takes the extension from a file name. */
  filename?: string;
  /** Badge: the notification count (0 hides the bubble). */
  count?: number | string;
  /** Badge: a dot instead of a number. */
  dot?: boolean;
  /** Badge: the icon under the bubble (icon data or a registered name, default bell). */
  icon?: IconData | string;
  /** Badge: color of the bubble. */
  badgeColor?: string;
  /** Currency: an ISO code instead of the currency of the locale. */
  currency?: string;
  /** Locale for symbols, digits and dates; also decides the mirroring of directional icons. */
  locale?: string;
  /** Text direction, decides the mirroring of directional icons. */
  dir?: 'ltr' | 'rtl';
  /** Weight bump under prefers-contrast: more. */
  contrast?: ContrastMode;
}

/** Shared props and smart options; title "auto" uses the description of the data. */
export type SmartSvgOptions = Omit<SvgOptions, 'title'> & SmartOptions & { title?: string | 'auto' | true };

export interface SmartData {
  kind: SmartKind;
  /** Accessible description of the data, used by title="auto". */
  title: string;
  classes: string[];
  [key: string]: unknown;
}

export type SmartIconData = IconData & { smart: SmartData };
export type GroupItem = string | IconData | ({ kind: SmartKind | SmartKindAlias } & SmartSvgOptions);

export interface GroupOptions extends Omit<SmartSvgOptions, 'animate' | 'trigger' | 'delay'> {
  animate?: AnimationName;
  /** Delay between two icons in ms (default 60). */
  stagger?: number;
  /** Delay of the first icon in ms. */
  delay?: number;
  /** Order of the wave. */
  from?: 'start' | 'end' | 'center';
  trigger?: Trigger;
  active?: boolean;
}

export interface CurrencyInfo {
  locale: string;
  currency?: string;
  symbol: string;
  glyph: CurrencyGlyph;
  name: string;
}

export declare const SMART_KINDS: SmartKind[];
export declare const SMART_OPTIONS: string[];
export declare const STATUS_STATES: StatusState[];
export declare const STATUS_ICONS: Record<StatusState, IconData>;
export declare const STATUS_TITLES: Record<StatusState, string>;
export declare const GROUP_TRIGGERS: Trigger[];
export declare const DIRECTIONAL_ICONS: Set<string>;
export declare const REGION_CURRENCY: Record<string, string>;
export declare const CURRENCY_GLYPHS: CurrencyGlyph[];
export declare const CURRENCY_PATHS: Record<CurrencyGlyph, string[]>;
export declare const CONTRAST_BUMP: number;

/** Icon data of a smart kind for the options. */
export declare function smartIcon(kind: SmartKind | SmartKindAlias, options?: SmartSvgOptions): SmartIconData;
/** Node tree of a smart kind, or of any icon spec with the smart behaviors. */
export declare function smartNode(kindOrSpec: SmartKind | SmartKindAlias | string | IconData, options?: SmartSvgOptions): IconNode;
/** SVG markup of a smart kind, or of any icon spec with the smart behaviors. */
export declare function smartSvg(kindOrSpec: SmartKind | SmartKindAlias | string | IconData, options?: SmartSvgOptions): string;
/** SVG markup of icons that share a preset with a stagger, wrapped in <span class="glyphfox-group">. */
export declare function groupSvg(items: GroupItem[], options?: GroupOptions): string;
/** The smart functions bound to an icon lookup. */
export declare function createSmart(lookup?: (name: string) => IconData | null): {
  smartIcon: typeof smartIcon;
  smartNode: typeof smartNode;
  smartSvg: typeof smartSvg;
  groupSvg: typeof groupSvg;
  resolveIcon(spec: string | IconData, props?: SmartSvgOptions): { icon: IconData; variant?: string };
};
export declare function drawSmart(kind: SmartKind | SmartKindAlias, options?: SmartSvgOptions, base?: IconData | null): SmartIconData;
export declare function smartKind(kind: string): SmartKind | null;
export declare function fraction(options: { value?: number | string; min?: number | string; max?: number | string }, fallback?: number): number;
export declare function labelWeight(strokeWidth: number): string;
/** Milliseconds until a live clock or calendar changes, or null. */
export declare function nextChange(kind: string, options?: SmartOptions, now?: number): number | null;
export declare function toDate(input?: DateInput): Date;
export declare function toTime(input?: TimeInput): { hours: number; minutes: number; seconds: number };

export declare function statusState(state: string): StatusState;
export declare function statusIcon(state: StatusState | string): IconData;
/** What to draw at morph progress p between two states. */
export declare function statusView(from: StatusState | string | null, to: StatusState | string, progress?: number, props?: SmartSvgOptions & { spinDuration?: number }): { icon: IconData; props: SmartSvgOptions };
/** SVG markup of a state; with `from`, a CSS only morph that plays on load. */
export declare function statusSvg(state: StatusState, options?: SmartSvgOptions & { from?: StatusState; spinDuration?: number }): string;

export declare function staggerDelays(count: number, options?: { stagger?: number; delay?: number; from?: 'start' | 'end' | 'center' }): number[];
export declare function groupProps(count: number, options?: GroupOptions): Array<{ animate?: AnimationName; trigger: Trigger; delay: number; active?: boolean; duration?: number; loop?: boolean | number }>;
/** Stylesheet that staggers a preset across the direct children of an element. */
export declare function groupCss(options?: GroupOptions & { count?: number }): { className: string; css: string } | null;
export declare function nextRun(run: string | null | undefined): '1' | '2';

export declare function registerDirectional(names: string | string[]): void;
export declare function isDirectional(iconOrName: string | IconData | null | undefined): boolean;
export declare function isRtlLocale(locale: string | null | undefined): boolean;
export declare function textDirection(options?: { dir?: string; locale?: string; element?: Element | null }): 'ltr' | 'rtl';
export declare function directionProps<T extends Record<string, unknown>>(icon: string | IconData, props?: T): T;
export declare function resolveLocale(locale?: string | null): string;
export declare function currencyForLocale(locale?: string | null): string | undefined;
export declare function currencyInfo(options?: { locale?: string; currency?: string }): CurrencyInfo;
export declare function prefersMoreContrast(): boolean;
export declare function watchContrast(onChange: (more: boolean) => void): () => void;
export declare function contrastCss(strokeWidth: number, bump?: number): { className: string; css: string };
export declare function contrastMode(props?: { contrast?: ContrastMode | 'done' }): 'auto' | 'more' | 'off' | 'done';
export declare function contrastProps<T extends Record<string, unknown>>(props?: T): T;
export declare function smartProps<T extends Record<string, unknown>>(icon: IconData, props?: T): T;
/** Renders icon data with the smart behaviors (direction, title "auto", contrast). */
export declare function renderSmart(icon: IconData, props?: SmartSvgOptions): IconNode;
