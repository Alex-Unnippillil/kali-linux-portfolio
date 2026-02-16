import { useEffect, useState } from 'react';

/**
 * Tracks the section id currently intersecting the viewport.
 * Useful for updating navigation state based on scroll position.
 */
export default function useIntersectionObserver(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;
    if (typeof IntersectionObserver === 'undefined') {
      setActiveId(ids[0] ?? null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
