import { useEffect, useState } from 'react';
import type { TocItem } from '@/utils/mdx';

interface Props {
  headings: TocItem[];
  className?: string;
}

export default function TableOfContents({ headings, className }: Props) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0% 0% -80% 0%' }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav
      aria-label="Table of contents"
      className={`mb-4 md:mb-0 md:sticky md:top-4 ${className ?? ''}`}
    >
      <ul className="space-y-2 text-sm">
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? 'ml-4' : ''}>
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? 'location' : undefined}
              className={activeId === h.id ? 'text-blue-600 font-medium' : 'text-slate-600'}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

