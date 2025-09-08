import { useEffect, useRef, useState } from 'react';

interface ToolResult {
  id: string;
  title: string;
  url: string;
}

export default function ToolSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ToolResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    let ignore = false;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        const toolMatches = (data as any[])
          .filter((r) => r.section === 'tools')
          .slice(0, 5);
        setResults(toolMatches);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (!ignore) setResults([]);
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        window.location.href = results[activeIndex].url;
      }
    } else if (e.key === 'Escape') {
      setResults([]);
    }
  };

  return (
    <div className="relative mb-4">
      <label htmlFor="tool-search" className="sr-only">
        Search tools
      </label>
      <input
        id="tool-search"
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search tools"
        className="w-full rounded border p-2"
        aria-label="Search tools"
        aria-autocomplete="list"
        aria-controls="tool-search-results"
        aria-expanded={results.length > 0}
      />
      {results.length > 0 && (
        <ul
          id="tool-search-results"
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow-md dark:bg-gray-800"
        >
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === activeIndex}>
              <a
                href={r.url}
                className={`block rounded px-2 py-1 text-sm focus:outline-none focus:ring hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  i === activeIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {r.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

