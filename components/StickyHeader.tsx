import { useEffect, useState } from 'react';

interface Section {
  id: string;
  label: string;
}

interface StickyHeaderProps {
  sections: Section[];
}

export default function StickyHeader({ sections }: StickyHeaderProps) {
  const [active, setActive] = useState(sections[0]?.id || '');
  const [shrink, setShrink] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShrink(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observers = sections.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActive(id);
          }
        },
        { rootMargin: '-50% 0px -50% 0px' }
      );
      observer.observe(el);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, [sections]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white text-blue-600 p-2 z-50"
      >
        Skip to content
      </a>
      <header
        className={`sticky top-0 z-40 bg-white border-b transition-all ${
          shrink ? 'py-2' : 'py-4'
        }`}
      >
        <nav className="flex gap-4 justify-center">
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`px-2 py-1 ${
                active === id ? 'border-b-2 border-blue-600 text-blue-600' : ''
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
    </>
  );
}

