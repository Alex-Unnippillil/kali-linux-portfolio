import { useState, useEffect, useMemo } from 'react';
import toolsData from '../../data/kali-tools.json';

interface Tool {
  id: string;
  name: string;
}

interface CategorizedTool extends Tool {
  category: string;
}

// Map tool ids to categories. Tools not listed fall under "Other".
const CATEGORY_MAP: Record<string, string> = {
  amap: 'Information Gathering',
  dmitry: 'Information Gathering',
  dnsrecon: 'Information Gathering',
  gobuster: 'Information Gathering',
  'recon-ng': 'Information Gathering',
  theharvester: 'Information Gathering',
  maltego: 'Information Gathering',
  'aircrack-ng': 'Wireless',
  kismet: 'Wireless',
  wifite: 'Wireless',
  burpsuite: 'Web Application Analysis',
  nikto: 'Web Application Analysis',
  wpscan: 'Web Application Analysis',
  cewl: 'Password Attacks',
  crunch: 'Password Attacks',
  fcrackzip: 'Password Attacks',
  hashcat: 'Password Attacks',
  hashid: 'Password Attacks',
  hydra: 'Password Attacks',
  john: 'Password Attacks',
};

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const ToolsPage = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  const tools: CategorizedTool[] = useMemo(
    () =>
      (toolsData as Tool[]).map((t) => ({
        ...t,
        category: CATEGORY_MAP[t.id as keyof typeof CATEGORY_MAP] || 'Other',
      })),
    [],
  );

  const categoryCounts = useMemo(() => {
    return tools.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});
  }, [tools]);

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      const matchesQuery = tool.name
        .toLowerCase()
        .includes(debouncedQuery.toLowerCase());
      const matchesCategory =
        activeCategories.length === 0 || activeCategories.includes(tool.category);
      return matchesQuery && matchesCategory;
    });
  }, [debouncedQuery, activeCategories, tools]);

  return (
    <div className="p-4">
      <label htmlFor="tool-search" className="sr-only">
        Search tools
      </label>
      <input
        id="tool-search"
        type="search"
        aria-label="Search tools"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tools"
        className="mb-4 w-full rounded border p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(categoryCounts).map(([cat, count]) => {
          const active = activeCategories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`rounded-full border px-3 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <div
        id="tools-grid"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {filtered.map((tool) => (
          <a
            key={tool.id}
            href={`https://www.kali.org/tools/${tool.id}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center rounded border p-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <span>{tool.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;

