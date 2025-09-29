import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid } from 'react-window';
import DelayedTooltip from '../ui/DelayedTooltip';
import AppTooltipContent from '../ui/AppTooltipContent';
import { createRegistryMap, buildAppMetadata } from '../../lib/appRegistry';

const registryMetadata = createRegistryMap(apps);

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
  const [hiddenIds, setHiddenIds] = useState([]);
  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const [draggingApp, setDraggingApp] = useState(null);
  const [dropActive, setDropActive] = useState(false);
  const [undoInfo, setUndoInfo] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = useMemo(
    () => `app-grid-instructions-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );
  const liveRegionId = useMemo(
    () => `app-grid-live-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );
  const visibleCountRef = useRef(0);

  const filtered = useMemo(() => {
    if (!query) return apps.map((app) => ({ ...app, nodes: app.title }));
    return apps
      .map((app) => {
        const { matched, nodes } = fuzzyHighlight(app.title, query);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean);
  }, [query]);

  const filteredApps = useMemo(
    () => filtered.filter((app) => !hiddenSet.has(app.id)),
    [filtered, hiddenSet],
  );

  useEffect(() => {
    visibleCountRef.current = filteredApps.length;
  }, [filteredApps.length]);

  useEffect(() => {
    if (focusedIndex >= filteredApps.length) {
      setFocusedIndex(filteredApps.length > 0 ? filteredApps.length - 1 : 0);
    }
  }, [filteredApps, focusedIndex]);

  const getColumnCount = (width) => {
    if (width >= 1024) return 8;
    if (width >= 768) return 6;
    if (width >= 640) return 4;
    return 3;
  };

  const announce = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setAnnouncement(`${message} (${timestamp})`);
  }, []);

  const lastAnnouncedQuery = useRef(null);

  useEffect(() => {
    if (lastAnnouncedQuery.current !== query) {
      lastAnnouncedQuery.current = query;
      announce(
        filteredApps.length === 0
          ? 'No apps match your current search.'
          : `${filteredApps.length} apps shown for the current search.`,
      );
    }
  }, [announce, filteredApps.length, query]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (filteredApps.length === 0) return;
      e.preventDefault();
      const colCount = columnCountRef.current;
      let idx = focusedIndex;
      if (e.key === 'ArrowRight') idx = Math.min(idx + 1, filteredApps.length - 1);
      if (e.key === 'ArrowLeft') idx = Math.max(idx - 1, 0);
      if (e.key === 'ArrowDown') idx = Math.min(idx + colCount, filteredApps.length - 1);
      if (e.key === 'ArrowUp') idx = Math.max(idx - colCount, 0);
      setFocusedIndex(idx);
      const row = Math.floor(idx / colCount);
      const col = idx % colCount;
      gridRef.current?.scrollToCell({ rowIndex: row, columnIndex: col, rowAlign: 'smart', columnAlign: 'smart' });
      setTimeout(() => {
        const el = document.getElementById('app-' + filteredApps[idx].id);
        el?.focus();
      }, 0);
    },
    [filteredApps, focusedIndex]
  );

  const hideApp = useCallback(
    (app, index) => {
      if (!app) return;
      setHiddenIds((prev) => {
        if (prev.includes(app.id)) return prev;
        return [...prev, app.id];
      });
      setUndoInfo({ app });
      announce(`${app.title} hidden from the grid`);
      setFocusedIndex((prev) => {
        const nextCount = Math.max(visibleCountRef.current - 1, 0);
        if (nextCount <= 0) return 0;
        if (typeof index === 'number') {
          return Math.min(index, nextCount - 1);
        }
        return Math.min(prev, nextCount - 1);
      });
    },
    [announce],
  );

  const undoHide = useCallback(() => {
    if (!undoInfo) return;
    setHiddenIds((prev) => prev.filter((id) => id !== undoInfo.app.id));
    announce(`${undoInfo.app.title} restored to the grid`);
    setUndoInfo(null);
  }, [announce, undoInfo]);

  useEffect(() => {
    if (!undoInfo) return;
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoHide();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoInfo, undoHide]);

  const handleDragStart = useCallback((app, index) => {
    setDraggingApp({ app, index });
    setDropActive(false);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingApp(null);
    setDropActive(false);
  }, []);

  const handleDropZoneDragOver = useCallback((event) => {
    event.preventDefault();
    if (!draggingApp) return;
    event.dataTransfer.dropEffect = 'move';
    setDropActive(true);
  }, [draggingApp]);

  const handleDropZoneDragEnter = useCallback((event) => {
    event.preventDefault();
    if (!draggingApp) return;
    setDropActive(true);
  }, [draggingApp]);

  const handleDropZoneDragLeave = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDropActive(false);
  }, []);

  const handleDropZoneDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!draggingApp) return;
      hideApp(draggingApp.app, draggingApp.index);
      setDraggingApp(null);
      setDropActive(false);
    },
    [draggingApp, hideApp],
  );

  const instructionsText =
    'Use arrow keys to move focus. Press Enter to open an app. Press Delete to hide it or drag it into the removal zone. Press Ctrl+Z to undo the last hide.';

  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const index = rowIndex * data.columnCount + columnIndex;
    if (index >= data.items.length) return null;
    const app = data.items[index];
    const meta = data.metadata[app.id] ?? buildAppMetadata(app);

    const handleItemDragStart = (event) => {
      event.dataTransfer?.setData('application/x-kali-app', app.id);
      event.dataTransfer?.setData('text/plain', app.title);
      data.onDragStart?.(app, index);
    };

    const handleItemDragEnd = () => {
      data.onDragEnd?.();
    };

    const handleItemKeyDown = (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        data.onHideApp?.(app, index);
      }
    };

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
            onDragStartCapture={handleItemDragStart}
            onDragEndCapture={handleItemDragEnd}
            onKeyDown={handleItemKeyDown}
          >
            <UbuntuApp
              id={app.id}
              icon={app.icon}
              name={app.title}
              displayName={<>{app.nodes}</>}
              openApp={() => openApp && openApp(app.id)}
            />
          </div>
        )}
      </DelayedTooltip>
    );
  };

  return (
    <div className="flex flex-col items-center h-full space-y-4" aria-labelledby={instructionsId}>
      <p id={instructionsId} className="px-4 text-center text-xs text-gray-200">
        {instructionsText}
      </p>
      <div id={liveRegionId} className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      <input
        className="mb-6 mt-4 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search apps"
      />
      {undoInfo && (
        <div
          className="flex w-2/3 max-w-xl items-center justify-between rounded bg-black/50 px-3 py-2 text-xs text-gray-100"
          role="status"
          aria-live="polite"
        >
          <span>
            {undoInfo.app.title} hidden. Press Ctrl+Z or use Undo to restore.
          </span>
          <button
            type="button"
            onClick={undoHide}
            className="rounded bg-sky-500 px-2 py-1 text-white hover:bg-sky-400 focus:outline-none focus-visible:ring focus-visible:ring-sky-300"
          >
            Undo
          </button>
        </div>
      )}
      <div
        className="w-full flex-1 h-[70vh] outline-none"
        onKeyDown={handleKeyDown}
        aria-describedby={instructionsId}
      >
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = getColumnCount(width);
            columnCountRef.current = columnCount;
            const rowCount = Math.ceil(filteredApps.length / columnCount);
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
                {(props) => (
                  <Cell
                    {...props}
                    data={{
                      items: filteredApps,
                      columnCount,
                      metadata: registryMetadata,
                      onHideApp: hideApp,
                      onDragStart: handleDragStart,
                      onDragEnd: handleDragEnd,
                    }}
                  />
                )}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
      <div
        className={`w-2/3 max-w-xl rounded border-2 border-dashed px-4 py-3 text-center text-sm transition focus:outline-none focus-visible:ring focus-visible:ring-red-300 ${
          dropActive ? 'border-red-400 bg-red-500/20 text-white' : 'border-gray-500 text-gray-200'
        }`}
        onDragEnter={handleDropZoneDragEnter}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
        role="region"
        aria-live="polite"
        aria-describedby={instructionsId}
        aria-label="Hide apps drop zone"
      >
        <p className="font-medium">Drag apps here to hide them from the grid.</p>
        <p className="mt-1 text-xs">
          Keyboard: Focus an app and press Delete to hide it. Press Ctrl+Z to undo.
        </p>
      </div>
    </div>
  );
}
