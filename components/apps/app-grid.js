import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid } from 'react-window';
import DelayedTooltip from '../ui/DelayedTooltip';
import AppTooltipContent from '../ui/AppTooltipContent';
import { createRegistryMap, buildAppMetadata } from '../../lib/appRegistry';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

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
  const [gridColumns, setGridColumns] = useState(3);
  const hintId = useId();

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
    if (filtered.length === 0) {
      setFocusedIndex(0);
      return;
    }
    if (focusedIndex >= filtered.length) {
      setFocusedIndex(0);
    }
  }, [filtered, focusedIndex]);

  const {
    getItemProps,
    onKeyDown,
    activeIndex,
    setActiveIndex,
  } = useRovingTabIndex({
    itemCount: filtered.length,
    orientation: 'grid',
    columns: gridColumns,
    enabled: filtered.length > 0,
    initialIndex: focusedIndex,
    onActiveChange: (index) => {
      setFocusedIndex(index);
      const colCount = columnCountRef.current || 1;
      const row = Math.floor(index / colCount);
      const col = index % colCount;
      gridRef.current?.scrollToCell({
        rowIndex: row,
        columnIndex: col,
        rowAlign: 'smart',
        columnAlign: 'smart',
      });
      const target = filtered[index];
      if (target) {
        requestAnimationFrame(() => {
          const el = document.getElementById('app-' + target.id);
          el?.focus();
        });
      }
    },
  });

  useEffect(() => {
    if (filtered.length === 0) return;
    const next = Math.min(focusedIndex, filtered.length - 1);
    if (next !== activeIndex) {
      setActiveIndex(next);
    }
  }, [activeIndex, filtered.length, focusedIndex, setActiveIndex]);

  const getColumnCount = (width) => {
    if (width >= 1024) return 8;
    if (width >= 768) return 6;
    if (width >= 640) return 4;
    return 3;
  };

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
              displayName={<>{app.nodes}</>}
              openApp={() => openApp && openApp(app.id)}
              focusProps={getItemProps(index, {
                onFocus: () => setFocusedIndex(index),
              })}
            />
          </div>
        )}
      </DelayedTooltip>
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
      <div
        className="w-full flex-1 h-[70vh] outline-none"
        role="grid"
        aria-label="All applications"
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
      >
        <p id={hintId} className="sr-only">
          Use arrow keys to move across the launcher grid. Home focuses the first app and End focuses the last.
        </p>
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = getColumnCount(width);
            columnCountRef.current = columnCount;
            if (gridColumns !== columnCount) {
              setGridColumns(columnCount);
            }
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
                    data={{
                      items: filtered,
                      columnCount,
                      metadata: registryMetadata,
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
