import { isBrowser } from './isBrowser';

export const MOTION_DURATION_CAP = 450;
const SPRING_DEFAULT_DURATION = 320;
const FADE_DEFAULT_DURATION = 200;
const SPRING_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const FADE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

type MotionOptions = {
  duration?: number;
  delay?: number;
  reducedMotion?: boolean;
};

export type MotionTiming = {
  duration: number;
  delay: number;
  easing: string;
};

function clampDuration(value: number) {
  return Math.min(value, MOTION_DURATION_CAP);
}

function prefersReducedMotion(explicit?: boolean): boolean {
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  if (!isBrowser) return false;

  const doc = document.documentElement;
  if (doc?.classList.contains('reduced-motion') || doc?.classList.contains('reduce-motion')) {
    return true;
  }

  if (typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }

  return false;
}

function resolveTiming(
  defaults: { duration: number; easing: string },
  options: MotionOptions
): MotionTiming {
  if (prefersReducedMotion(options.reducedMotion)) {
    return { duration: 0, delay: 0, easing: 'linear' };
  }

  const duration = clampDuration(options.duration ?? defaults.duration);
  const delay = Math.max(0, options.delay ?? 0);

  return {
    duration,
    delay,
    easing: defaults.easing,
  };
}

export function spring(options: MotionOptions = {}): MotionTiming {
  return resolveTiming({ duration: SPRING_DEFAULT_DURATION, easing: SPRING_EASING }, options);
}

export function fade(options: MotionOptions = {}): MotionTiming {
  return resolveTiming({ duration: FADE_DEFAULT_DURATION, easing: FADE_EASING }, options);
}

export function transitionString(property: string, timing: MotionTiming) {
  const delayPart = timing.delay ? ` ${timing.delay}ms` : '';
  return `${property} ${timing.duration}ms ${timing.easing}${delayPart}`;
}

export const motionEasings = {
  spring: SPRING_EASING,
  fade: FADE_EASING,
};

export const motionDurations = {
  spring: SPRING_DEFAULT_DURATION,
  fade: FADE_DEFAULT_DURATION,
};
