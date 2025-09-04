"use client";

import { useMemo, useState } from 'react';

export interface AppItem {
  id: string;
  name: string;
  category: string;
  favorite?: boolean;
  recent?: boolean;
}

interface WhiskerProps {
  apps: AppItem[];
}

const staticCategories = ['Favorites', 'Recently Used', 'All Applications'] as const;

type StaticCategory = (typeof staticCategories)[number];

type Category = StaticCategory | string;

const Whisker: React.FC<WhiskerProps> = ({ apps }) => {
  const [active, setActive] = useState<Category>('All Applications');

  const categories = useMemo(() => {
    const toolCats = Array.from(new Set(apps.map((a) => a.category))).sort();
    return [...staticCategories, ...toolCats];
  }, [apps]);

  const filteredApps = useMemo(() => {
    if (active === 'Favorites') return apps.filter((a) => a.favorite);
    if (active === 'Recently Used') return apps.filter((a) => a.recent);
    if (active === 'All Applications') return apps;
    return apps.filter((a) => a.category === active);
  }, [active, apps]);

  return (
    <div className="flex h-full">
      <nav className="w-48 border-r border-gray-700">
        <ul>
          {categories.map((cat) => (
            <li key={cat}>
              <button
                type="button"
                onClick={() => setActive(cat)}
                aria-current={active === cat ? 'true' : undefined}
                className={`w-full text-left px-2 py-1 hover:bg-gray-700 ${
                  active === cat ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 p-2 grid grid-cols-2 gap-2 overflow-auto">
        {filteredApps.map((app) => (
          <div key={app.id} className="p-2 border border-gray-700 rounded">
            {app.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Whisker;

