'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import apps, { games } from '../../apps.config';
import ResponsiveGrid from '../util-components/ResponsiveGrid';

interface AppEntry {
  id: string;
  title: string;
  icon: string;
  tags?: string[];
}

const allEntries: AppEntry[] = [
  ...apps.map((a: AppEntry) => ({ ...a, tags: ['App', ...(a.tags || [])] })),
  ...games.map((g: AppEntry) => ({ ...g, tags: ['Game', ...(g.tags || [])] })),
];

export default function AllApps() {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('All');

  const tags = useMemo(
    () => ['All', ...Array.from(new Set(allEntries.flatMap(e => e.tags || [])))],
    []
  );

  const filtered = useMemo(
    () =>
      allEntries.filter(
        a =>
          (tag === 'All' || (a.tags || []).includes(tag)) &&
          a.title.toLowerCase().includes(search.toLowerCase())
      ),
    [tag, search]
  );

  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-panel text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-2 py-1 rounded bg-gray-800 text-white flex-grow"
        />
        <div className="flex flex-wrap gap-2">
          {tags.map(t => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-2 py-0.5 text-sm rounded ${
                tag === t ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-center">No apps found.</p>
      ) : (
        <ResponsiveGrid>
          {filtered.map(app => (
            <Link
              key={app.id}
              href={`/apps/${app.id}`}
              className="flex flex-col items-center p-2 rounded hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
              prefetch={false}
            >
              <Image
                src={app.icon.replace('./', '/')}
                alt={app.title}
                width={64}
                height={64}
                className="mb-1"
                loading="lazy"
                sizes="64px"
              />
              <span className="text-xs text-center">{app.title}</span>
            </Link>
          ))}
        </ResponsiveGrid>
      )}
    </div>
  );
}

export const displayAllApps = () => <AllApps />;

