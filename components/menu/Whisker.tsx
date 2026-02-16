import React, { useState, useMemo } from 'react';
import apps from '@/data/apps.json';

type App = {
  id: string;
  name: string;
  description: string;
};

type HighlightResult = {
  matched: boolean;
  nodes: React.ReactNode[];
};

function fuzzyHighlight(text: string, query: string): HighlightResult {
  const q = query.toLowerCase();
  let qi = 0;
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      nodes.push(<mark key={i}>{ch}</mark>);
      qi++;
    } else {
      nodes.push(ch);
    }
  }

  return { matched: qi === q.length, nodes };
}

export default function Whisker() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const typed = query.trim();
    if (!typed) {
      return (apps as App[]).map((app) => ({ ...app, nodes: [app.name] }));
    }
    return (apps as App[])
      .map((app) => {
        const { matched, nodes } = fuzzyHighlight(app.name, typed);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean) as (App & { nodes: React.ReactNode[] })[];
  }, [query]);

  return (
    <div className="p-4">
      <input
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring"
        placeholder="Search applications..."
        aria-label="Search applications"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="space-y-2">
        {filtered.map((app) => (
          <li key={app.id} className="text-white">
            {app.nodes}
          </li>
        ))}
      </ul>
    </div>
  );
}
