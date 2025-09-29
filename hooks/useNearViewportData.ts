import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PreloadFn = () => void | Promise<unknown>;

type Threshold = number | number[];

export interface UseNearViewportDataOptions {
  /**
   * Root margin passed to the underlying IntersectionObserver. Allows
   * preloading before the element becomes visible.
   */
  rootMargin?: string;
  /**
   * Threshold value passed to IntersectionObserver. Defaults to `0` so that
   * any intersection triggers the preload callback.
   */
  threshold?: Threshold;
  /**
   * When true the observer stops watching after the first intersection.
   * Defaults to `true` so preloading only happens once.
   */
  once?: boolean;
  /**
   * Disable the observer entirely. Useful for SSR or when preloading should
   * happen immediately.
   */
  disabled?: boolean;
  /**
   * Immediately invoke the preload callback on mount, regardless of
   * IntersectionObserver support.
   */
  immediate?: boolean;
}

export interface UseNearViewportDataResult<T extends Element> {
  /**
   * Callback ref assigned to the element that should be observed.
   */
  ref: (node: T | null) => void;
  /**
   * Indicates whether the element has intersected the viewport (or the
   * preload was triggered via fallback/manual call).
   */
  isNearViewport: boolean;
  /**
   * True once the preload callback has executed.
   */
  hasTriggered: boolean;
  /**
   * Manual escape hatch to run the preload callback immediately. Useful for
   * integrating with data fetching libraries that expose their own
   * prefetching primitives.
   */
  trigger: () => void;
}

/**
 * Observe an element and execute the provided preload callback when it nears
 * the viewport. This is intended to start network requests just before the
 * user scrolls to heavy components (charts, log tables, etc.).
 */
export function useNearViewportData<T extends Element>(
  preload: PreloadFn,
  options: UseNearViewportDataOptions = {},
): UseNearViewportDataResult<T> {
  const {
    rootMargin = '25%',
    threshold = 0,
    once = true,
    disabled = false,
    immediate = false,
  } = options;

  const [target, setTarget] = useState<T | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const trigger = useCallback(() => {
    setIsNearViewport(true);
    setHasTriggered((prev) => {
        if (!prev) {
          try {
            void preload();
          } catch (error) {
            console.warn('useNearViewportData preload error', error);
          }
        }
      return true;
    });
  }, [preload]);

  useEffect(() => {
    if (immediate && !hasTriggered) {
      trigger();
    }
  }, [immediate, hasTriggered, trigger]);

  useEffect(() => {
    if (disabled) {
      cleanup();
      return;
    }

    if (!target) {
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      trigger();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          trigger();
          if (once) {
            cleanup();
          }
        }
      });
    }, { rootMargin, threshold });

    observer.observe(target);
    observerRef.current = observer;

    return cleanup;
  }, [cleanup, disabled, once, rootMargin, target, threshold, trigger]);

  const ref = useCallback(
    (node: T | null) => {
      if (node === target) return;
      cleanup();
      setTarget(node);
    },
    [cleanup, target],
  );

  return useMemo(
    () => ({ ref, isNearViewport, hasTriggered, trigger }),
    [ref, isNearViewport, hasTriggered, trigger],
  );
}

export default useNearViewportData;
