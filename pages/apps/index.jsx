import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { safeLocalStorage } from '../../utils/safeStorage';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState([]);

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

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      const favs = JSON.parse(safeLocalStorage.getItem('kali:favs') || '[]');
      setFavorites(Array.isArray(favs) ? favs : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  const toggleFavorite = (href) => {
    setFavorites((prev) => {
      const exists = prev.includes(href);
      const updated = exists ? prev.filter((h) => h !== href) : [...prev, href];
      safeLocalStorage?.setItem('kali:favs', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredApps = apps.filter(
    (app) => !app.disabled && app.title.toLowerCase().includes(query.toLowerCase()),
  );

  const favApps = filteredApps.filter((app) =>
    favorites.includes(`/apps/${app.id}`),
  );
  const otherApps = filteredApps.filter(
    (app) => !favorites.includes(`/apps/${app.id}`),
  );

  const renderApp = (app) => {
    const href = `/apps/${app.id}`;
    const isFav = favorites.includes(href);
    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFavorite(href);
      }
    };
    return (
      <li key={app.id} className="relative">
        <Link
          href={href}
          className="relative flex flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
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
          <span
            role="button"
            tabIndex={0}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute right-1 top-1 text-yellow-400"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(href);
            }}
            onKeyDown={handleKey}
          >
            {isFav ? '★' : '☆'}
          </span>
        </Link>
      </li>
    );
  };

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
      <ul
        id="appList"
        tabIndex="-1"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {favApps.length > 0 && (
          <>
            <li key="fav-heading" className="col-span-full">
              <h2 className="mb-2 text-xl">Favorites</h2>
            </li>
            {favApps.map(renderApp)}
            <li key="all-heading" className="col-span-full">
              <h2 className="mt-4 mb-2 text-xl">All Apps</h2>
            </li>
          </>
        )}
        {otherApps.map(renderApp)}
      </ul>
    </div>
  );
};

export default AppsPage;

