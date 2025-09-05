import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const CATEGORY_LABELS = {
    '802-11': '802.11',
    bluetooth: 'Bluetooth',
    'reverse-engineering': 'Reverse Engineering',
  };

  const categories = useMemo(
    () => Array.from(new Set(apps.flatMap((a) => a.categories || []))),
    [apps],
  );

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
    (app) =>
      !app.disabled &&
      app.title.toLowerCase().includes(query.toLowerCase()) &&
      (!category || (app.categories || []).includes(category)),
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
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('')}
          className={`px-2 py-1 rounded ${
            category === '' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-2 py-1 rounded ${
              category === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>
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
            {app.categories && (
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {app.categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/metapackages/${cat}`}
                    className={`px-2 py-0.5 text-xs rounded ${
                      category === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </Link>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

