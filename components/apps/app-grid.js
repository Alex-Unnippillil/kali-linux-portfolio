import React, { useState, useMemo } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';

function fuzzyHighlight(text, query) {
  const q = query.toLowerCase();
  let qi = 0;
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      result.push(<mark key={i}>{ch}</mark>);
      qi++;
    } else {
      result.push(ch);
    }
  }
  return { matched: qi === q.length, nodes: result };
}

export default function AppGrid({ openApp }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return apps.map(app => ({ ...app, nodes: app.title }));
    return apps
      .map(app => {
        const { matched, nodes } = fuzzyHighlight(app.title, query);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean);
  }, [query]);

  return (
    <div className="flex flex-col items-center">
      <input
        className="mb-6 mt-4 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
        {filtered.map(app => (
          <UbuntuApp
            key={app.id}
            id={app.id}
            icon={app.icon}
            name={app.title}
            displayName={<>{app.nodes}</>}
            openApp={() => openApp && openApp(app.id)}
          />
        ))}
      </div>
    </div>
  );
}
