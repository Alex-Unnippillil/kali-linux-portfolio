import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DelayedTooltip from '../../components/ui/DelayedTooltip';
import AppTooltipContent from '../../components/ui/AppTooltipContent';
import {
  type AppEntry,
  type AppMetadata,
  buildAppMetadata,
  loadAppRegistry,
} from '../../lib/appRegistry';
import { buildAppRoute } from '../../utils/routes';

const AppsPage = () => {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [query, setQuery] = useState('');
  const [metadata, setMetadata] = useState<Record<string, AppMetadata>>({});

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
        aria-label="Search apps"
        className="mb-4 w-full rounded border p-2"
      />
      <div
        id="app-grid"
        tabIndex={-1}
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
                    href={buildAppRoute({ appId: app.id })}
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
    </div>
  );
};

export default AppsPage;

