'use client';

import React, { useMemo, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';

interface AppEntry {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
  screen?: { prefetch?: boolean };
  cat?: string;
}

const AppMenuDrawer: React.FC = () => {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const allApps: AppEntry[] = useMemo(() => {
    const addCat = (list: AppEntry[], cat: string) => list.map((a) => ({ ...a, cat }));
    return [
      ...addCat(apps as any, 'apps'),
      ...addCat(utilities as any, 'utilities'),
      ...addCat(games as any, 'games'),
    ];
  }, []);

  const filtered = allApps.filter(
    (a) =>
      (category === 'all' || a.cat === category) &&
      a.title.toLowerCase().includes(query.toLowerCase()),
  );

  const closeMenu = () => {
    document.getElementById('appmenu')?.setAttribute('hidden', '');
  };

  return (
    <div
      id="appmenu"
      className="appmenu fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 p-4"
      hidden
    >
      <div className="mb-4 flex w-full max-w-md gap-2">
        <input
          id="appmenu-search"
          type="search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
        />
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-2 py-1 rounded bg-black bg-opacity-20"
        >
          <option value="all">All</option>
          <option value="utilities">Utilities</option>
          <option value="games">Games</option>
        </select>
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMenu}
          className="px-2 py-1 rounded bg-black bg-opacity-20"
        >
          ✕
        </button>
      </div>
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
        {filtered.map((app) => (
          <li key={app.id} data-cat={app.cat}>
            <UbuntuApp
              id={app.id}
              icon={app.icon}
              name={app.title}
              openApp={() => {
                window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
                closeMenu();
              }}
              disabled={app.disabled}
              prefetch={app.screen?.prefetch}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AppMenuDrawer;

