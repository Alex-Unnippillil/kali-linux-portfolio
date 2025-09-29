export type MobileOverride = {
  dpi: number;
  rotation: number;
};

export type MobileOverrideMap = Record<string, MobileOverride>;

export type MobileOrientation = 'portrait' | 'landscape';

export type EdgeGestureAction = 'app-switcher' | 'notifications' | 'quick-settings';

export const ROTATION_OPTIONS = [0, 90, 180, 270] as const;
export type RotationOption = (typeof ROTATION_OPTIONS)[number];

export const MIN_MOBILE_DPI = 72;
export const MAX_MOBILE_DPI = 640;
export const DEFAULT_MOBILE_DPI = 320;
