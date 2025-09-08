import { useState } from 'react';
import type { Tool } from '../../types/tool';
import toolsData from '../../data/tools.json';

const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

const tools = toolsData as Tool[];

const ToolsPage = () => {
  const [active, setActive] = useState<string | null>(null);

  const categories = tools.reduce<Record<string, number>>((acc, tool) => {
    acc[tool.category] = (acc[tool.category] || 0) + 1;
    return acc;
  }, {});

  const filtered = active ? tools.filter(t => t.category === active) : tools;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(categories).map(([category, count]) => (
          <button
            key={category}
            onClick={() => setActive(category)}
            className="rounded border px-2 py-1 text-sm"
          >
            {category} ({count})
          </button>
        ))}
      </div>
      <div id="tools-grid" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map(tool => (
          <a
            key={tool.name}
            href={`/tools/${slugify(tool.name)}`}
            className="rounded border p-4 text-center"
          >
            {tool.name}
          </a>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
