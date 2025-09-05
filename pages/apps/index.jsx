import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import kaliMenu from '../../data/kali-menu.json';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const idToCategory = useMemo(() => {
    const map = {};
    Object.entries(kaliMenu).forEach(([cat, tools]) => {
      tools.forEach((tool) => {
        map[tool.id] = cat;
      });
    });
    return map;
  }, []);
  const categories = ['All', ...Object.keys(kaliMenu)];
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let isMounted = true;
    import('../../apps.config').then((mod) => {
      if (isMounted) {
        setApps(mod.default);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredApps = apps.filter((app) => {
    if (app.disabled) return false;
    const matchesQuery = app.title.toLowerCase().includes(query.toLowerCase());
    const cat = idToCategory[app.id];
    const matchesCategory = activeCategory === 'All' || cat === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="p-4">
      <label htmlFor="app-search" className="sr-only">
        Search apps
      </label>
      <input
        id="app-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search apps"
        className="mb-4 w-full rounded border p-2"
      />
      <nav aria-label="Kali categories" className="mb-4">
        <ul className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <li key={cat}>
              <button
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded px-2 py-1 text-sm ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-black'
                }`}
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div
        id="app-grid"
        tabIndex="-1"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {filteredApps.map((app) => (
          <Link
            key={app.id}
            href={`/apps/${app.id}`}
            className="flex flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
            aria-label={app.title}
          >
            {app.icon && (
              <Image
                src={app.icon}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="h-16 w-16"
              />
            )}
            <span className="mt-2">{app.title}</span>
            {idToCategory[app.id] && (
              <span className="mt-1 text-xs text-gray-500">
                {idToCategory[app.id]}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

