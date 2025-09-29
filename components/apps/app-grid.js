import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid } from 'react-window';
import DelayedTooltip from '../ui/DelayedTooltip';
import AppTooltipContent from '../ui/AppTooltipContent';
import { createRegistryMap, buildAppMetadata } from '../../lib/appRegistry';
import {
  FAVORITES_KEY,
  RECENTS_KEY,
  arraysEqual,
  persistIds,
  readStoredIds,
  sanitizeIds,
  updateRecentIds,
} from '../../utils/appPreferences';
import { useAppSearch, getHighlightedSegments } from '../../hooks/useAppSearch';
import { buildCategoryConfigs } from '../../lib/appCategories';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const registryMetadata = createRegistryMap(apps);

const getColumnCount = (width) => {
  if (width >= 1024) return 8;
  if (width >= 768) return 6;
  if (width >= 640) return 4;
  return 3;
};

export default function AppGrid({ openApp }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const columnCountRef = useRef(1);
  const gridRef = useRef(null);
  const categoryListRef = useRef(null);

  const availableIds = useMemo(() => new Set(apps.map((app) => app.id)), []);

  const [favoriteIds, setFavoriteIds] = useState(() =>
    sanitizeIds(readStoredIds(FAVORITES_KEY), availableIds),
  );
  const [recentIds, setRecentIds] = useState(() =>
    sanitizeIds(readStoredIds(RECENTS_KEY), availableIds, 10),
  );

  useRovingTabIndex(categoryListRef, true, 'horizontal');

  useEffect(() => {
    setFavoriteIds((current) => {
      const sanitized = sanitizeIds(current, availableIds);
      if (!arraysEqual(sanitized, current)) {
        persistIds(FAVORITES_KEY, sanitized);
        return sanitized;
      }
      return current;
    });
    setRecentIds((current) => {
      const sanitized = sanitizeIds(current, availableIds, 10);
      if (!arraysEqual(sanitized, current)) {
        persistIds(RECENTS_KEY, sanitized);
        return sanitized;
      }
      return current;
    });
  }, [availableIds]);

  const { query, setQuery, results, filtered } = useAppSearch(apps, {
    fuseOptions: { keys: ['title', 'id'] },
  });

  const matchMap = useMemo(() => {
    const map = new Map();
    results.forEach(({ item, matches }) => {
      map.set(item.id, matches);
    });
    return map;
  }, [results]);

  const favoritesForCategories = useMemo(() => {
    const stored = favoriteIds;
    if (stored.length > 0) return stored;
    return apps.filter((app) => app.favourite).map((app) => app.id);
  }, [favoriteIds]);

  const categories = useMemo(
    () =>
      buildCategoryConfigs(filtered, {
        favoriteIds: favoritesForCategories,
        recentIds,
      }),
    [filtered, favoritesForCategories, recentIds],
  );

  useEffect(() => {
    if (!categories.some((category) => category.id === activeCategory)) {
      setActiveCategory(categories[0]?.id ?? 'all');
    }
  }, [categories, activeCategory]);

  const activeCategoryConfig = useMemo(
    () => categories.find((category) => category.id === activeCategory) ?? categories[0],
    [categories, activeCategory],
  );

  const filteredMap = useMemo(
    () => new Map(filtered.map((app) => [app.id, app])),
    [filtered],
  );

  const recentApps = useMemo(
    () =>
      recentIds
        .map((id) => filteredMap.get(id))
        .filter(Boolean),
    [recentIds, filteredMap],
  );

  const recentSet = useMemo(
    () => new Set(recentApps.map((app) => app.id)),
    [recentApps],
  );

  const visibleApps = useMemo(() => {
    if (!activeCategoryConfig) return [];
    if (activeCategoryConfig.type === 'favorites' || activeCategoryConfig.type === 'recent') {
      return activeCategoryConfig.apps;
    }
    const base =
      activeCategoryConfig.type === 'all'
        ? filtered
        : activeCategoryConfig.apps;
    return base.filter((app) => !recentSet.has(app.id));
  }, [activeCategoryConfig, filtered, recentSet]);

  useEffect(() => {
    if (visibleApps.length === 0) {
      setFocusedIndex(0);
    } else if (focusedIndex >= visibleApps.length) {
      setFocusedIndex(0);
    }
  }, [visibleApps, focusedIndex]);

  useEffect(() => {
    if (visibleApps.length > 0) {
      setFocusedIndex(0);
    }
  }, [query, activeCategory, visibleApps.length]);

  const handleLaunch = useCallback(
    (id) => {
      setRecentIds((current) => {
        const next = updateRecentIds(current, id, 10);
        persistIds(RECENTS_KEY, next);
        return next;
      });
      if (openApp) {
        openApp(id);
      }
    },
    [openApp],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (visibleApps.length === 0) return;
      e.preventDefault();
      const colCount = columnCountRef.current;
      let idx = focusedIndex;
      if (e.key === 'ArrowRight') idx = Math.min(idx + 1, visibleApps.length - 1);
      if (e.key === 'ArrowLeft') idx = Math.max(idx - 1, 0);
      if (e.key === 'ArrowDown') idx = Math.min(idx + colCount, visibleApps.length - 1);
      if (e.key === 'ArrowUp') idx = Math.max(idx - colCount, 0);
      setFocusedIndex(idx);
      const row = Math.floor(idx / colCount);
      const col = idx % colCount;
      gridRef.current?.scrollToItem?.({ rowIndex: row, columnIndex: col, align: 'smart' });
      const target = visibleApps[idx];
      if (target) {
        setTimeout(() => {
          const el = document.getElementById('app-' + target.id);
          el?.focus();
        }, 0);
      }
    },
    [focusedIndex, visibleApps],
  );

  const rowCount = useMemo(() => {
    const columns = Math.max(columnCountRef.current, 1);
    return Math.ceil(visibleApps.length / columns);
  }, [visibleApps.length]);

  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const index = rowIndex * data.columnCount + columnIndex;
    if (index >= data.items.length) return null;
    const app = data.items[index];
    const meta = data.metadata[app.id] ?? buildAppMetadata(app);
    const matches = data.matches.get(app.id);
    const segments = getHighlightedSegments(app.title, matches, 'title');
    const displayName = segments.map((segment, segmentIndex) =>
      segment.match ? <mark key={segmentIndex}>{segment.text}</mark> : segment.text,
    );
    const tabIndex = index === focusedIndex ? 0 : -1;
    return (
      <DelayedTooltip content={<AppTooltipContent meta={meta} />}>
        {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
          <div
            ref={ref}
            style={{
              ...style,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 12,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <UbuntuApp
              id={app.id}
              icon={app.icon}
              name={app.title}
              displayName={<>{displayName}</>}
              openApp={() => handleLaunch(app.id)}
              tabIndex={tabIndex}
              onFocus={() => setFocusedIndex(index)}
            />
          </div>
        )}
      </DelayedTooltip>
    );
  };

  return (
    <div className="flex h-full flex-col items-center">
      <label htmlFor="app-grid-search" className="sr-only">
        Search applications
      </label>
      <input
        id="app-grid-search"
        className="mb-4 mt-4 w-11/12 max-w-xl rounded bg-black bg-opacity-20 px-4 py-2 text-white focus:outline-none"
        placeholder="Search applications"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
      />
      <nav className="mb-4 w-full px-4" aria-label="Filter apps by category">
        <div
          ref={categoryListRef}
          className="flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Application categories"
        >
          {categories.map((category) => {
            const isActive = category.id === activeCategory;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                onClick={() => {
                  setActiveCategory(category.id);
                  setFocusedIndex(0);
                }}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{category.label}</span>
                <span className="rounded-full bg-black/30 px-2 text-xs text-white/70">
                  {category.apps.length}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      {recentApps.length > 0 && (
        <section className="mb-4 w-full px-4" aria-label="Recently opened apps">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">Recent</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {recentApps.map((app) => (
              <UbuntuApp
                key={app.id}
                id={app.id}
                icon={app.icon}
                name={app.title}
                openApp={() => handleLaunch(app.id)}
              />
            ))}
          </div>
        </section>
      )}
      <div
        className="h-[70vh] w-full flex-1 outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="grid"
        aria-label="Application grid"
      >
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = getColumnCount(width);
            columnCountRef.current = columnCount;
            const rowCountValue = Math.ceil(visibleApps.length / columnCount) || 0;
            return (
              <Grid
                ref={gridRef}
                columnCount={columnCount}
                columnWidth={width / columnCount}
                height={height}
                rowCount={rowCountValue}
                rowHeight={112}
                width={width}
                className="scroll-smooth"
                itemData={{
                  items: visibleApps,
                  columnCount,
                  metadata: registryMetadata,
                  matches: matchMap,
                }}
              >
                {(props) => (
                  <Cell
                    {...props}
                    data={{
                      ...props.data,
                      metadata: registryMetadata,
                      matches: matchMap,
                    }}
                  />
                )}
              </Grid>
            );
          }}
        </AutoSizer>
        {visibleApps.length === 0 && (
          <p className="mt-6 text-center text-sm text-white/70">
            No applications match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
