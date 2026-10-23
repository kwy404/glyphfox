import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  booleanAttribute,
  inject,
} from '@angular/core';
import { bool, fuse, loadIcon, lookupIcon, morphFrame, morphGoal, nodesToString, parseSpec, registerIcons, renderIcon, resolveSpec, strokeWidth, tween } from 'glyphfox/core';
import type { AnimationName, IconData, IconProps, Layout, ModifierCorner, ModifierName, Trigger, Variant } from 'glyphfox';
import { GLYPHFOX_CONFIG } from './provider';

const EMPTY: IconData = { name: 'empty', body: '', tags: [], categories: [] };

function namesOf(spec: string): string[] {
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
}

function numberOrString(value: unknown): number | string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  const s = String(value);
  return /^\d*\.?\d+$/.test(s.trim()) ? Number(s) : s;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function loopValue(value: unknown): boolean | number | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === '' || value === true || value === 'true') return true;
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1) return n;
  return bool(value);
}

/**
 * <gf-icon name="file" /> with every shared prop as an input. `name` takes
 * the full spec syntax: "file+check@tr", "cloud&lock:side", "heart/solid".
 * `icons` renders a fusion from a list; `layout` and `gap` tune it.
 */
@Component({
  selector: 'gf-icon',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display:inline-flex;line-height:0;vertical-align:middle;flex-shrink:0',
    '(click)': 'onClick()',
    '(mouseenter)': 'onHover(true)',
    '(mouseleave)': 'onHover(false)',
  },
})
export class GlyphFoxIcon implements OnChanges, OnInit, OnDestroy {
  /** Any spec: "file", "file+check@tr", "cloud&lock:side", "heart/solid". */
  @Input() name?: string;
  /** Icon data instead of a name. */
  @Input() icon?: IconData;
  /** A fusion of 2 to 10 icons (names or icon data). */
  @Input() icons?: Array<string | IconData>;
  @Input() layout?: Layout;
  @Input({ transform: optionalNumber }) gap?: number;

  @Input({ transform: numberOrString }) size?: number | string;
  @Input() color?: string;
  @Input() secondaryColor?: string;
  @Input({ transform: optionalNumber }) secondaryOpacity?: number;
  @Input({ transform: optionalNumber }) weight?: number;
  @Input({ transform: booleanAttribute }) absoluteWeight?: boolean;
  @Input() corners?: 'round' | 'sharp';
  @Input() variant?: Variant;
  @Input({ transform: optionalNumber }) rotate?: number;
  @Input({ transform: booleanAttribute }) flipX?: boolean;
  @Input({ transform: booleanAttribute }) flipY?: boolean;
  @Input({ transform: booleanAttribute }) mirrorRtl?: boolean;
  @Input() animate?: AnimationName;
  @Input() trigger?: Trigger;
  @Input({ transform: booleanAttribute }) active?: boolean;
  @Input({ transform: optionalNumber }) duration?: number;
  @Input({ transform: optionalNumber }) delay?: number;
  @Input({ transform: loopValue }) loop?: boolean | number;
  @Input() modifier?: ModifierName;
  @Input() modifierCorner?: ModifierCorner;
  @Input() morphTo?: string | IconData | null;
  @Input() title?: string;
  @Input({ transform: (v: unknown) => (v === undefined || v === null ? undefined : booleanAttribute(v)) }) decorative?: boolean;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly configs = inject(GLYPHFOX_CONFIG, { optional: true }) ?? [];
  private readonly defaults: Partial<IconProps> = {};
  private p = 0;
  private goal = 0;
  private hovered = false;
  private toggled = false;
  private mounted = false;
  private run: string | null = null;
  private lastTarget: { icon: IconData; variant?: Variant } | null = null;
  private cancel: () => void = () => {};
  private destroyed = false;

  constructor() {
    for (const c of this.configs) {
      if (c.icons) registerIcons(c.icons);
      Object.assign(this.defaults, c.defaults || {});
    }
  }

  ngOnInit(): void {
    if (this.morphTo && this.props().trigger === 'state' && this.active) this.p = 1;
    const later = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null;
    if (later) {
      later(() => {
        this.mounted = true;
        this.update();
      });
    }
    this.update();
  }

  ngOnChanges(): void {
    this.update();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cancel();
  }

  /** @internal */
  onClick(): void {
    const p = this.props();
    if ((p.trigger || 'mount') === 'click' && (p.animate || p.morphTo)) {
      this.toggled = !this.toggled;
      this.run = this.run === '1' ? '2' : '1';
      this.update();
    }
  }

  /** @internal */
  onHover(on: boolean): void {
    this.hovered = on;
    if (this.props().trigger === 'hover' && this.morphTo) this.update();
  }

  private props(): IconProps {
    const own: Record<string, unknown> = {
      size: this.size,
      color: this.color,
      secondaryColor: this.secondaryColor,
      secondaryOpacity: this.secondaryOpacity,
      weight: this.weight,
      absoluteWeight: this.absoluteWeight,
      corners: this.corners,
      variant: this.variant,
      rotate: this.rotate,
      flipX: this.flipX,
      flipY: this.flipY,
      mirrorRtl: this.mirrorRtl,
      animate: this.animate,
      trigger: this.trigger,
      active: this.active,
      duration: this.duration,
      delay: this.delay,
      loop: this.loop,
      modifier: this.modifier,
      modifierCorner: this.modifierCorner,
      morphTo: this.morphTo,
      title: this.title,
      decorative: this.decorative,
    };
    const out: Record<string, unknown> = { ...this.defaults };
    for (const k of Object.keys(own)) if (own[k] !== undefined) out[k] = own[k];
    return out as IconProps;
  }

  private resolve(spec: string | IconData | null | undefined, weight: number): { icon: IconData; variant?: Variant } | null {
    if (!spec) return null;
    if (typeof spec === 'object') return { icon: spec };
    const missing = namesOf(spec).filter((n) => !lookupIcon(n));
    if (missing.length) {
      Promise.all(missing.map((n) => loadIcon(n))).then(() => {
        if (!this.destroyed) this.update();
      });
      return null;
    }
    try {
      return resolveSpec(spec, lookupIcon, { weight, gap: this.gap });
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${(err as Error).message}`);
      return null;
    }
  }

  private base(weight: number): { icon: IconData; variant?: Variant } | null {
    if (this.icons && this.icons.length >= 2) {
      const parts = this.icons.map((s) => this.resolve(s, weight));
      if (!parts.every(Boolean)) return null;
      try {
        return { icon: fuse(parts.map((x) => x!.icon), { layout: this.layout, gap: this.gap, weight }) };
      } catch (err) {
        if (typeof console !== 'undefined') console.warn(`glyphfox: ${(err as Error).message}`);
        return null;
      }
    }
    let spec = this.icon || this.name;
    if (typeof spec === 'string' && this.layout && spec.includes('&') && !spec.includes(':')) spec = `${spec}:${this.layout}`;
    return this.resolve(spec, weight);
  }

  private update(): void {
    const props = this.props();
    const sw = strokeWidth(props);
    const target = this.resolve(props.morphTo as string | IconData | null | undefined, sw);
    const goal = target ? morphGoal((props.trigger || 'mount') as Trigger, { active: bool(props.active), hovered: this.hovered, toggled: this.toggled, mounted: this.mounted }) : 0;
    if (goal !== this.goal) {
      this.goal = goal;
      this.cancel();
      if (typeof requestAnimationFrame === 'function') {
        this.cancel = tween(this.p, goal, { duration: props.duration ?? 450, delay: props.delay ?? 0 }, (v) => {
          this.p = v;
          this.draw();
        });
      } else this.p = goal;
    }
    this.draw();
  }

  private draw(): void {
    if (this.destroyed) return;
    const props = this.props();
    const sw = strokeWidth(props);
    const base = this.base(sw);
    const target = this.resolve(props.morphTo as string | IconData | null | undefined, sw);
    if (target) this.lastTarget = target;
    const drawTarget = target || (this.p > 0 ? this.lastTarget : null);
    const variant = props.variant ?? base?.variant;
    const frame = morphFrame(base ? base.icon : EMPTY, drawTarget && drawTarget.icon, this.p, { variant, targetVariant: drawTarget?.variant });
    const el = this.host.nativeElement;
    const labelled = !!(el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')));
    const decorative = props.decorative !== undefined ? props.decorative : props.title ? false : !labelled;
    const node = renderIcon(frame.icon, { ...props, variant: frame.variant, morphTo: undefined, run: this.run, decorative });
    this.renderer.setProperty(el, 'innerHTML', nodesToString(node));
  }
}
