import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../../components/base/Icon';

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

  const filteredApps = apps.filter(
    (app) => !app.disabled && app.title.toLowerCase().includes(query.toLowerCase()),
  );

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
          >
            {app.icon && (
              <Icon name={app.icon} size={32} className="h-8 w-8" title={app.title} />
            )}
            <span className="mt-2">{app.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

