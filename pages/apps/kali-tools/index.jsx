import { useState } from 'react';
import tools from '../../../data/kali-tools.json';

const KaliToolsPage = () => {
  const [query, setQuery] = useState('');
  const hasError = !Array.isArray(tools);
  const filteredTools = hasError
    ? []
    : tools.filter((tool) =>
        tool.name.toLowerCase().includes(query.toLowerCase()),
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
      {hasError ? (
        <p
          role="alert"
          className="mt-4 text-center text-sm text-red-600"
        >
          Unable to load tools.
        </p>
      ) : filteredTools.length === 0 ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-center text-sm text-gray-500"
        >
          No tools found.
        </p>
      ) : (
        <div
          id="tools-grid"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
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
      )}
    </div>
  );
};

export default KaliToolsPage;
