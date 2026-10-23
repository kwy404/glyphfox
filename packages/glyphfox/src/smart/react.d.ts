import type { ElementType, ForwardRefExoticComponent, ReactNode, RefAttributes, SVGProps } from 'react';
import type { IconData, IconProps, IconSpec } from '../index.js';
import type { GroupItem, GroupOptions, SmartKind, SmartKindAlias, SmartOptions, StatusState } from './index.js';

type SvgRest = Omit<SVGProps<SVGSVGElement>, keyof IconProps | keyof SmartOptions | 'ref' | 'name' | 'title'>;

export interface SmartIconProps extends Omit<IconProps, 'title'>, SmartOptions, SvgRest {
  /** The data icon to draw. */
  kind?: SmartKind | SmartKindAlias;
  /** Without kind: any icon spec rendered with the locale and contrast behaviors. */
  name?: IconSpec;
  /** Accessible name; "auto" describes the data ("Battery 42%"). */
  title?: string | 'auto';
  gap?: number;
}

export interface StatusIconProps extends Omit<IconProps, 'title'>, Pick<SmartOptions, 'locale' | 'dir' | 'contrast'>, SvgRest {
  state?: StatusState;
  /** Duration of one turn of the loading spin in ms. */
  spinDuration?: number;
  /** Accessible name; "auto" names the state. */
  title?: string | 'auto';
}

export interface IconGroupProps extends Omit<GroupOptions, 'style' | 'class'> {
  /** Names, icon data or smart items ({ kind, value... }) rendered by the group. */
  icons?: GroupItem[];
  /** Element of the group (default span). */
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  style?: Record<string, string | number>;
  [attribute: string]: unknown;
}

export declare const SmartIcon: ForwardRefExoticComponent<SmartIconProps & RefAttributes<SVGSVGElement>>;
export declare const StatusIcon: ForwardRefExoticComponent<StatusIconProps & RefAttributes<SVGSVGElement>>;
export declare const IconGroup: ForwardRefExoticComponent<IconGroupProps & RefAttributes<HTMLElement>>;
export type { IconData };
