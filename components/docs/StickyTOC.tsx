import React, { useEffect, useState } from 'react';
import type { Heading } from '@/lib/markdown';

interface Props {
  headings: Heading[];
}

/**
 * StickyTOC renders a table of contents and highlights the currently
 * active section using an IntersectionObserver.
 */
const StickyTOC: React.FC<Props> = ({ headings }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    }, { rootMargin: '0px 0px -70% 0px' });

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label="Table of contents" className="sticky top-0">
      <ul>
        {headings.map((h) => (
          <li key={h.id} style={{ marginLeft: `${(h.level - 1) * 16}px` }}>
            <a
              href={`#${h.id}`}
              className={activeId === h.id ? 'font-bold text-blue-600' : ''}
              aria-current={activeId === h.id ? 'true' : undefined}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default StickyTOC;
