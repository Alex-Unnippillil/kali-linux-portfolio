import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import apps, { games, utilities } from '../apps.config.js';

type AppEntry = {
  id: string;
  title: string;
  icon: string;
  favourite?: boolean;
  disabled?: boolean;
};

type CategoryKey = 'favorites' | 'utilities' | 'games' | 'applications';

type CategorizedApp = AppEntry & {
  category: CategoryKey;
};

type CategorizedSection = {
  key: CategoryKey;
  label: string;
  apps: CategorizedApp[];
};

const normalizeApps = (list: AppEntry[]): AppEntry[] =>
  list.map((app) => ({
    id: app.id,
    title: app.title,
    icon: app.icon,
    favourite: Boolean(app.favourite),
    disabled: Boolean(app.disabled),
  }));

const getVisibleSections = (
  entries: AppEntry[],
  query: string,
  utilityIds: Set<string>,
  gameIds: Set<string>
): CategorizedSection[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const favorites: CategorizedApp[] = [];
  const utilitiesOnly: CategorizedApp[] = [];
  const gamesOnly: CategorizedApp[] = [];
  const applications: CategorizedApp[] = [];

  entries.forEach((app) => {
    const categorizedApp: CategorizedApp = {
      ...app,
      category: 'applications',
    };

    const matchesQuery =
      normalizedQuery.length === 0 ||
      app.title.toLowerCase().includes(normalizedQuery);

    if (!matchesQuery) {
      return;
    }

    if (app.favourite) {
      favorites.push({ ...categorizedApp, category: 'favorites' });
    }

    if (utilityIds.has(app.id)) {
      utilitiesOnly.push({ ...categorizedApp, category: 'utilities' });
      return;
    }

    if (gameIds.has(app.id)) {
      gamesOnly.push({ ...categorizedApp, category: 'games' });
      return;
    }

    if (!app.favourite) {
      applications.push(categorizedApp);
    }
  });

  const sections: CategorizedSection[] = [
    { key: 'favorites', label: 'Favorites', apps: favorites },
    { key: 'utilities', label: 'Utilities', apps: utilitiesOnly },
    { key: 'games', label: 'Games', apps: gamesOnly },
    { key: 'applications', label: 'Applications', apps: applications },
  ];

  return sections.filter((section) => section.apps.length > 0);
};

const LauncherPage = () => {
  const typedApps = useMemo(() => normalizeApps(apps as AppEntry[]), []);
  const utilityIds = useMemo(
    () => new Set(normalizeApps((utilities as AppEntry[]) ?? []).map((app) => app.id)),
    []
  );
  const gameIds = useMemo(
    () => new Set(normalizeApps((games as AppEntry[]) ?? []).map((app) => app.id)),
    []
  );
  const [query, setQuery] = useState('');
  const sections = useMemo(
    () => getVisibleSections(typedApps, query, utilityIds, gameIds),
    [typedApps, query, utilityIds, gameIds]
  );
  const flattenedApps = useMemo(
    () => sections.flatMap((section) => section.apps.map((app) => app)),
    [sections]
  );
  const indexLookup = useMemo(() => {
    const map = new Map<string, number>();
    flattenedApps.forEach((item, index) => {
      map.set(item.id, index);
    });
    return map;
  }, [flattenedApps]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!flattenedApps.length) {
      setActiveId(null);
      return;
    }

    if (!activeId || !flattenedApps.some((item) => item.id === activeId)) {
      setActiveId(flattenedApps[0].id);
    }
  }, [flattenedApps, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const node = tileRefs.current.get(activeId);
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [activeId, sections]);

  const handleRegisterRef = (id: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      tileRefs.current.set(id, node);
    } else {
      tileRefs.current.delete(id);
    }
  };

  const moveFocus = (targetId: string | null) => {
    if (!targetId) return;
    setActiveId(targetId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!flattenedApps.length) return;

    const first = flattenedApps[0];
    const last = flattenedApps[flattenedApps.length - 1];

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const next = flattenedApps[index + 1] ?? first;
        moveFocus(next.id);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const previous = flattenedApps[index - 1] ?? last;
        moveFocus(previous.id);
        break;
      }
      case 'Home': {
        event.preventDefault();
        moveFocus(first.id);
        break;
      }
      case 'End': {
        event.preventDefault();
        moveFocus(last.id);
        break;
      }
      default:
        break;
    }
  };

  return (
    <>
      <Head>
        <title>App Launcher</title>
      </Head>
      <div className="min-h-screen bg-slate-950 text-white">
        <main
          aria-labelledby="launcher-heading"
          className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8"
        >
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 id="launcher-heading" className="text-3xl font-semibold tracking-tight">
                App Launcher
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Browse every tool, utility, and game available in the Kali-inspired desktop.
              </p>
            </div>
            <div className="w-full max-w-md">
              <label htmlFor="launcher-search" className="sr-only">
                Search applications
              </label>
              <input
                id="launcher-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search applications"
                aria-controls="launcher-categories"
                className="w-full rounded-md border border-white/10 bg-white/10 px-4 py-2 text-base text-white shadow-sm outline-none transition focus:border-ubt-blue focus:ring-2 focus:ring-ubt-blue/80"
              />
            </div>
          </header>

          <div id="launcher-categories" className="flex flex-col gap-10">
            {sections.map((section) => (
              <section key={section.key} aria-labelledby={`launcher-section-${section.key}`}>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2
                    id={`launcher-section-${section.key}`}
                    className="text-lg font-semibold uppercase tracking-widest text-white/70"
                  >
                    {section.label}
                  </h2>
                  <span className="text-xs text-white/50" aria-live="polite">
                    {section.apps.length} app{section.apps.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div
                  role="grid"
                  aria-labelledby={`launcher-section-${section.key}`}
                  className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                >
                  {section.apps.map((app) => {
                    const index = indexLookup.get(app.id) ?? 0;
                    const isActive = activeId === app.id;

                    return (
                      <article key={app.id} role="presentation" className="group focus-within:outline-none">
                        <button
                          ref={handleRegisterRef(app.id)}
                          type="button"
                          role="gridcell"
                          tabIndex={isActive ? 0 : -1}
                          aria-selected={isActive}
                          aria-label={`Open ${app.title}`}
                          onFocus={() => setActiveId(app.id)}
                          onClick={() => setActiveId(app.id)}
                          onKeyDown={(event) => handleKeyDown(event, index)}
                          className={`flex w-full flex-col items-center gap-3 rounded-lg border border-transparent bg-white/5 px-4 py-5 text-center transition focus-visible:border-ubt-blue focus-visible:ring-2 focus-visible:ring-ubt-blue/70 ${
                            isActive ? 'border-ubt-blue/70 ring-1 ring-ubt-blue/60' : 'hover:border-white/30'
                          }`}
                        >
                          <span
                            aria-hidden
                            className="flex h-16 w-16 items-center justify-center rounded-lg bg-black/40 shadow-inner"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={app.icon} alt="" className="h-12 w-12" />
                          </span>
                          <span className="text-sm font-medium text-white">{app.title}</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            {!sections.length && (
              <p role="status" className="text-sm text-white/70">
                No applications match “{query.trim()}”.
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default LauncherPage;
