import type { DefineComponent } from 'vue';
import type { AnimationName, IconProps, Trigger } from '../index.js';
import type { SmartKind, SmartKindAlias, SmartOptions, StatusState } from './index.js';

/** Vue props are plain values here: the full unions make template type checks too deep. */
type VueSmartProps = Omit<IconProps, 'morphTo' | 'title'> & Omit<SmartOptions, 'date' | 'time' | 'icon'> & { kind?: SmartKind | SmartKindAlias; name?: string; title?: string; gap?: number; date?: string | number; time?: string | number; icon?: string };

export declare const smartIconProps: Record<string, unknown>;
export declare const SmartIcon: DefineComponent<VueSmartProps>;
export declare const StatusIcon: DefineComponent<Omit<IconProps, 'morphTo' | 'title'> & Pick<SmartOptions, 'locale' | 'dir' | 'contrast'> & { state?: StatusState; spinDuration?: number; title?: string }>;
export declare const IconGroup: DefineComponent<
  Pick<IconProps, 'size' | 'color' | 'secondaryColor' | 'weight' | 'corners' | 'variant'> & {
    animate?: AnimationName;
    stagger?: number | string;
    delay?: number | string;
    from?: 'start' | 'end' | 'center';
    trigger?: Trigger;
    active?: boolean;
    duration?: number | string;
    loop?: boolean | number;
    /** Names, icon data or smart items ({ kind, value... }). */
    icons?: Array<string | Record<string, unknown>>;
    as?: string;
  }
>;
