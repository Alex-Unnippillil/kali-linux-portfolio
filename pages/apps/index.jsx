import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import usePersistedState from '../../hooks/usePersistedState';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [favorites, setFavorites] = usePersistedState('app-favorites', []);
  const [history, setHistory] = usePersistedState('app-history', []);

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

  const categories = useMemo(
    () => ['All', 'Favorites', 'History', ...Array.from(new Set(apps.map((a) => a.category)))],
    [apps],
  );

  const handleOpen = (id) => {
    setHistory((prev) => {
      const updated = [id, ...prev.filter((h) => h !== id)];
      return updated.slice(0, 20);
    });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  let catFiltered;
  if (category === 'Favorites') {
    catFiltered = apps.filter((app) => favorites.includes(app.id));
  } else if (category === 'History') {
    catFiltered = history
      .map((id) => apps.find((app) => app.id === id))
      .filter(Boolean);
  } else if (category === 'All') {
    catFiltered = apps;
  } else {
    catFiltered = apps.filter((app) => app.category === category);
  }

  const filteredApps = catFiltered.filter(
    (app) => !app.disabled && app.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="p-4">
      <label htmlFor="app-category" className="sr-only">
        Filter by category
      </label>
      <select
        id="app-category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="mb-4 w-full rounded border p-2"
      >
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
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
      <div
        id="app-grid"
        tabIndex="-1"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {filteredApps.map((app) => (
          <div key={app.id} className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(app.id);
              }}
              aria-label="Toggle favorite"
              className="absolute right-1 top-1"
            >
              {favorites.includes(app.id) ? '★' : '☆'}
            </button>
            <Link
              href={`/apps/${app.id}`}
              onClick={() => handleOpen(app.id)}
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
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

