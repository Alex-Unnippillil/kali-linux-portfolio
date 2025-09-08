import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

interface TocSection {
  id: string;
  text: string;
  children: TocItem[];
}

interface StickyTocProps {
  toc: TocItem[];
}

export default function StickyToc({ toc }: StickyTocProps) {
  const sections: TocSection[] = toc.reduce((acc: TocSection[], item) => {
    if (item.depth === 2) {
      acc.push({ id: item.id, text: item.text, children: [] });
    } else if (item.depth === 3 && acc.length > 0) {
      acc[acc.length - 1].children.push(item);
    }
    return acc;
  }, []);

  const [openSections, setOpenSections] = useState<string[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      setOpenSections(sections.map((s) => s.id));
      setShowToc(true);
    }
  }, [sections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const elements = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => !!el);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0.1 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const isSectionActive = (section: TocSection) => {
    if (activeId === section.id) return true;
    return section.children.some((c) => c.id === activeId);
  };

  return (
    <nav className="lg:w-1/4 lg:min-w-[12rem] lg:max-w-[20rem] lg:flex-shrink-0 lg:pr-4 lg:sticky lg:top-0">
      <button
        className="lg:hidden mb-2 flex items-center"
        onClick={() => setShowToc((v) => !v)}
        aria-label="Toggle table of contents"
      >
        Table of Contents {showToc ? '▲' : '▼'}
      </button>
      <div className={`${showToc ? '' : 'hidden'} lg:block`}>
        {sections.map((section) => (
          <div key={section.id} className="mb-2">
            <div className="flex items-center text-sm font-medium">
              <button
                onClick={() => toggleSection(section.id)}
                className="mr-1"
                aria-label={`Toggle ${section.text}`}
              >
                {openSections.includes(section.id) ? '▼' : '▶'}
              </button>
              <a
                href={`#${section.id}`}
                className={isSectionActive(section) ? 'text-blue-500' : ''}
              >
                {section.text}
              </a>
            </div>
            {section.children.length > 0 && openSections.includes(section.id) && (
              <ul className="ml-4 mt-1 space-y-1">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      className={
                        activeId === child.id
                          ? 'text-blue-500 text-sm'
                          : 'text-sm'
                      }
                    >
                      {child.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

