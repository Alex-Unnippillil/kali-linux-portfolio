import { useEffect, useState } from 'react';

interface Tool {
  id: string;
  name: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/tools')
      .then((res) => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then((data: Tool[]) => setTools(data))
      .catch(() => setError('Failed to load tools.'))
      .finally(() => setLoading(false));
  }, [retry]);

  const filtered = tools.filter((tool) =>
    tool.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
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

      {error ? (
        <div className="flex items-center text-gray-500">
          <span aria-hidden="true" className="mr-2">
            ⚠️
          </span>
          <span className="mr-4">Unable to fetch tools.</span>
          <button
            onClick={() => setRetry((r) => r + 1)}
            className="rounded border px-2 py-1 text-sm"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center text-gray-500">
          <span aria-hidden="true" className="mr-2">
            🔍
          </span>
          <span>No tools match your search.</span>
        </div>
      ) : (
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
              className="flex flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
            >
              <span>{tool.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
