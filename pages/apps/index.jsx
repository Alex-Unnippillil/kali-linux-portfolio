import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const AppGrid = dynamic(() => import('../../components/apps/app-grid'), {
  ssr: false,
});

const AppsPage = () => {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('run');
  const [focusedIndex, setFocusedIndex] = useState(0);

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

  useEffect(() => {
    if (focusedIndex >= filteredApps.length) {
      setFocusedIndex(0);
    }
  }, [filteredApps, focusedIndex]);

  const handleKeyDown = (e) => {
    if (mode !== 'run') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filteredApps.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      const app = filteredApps[focusedIndex];
      if (app) router.push(`/apps/${app.id}`);
    }
  };

  return (
    <div className="p-4" onKeyDown={handleKeyDown}>
      <div className="mb-4 flex items-center justify-between">
        <label htmlFor="app-search" className="sr-only">
          Search apps
        </label>
        <input
          id="app-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps"
          className="w-full rounded border p-2"
        />
        <button
          className="ml-2 rounded border px-3 py-1"
          onClick={() => setMode(mode === 'run' ? 'finder' : 'run')}
        >
          {mode === 'run' ? 'Finder' : 'Run'}
        </button>
      </div>
      {mode === 'run' ? (
        <ul tabIndex={0} className="outline-none">
          {filteredApps.map((app, idx) => (
            <li key={app.id}>
              <Link
                href={`/apps/${app.id}`}
                className={`block rounded border p-2 ${
                  idx === focusedIndex ? 'bg-gray-200' : ''
                }`}
              >
                {app.icon && (
                  <Image
                    src={app.icon}
                    alt=""
                    width={24}
                    height={24}
                    sizes="24px"
                    className="mr-2 inline-block align-middle"
                  />
                )}
                <span className="align-middle">{app.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="h-[80vh]">
          <AppGrid openApp={(id) => router.push(`/apps/${id}`)} />
        </div>
      )}
    </div>
  );
};

export default AppsPage;

