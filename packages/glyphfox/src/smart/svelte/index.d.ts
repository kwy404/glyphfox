import type { Component } from 'svelte';
import type { IconProps } from '../../index.js';
import type { GroupItem, GroupOptions, SmartKind, SmartKindAlias, SmartOptions, StatusState } from '../index.js';

type Attributes = { class?: string; style?: string; [attribute: string]: unknown };

export declare const SmartIcon: Component<Omit<IconProps, 'title'> & SmartOptions & Attributes & { kind?: SmartKind | SmartKindAlias; name?: string; title?: string }>;
export declare const StatusIcon: Component<Omit<IconProps, 'title'> & Pick<SmartOptions, 'locale' | 'dir' | 'contrast'> & Attributes & { state?: StatusState; spinDuration?: number; title?: string }>;
export declare const IconGroup: Component<GroupOptions & Attributes & { icons?: GroupItem[]; as?: string; count?: number }>;
