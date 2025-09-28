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

  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const index = rowIndex * data.columnCount + columnIndex;
    if (index >= data.items.length) return null;
    const app = data.items[index];
    const meta = data.metadata[app.id] ?? buildAppMetadata(app);
    return (
      <DelayedTooltip content={<AppTooltipContent meta={meta} />}>
        {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
          <div
            ref={ref}
            className="group flex h-full w-full items-center justify-center p-3"
            style={{
              ...style,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur transition duration-200 group-hover:border-kali-accent/70 focus-within:border-kali-accent focus-within:ring-2 focus-within:ring-kali-focus focus-within:ring-offset-2 focus-within:ring-offset-black">
              <UbuntuApp
                id={app.id}
                icon={app.icon}
                name={app.title}
                displayName={<>{app.nodes}</>}
                openApp={() => openApp && openApp(app.id)}
              />
            </div>
          </div>
        )}
      </DelayedTooltip>
    );
  };

  return (
    <div className="flex flex-col items-center h-full">
      <input
        className="mb-6 mt-4 w-2/3 md:w-1/3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white shadow-sm backdrop-blur focus:border-kali-accent focus:outline-none focus:ring-2 focus:ring-kali-focus focus:ring-offset-2 focus:ring-offset-black"
        placeholder="Search"
        aria-label="Search apps"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
                {(props) => (
                  <Cell
                    {...props}
                    data={{ items: filtered, columnCount, metadata: registryMetadata }}
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
