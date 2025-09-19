"use client";

import { RefObject, useEffect, useState } from 'react';

interface Options extends IntersectionObserverInit {
  /**
   * If true, hydration is triggered immediately when the element is available
   * (useful for SSR fallbacks). Defaults to false.
   */
  immediate?: boolean;
}

/**
 * Defers hydration until the referenced element intersects with the viewport.
 * Returns a boolean that can be used to decide whether to render the full
 * interactive component or a lightweight placeholder.
 */
export function useIntersectionHydration<T extends Element>(
  ref: RefObject<T>,
  options?: Options,
) {
  const [hydrated, setHydrated] = useState(() => typeof window === 'undefined');
  const { immediate = false, ...observerOptions } = options ?? {};

  useEffect(() => {
    const node = ref.current;
    if (hydrated || typeof window === 'undefined') {
      return;
    }

    if (!node) {
      if (immediate) {
        setHydrated(true);
      }
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setHydrated(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setHydrated(true);
          observer.disconnect();
          break;
        }
      }
    }, observerOptions);

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, hydrated, immediate, observerOptions.root, observerOptions.rootMargin, observerOptions.threshold]);

  return hydrated;
}

export default useIntersectionHydration;
