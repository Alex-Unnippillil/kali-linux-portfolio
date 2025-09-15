import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
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
  const gridRef = useRef(null);
  const columnCountRef = useRef(1);
  const [focusedIndex, setFocusedIndex] = useState(0);

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

  const focusAppByIndex = useCallback(
    (index) => {
      if (filtered.length === 0) return;
      const colCount = Math.max(columnCountRef.current, 1);
      const clamped = Math.max(0, Math.min(index, filtered.length - 1));
      setFocusedIndex(clamped);
      const row = Math.floor(clamped / colCount);
      const col = clamped % colCount;
      const grid = gridRef.current;
      if (grid && typeof grid.scrollToItem === 'function') {
        grid.scrollToItem({ rowIndex: row, columnIndex: col, align: 'smart' });
      } else if (grid && typeof grid.scrollToCell === 'function') {
        grid.scrollToCell({
          rowIndex: row,
          columnIndex: col,
          rowAlign: 'smart',
          columnAlign: 'smart',
        });
      }
      requestAnimationFrame(() => {
        const app = filtered[clamped];
        if (!app) return;
        const el = document.getElementById(`app-${app.id}`);
        el?.focus();
      });
    },
    [filtered]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (
        ![
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
        ].includes(e.key)
      ) {
        return;
      }
      if (filtered.length === 0) return;
      const target = e.target;
      let currentIndex = focusedIndex;
      if (target instanceof HTMLElement) {
        const cell = target.closest('[data-app-index]');
        if (cell) {
          const parsed = Number(cell.getAttribute('data-app-index'));
          if (!Number.isNaN(parsed)) {
            currentIndex = parsed;
          }
        }
      }
      const colCount = Math.max(columnCountRef.current, 1);
      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight':
          nextIndex = Math.min(currentIndex + 1, filtered.length - 1);
          break;
        case 'ArrowLeft':
          nextIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'ArrowDown':
          nextIndex = Math.min(currentIndex + colCount, filtered.length - 1);
          break;
        case 'ArrowUp':
          nextIndex = Math.max(currentIndex - colCount, 0);
          break;
        case 'Home':
          nextIndex = currentIndex - (currentIndex % colCount);
          break;
        case 'End':
          nextIndex = Math.min(
            currentIndex - (currentIndex % colCount) + (colCount - 1),
            filtered.length - 1,
          );
          break;
        default:
          return;
      }
      e.preventDefault();
      focusAppByIndex(nextIndex);
    },
    [filtered, focusAppByIndex, focusedIndex]
  );

  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const { items, columnCount, focusedIndex: activeIndex, setFocusedIndex: setActive } = data;
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) return null;
    const app = items[index];
    const updateActive = () => {
      if (activeIndex !== index) {
        setActive(index);
      }
    };
    const isActive = activeIndex === index;
    return (
      <div
        role="gridcell"
        aria-selected={isActive}
        aria-colindex={columnIndex + 1}
        aria-rowindex={rowIndex + 1}
        data-app-index={index}
        data-app-id={app.id}
        style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 12 }}
        onFocusCapture={updateActive}
        onMouseDown={updateActive}
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
        type="search"
        role="searchbox"
        aria-label="Search apps"
        className="mb-6 mt-4 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && filtered.length > 0) {
            e.preventDefault();
            focusAppByIndex(0);
          }
        }}
      />
      <div
        className="w-full flex-1 h-[70vh]"
        role="grid"
        aria-label="Application grid"
        aria-rowcount={filtered.length ? Math.ceil(filtered.length / Math.max(columnCountRef.current, 1)) : 0}
        aria-colcount={Math.max(columnCountRef.current, 1)}
        onKeyDown={handleKeyDown}
      >
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = getColumnCount(width);
            columnCountRef.current = columnCount;
            const rowCount = Math.ceil(filtered.length / columnCount);
            return (
              <Grid
                ref={gridRef}
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
                      items: filtered,
                      columnCount,
                      focusedIndex,
                      setFocusedIndex,
                    }}
                  />
                )}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}
