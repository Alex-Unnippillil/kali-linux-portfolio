import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import UbuntuApp from '../base/ubuntu_app';
import DelayedTooltip from '../ui/DelayedTooltip';
import AppTooltipContent from '../ui/AppTooltipContent';

import apps from '../../apps.config';
import { buildAppMetadata, createRegistryMap } from '../../lib/appRegistry';

const DEFAULT_REGISTRY_METADATA = createRegistryMap(apps);

const clamp = (value, min, max) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const normalizeQuery = (raw) => {
  if (raw == null) return '';
  return String(raw).trim();
};

const tokenize = (q) =>
  q
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const DEFAULT_HIGHLIGHT_CLASS =
  'rounded bg-sky-400/25 px-0.5 text-white ring-1 ring-sky-300/30';

const highlightSubstring = (text, token) => {
  if (!token) return text;
  const lowerText = text.toLowerCase();
  const lowerToken = token.toLowerCase();
  const start = lowerText.indexOf(lowerToken);
  if (start === -1) return text;
  const end = start + token.length;
  return [
    text.slice(0, start),
    <mark key={`${token}-${start}`} className={DEFAULT_HIGHLIGHT_CLASS}>
      {text.slice(start, end)}
    </mark>,
    text.slice(end),
  ];
};

// Subsequence highlighter used when users type shorthand like "trm" for "terminal".
const highlightSubsequence = (text, rawQuery) => {
  const query = (rawQuery || '').toLowerCase().replace(/\s+/g, '');
  const lowerText = (text || '').toLowerCase();

  if (!query) return { matched: true, nodes: text };
  if (!text) return { matched: false, nodes: '' };

  const nodes = [];
  let queryIndex = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = lowerText[i];
    const match = queryIndex < query.length && ch === query[queryIndex];

    if (match) {
      nodes.push(
        <mark key={`${queryIndex}-${i}`} className={DEFAULT_HIGHLIGHT_CLASS}>
          {text[i]}
        </mark>,
      );
      queryIndex += 1;
    } else {
      nodes.push(text[i]);
    }
  }

  return {
    matched: queryIndex === query.length,
    nodes,
  };
};

const getColumnCount = (width) => {
  if (width < 420) return 2;
  if (width < 640) return 3;
  if (width < 900) return 4;
  if (width < 1100) return 5;
  return 6;
};

const getLayout = (width) => {
  const columnCount = getColumnCount(width);
  const columnWidth = Math.max(120, Math.floor(width / columnCount));
  const rowHeight = 112;
  return { columnCount, columnWidth, rowHeight };
};

const getRegistryMetadata = (appList) =>
  appList === apps ? DEFAULT_REGISTRY_METADATA : createRegistryMap(appList);

const buildMatch = (app, meta, tokens, rawQuery) => {
  const title = typeof app?.title === 'string' ? app.title : '';
  const id = typeof app?.id === 'string' ? app.id : '';
  const description = typeof meta?.description === 'string' ? meta.description : '';

  const lowerTitle = title.toLowerCase();
  const lowerId = id.toLowerCase();
  const lowerDesc = description.toLowerCase();

  if (!tokens.length) {
    return { matched: true, score: 0, nodes: title };
  }

  let score = 0;
  let bestTokenInTitle = '';
  let allTokensMatched = true;

  tokens.forEach((token) => {
    if (!token) return;
    const inTitle = lowerTitle.includes(token);
    const inId = lowerId.includes(token);
    const inDesc = lowerDesc.includes(token);

    if (!inTitle && !inId && !inDesc) {
      allTokensMatched = false;
      return;
    }

    if (inTitle) {
      score += 3;
      if (lowerTitle.startsWith(token)) score += 2;
      if (token.length > bestTokenInTitle.length) bestTokenInTitle = token;
      return;
    }

    if (inId) {
      score += 2;
      if (lowerId.startsWith(token)) score += 1;
      return;
    }

    score += 1;
  });

  if (!allTokensMatched && tokens.length === 1) {
    const subsequence = highlightSubsequence(title, rawQuery);
    if (subsequence.matched) {
      return { matched: true, score: score + 2, nodes: subsequence.nodes };
    }
  }

  if (!allTokensMatched) {
    return { matched: false, score: 0, nodes: title };
  }

  if (bestTokenInTitle) {
    return {
      matched: true,
      score,
      nodes: highlightSubstring(title, bestTokenInTitle),
    };
  }

  return { matched: true, score, nodes: title };
};

const buildItemKey = ({ columnIndex, rowIndex, data }) => {
  const index = rowIndex * data.columnCount + columnIndex;
  const item = data.items[index];
  return item?.id || `empty-${rowIndex}-${columnIndex}`;
};

const Cell = React.memo(({ columnIndex, rowIndex, style, data }) => {
  const index = rowIndex * data.columnCount + columnIndex;
  const app = data.items[index];

  if (!app) return null;

  const meta = data.metadata[app.id] ?? buildAppMetadata(app);
  const isSelected = data.isGridActive && index === data.focusedIndex;
  const isHovered = index === data.hoveredIndex;
  const shouldPrefetch = app.prefetchOnHover !== false;

  return (
    <div
      style={style}
      className="flex items-center justify-center p-2"
      role="gridcell"
      aria-colindex={columnIndex + 1}
      aria-rowindex={rowIndex + 1}
    >
      <DelayedTooltip content={<AppTooltipContent meta={meta} />}>
        {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
          <div
            ref={ref}
            onMouseEnter={(event) => {
              data.setFocusedIndex(index);
              data.setHoveredIndex(index);
              onMouseEnter(event);
            }}
            onMouseLeave={(event) => {
              data.setHoveredIndex(null);
              onMouseLeave(event);
            }}
            onFocus={(event) => {
              data.setFocusedIndex(index);
              onFocus(event);
            }}
            onBlur={onBlur}
            className="flex items-center justify-center"
          >
            <UbuntuApp
              id={app.id}
              icon={app.icon}
              name={app.title}
              displayName={app.nodes}
              disabled={Boolean(app.disabled)}
              openApp={data.handleOpenApp}
              prefetch={shouldPrefetch ? app.screen?.prefetch : undefined}
              launchOnClick
              isSelected={isSelected}
              isHovered={isHovered}
              assistiveHint={
                app.disabled
                  ? 'Unavailable. This app is marked as disabled.'
                  : 'Press Enter to launch. Use arrow keys to navigate.'
              }
              accentVariables={data.accentVariables}
            />
          </div>
        )}
      </DelayedTooltip>
    </div>
  );
});

Cell.displayName = 'AppGridCell';

export default function AppGrid({
  openApp,
  appsList,
  autoFocusSearch = false,
  showSearch = true,
  accentVariables,
}) {
  const appList = Array.isArray(appsList) ? appsList : apps;
  const registryMetadata = useMemo(() => getRegistryMetadata(appList), [appList]);

  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isGridActive, setGridActive] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const searchInputRef = useRef(null);
  const gridRef = useRef(null);
  const columnCountRef = useRef(4);
  const totalCount = appList.length;

  const normalizedQuery = normalizeQuery(query);
  const tokens = useMemo(() => tokenize(normalizedQuery), [normalizedQuery]);

  const handleOpenApp = useCallback(
    (id) => {
      if (typeof openApp === 'function' && id) {
        openApp(id);
      }
    },
    [openApp],
  );

  const filtered = useMemo(() => {
    const base = (appList || []).filter((app) => app && typeof app.id === 'string');
    if (!tokens.length) {
      return base.map((app) => ({ ...app, nodes: app.title }));
    }

    const results = [];
    base.forEach((app) => {
      const meta = registryMetadata[app.id];
      const match = buildMatch(app, meta, tokens, normalizedQuery);
      if (!match.matched) return;
      results.push({ ...app, nodes: match.nodes, _score: match.score });
    });

    results.sort((a, b) => {
      const scoreA = typeof a._score === 'number' ? a._score : 0;
      const scoreB = typeof b._score === 'number' ? b._score : 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (a.title || '').localeCompare(b.title || '');
    });

    return results;
  }, [appList, registryMetadata, tokens, normalizedQuery]);

  const scrollToIndex = useCallback((index) => {
    const colCount = columnCountRef.current || 1;
    const rowIndex = Math.floor(index / colCount);
    const columnIndex = index % colCount;
    gridRef.current?.scrollToItem?.({
      rowIndex,
      columnIndex,
      align: 'smart',
    });
  }, []);

  const focusRenderedIndex = useCallback(
    (index) => {
      const app = filtered[index];
      if (!app) return;

      const tryFocus = () => {
        const el = document.getElementById(`app-${app.id}`);
        if (el && typeof el.focus === 'function') {
          el.focus();
          return true;
        }
        return false;
      };

      if (tryFocus()) return;
      requestAnimationFrame(() => {
        if (tryFocus()) return;
        window.setTimeout(tryFocus, 60);
      });
    },
    [filtered],
  );

  const focusIndex = useCallback(
    (index) => {
      if (!filtered.length) return;
      const next = clamp(index, 0, filtered.length - 1);
      setFocusedIndex(next);
      scrollToIndex(next);
      focusRenderedIndex(next);
    },
    [filtered.length, focusRenderedIndex, scrollToIndex],
  );

  useEffect(() => {
    if (!filtered.length) {
      setFocusedIndex(0);
      return;
    }
    setFocusedIndex((prev) => clamp(prev, 0, filtered.length - 1));
  }, [filtered.length]);

  useEffect(() => {
    if (autoFocusSearch && showSearch) {
      searchInputRef.current?.focus?.();
    }
  }, [autoFocusSearch, showSearch]);

  const handleGridKeyDown = useCallback(
    (event) => {
      if (!filtered.length) return;

      const key = event.key;
      const isMeta = event.ctrlKey || event.metaKey;

      if ((isMeta && (key === 'k' || key === 'K')) || key === '/') {
        if (showSearch) {
          event.preventDefault();
          searchInputRef.current?.focus?.();
        }
        return;
      }

      if (key === 'Escape') {
        if (normalizedQuery) {
          event.preventDefault();
          setQuery('');
          if (showSearch) searchInputRef.current?.focus?.();
        }
        return;
      }

      const colCount = columnCountRef.current || 1;
      let nextIndex = focusedIndex;

      if (key === 'ArrowRight') nextIndex += 1;
      else if (key === 'ArrowLeft') nextIndex -= 1;
      else if (key === 'ArrowDown') nextIndex += colCount;
      else if (key === 'ArrowUp') nextIndex -= colCount;
      else if (key === 'Home') nextIndex = 0;
      else if (key === 'End') nextIndex = filtered.length - 1;
      else if (key === 'PageDown') nextIndex += colCount * 3;
      else if (key === 'PageUp') nextIndex -= colCount * 3;
      else return;

      event.preventDefault();
      focusIndex(nextIndex);
    },
    [filtered.length, focusIndex, focusedIndex, normalizedQuery, showSearch],
  );

  const handleSearchKeyDown = useCallback(
    (event) => {
      if (!filtered.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusIndex(focusedIndex);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleOpenApp(filtered[0]?.id);
      } else if (event.key === 'Escape') {
        if (normalizedQuery) {
          event.preventDefault();
          setQuery('');
        }
      }
    },
    [filtered, focusIndex, focusedIndex, handleOpenApp, normalizedQuery],
  );

  const showEmptyState = filtered.length === 0;

  return (
    <div
      className="w-full max-w-5xl mx-auto"
      id="app-grid"
      tabIndex={-1}
      onFocus={() => {
        if (showSearch) {
          searchInputRef.current?.focus?.();
          return;
        }
        focusIndex(focusedIndex);
      }}
    >
      <div className="rounded-xl border border-slate-700/70 bg-ub-cool-grey/40 shadow-xl backdrop-blur">
        {showSearch ? (
          <div className="flex flex-col gap-2 border-b border-slate-700/60 p-4">
            <div className="flex items-center gap-2">
              <label htmlFor="launcher-search" className="sr-only">
                Search apps
              </label>
              <input
                id="launcher-search"
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search apps"
                aria-label="Search apps"
                aria-describedby="launcher-search-hint"
                className="w-full rounded-md border border-slate-600/70 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              />
              {normalizedQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus?.();
                  }}
                  className="rounded-md border border-slate-600/70 bg-black/20 px-2 py-2 text-xs text-slate-200 hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <p id="launcher-search-hint" className="opacity-90">
                Use arrow keys to navigate. Press Enter to launch. Ctrl+K or / focuses search.
              </p>
              <p aria-live="polite" className="tabular-nums opacity-80">
                {showEmptyState
                  ? `No matches (0 / ${totalCount})`
                  : `Showing ${filtered.length} / ${totalCount}`}
              </p>
            </div>
          </div>
        ) : null}

        {showEmptyState ? (
          <div className="p-6 text-sm text-slate-200">
            <p className="font-semibold text-white">No apps match your search.</p>
            <p className="mt-2 text-slate-300">
              Try fewer words, or search by an app id (example: &quot;mimikatz&quot; or
              &quot;security&quot;).
            </p>
            {normalizedQuery ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus?.();
                }}
                className="mt-4 rounded-md border border-slate-600/70 bg-black/20 px-3 py-2 text-xs text-slate-100 hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className="h-[70vh]"
            onKeyDown={handleGridKeyDown}
            onFocusCapture={() => setGridActive(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setGridActive(false);
              }
            }}
            role="grid"
            aria-label="Application launcher"
          >
            <AutoSizer>
              {({ height, width }) => {
                const layout = getLayout(width);
                columnCountRef.current = layout.columnCount;

                const itemData = {
                  items: filtered,
                  columnCount: layout.columnCount,
                  metadata: registryMetadata,
                  handleOpenApp,
                  setFocusedIndex,
                  hoveredIndex,
                  setHoveredIndex,
                  focusedIndex,
                  isGridActive,
                  accentVariables: accentVariables || {},
                };

                const adjustedRowCount = Math.max(
                  1,
                  Math.ceil(filtered.length / layout.columnCount),
                );

                return (
                  <Grid
                    ref={gridRef}
                    columnCount={layout.columnCount}
                    columnWidth={layout.columnWidth}
                    height={height}
                    rowCount={adjustedRowCount}
                    rowHeight={layout.rowHeight}
                    width={width}
                    itemData={itemData}
                    itemKey={buildItemKey}
                    overscanRowCount={2}
                    overscanColumnCount={1}
                    className="scroll-smooth"
                  >
                    {Cell}
                  </Grid>
                );
              }}
            </AutoSizer>
          </div>
        )}
      </div>
    </div>
  );
}
