import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid } from 'react-window';
import {
  getAppRegistryEntry,
  getHeavyAppEntries,
} from '../../lib/appRegistry';

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

export default function AppGrid({ openApp }) {
  const [query, setQuery] = useState('');
  const gridRef = useRef(null);
  const columnCountRef = useRef(1);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const hoverTimeoutRef = useRef(null);
  const hoverTargetRef = useRef(null);
  const prefetchedAppsRef = useRef(new Set());
  const idleHandleRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query) return apps.map((app) => ({ ...app, nodes: app.title }));
    return apps
      .map((app) => {
        const { matched, nodes } = fuzzyHighlight(app.title, query);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean);
  }, [query]);

  useEffect(() => {
    if (focusedIndex >= filtered.length) {
      setFocusedIndex(0);
    }
  }, [filtered, focusedIndex]);

  const prefetchApp = useCallback((appId) => {
    if (!appId || prefetchedAppsRef.current.has(appId)) return;
    const entry = getAppRegistryEntry(appId);
    if (!entry?.importer) return;
    prefetchedAppsRef.current.add(appId);
    entry
      .importer()
      .catch(() => {
        prefetchedAppsRef.current.delete(appId);
      });
  }, []);

  const scheduleHoverPrefetch = useCallback(
    (appId) => {
      if (!appId || prefetchedAppsRef.current.has(appId)) return;
      if (typeof window === 'undefined') return;
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTargetRef.current = appId;
      hoverTimeoutRef.current = window.setTimeout(() => {
        hoverTimeoutRef.current = null;
        prefetchApp(appId);
      }, 200);
    },
    [prefetchApp]
  );

  const cancelHoverPrefetch = useCallback((appId) => {
    if (
      hoverTimeoutRef.current &&
      (appId === undefined || hoverTargetRef.current === appId)
    ) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
      hoverTargetRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const heavyEntries = getHeavyAppEntries();
    if (!heavyEntries.length) return undefined;

    const nextHeavy = heavyEntries.find(
      (entry) => !prefetchedAppsRef.current.has(entry.id)
    );

    if (!nextHeavy) return undefined;

    const runPrefetch = () => {
      idleHandleRef.current = null;
      if (document.visibilityState !== 'visible') return;
      prefetchApp(nextHeavy.id);
    };

    const scheduleIdle = () => {
      if (idleHandleRef.current !== null) return;
      if (document.visibilityState !== 'visible') return;
      if (typeof window.requestIdleCallback === 'function') {
        idleHandleRef.current = window.requestIdleCallback(runPrefetch, {
          timeout: 2000,
        });
      } else {
        idleHandleRef.current = window.setTimeout(runPrefetch, 500);
      }
    };

    const cancelIdle = () => {
      if (idleHandleRef.current === null) return;
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandleRef.current);
      } else {
        clearTimeout(idleHandleRef.current);
      }
      idleHandleRef.current = null;
    };

    scheduleIdle();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!prefetchedAppsRef.current.has(nextHeavy.id)) {
          scheduleIdle();
        }
      } else {
        cancelIdle();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelIdle();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [prefetchApp]);

  const getColumnCount = (width) => {
    if (width >= 1024) return 8;
    if (width >= 768) return 6;
    if (width >= 640) return 4;
    return 3;
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const colCount = columnCountRef.current;
      let idx = focusedIndex;
      if (e.key === 'ArrowRight') idx = Math.min(idx + 1, filtered.length - 1);
      if (e.key === 'ArrowLeft') idx = Math.max(idx - 1, 0);
      if (e.key === 'ArrowDown') idx = Math.min(idx + colCount, filtered.length - 1);
      if (e.key === 'ArrowUp') idx = Math.max(idx - colCount, 0);
      setFocusedIndex(idx);
      const row = Math.floor(idx / colCount);
      const col = idx % colCount;
      gridRef.current?.scrollToCell({ rowIndex: row, columnIndex: col, rowAlign: 'smart', columnAlign: 'smart' });
      setTimeout(() => {
        const el = document.getElementById('app-' + filtered[idx].id);
        el?.focus();
      }, 0);
    },
    [filtered, focusedIndex]
  );

  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const index = rowIndex * data.columnCount + columnIndex;
    if (index >= data.items.length) return null;
    const app = data.items[index];
    return (
      <div
        style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 12 }}
        onMouseEnter={() => scheduleHoverPrefetch(app.id)}
        onMouseLeave={() => cancelHoverPrefetch(app.id)}
        onFocus={() => scheduleHoverPrefetch(app.id)}
        onBlur={() => cancelHoverPrefetch(app.id)}
      >
        <UbuntuApp
          id={app.id}
          icon={app.icon}
          name={app.title}
          displayName={<>{app.nodes}</>}
          openApp={() => openApp && openApp(app.id)}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center h-full">
      <input
        className="mb-6 mt-4 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search applications"
      />
      <div className="w-full flex-1 h-[70vh] outline-none" onKeyDown={handleKeyDown}>
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = getColumnCount(width);
            columnCountRef.current = columnCount;
            const rowCount = Math.ceil(filtered.length / columnCount);
            return (
              <Grid
                gridRef={gridRef}
                columnCount={columnCount}
                columnWidth={width / columnCount}
                height={height}
                rowCount={rowCount}
                rowHeight={112}
                width={width}
                className="scroll-smooth"
              >
                {(props) => <Cell {...props} data={{ items: filtered, columnCount }} />}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}
