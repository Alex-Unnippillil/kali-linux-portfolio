export const UI_HAPTIC_EVENTS = Object.freeze({
  WINDOW_SNAP: 'windowSnap',
  WINDOW_MINIMIZE: 'windowMinimize',
  ICON_DROP: 'iconDrop',
} as const);

type HapticEventKey = (typeof UI_HAPTIC_EVENTS)[keyof typeof UI_HAPTIC_EVENTS];

type HapticPattern = number | number[];

const PATTERNS: Record<HapticEventKey, HapticPattern> = Object.freeze({
  [UI_HAPTIC_EVENTS.WINDOW_SNAP]: [12, 8],
  [UI_HAPTIC_EVENTS.WINDOW_MINIMIZE]: [10],
  [UI_HAPTIC_EVENTS.ICON_DROP]: [8],
});

export const UI_HAPTIC_PATTERNS = PATTERNS;

export type HapticOptions = {
  hapticsEnabled?: boolean;
  reducedMotion?: boolean;
};

export const supportsVibration = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const getSystemReducedMotionPreference = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    return false;
  }
};

export const shouldVibrate = (options: HapticOptions = {}): boolean => {
  const { hapticsEnabled, reducedMotion } = options;
  if (hapticsEnabled === false) return false;
  const prefersReducedMotion =
    typeof reducedMotion === 'boolean'
      ? reducedMotion
      : getSystemReducedMotionPreference();
  if (prefersReducedMotion) return false;
  return supportsVibration();
};

export const triggerUIHaptic = (
  event: HapticEventKey,
  options: HapticOptions = {},
): boolean => {
  const pattern = UI_HAPTIC_PATTERNS[event];
  if (!pattern) return false;
  if (!shouldVibrate(options)) return false;
  try {
    const vibrate = typeof navigator !== 'undefined' ? navigator.vibrate : undefined;
    if (typeof vibrate !== 'function') return false;
    vibrate.call(navigator, pattern);
    return true;
  } catch (error) {
    return false;
  }
};
