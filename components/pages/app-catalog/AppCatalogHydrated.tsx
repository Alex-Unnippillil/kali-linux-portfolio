'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useMemo, useState, useTransition } from 'react';
import DelayedTooltip from '../../ui/DelayedTooltip';
import AppTooltipContent from '../../ui/AppTooltipContent';
import {
  buildAppMetadata,
  loadAppRegistry,
  type AppMetadata,
} from '../../../lib/appRegistry';

interface AppEntry {
  id: string;
  title: string;
  icon?: string | null;
  disabled?: boolean;
}

export interface AppCatalogHydratedProps {
  initialApps: AppEntry[];
  initialMetadata: Record<string, AppMetadata>;
  generatedAt: string;
}

export const AppCatalogHydrated: React.FC<AppCatalogHydratedProps> = ({
  initialApps,
  initialMetadata,
  generatedAt,
}) => {
  const [apps, setApps] = useState<AppEntry[]>(initialApps);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [query, setQuery] = useState('');
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    startTransition(() => {
      loadAppRegistry().then(({ apps: registry, metadata: registryMetadata }) => {
        if (!active) return;
        setApps(registry);
        setMetadata(registryMetadata);
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredApps = useMemo(
    () =>
      apps.filter(
        (app) =>
          !app.disabled && app.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [apps, query],
  );

  return (
    <div className="p-4" data-hydrated="true">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Catalog snapshot {new Date(generatedAt).toLocaleString()}</span>
        {isRefreshing ? <span aria-live="polite">Refreshing…</span> : null}
      </div>
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
        className="mb-4 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white placeholder:text-slate-500"
      />
      <div
        id="app-grid"
        tabIndex={-1}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {filteredApps.map((app) => {
          const meta =
            metadata[app.id] ??
            buildAppMetadata({ ...app, icon: app.icon ?? undefined });
          return (
            <DelayedTooltip key={app.id} content={<AppTooltipContent meta={meta} />}>
              {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
                <div
                  ref={ref}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  className="flex flex-col items-center"
                >
                  <Link
                    href={`/apps/${app.id}`}
                    className="flex h-full w-full flex-col items-center rounded border border-slate-700 bg-slate-900 p-4 text-center text-white transition hover:border-slate-400 focus:outline-none focus:ring"
                    aria-label={app.title}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    {app.icon ? (
                      <Image
                        src={app.icon}
                        alt=""
                        width={64}
                        height={64}
                        sizes="64px"
                        className="h-16 w-16"
                      />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded bg-slate-800 text-xl">
                        {app.title.charAt(0)}
                      </span>
                    )}
                    <span className="mt-2">{app.title}</span>
                  </Link>
                </div>
              )}
            </DelayedTooltip>
          );
        })}
      </div>
      {filteredApps.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">
          No apps match “{query}”. Try a different search term.
        </p>
      ) : null}
    </div>
  );
};

export default AppCatalogHydrated;
