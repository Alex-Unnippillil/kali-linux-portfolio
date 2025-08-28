import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AppConfig {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
}

const AppsPage = () => {
  const [apps, setApps] = useState<AppConfig[]>([]);
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredApps.map((app) => (
          <Link
            key={app.id}
            href={`/apps/${app.id}`}
            className="flex flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
            aria-label={app.title}
          >
            {app.icon && <img src={app.icon} alt="" className="h-16 w-16" />}
            <span className="mt-2">{app.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

