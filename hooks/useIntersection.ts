import { useEffect, useMemo, useState } from 'react';
import useDataSaverPreference from './useDataSaverPreference';

/**
 * useIntersection observes the given element and reports whether it is
 * currently intersecting the viewport.  It returns a boolean visibility state
 * that updates whenever the element's intersection status changes.
 */
export default function useIntersection<T extends Element>(
  ref: React.RefObject<T>,
  options?: IntersectionObserverInit,
) {
  const [isIntersecting, setIntersecting] = useState(false);
  const dataSaverEnabled = useDataSaverPreference();

  const effectiveOptions = useMemo(() => {
    if (!dataSaverEnabled) return options;
    if (!options) {
      return { threshold: 0.6 } as IntersectionObserverInit;
    }

    const nextOptions: IntersectionObserverInit = { ...options };
    if (nextOptions.threshold === undefined) {
      nextOptions.threshold = 0.6;
      return nextOptions;
    }

    if (typeof nextOptions.threshold === 'number') {
      nextOptions.threshold = Math.max(nextOptions.threshold, 0.6);
      return nextOptions;
    }

    if (Array.isArray(nextOptions.threshold)) {
      nextOptions.threshold = nextOptions.threshold.map((value) =>
        Math.max(value, 0.6),
      );
      return nextOptions;
    }

    return nextOptions;
  }, [options, dataSaverEnabled]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    }, effectiveOptions);

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, effectiveOptions]);

  return isIntersecting;
}
