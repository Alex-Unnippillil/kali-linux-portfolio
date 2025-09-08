import Head from 'next/head';
import { useMemo, useState } from 'react';
import tools from '../../../data/kali-tools.json';
import LetterRail from '../../../components/tools/LetterRail';

const letters = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

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
                    <span>{tool.name}</span>
                  </a>
                ))}
              </div>
            </section>
          ) : null,
        )}
        <LetterRail letters={letters} grouped={grouped} />
      </div>
    </>
  );
};

export default KaliToolsPage;
