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
      gridRef.current?.scrollToCell({
        rowIndex: row,
        columnIndex: col,
        rowAlign: 'smart',
        columnAlign: 'smart',
        behavior: 'auto',
      });
    },
    [filtered, focusedIndex]
  );

  const Cell = useCallback(({ columnIndex, rowIndex, style, items, columnCount, metadata, layout }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) return null;
    const app = items[index];
    const meta = metadata[app.id] ?? buildAppMetadata(app);
    return (
      <DelayedTooltip content={<AppTooltipContent meta={meta} />}>
        {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
          <div
            ref={ref}
            style={{
              ...style,
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: `${layout.paddingY}px ${layout.paddingX}px`,
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
              style={layout.iconStyle}
              openApp={() => openApp && openApp(app.id)}
            />
          </div>
        )}
      </DelayedTooltip>
    );
  }, [openApp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const item = filtered[focusedIndex];
    if (!item) return;
    const frame = window.requestAnimationFrame(() => {
      const el = document.getElementById('app-' + item.id);
      el?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filtered, focusedIndex]);

  useEffect(() => {
    if (!gridRef.current) return;
    gridRef.current.scrollToCell({ rowIndex: 0, columnIndex: 0, behavior: 'auto' });
  }, [query]);

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
            if (!height || !width) return null;
            const layout = getColumnCount(width);
            columnCountRef.current = layout.columnCount;
            const rowCount = Math.ceil(filtered.length / layout.columnCount);
            return (
              <Grid
                gridRef={gridRef}
                columnCount={layout.columnCount}
                columnWidth={Math.floor(layout.columnWidth)}
                height={height}
                rowCount={rowCount}
                rowHeight={Math.floor(layout.rowHeight)}
                width={width}
                defaultHeight={height}
                defaultWidth={width}
                style={{ width, height }}
                cellComponent={Cell}
                cellProps={{
                  items: filtered,
                  columnCount: layout.columnCount,
                  metadata: registryMetadata,
                  layout,
                }}
                className="scroll-smooth"
              >
                {null}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}
