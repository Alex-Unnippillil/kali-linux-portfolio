import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

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
    const links = listRef.current?.querySelectorAll('li a');
    if (!links || links.length === 0) return;
    const safeIndex = Math.min(index, links.length - 1);
    if (safeIndex !== index) {
      setIndex(safeIndex);
      return;
    }
    links.forEach((link, i) => {
      link.tabIndex = i === safeIndex ? 0 : -1;
    });
    links[safeIndex]?.focus();
  }, [index, filteredApps]);

  const handleKeyDown = (e) => {
    const links = listRef.current?.querySelectorAll('li a');
    if (!links || links.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, links.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      links[index]?.click();
    }
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
        ref={listRef}
        onKeyDown={handleKeyDown}
        className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {filteredApps.map((app) => (
          <li key={app.id}>
            <Link
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
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AppsPage;

