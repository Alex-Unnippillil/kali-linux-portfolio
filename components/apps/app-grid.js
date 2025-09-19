import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps, { games, utilities } from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid as Grid } from 'react-window';
import { useSettings } from '../../hooks/useSettings';

const MIN_COLUMN_WIDTH = 150;
const ROW_HEIGHT = 140;
const DEFAULT_CATEGORY_ID = 'all';

const gameIds = new Set(games.map((game) => game.id));
const utilityIds = new Set(utilities.map((utility) => utility.id));
const SECURITY_APP_IDS = new Set([
  'autopsy',
  'beef',
  'ble-sensor',
  'dsniff',
  'evidence-vault',
  'ettercap',
  'ghidra',
  'hashcat',
  'http',
  'hydra',
  'john',
  'kismet',
  'metasploit',
  'mimikatz',
  'mimikatz-offline',
  'msf-post',
  'nessus',
  'nikto',
  'nmap-nse',
  'openvas',
  'radare2',
  'reaver',
  'recon-ng',
  'security-tools',
  'serial-terminal',
  'ssh',
  'volatility',
  'wireshark',
]);

const CATEGORY_DEFINITIONS = [
  { id: 'all', label: 'All', filter: () => true },
  { id: 'favorites', label: 'Favorites', filter: (app) => Boolean(app.favourite) },
  {
    id: 'apps',
    label: 'Apps',
    filter: (app) => !gameIds.has(app.id) && !utilityIds.has(app.id) && !SECURITY_APP_IDS.has(app.id),
  },
  { id: 'utilities', label: 'Utilities', filter: (app) => utilityIds.has(app.id) },
  { id: 'security', label: 'Security', filter: (app) => SECURITY_APP_IDS.has(app.id) },
  { id: 'games', label: 'Games', filter: (app) => gameIds.has(app.id) },
];

const CATEGORY_MAP = {};
CATEGORY_DEFINITIONS.forEach((category) => {
  CATEGORY_MAP[category.id] = category;
});

function clampCategoryId(id) {
  return CATEGORY_MAP[id] ? id : DEFAULT_CATEGORY_ID;
}

function fuzzyHighlight(text, query) {
  const q = query.toLowerCase();
  let qi = 0;
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      result.push(<mark key={i}>{ch}</mark>);
      qi++;
    } else {
      result.push(ch);
    }
  }
  return { matched: qi === q.length, nodes: result };
}

const Cell = ({ columnIndex, rowIndex, style, data }) => {
  const index = rowIndex * data.columnCount + columnIndex;
  const app = data.items[index];
  if (!app) {
    return <div style={style} />;
  }
  const globalIndex = data.pageStart + index;
  const isFocused = globalIndex === data.focusedIndex;
  const cellStyle = {
    ...style,
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const highlightStyle = isFocused
    ? { boxShadow: '0 0 0 2px rgba(23, 147, 209, 0.7)', borderRadius: '12px' }
    : { borderRadius: '12px' };

  return (
    <div
      role="gridcell"
      aria-selected={isFocused}
      style={cellStyle}
      className="focus-within:z-10"
      data-testid={`app-tile-${app.id}`}
      onFocusCapture={() => data.onFocusIndexChange(globalIndex)}
      onMouseDown={() => data.onFocusIndexChange(globalIndex)}
    >
      <div className="flex h-full w-full items-center justify-center transition-all" style={highlightStyle}>
        <UbuntuApp
          id={app.id}
          icon={app.icon}
          name={app.title}
          displayName={<>{app.nodes || app.title}</>}
          openApp={() => data.openApp && data.openApp(app.id)}
          disabled={app.disabled}
          prefetch={app.screen?.prefetch}
        />
      </div>
    </div>
  );
};

const VirtualizedPage = ({
  height,
  width,
  items,
  page,
  onPageChange,
  focusedIndex,
  onFocusIndexChange,
  onLayoutChange,
  gridRef,
  openApp,
}) => {
  const columnCount = Math.max(1, Math.floor(width / MIN_COLUMN_WIDTH));
  const rowHeight = ROW_HEIGHT;
  const rowsPerPage = Math.max(1, Math.floor(height / rowHeight));
  const pageSize = Math.max(columnCount, rowsPerPage * columnCount);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const clampedPage = Math.min(Math.max(page, 0), totalPages - 1);
  const pageStart = clampedPage * pageSize;
  const pageItems = items.slice(pageStart, pageStart + pageSize);
  const visibleCount = pageItems.length;
  const rowCount = Math.max(1, Math.ceil(Math.max(visibleCount, 1) / columnCount));
  const columnWidth = columnCount === 0 ? width : width / columnCount;

  useEffect(() => {
    onLayoutChange({ columnCount, pageSize, pageStart, totalPages, visibleCount });
  }, [columnCount, pageSize, pageStart, totalPages, visibleCount, onLayoutChange]);

  useEffect(() => {
    if (clampedPage !== page) {
      onPageChange(clampedPage);
    }
  }, [clampedPage, onPageChange, page]);

  useEffect(() => {
    if (!visibleCount) {
      if (focusedIndex !== 0) {
        onFocusIndexChange(0);
      }
      return;
    }
    const minIndex = pageStart;
    const maxIndex = pageStart + visibleCount - 1;
    if (focusedIndex < minIndex || focusedIndex > maxIndex) {
      onFocusIndexChange(minIndex);
    }
  }, [focusedIndex, visibleCount, pageStart, onFocusIndexChange]);

  const itemData = useMemo(
    () => ({
      items: pageItems,
      columnCount,
      pageStart,
      focusedIndex,
      onFocusIndexChange,
      openApp,
    }),
    [pageItems, columnCount, pageStart, focusedIndex, onFocusIndexChange, openApp]
  );

  return (
    <Grid
      ref={gridRef}
      columnCount={columnCount}
      columnWidth={columnWidth}
      height={height}
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={width}
      itemData={itemData}
      itemKey={({ columnIndex: ci, rowIndex: ri, data }) => {
        const idx = ri * data.columnCount + ci;
        const item = data.items[idx];
        return item ? item.id : `empty-${ri}-${ci}`;
      }}
      className="scroll-smooth"
    >
      {Cell}
    </Grid>
  );
};

export default function AppGrid({ openApp }) {
  const { appGridCategory, setAppGridCategory, appGridPage, setAppGridPage, hydrated } = useSettings();
  const categoryId = clampCategoryId(appGridCategory);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef(null);
  const layoutRef = useRef({ columnCount: 1, pageSize: 1, pageStart: 0, visibleCount: 0, totalPages: 1 });
  const [pageInfo, setPageInfo] = useState({ current: 0, total: 1 });
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hydrated) {
      hasHydratedRef.current = true;
    }
  }, [hydrated]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 120);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!hydrated || !hasHydratedRef.current) return;
    setFocusedIndex(0);
    setAppGridPage(0);
  }, [debouncedQuery, hydrated, setAppGridPage]);

  useEffect(() => {
    if (!CATEGORY_MAP[appGridCategory] && hydrated) {
      setAppGridCategory(DEFAULT_CATEGORY_ID);
    }
  }, [appGridCategory, hydrated, setAppGridCategory]);

  const filtered = useMemo(() => {
    const category = CATEGORY_MAP[categoryId] || CATEGORY_MAP[DEFAULT_CATEGORY_ID];
    const base = apps.filter((app) => !app.disabled && category.filter(app));
    if (!debouncedQuery) {
      return base.map((app) => ({ ...app, nodes: app.title }));
    }
    return base
      .map((app) => {
        const { matched, nodes } = fuzzyHighlight(app.title, debouncedQuery);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean);
  }, [categoryId, debouncedQuery]);

  useEffect(() => {
    if (!filtered.length) {
      if (focusedIndex !== 0) setFocusedIndex(0);
      return;
    }
    if (focusedIndex >= filtered.length) {
      setFocusedIndex(filtered.length - 1);
    }
  }, [filtered, focusedIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const target = filtered[focusedIndex];
    if (!target) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const el = document.getElementById(`app-${target.id}`);
      el?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filtered, focusedIndex]);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    const { pageStart, columnCount, visibleCount } = layout;
    if (visibleCount === 0) return;
    const localIndex = focusedIndex - pageStart;
    if (localIndex < 0 || localIndex >= visibleCount) return;
    const rowIndex = Math.floor(localIndex / columnCount);
    const columnIndex = localIndex % columnCount;
    if (typeof gridRef.current?.scrollToItem === 'function') {
      gridRef.current.scrollToItem({ columnIndex, rowIndex, align: 'smart' });
    }
  }, [focusedIndex]);

  const handleLayoutChange = useCallback((layout) => {
    layoutRef.current = layout;
    const pageSize = Math.max(layout.pageSize, 1);
    const current = pageSize ? Math.floor(layout.pageStart / pageSize) : 0;
    setPageInfo((prev) => (prev.current === current && prev.total === layout.totalPages ? prev : { current, total: layout.totalPages }));
  }, []);

  const handlePageChange = useCallback(
    (delta) => {
      const layout = layoutRef.current;
      if (!layout) return;
      const maxPage = Math.max(layout.totalPages - 1, 0);
      const current = Math.min(Math.max(appGridPage, 0), maxPage);
      const next = Math.min(Math.max(current + delta, 0), maxPage);
      if (next === current) return;
      setAppGridPage(next);
      const nextIndex = Math.min(next * Math.max(layout.pageSize, 1), Math.max(filtered.length - 1, 0));
      setFocusedIndex(nextIndex);
    },
    [appGridPage, filtered.length, setAppGridPage]
  );

  const changeCategory = useCallback(
    (nextCategory) => {
      const normalized = clampCategoryId(nextCategory);
      if (normalized === appGridCategory) return;
      setAppGridCategory(normalized);
      setFocusedIndex(0);
      if (hydrated) {
        setAppGridPage(0);
      }
    },
    [appGridCategory, hydrated, setAppGridCategory, setAppGridPage]
  );

  const handleKeyDown = useCallback(
    (event) => {
      const { key, ctrlKey } = event;
      const layout = layoutRef.current;
      if (!layout) return;

      if (ctrlKey && (key === 'ArrowRight' || key === 'ArrowLeft')) {
        event.preventDefault();
        const currentIndex = CATEGORY_DEFINITIONS.findIndex((cat) => cat.id === categoryId);
        if (currentIndex === -1) return;
        const delta = key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (currentIndex + delta + CATEGORY_DEFINITIONS.length) % CATEGORY_DEFINITIONS.length;
        changeCategory(CATEGORY_DEFINITIONS[nextIndex].id);
        return;
      }

      if (key === 'PageDown' || key === 'PageUp') {
        event.preventDefault();
        handlePageChange(key === 'PageDown' ? 1 : -1);
        return;
      }

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
      }

      const { columnCount, pageStart, visibleCount } = layout;
      if (visibleCount === 0) return;
      const lastIndex = pageStart + visibleCount - 1;
      let nextIndex = focusedIndex;

      if (key === 'ArrowRight') {
        if (focusedIndex < lastIndex) {
          nextIndex = Math.min(focusedIndex + 1, filtered.length - 1);
        } else {
          event.preventDefault();
          handlePageChange(1);
          return;
        }
      } else if (key === 'ArrowLeft') {
        if (focusedIndex > pageStart) {
          nextIndex = Math.max(focusedIndex - 1, 0);
        } else {
          event.preventDefault();
          handlePageChange(-1);
          return;
        }
      } else if (key === 'ArrowDown') {
        const candidate = focusedIndex + columnCount;
        if (candidate <= lastIndex && candidate < filtered.length) {
          nextIndex = candidate;
        } else {
          event.preventDefault();
          handlePageChange(1);
          return;
        }
      } else if (key === 'ArrowUp') {
        const candidate = focusedIndex - columnCount;
        if (candidate >= pageStart) {
          nextIndex = candidate;
        } else {
          event.preventDefault();
          handlePageChange(-1);
          return;
        }
      } else if (key === 'Home') {
        nextIndex = pageStart;
      } else if (key === 'End') {
        nextIndex = lastIndex;
      }

      event.preventDefault();
      setFocusedIndex(Math.max(0, Math.min(nextIndex, filtered.length - 1)));
    },
    [categoryId, changeCategory, filtered.length, focusedIndex, handlePageChange]
  );

  const displayedPage = Math.max(0, Math.min(pageInfo.current, Math.max(pageInfo.total - 1, 0)));
  const totalPages = Math.max(pageInfo.total, 1);

  return (
    <div className="flex h-full w-full flex-col gap-4 px-4 py-4" data-testid="app-grid">
      <label htmlFor="app-grid-search" className="sr-only">
        Search applications
      </label>
      <input
        id="app-grid-search"
        data-testid="app-grid-search"
        className="w-full rounded-md bg-black/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter applications by category">
          {CATEGORY_DEFINITIONS.map((category) => {
            const active = category.id === categoryId;
            return (
              <button
                key={category.id}
                type="button"
                className={`rounded-full px-3 py-1 text-sm transition focus:outline-none focus:ring-2 focus:ring-ubt-blue ${
                  active ? 'bg-ubt-blue text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                aria-pressed={active}
                data-testid={`category-${category.id}`}
                onClick={() => changeCategory(category.id)}
              >
                {category.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-sm text-white/80" aria-live="polite">
          <button
            type="button"
            className="rounded border border-white/20 px-3 py-1 text-white/80 transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => handlePageChange(-1)}
            disabled={displayedPage === 0 || totalPages <= 1}
            data-testid="prev-page"
            aria-label="Previous page"
          >
            Prev
          </button>
          <span data-testid="page-indicator">
            Page {Math.min(displayedPage + 1, totalPages)} of {totalPages}
          </span>
          <button
            type="button"
            className="rounded border border-white/20 px-3 py-1 text-white/80 transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => handlePageChange(1)}
            disabled={displayedPage >= totalPages - 1 || totalPages <= 1}
            data-testid="next-page"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
      <div
        className="relative flex min-h-[20rem] flex-1 overflow-hidden rounded-lg bg-black/30"
        role="grid"
        aria-label="Application grid"
        data-testid="app-grid-viewport"
        onKeyDownCapture={handleKeyDown}
      >
        {filtered.length ? (
          <AutoSizer>
            {({ height, width }) => (
              <VirtualizedPage
                height={height}
                width={width}
                items={filtered}
                page={appGridPage}
                onPageChange={setAppGridPage}
                focusedIndex={focusedIndex}
                onFocusIndexChange={setFocusedIndex}
                onLayoutChange={handleLayoutChange}
                gridRef={gridRef}
                openApp={openApp}
              />
            )}
          </AutoSizer>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/70">
            No applications match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
