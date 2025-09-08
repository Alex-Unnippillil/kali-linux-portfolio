import { useState } from 'react';
import tools from '../../data/tools.json';

interface Tool {
  id: string;
  name: string;
  category: string;
  packages: { name: string; version?: string }[];
  commands: { label?: string; cmd: string }[];
}

type View = 'card' | 'table';

export default function ToolsPage() {
  const [view, setView] = useState<View>('card');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toolsData = tools as Tool[];
  const categories = Array.from(new Set(toolsData.map((t) => t.category)));

  const categoryCounts = categories.map((cat) => ({
    cat,
    count: toolsData.filter((t) => t.category === cat).length,
  }));

  const filtered = toolsData.filter((t) =>
    activeCategory ? t.category === activeCategory : true,
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {categoryCounts.map(({ cat, count }) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded border px-2 py-1 text-sm ${
              activeCategory === cat ? 'bg-blue-600 text-white' : ''
            }`}
          >
            {cat} ({count})
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            aria-label="Card view"
            onClick={() => setView('card')}
            className={`rounded border px-2 py-1 text-sm ${
              view === 'card' ? 'bg-gray-200' : ''
            }`}
          >
            Card
          </button>
          <button
            aria-label="Table view"
            onClick={() => setView('table')}
            className={`rounded border px-2 py-1 text-sm ${
              view === 'table' ? 'bg-gray-200' : ''
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {view === 'card' ? (
        <ul
          id="tools-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
        >
          {filtered.map((tool) => (
            <li key={tool.id} className="rounded border p-4">
              <h3 className="font-semibold">{tool.name}</h3>
              <p className="mt-1 text-sm">Category: {tool.category}</p>
              {tool.packages && tool.packages.length > 0 && (
                <p className="mt-2 text-sm">
                  Packages: {tool.packages.map((p) => p.name).join(', ')}
                </p>
              )}
              {tool.commands && tool.commands.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {tool.commands.map((c, i) => (
                    <li key={i}>
                      <code>{c.cmd}</code>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table id="tools-grid" className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Category</th>
                <th className="border px-2 py-1 text-left">Packages</th>
                <th className="border px-2 py-1 text-left">Commands</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool) => (
                <tr key={tool.id}>
                  <td className="border px-2 py-1">{tool.name}</td>
                  <td className="border px-2 py-1">{tool.category}</td>
                  <td className="border px-2 py-1">
                    {tool.packages.map((p) => p.name).join(', ')}
                  </td>
                  <td className="border px-2 py-1">
                    <ul className="space-y-1">
                      {tool.commands.map((c, i) => (
                        <li key={i}>
                          <code>{c.cmd}</code>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

