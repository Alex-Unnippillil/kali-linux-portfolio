import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps, { games, utilities } from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid } from 'react-window';

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
  const [category, setCategory] = useState('All');
  const gridRef = useRef(null);
  const columnCountRef = useRef(1);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const baseSet = useMemo(
    () => new Set([...games.map((g) => g.id), ...utilities.map((u) => u.id)]),
    []
  );
  const baseApps = useMemo(
    () => apps.filter((a) => !baseSet.has(a.id)),
    [baseSet]
  );

  const categories = useMemo(
    () => ({
      All: apps,
      Applications: baseApps,
      Utilities: utilities,
      Games: games,
    }),
    [baseApps]
  );

  const items = categories[category] || [];

  const filtered = useMemo(() => {
    if (!query) return items.map((app) => ({ ...app, nodes: app.title }));
    return items
      .map((app) => {
        const { matched, nodes } = fuzzyHighlight(app.title, query);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean);
  }, [query, items]);

  useEffect(() => {
    if (focusedIndex >= filtered.length) {
      setFocusedIndex(0);
    }
  }, [filtered, focusedIndex, category]);

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
      <div style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
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
      <div className="mt-4 mb-2 flex space-x-2">
        {Object.keys(categories).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded text-white focus:outline-none ${
              cat === category ? 'bg-black bg-opacity-20' : 'bg-black bg-opacity-10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <input
        className="mb-6 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div
        className="w-full flex-1 h-[70vh] outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
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
