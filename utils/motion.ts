export interface MotionFrameHandle {
  cancel: () => void;
  mode: 'raf' | 'timeout' | 'none';
}

interface ScheduleMotionFrameOptions {
  /** Delay in milliseconds used when reduced motion prefers a timeout fallback. */
  fallbackDelay?: number;
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Determines whether motion should be reduced, respecting both the OS setting
 * and the in-app accessibility toggle (which adds a `reduced-motion` class to
 * the root element).
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduced-motion')) {
    return true;
  }
  if (hasMatchMedia()) {
    return window.matchMedia(MOTION_QUERY).matches;
  }
  return false;
}

/**
 * Schedule a frame callback that respects reduced motion preferences. When
 * reduced motion is enabled the callback is scheduled via `setTimeout` so that
 * components can swap to lower-frequency updates without relying on CSS
 * animations.
 */
export function scheduleMotionFrame(
  callback: FrameRequestCallback,
  options: ScheduleMotionFrameOptions = {},
): MotionFrameHandle {
  if (typeof window === 'undefined') {
    return { cancel: () => {}, mode: 'none' };
  }

  const fallbackDelay = options.fallbackDelay ?? 16;

  if (shouldReduceMotion()) {
    const timeoutId = window.setTimeout(() => {
      const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
      callback(now);
    }, fallbackDelay);

    return {
      cancel: () => window.clearTimeout(timeoutId),
      mode: 'timeout',
    };
  }

  const rafId = window.requestAnimationFrame(callback);
  return {
    cancel: () => window.cancelAnimationFrame(rafId),
    mode: 'raf',
  };
}

/**
 * Listen for changes to the motion preference, combining OS-level updates and
 * the app-level reduced motion toggle.
 */
export function observeMotionPreference(listener: (prefersReduced: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const notify = () => listener(shouldReduceMotion());
  notify();

  let cleanupMedia = () => {};
  if (hasMatchMedia()) {
    const media = window.matchMedia(MOTION_QUERY);
    const handleChange = () => notify();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      cleanupMedia = () => media.removeEventListener('change', handleChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handleChange);
      cleanupMedia = () => media.removeListener(handleChange);
    }
  }

  let cleanupObserver = () => {};
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const observer = new MutationObserver(() => notify());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    cleanupObserver = () => observer.disconnect();
  }

  return () => {
    cleanupMedia();
    cleanupObserver();
  };
}
