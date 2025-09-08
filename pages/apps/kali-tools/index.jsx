import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import tools from '../../../data/kali-tools.json';

const KaliToolsPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const letters = useMemo(
    () =>
      Array.from(
        new Set(tools.map((t) => t.name[0].toUpperCase())),
      ).sort(),
    [],
  );

  const [filters, setFilters] = useState([]);

  // restore filters from query params on load
  useEffect(() => {
    if (!router.isReady) return;
    const { letters: qs } = router.query;
    if (typeof qs === 'string' && qs) {
      setFilters(qs.split(',').map((l) => l.toUpperCase()));
    }
  }, [router.isReady, router.query]);

  // sync filters with query params for deep links
  useEffect(() => {
    if (!router.isReady) return;
    const q = { ...router.query };
    if (filters.length) {
      q.letters = filters.join(',');
    } else {
      delete q.letters;
    }
    router.replace({ pathname: router.pathname, query: q }, undefined, {
      shallow: true,
    });
  }, [filters, router]);

  const toggleFilter = (l) => {
    setFilters((prev) =>
      prev.includes(l) ? prev.filter((f) => f !== l) : [...prev, l],
    );
  };

  const filteredTools = tools.filter((tool) => {
    const matchQuery = tool.name.toLowerCase().includes(query.toLowerCase());
    const matchFilter =
      filters.length === 0 || filters.includes(tool.name[0].toUpperCase());
    return matchQuery && matchFilter;
  });

  return (
    <div className="p-4">
      <div className="sticky top-0 z-10 bg-white pb-4">
        <label htmlFor="tool-search" className="sr-only">
          Search tools
        </label>
        <input
          id="tool-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools"
          className="mb-2 w-full rounded border p-2"
        />
        <div className="flex flex-wrap gap-2 overflow-auto">
          <button
            onClick={() => setFilters([])}
            className={`px-2 py-1 text-sm rounded border ${
              filters.length === 0
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            All
          </button>
          {letters.map((l) => (
            <button
              key={l}
              onClick={() => toggleFilter(l)}
              className={`px-2 py-1 text-sm rounded border ${
                filters.includes(l)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
  );
};

export default KaliToolsPage;
