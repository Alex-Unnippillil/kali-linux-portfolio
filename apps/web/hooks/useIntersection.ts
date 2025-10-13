import { useEffect, useState } from 'react';

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
    if (typeof IntersectionObserver === 'undefined') {
      setIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}
