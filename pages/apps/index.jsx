import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const AppGrid = dynamic(() => import('../../components/apps/app-grid'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const AppsPage = () => {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('run');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    let isMounted = true;
    import('../../apps.config').then((mod) => {
      if (!isMounted) return;
      const list = mod.default.map((app) => {
        let id = app.id;
        try {
          const fn = app.screen?.toString?.();
          const match = fn && fn.match(/components\/apps\/([^"']+)/);
          if (match) {
            const dynId = match[1].replace(/\/index$/, '');
            id = dynId
              .split('/')
              .pop()
              .replace(/([a-z])([A-Z])/g, '$1-$2')
              .replace(/_/g, '-')
              .toLowerCase();
          }
        } catch (err) {
          // ignore parsing errors and fall back to existing id
        }
        return { ...app, id };
      });
      setApps(list);
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

  useEffect(() => {
    const updateColumns = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth;
      if (width >= 1024) setColumnCount(6);
      else if (width >= 768) setColumnCount(4);
      else if (width >= 640) setColumnCount(3);
      else setColumnCount(2);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.focus();
  }, [focusedIndex, filteredApps]);

  const handleKeyDown = (e) => {
    if (mode !== 'run') return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filteredApps.length - 1));
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) =>
        Math.min(i + columnCount, filteredApps.length - 1),
      );
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - columnCount, 0));
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
        <div
          ref={containerRef}
          tabIndex={0}
          className="outline-none flex justify-center"
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(120px, 1fr))`,
            }}
          >
            {filteredApps.map((app, idx) => (
              <button
                key={app.id}
                ref={(el) => (itemRefs.current[idx] = el)}
                className={`relative flex flex-col items-center rounded border p-4 focus:outline-none ${
                  idx === focusedIndex ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => router.push(`/apps/${app.id}`)}
                tabIndex={idx === focusedIndex ? 0 : -1}
                onFocus={() => setFocusedIndex(idx)}
                type="button"
              >
                {app.icon && (
                  <Image
                    src={app.icon}
                    alt=""
                    width={48}
                    height={48}
                    sizes="48px"
                  />
                )}
                <span className="mt-2 text-sm text-center">{app.title}</span>
                {app.favourite && (
                  <span className="absolute top-1 right-1 text-yellow-400 text-xs">
                    ★
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[80vh]">
          <AppGrid openApp={(id) => router.push(`/apps/${id}`)} />
        </div>
      )}
    </div>
  );
};

export default AppsPage;

