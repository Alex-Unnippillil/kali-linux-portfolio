import { useEffect, useState } from 'react';
import { observeViewport } from '../utils/viewport';

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

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const unsubscribe = observeViewport(node, (entry) => {
      setIntersecting(entry.isIntersecting);
    }, options);

    return () => {
      unsubscribe();
    };
  }, [ref, options]);

  return isIntersecting;
}
