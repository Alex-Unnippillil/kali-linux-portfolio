import Head from 'next/head';
import { useState } from 'react';
import tools from '../../../data/kali-tools.json';

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
              className="flex flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
            >
              <span>{tool.name}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
};

export default KaliToolsPage;
