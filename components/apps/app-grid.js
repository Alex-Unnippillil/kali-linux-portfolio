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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const gridMetricsRef = useRef({
    columnCount: 1,
    rowCount: 0,
    rows: [],
    positions: [],
    pageJump: 1,
  });

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
    const base = {
      columnCount: 2,
      paddingX: 14,
      paddingY: 14,
      minIcon: 72,
      maxIcon: 112,
      targetImage: 56,
      minImage: 48,
      fontSize: '0.875rem',
      gap: '0.6rem',
    };

    if (width >= 640) {
      Object.assign(base, {
        columnCount: 4,
        paddingX: 16,
        paddingY: 16,
        minIcon: 76,
        targetImage: 64,
        fontSize: '0.8rem',
        gap: '0.5rem',
      });
    }

    if (width >= 768) {
      Object.assign(base, {
        columnCount: 6,
        paddingX: 18,
        paddingY: 18,
        minIcon: 80,
        targetImage: 68,
      });
    }

    if (width >= 1024) {
      Object.assign(base, {
        columnCount: 8,
        paddingX: 20,
        paddingY: 20,
        minIcon: 84,
        targetImage: 72,
        fontSize: '0.85rem',
        gap: '0.5rem',
      });
    }

    const columnWidth = width / base.columnCount;
    const availableWidth = Math.max(columnWidth - base.paddingX * 2, 0);

    const desiredIconWidth = Math.min(base.maxIcon, Math.max(base.minIcon, availableWidth));
    const iconWidth = availableWidth > 0 ? Math.min(desiredIconWidth, availableWidth) : desiredIconWidth;

    const maxImageForWidth = Math.max(iconWidth - 24, 36);
    const targetImage = Math.min(base.targetImage, maxImageForWidth);
    const imageLowerBound = Math.min(base.minImage, iconWidth);
    const imageUpperBound = Math.max(32, Math.min(targetImage, iconWidth - 8));
    const iconImage = Math.max(imageLowerBound, Math.min(imageUpperBound, iconWidth));
    const iconHeight = iconImage + 48;
    const rowHeight = iconHeight + base.paddingY * 2;

    return {
      columnCount: base.columnCount,
      columnWidth,
      rowHeight,
      paddingX: base.paddingX,
      paddingY: base.paddingY,
      iconStyle: {
        '--desktop-icon-width': `${iconWidth}px`,
        '--desktop-icon-height': `${iconHeight}px`,
        '--desktop-icon-image': `${iconImage}px`,
        '--desktop-icon-font-size': base.fontSize,
        '--desktop-icon-gap': base.gap,
      },
    };
  };

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
          'PageUp',
          'PageDown',
        ].includes(e.key)
      ) {
        return;
      }

      if (!filtered.length) return;

      const metrics = gridMetricsRef.current;
      const { positions, rows, pageJump } = metrics;
      if (!positions.length) return;

      const currentIndex = focusedIndex;
      const currentPosition = positions[currentIndex];
      if (!currentPosition) return;

      e.preventDefault();

      const currentRowEntries = rows[currentPosition.row] ?? [];
      const clampToRow = (rowIndex, columnIndex) => {
        const targetRow = rows[rowIndex];
        if (!targetRow || !targetRow.length) return currentIndex;
        const safeColumn = Math.max(0, Math.min(columnIndex, targetRow.length - 1));
        return targetRow[safeColumn];
      };

      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight': {
          if (currentPosition.column < currentRowEntries.length - 1) {
            nextIndex = currentRowEntries[currentPosition.column + 1];
          } else if (rows[currentPosition.row + 1]?.length) {
            nextIndex = rows[currentPosition.row + 1][0];
          }
          break;
        }
        case 'ArrowLeft': {
          if (currentPosition.column > 0) {
            nextIndex = currentRowEntries[currentPosition.column - 1];
          } else if (rows[currentPosition.row - 1]?.length) {
            const prevRow = rows[currentPosition.row - 1];
            nextIndex = prevRow[prevRow.length - 1];
          }
          break;
        }
        case 'ArrowDown': {
          const targetRowIndex = Math.min(rows.length - 1, currentPosition.row + 1);
          if (targetRowIndex !== currentPosition.row) {
            nextIndex = clampToRow(targetRowIndex, currentPosition.column);
          }
          break;
        }
        case 'ArrowUp': {
          const targetRowIndex = Math.max(0, currentPosition.row - 1);
          if (targetRowIndex !== currentPosition.row) {
            nextIndex = clampToRow(targetRowIndex, currentPosition.column);
          }
          break;
        }
        case 'Home': {
          if (e.ctrlKey || e.metaKey) {
            nextIndex = rows[0]?.[0] ?? 0;
          } else if (currentRowEntries.length) {
            nextIndex = currentRowEntries[0];
          }
          break;
        }
        case 'End': {
          if (e.ctrlKey || e.metaKey) {
            const lastRow = rows[rows.length - 1] ?? [];
            nextIndex = lastRow[lastRow.length - 1] ?? currentIndex;
          } else if (currentRowEntries.length) {
            nextIndex = currentRowEntries[currentRowEntries.length - 1];
          }
          break;
        }
        case 'PageDown': {
          const jump = Math.max(1, pageJump || 1);
          const targetRowIndex = Math.min(rows.length - 1, currentPosition.row + jump);
          if (targetRowIndex !== currentPosition.row) {
            nextIndex = clampToRow(targetRowIndex, currentPosition.column);
          }
          break;
        }
        case 'PageUp': {
          const jump = Math.max(1, pageJump || 1);
          const targetRowIndex = Math.max(0, currentPosition.row - jump);
          if (targetRowIndex !== currentPosition.row) {
            nextIndex = clampToRow(targetRowIndex, currentPosition.column);
          }
          break;
        }
        default:
          break;
      }

      if (nextIndex !== currentIndex && filtered[nextIndex]) {
        setFocusedIndex(nextIndex);
      }
    },
    [filtered, focusedIndex]
  );

  useEffect(() => {
    if (!filtered.length) {
      setAnnouncement('');
      return;
    }

    const metrics = gridMetricsRef.current;
    const { positions } = metrics;
    const currentItem = filtered[focusedIndex];
    const position = positions[focusedIndex];

    if (!currentItem || !position) return;

    const { row, column } = position;
    const scrollToItemTarget = { rowIndex: row, columnIndex: column, align: 'smart' };
    const scrollToCellTarget = { rowIndex: row, columnIndex: column, rowAlign: 'smart', columnAlign: 'smart' };
    if (typeof gridRef.current?.scrollToItem === 'function') {
      gridRef.current.scrollToItem(scrollToItemTarget);
    } else if (typeof gridRef.current?.scrollToCell === 'function') {
      gridRef.current.scrollToCell(scrollToCellTarget);
    }

    const focusItem = () => {
      const el = document.getElementById('app-' + currentItem.id);
      el?.focus();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focusItem);
    } else {
      setTimeout(focusItem, 0);
    }

    setAnnouncement(`Focus moved to ${currentItem.title}, row ${row + 1}, column ${column + 1}`);
  }, [filtered, focusedIndex]);

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
              padding: `${data.layout.paddingY}px ${data.layout.paddingX}px`,
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
              style={data.layout.iconStyle}
              openApp={() => openApp && openApp(app.id)}
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
        aria-label="Search apps"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="w-full flex-1 h-[70vh] outline-none" onKeyDown={handleKeyDown}>
        <AutoSizer>
          {({ height, width }) => {
            const layout = getColumnCount(width);
            const rowCount = Math.ceil(filtered.length / layout.columnCount);
            const rows = [];
            const positions = [];
            for (let i = 0; i < filtered.length; i++) {
              const rowIndex = Math.floor(i / layout.columnCount);
              const columnIndex = i % layout.columnCount;
              if (!rows[rowIndex]) rows[rowIndex] = [];
              rows[rowIndex][columnIndex] = i;
              positions[i] = { row: rowIndex, column: columnIndex };
            }
            const visibleRowCount = Math.max(1, Math.floor(height / layout.rowHeight));
            gridMetricsRef.current = {
              columnCount: layout.columnCount,
              rowCount,
              rows,
              positions,
              pageJump: visibleRowCount,
            };

            return (
              <Grid
                ref={gridRef}
                gridRef={gridRef}
                columnCount={layout.columnCount}
                columnWidth={layout.columnWidth}
                height={height}
                rowCount={rowCount}
                rowHeight={layout.rowHeight}
                width={width}
                className="scroll-smooth"
              >
                {(props) => (
                  <Cell
                    {...props}
                    data={{
                      items: filtered,
                      columnCount: layout.columnCount,
                      metadata: registryMetadata,
                      layout,
                    }}
                  />
                )}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
