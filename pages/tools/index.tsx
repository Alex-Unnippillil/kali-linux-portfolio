import { useEffect, useMemo, useRef, useState } from 'react';
import tools from '../../data/kali-tools.json';

const badgeClass =
  'inline-block rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function ToolsPage() {
  const sectionRefs = useRef<Record<string, HTMLHeadingElement | null>>({});
  const firstLetter = tools[0]?.name?.[0]?.toUpperCase() ?? 'A';
  const [activeLetter, setActiveLetter] = useState(firstLetter);

  const groupedTools = useMemo(() => {
    return tools.reduce<Record<string, typeof tools>>((acc, tool) => {
      const letter = tool.name[0].toUpperCase();
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(tool);
      return acc;
    }, {});
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const letter = entry.target.getAttribute('data-letter');
            if (letter) setActiveLetter(letter);
          }
        });
      },
      { rootMargin: '0px 0px -80% 0px' },
    );

    LETTERS.forEach((letter) => {
      const ref = sectionRefs.current[letter];
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex p-4">
      <ul className="flex-1 space-y-8">
        {LETTERS.map((letter) => {
          const items = groupedTools[letter];
          if (!items) return null;
          return (
            <li key={letter} className="scroll-mt-20">
              <h2
                id={letter}
                ref={(el) => {
                  sectionRefs.current[letter] = el;
                }}
                data-letter={letter}
                tabIndex={-1}
                className="sticky top-0 z-10 bg-white py-2 text-xl font-semibold dark:bg-gray-900"
              >
                {letter}
              </h2>
              <ul className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {items.map((tool) => (
                  <li key={tool.id}>
                    <a
                      href={`https://www.kali.org/tools/${tool.id}/`}
                      className="block rounded border p-4 focus:outline-none focus:ring"
                    >
                      <h3 className="text-base font-semibold sm:text-lg md:text-xl">
                        {tool.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={`https://gitlab.com/kalilinux/packages/${tool.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={badgeClass}
                        >
                          Source
                        </a>
                        <a
                          href={`https://www.kali.org/tools/${tool.id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={badgeClass}
                        >
                          Package
                        </a>
                        <span className={badgeClass}>{`$ apt install ${tool.id}`}</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <nav
        aria-label="Alphabet"
        className="fixed right-2 top-1/2 hidden -translate-y-1/2 flex-col space-y-1 sm:flex"
      >
        {LETTERS.map((letter) => {
          const disabled = !groupedTools[letter];
          return (
            <a
              key={letter}
              href={disabled ? undefined : `#${letter}`}
              onClick={() => sectionRefs.current[letter]?.focus()}
              tabIndex={disabled ? -1 : 0}
              className={`rounded px-2 py-1 text-sm focus:outline-none focus:ring ${
                activeLetter === letter ? 'bg-blue-600 text-white' : 'text-gray-500'
              } ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
            >
              {letter}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

