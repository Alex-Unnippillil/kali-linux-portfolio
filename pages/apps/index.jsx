import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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
      <ul id="app-grid" tabIndex="-1" className="space-y-1">
        {filteredApps.map((app) => {
          const hasSubmenu = Array.isArray(app.submenu) && app.submenu.length > 0;

          return (
            <li
              key={app.id}
              className="h-8 px-2 flex items-center rounded hover:bg-kali-menu-hover focus-within:bg-kali-menu-hover"
            >
              <Link
                href={`/apps/${app.id}`}
                className="flex w-full items-center gap-2 focus:outline-none focus:ring"
                aria-label={app.title}
              >
                {app.icon && (
                  <Image
                    src={app.icon}
                    alt=""
                    width={18}
                    height={18}
                    sizes="18px"
                    className="h-[18px] w-[18px]"
                  />
                )}
                <span className="flex-1 text-left text-sm">{app.title}</span>
                {hasSubmenu && (
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-kali-subtle"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AppsPage;

