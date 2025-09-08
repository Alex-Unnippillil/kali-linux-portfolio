import Head from 'next/head';
import { useMemo, useState } from 'react';
import tools from '../../../data/kali-tools.json';

const letters = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

const metaBadgeClass =
  'ml-1 rounded bg-gray-200 px-1 text-[0.65rem] font-medium text-gray-700';

const KaliToolsPage = () => {
  const [query, setQuery] = useState('');
  const filteredTools = useMemo(
    () =>
      tools.filter((tool) =>
        tool.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  const grouped = useMemo(() => {
    return filteredTools.reduce((acc, tool) => {
      const letter = tool.name[0].toUpperCase();
      (acc[letter] ||= []).push(tool);
      return acc;
    }, {});
  }, [filteredTools]);

  const softwareLd = filteredTools.map((tool) => ({
    '@type': 'SoftwareApplication',
    name: tool.name,
    url: `https://www.kali.org/tools/${tool.id}/`,
  }));

  const handleScroll = (letter) => {
    const el = document.getElementById(`section-${letter}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': softwareLd,
            }),
          }}
        />
      </Head>
      <div className="relative p-4">
        <label htmlFor="tool-search" className="sr-only">
          Search tools
        </label>
        <input
          id="tool-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools"
          className="mb-4 w-full rounded border p-2"
        />
        {letters.map((letter) =>
          grouped[letter] ? (
            <section key={letter} id={`section-${letter}`} className="mb-8">
              <h2 className="mb-2 text-xl font-bold">{letter}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {grouped[letter].map((tool) => (
                  <a
                    key={tool.id}
                    href={`https://www.kali.org/tools/${tool.id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
                  >
                    <span className="flex items-center justify-center">
                      {tool.name}
                      {tool.version && (
                        <span className={metaBadgeClass}>{`v${tool.version}`}</span>
                      )}
                      {tool.updated && (
                        <span className={metaBadgeClass}>Updated</span>
                      )}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ) : null,
        )}
        <nav
          aria-label="Alphabet navigation"
          className="fixed right-2 top-1/2 -translate-y-1/2"
        >
          <ul className="flex flex-col items-center space-y-1">
            {letters.map((letter) => {
              const disabled = !grouped[letter];
              return (
                <li key={letter}>
                  <button
                    type="button"
                    aria-label={`Jump to ${letter} section`}
                    aria-disabled={disabled}
                    disabled={disabled}
                    onClick={() => !disabled && handleScroll(letter)}
                    className={`h-6 w-6 text-xs ${
                      disabled
                        ? 'cursor-default text-gray-400'
                        : 'text-blue-600 hover:underline'
                    }`}
                  >
                    {letter}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default KaliToolsPage;
