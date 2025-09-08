import Head from 'next/head';
import { useState } from 'react';
import tools from '../../../data/kali-tools.json';

const badgeClass =
  'inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold leading-tight text-gray-800 transition-colors hover:bg-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600';

const KaliToolsPage = () => {
  const [query, setQuery] = useState('');
  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(query.toLowerCase()),
  );

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
      <div className="p-4">
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredTools.map((tool) => (
            <a
              key={tool.id}
              href={`https://www.kali.org/tools/${tool.id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center rounded border p-4 text-center leading-tight hover:bg-gray-50 focus:outline-none focus:ring dark:hover:bg-gray-800"
            >
              <span className="font-semibold leading-tight">{tool.name}</span>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
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
          ))}
        </div>
      </div>
    </>
  );
};

export default KaliToolsPage;
