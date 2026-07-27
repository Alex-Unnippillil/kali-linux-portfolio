import React, { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
}

interface TOCProps {
  headings: Heading[];
}

const TOC: React.FC<TOCProps> = ({ headings }) => {
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
      { rootMargin: '0px 0px -80% 0px' }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label="Table of contents" className="sticky top-0 p-4 max-h-screen overflow-auto">
      <ul className="space-y-2">
        {headings.map(({ id, text }) => (
          <li key={id}>
            <a href={`#${id}`} className={activeId === id ? 'font-bold text-blue-500' : ''}>
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TOC;

