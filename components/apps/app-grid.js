import React, { useState, useEffect, useMemo, useRef } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import {
  appCategories,
  appCategoryMap,
  appMetadataMap,
  getSearchDocuments,
} from '../../utils/appCatalog';

const enrichedApps = apps.map((app) => {
  const meta = appMetadataMap.get(app.id);
  const categoryId = meta?.category ?? 'uncategorized';
  const categoryLabel = appCategoryMap.get(categoryId)?.label ?? 'Other';

  return {
    ...app,
    categoryId,
    categoryLabel,
    tags: meta?.tags ?? [],
  };
});

const appsById = new Map(enrichedApps.map((app) => [app.id, app]));

const sections = appCategories.map((category) => ({
  ...category,
  apps: enrichedApps.filter((app) => app.categoryId === category.id),
}));

const searchDocuments = getSearchDocuments();

const highlightTitle = (title, match) => {
  const titleMatch = match?.matches?.find((item) => item.key === 'title');
  if (!titleMatch || !titleMatch.indices?.length) {
    return title;
  }

  const nodes = [];
  let cursor = 0;
  titleMatch.indices.forEach(([start, end], index) => {
    if (cursor < start) {
      nodes.push(title.slice(cursor, start));
    }
    nodes.push(
      <mark
        key={`${start}-${end}-${index}`}
        className="rounded-sm bg-ub-orange bg-opacity-60 px-0.5 text-inherit"
      >
        {title.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  });

  if (cursor < title.length) {
    nodes.push(title.slice(cursor));
  }

  return nodes;
};

const SearchResultList = ({
  results,
  openApp,
}) => {
  if (!results.length) {
    return (
      <div className="rounded border border-white/10 bg-black/30 p-6 text-center text-sm text-white/70">
        No apps matched your search.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {results.map(({ app, match }) => (
        <div key={app.id} className="flex justify-center">
          <UbuntuApp
            id={app.id}
            icon={app.icon}
            name={app.title}
            displayName={<>{highlightTitle(app.title, match)}</>}
            openApp={() => openApp && openApp(app.id)}
          />
          <div className="sr-only">{app.categoryLabel}</div>
        </div>
      ))}
    </div>
  );
};

export default function AppGrid({ openApp }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const workerRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/appSearch.worker.ts', import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event) => {
      const { data } = event;
      if (data.type === 'ready') {
        setWorkerReady(true);
        return;
      }
      if (data.type === 'results') {
        if (data.query !== latestQueryRef.current) return;
        setSearchResults(
          data.results
            .map((hit) => {
              const app = appsById.get(hit.id);
              if (!app || app.disabled) return null;
              return { app, match: hit };
            })
            .filter(Boolean),
        );
        setIsSearching(false);
      }
    };
    worker.postMessage({ type: 'init', payload: searchDocuments });
    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerReady || !workerRef.current) return;
    const normalized = query.trim();
    latestQueryRef.current = normalized;

    if (!normalized) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    workerRef.current.postMessage({ type: 'search', query: normalized });
  }, [query, workerReady]);

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          apps: section.apps.filter((app) => !app.disabled),
        }))
        .filter((section) => section.apps.length > 0),
    [],
  );

  const statusMessage = useMemo(() => {
    if (!workerReady) return 'Building search index…';
    if (isSearching) return 'Searching…';
    if (query.trim()) {
      return searchResults.length
        ? `${searchResults.length} matches`
        : 'No matches';
    }
    return `${searchDocuments.length} apps indexed`;
  }, [workerReady, isSearching, query, searchResults.length]);

  const showSearchResults = Boolean(query.trim());

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-col items-center gap-2 px-6 py-4">
        <label htmlFor="launcher-search" className="sr-only">
          Search apps
        </label>
        <input
          id="launcher-search"
          className="w-full rounded-md bg-black/40 px-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-ub-orange md:w-2/3 lg:w-1/2"
          placeholder="Search for apps, games, or tags"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="text-xs text-white/60" role="status">
          {statusMessage}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {showSearchResults ? (
          <SearchResultList results={searchResults} openApp={openApp} />
        ) : (
          <div className="space-y-8">
            {visibleSections.map((section) => (
              <section key={section.id} aria-label={`${section.label} category`}>
                <header className="mb-3 flex flex-col justify-between gap-2 text-white sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-lg font-semibold">{section.label}</h2>
                    {section.description ? (
                      <p className="text-xs text-white/60">{section.description}</p>
                    ) : null}
                  </div>
                  <span className="text-xs text-white/50">{section.apps.length} apps</span>
                </header>
                <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {section.apps.map((app) => (
                    <div key={app.id} className="flex justify-center">
                      <UbuntuApp
                        id={app.id}
                        icon={app.icon}
                        name={app.title}
                        openApp={() => openApp && openApp(app.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
