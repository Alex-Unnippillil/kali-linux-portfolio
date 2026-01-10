import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DelayedTooltip from '../../components/ui/DelayedTooltip';
import AppTooltipContent from '../../components/ui/AppTooltipContent';
import {
  buildAppMetadata,
  loadAppRegistry,
} from '../../lib/appRegistry';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { apps: registry, metadata: registryMeta } = await loadAppRegistry();
      if (!isMounted) return;
      setApps(registry);
      setMetadata(registryMeta);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          !app.disabled &&
          app.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [apps, query],
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
        {filteredApps.map((app) => {
          const meta = metadata[app.id] ?? buildAppMetadata(app);
          return (
            <DelayedTooltip
              key={app.id}
              content={<AppTooltipContent meta={meta} />}
            >
              {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
                <div
                  ref={ref}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  className="flex flex-col items-center"
                >
                  <Link
                    href={`/apps/${app.id}`}
                    className="flex h-full w-full flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
                    aria-label={app.title}
                    onFocus={onFocus}
                    onBlur={onBlur}
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
                </div>
              )}
            </DelayedTooltip>
          );
        })}
      </div>
      <footer className="mt-8 text-center text-sm text-gray-500">
        <Link
          href="/input-hub"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Request a Tool
        </Link>
        {' | '}
        <Link
          href="/dummy-form"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Request a Feature
        </Link>
      </footer>
    </div>
  );
};

export default AppsPage;

