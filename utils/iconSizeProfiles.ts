import { DESKTOP_TOP_PADDING } from './uiConstants';

export const ICON_SIZE_STORAGE_KEY = 'qs-icon-size';
export const ICON_SIZE_EVENT = 'qs-icon-size-change';

export const ICON_SIZE_OPTIONS = ['small', 'medium', 'large'] as const;

export type IconSize = (typeof ICON_SIZE_OPTIONS)[number];

export const ICON_SIZE_DEFAULT: IconSize = 'medium';

interface IconDimensions {
  width: number;
  height: number;
}

interface IconGridSpacing {
  row: number;
  column: number;
}

interface DesktopPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface IconProfile {
  iconDimensions: IconDimensions;
  iconGridSpacing: IconGridSpacing;
  desktopPadding: DesktopPadding;
  cssVariables: Record<string, string>;
}

type IconProfileSet = {
  precise: IconProfile;
  coarse: IconProfile;
};

const pxToRem = (value: number) => `${(value / 16).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d+?)0+$/, '$1')}rem`;

export const ICON_SIZE_PROFILES: Record<IconSize, IconProfileSet> = {
  small: {
    precise: {
      iconDimensions: { width: 88, height: 80 },
      iconGridSpacing: { row: 104, column: 120 },
      desktopPadding: {
        top: DESKTOP_TOP_PADDING,
        right: 20,
        bottom: 112,
        left: 20,
      },
      cssVariables: {
        '--desktop-icon-width': pxToRem(88),
        '--desktop-icon-height': pxToRem(80),
        '--desktop-icon-padding': '0.25rem',
        '--desktop-icon-gap': '0.35rem',
        '--desktop-icon-image': pxToRem(36),
        '--desktop-icon-font-size': '0.72rem',
      },
    },
    coarse: {
      iconDimensions: { width: 112, height: 100 },
      iconGridSpacing: { row: 136, column: 160 },
      desktopPadding: {
        top: 68,
        right: 28,
        bottom: 160,
        left: 28,
      },
      cssVariables: {
        '--desktop-icon-width': pxToRem(112),
        '--desktop-icon-height': pxToRem(100),
        '--desktop-icon-padding': '0.4rem',
        '--desktop-icon-gap': '0.45rem',
        '--desktop-icon-image': pxToRem(48),
        '--desktop-icon-font-size': '0.82rem',
      },
    },
  },
  medium: {
    precise: {
      iconDimensions: { width: 96, height: 88 },
      iconGridSpacing: { row: 112, column: 128 },
      desktopPadding: {
        top: DESKTOP_TOP_PADDING,
        right: 24,
        bottom: 120,
        left: 24,
      },
      cssVariables: {
        '--desktop-icon-width': '6rem',
        '--desktop-icon-height': '5.5rem',
        '--desktop-icon-padding': '0.25rem',
        '--desktop-icon-gap': '0.375rem',
        '--desktop-icon-image': '2.5rem',
        '--desktop-icon-font-size': '0.75rem',
      },
    },
    coarse: {
      iconDimensions: { width: 120, height: 108 },
      iconGridSpacing: { row: 144, column: 156 },
      desktopPadding: {
        top: 72,
        right: 32,
        bottom: 168,
        left: 32,
      },
      cssVariables: {
        '--desktop-icon-width': pxToRem(120),
        '--desktop-icon-height': pxToRem(108),
        '--desktop-icon-padding': '0.45rem',
        '--desktop-icon-gap': '0.5rem',
        '--desktop-icon-image': '3rem',
        '--desktop-icon-font-size': '0.85rem',
      },
    },
  },
  large: {
    precise: {
      iconDimensions: { width: 112, height: 100 },
      iconGridSpacing: { row: 124, column: 140 },
      desktopPadding: {
        top: DESKTOP_TOP_PADDING,
        right: 28,
        bottom: 132,
        left: 28,
      },
      cssVariables: {
        '--desktop-icon-width': '7rem',
        '--desktop-icon-height': '6.25rem',
        '--desktop-icon-padding': '0.35rem',
        '--desktop-icon-gap': '0.45rem',
        '--desktop-icon-image': '3rem',
        '--desktop-icon-font-size': '0.85rem',
      },
    },
    coarse: {
      iconDimensions: { width: 132, height: 120 },
      iconGridSpacing: { row: 160, column: 180 },
      desktopPadding: {
        top: 80,
        right: 36,
        bottom: 192,
        left: 36,
      },
      cssVariables: {
        '--desktop-icon-width': pxToRem(132),
        '--desktop-icon-height': pxToRem(120),
        '--desktop-icon-padding': '0.5rem',
        '--desktop-icon-gap': '0.55rem',
        '--desktop-icon-image': pxToRem(56),
        '--desktop-icon-font-size': '0.95rem',
      },
    },
  },
};

export const isValidIconSize = (value: unknown): value is IconSize =>
  typeof value === 'string' && (ICON_SIZE_OPTIONS as readonly string[]).includes(value);

export const getIconProfile = (size: IconSize, isCoarse: boolean): IconProfile =>
  ICON_SIZE_PROFILES[size][isCoarse ? 'coarse' : 'precise'];
