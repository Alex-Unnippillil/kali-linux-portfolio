import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');

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

  const fuse = useMemo(
    () =>
      new Fuse(apps, {
        keys: ['title', 'keywords'],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [apps],
  );

  const filteredApps = useMemo(() => {
    if (!query) return apps.filter((app) => !app.disabled);
    return fuse.search(query).map((r) => r.item).filter((app) => !app.disabled);
  }, [apps, fuse, query]);

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
            data-keywords={app.keywords}
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
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

