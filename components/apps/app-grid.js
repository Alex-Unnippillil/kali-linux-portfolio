import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid } from 'react-window';
import Image from 'next/image';
import ContextMenu from '../common/ContextMenu';
import usePersistentState from '../../hooks/usePersistentState';

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
  const [favorites, setFavorites] = usePersistentState('xfce.whisker.favorites', []);

  const toggleFavorite = useCallback(
    (id) => {
      setFavorites((prev) => {
        const exists = prev.includes(id);
        const updated = exists ? prev.filter((f) => f !== id) : [...prev, id];
        return updated;
      });
    },
    [setFavorites],
  );

  const favoriteApps = useMemo(
    () => apps.filter((a) => favorites.includes(a.id)),
    [favorites],
  );

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

  const AppIcon = ({ app }) => {
    const ref = useRef(null);
    const pinned = favorites.includes(app.id);
    return (
      <>
        <div ref={ref}>
          <UbuntuApp
            id={app.id}
            icon={app.icon}
            name={app.title}
            displayName={<>{app.nodes}</>}
            openApp={() => openApp && openApp(app.id)}
          />
        </div>
        <ContextMenu
          targetRef={ref}
          items={[
            {
              label: <span className="ml-5">{pinned ? 'Remove' : 'Add to Favorites'}</span>,
              onSelect: () => toggleFavorite(app.id),
            },
          ]}
        />
      </>
    );
  };

  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const index = rowIndex * data.columnCount + columnIndex;
    if (index >= data.items.length) return null;
    const app = data.items[index];
    return (
      <div style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
        <AppIcon app={app} />
      </div>
    );
  };

  const AppRow = ({ app }) => {
    const ref = useRef(null);
    const pinned = favorites.includes(app.id);
    const handleOpen = () => openApp && openApp(app.id);
    return (
      <>
        <div
          ref={ref}
          tabIndex={0}
          onDoubleClick={handleOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleOpen();
          }}
          className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white hover:bg-opacity-10 rounded cursor-default"
        >
          <Image
            width={24}
            height={24}
            className="w-6 h-6"
            src={app.icon.replace('./', '/')}
            alt=""
            sizes="24px"
          />
          <span>{app.title}</span>
        </div>
        <ContextMenu
          targetRef={ref}
          items={[
            {
              label: <span className="ml-5">{pinned ? 'Remove' : 'Add to Favorites'}</span>,
              onSelect: () => toggleFavorite(app.id),
            },
          ]}
        />
      </>
    );
  };

  return (
    <div className="flex flex-col items-center h-full">
      <input
        className="mb-6 mt-4 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
        placeholder="Search"
        aria-label="Search applications"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {favoriteApps.length > 0 && (
        <div className="w-full max-w-md mb-4">
          {favoriteApps.map((app) => (
            <AppRow key={app.id} app={app} />
          ))}
        </div>
      )}
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
