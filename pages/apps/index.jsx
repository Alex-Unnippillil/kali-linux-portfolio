import { useEffect, useState } from 'react';
import AppTile from '../../components/apps/AppTile';

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
          <AppTile
            key={app.id}
            id={app.id}
            title={app.title}
            icon={app.icon}
            href={`/apps/${app.id}`}
            offlineCapable={Boolean(app.offlineCapable)}
          />
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

