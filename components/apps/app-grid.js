import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid as FixedSizeGrid } from 'react-window';
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
  const visibleRowCountRef = useRef(1);
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

  const focusActiveItem = useCallback(
    (index) => {
      const item = filtered[index];
      if (!item) return;
      const colCount = columnCountRef.current || 1;
      const rowIndex = Math.floor(index / colCount);
      const columnIndex = index % colCount;

      if (gridRef.current && typeof gridRef.current.scrollToCell === 'function') {
        gridRef.current.scrollToCell({
          rowIndex,
          columnIndex,
          rowAlign: 'smart',
          columnAlign: 'smart',
        });
      }

      const scheduleFocus = (attempt = 0) => {
        const el = document.getElementById('app-' + item.id);
        if (el) {
          el.focus();
          return;
        }

        if (attempt >= 9) {
          return;
        }

        const retry = () => scheduleFocus(attempt + 1);
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(retry);
        } else {
          setTimeout(retry, 16);
        }
      };

      scheduleFocus();
    },
    [filtered]
  );

  useEffect(() => {
    if (!filtered.length) {
      if (focusedIndex !== 0) {
        setFocusedIndex(0);
      }
      return;
    }

    if (focusedIndex >= filtered.length) {
      setFocusedIndex(0);
      return;
    }

    focusActiveItem(focusedIndex);
  }, [filtered, focusedIndex, focusActiveItem]);

  const handleKeyDown = useCallback(
    (e) => {
      const navigationKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ];

      if (!navigationKeys.includes(e.key)) return;
      if (!filtered.length) return;

      e.preventDefault();
      const colCount = columnCountRef.current || 1;
      const rowsPerPage = visibleRowCountRef.current || 1;
      const total = filtered.length;

      let idx = focusedIndex;
      switch (e.key) {
        case 'ArrowRight':
          idx = Math.min(idx + 1, total - 1);
          break;
        case 'ArrowLeft':
          idx = Math.max(idx - 1, 0);
          break;
        case 'ArrowDown':
          idx = Math.min(idx + colCount, total - 1);
          break;
        case 'ArrowUp':
          idx = Math.max(idx - colCount, 0);
          break;
        case 'Home':
          idx = 0;
          break;
        case 'End':
          idx = total - 1;
          break;
        case 'PageDown':
          idx = Math.min(idx + colCount * rowsPerPage, total - 1);
          break;
        case 'PageUp':
          idx = Math.max(idx - colCount * rowsPerPage, 0);
          break;
        default:
          break;
      }

      setFocusedIndex(idx);
    },
    [filtered, focusedIndex]
  );

  const Cell = ({
    columnIndex,
    rowIndex,
    style,
    items,
    totalColumns,
    metadata,
    layout,
    activeIndex,
    onItemFocus,
    onOpenApp,
  }) => {
    const index = rowIndex * totalColumns + columnIndex;
    if (index >= items.length) return null;
    const app = items[index];
    const meta = metadata[app.id] ?? buildAppMetadata(app);
    const isActive = activeIndex === index;

    return (
      <DelayedTooltip content={<AppTooltipContent meta={meta} />}>
        {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
          <div
            ref={ref}
            role="gridcell"
            aria-colindex={columnIndex + 1}
            aria-rowindex={rowIndex + 1}
            aria-selected={isActive ? 'true' : 'false'}
            style={{
              ...style,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: `${layout.paddingY}px ${layout.paddingX}px`,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={(event) => {
              onItemFocus(index);
              onFocus?.(event);
            }}
            onBlur={onBlur}
          >
            <UbuntuApp
              id={app.id}
              icon={app.icon}
              name={app.title}
              displayName={<>{app.nodes}</>}
              style={layout.iconStyle}
              openApp={() => onOpenApp && onOpenApp(app.id)}
              isSelected={isActive}
              assistiveHint="Use arrow keys to move between apps and press Enter to launch."
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
      <div className="w-full flex-1 h-[70vh]">
        <AutoSizer>
          {({ height, width }) => {
            const layout = getColumnCount(width);
            columnCountRef.current = layout.columnCount;
            const rowCount = Math.ceil(filtered.length / layout.columnCount);
            const rowsVisible = Math.max(1, Math.floor(height / layout.rowHeight));
            visibleRowCountRef.current = rowsVisible;
            const activeIndex = filtered.length ? Math.min(focusedIndex, filtered.length - 1) : -1;
            const activeDescendant = activeIndex >= 0 ? `app-${filtered[activeIndex].id}` : undefined;

            return (
              <div
                role="grid"
                aria-label="Applications"
                aria-rowcount={rowCount}
                aria-colcount={layout.columnCount}
                aria-activedescendant={activeDescendant || undefined}
                className="h-full w-full outline-none"
                onKeyDown={handleKeyDown}
              >
                <FixedSizeGrid
                  gridRef={gridRef}
                  columnCount={layout.columnCount}
                  columnWidth={layout.columnWidth}
                  height={height}
                  rowCount={rowCount}
                  rowHeight={layout.rowHeight}
                  width={width}
                  className="scroll-smooth"
                  cellComponent={Cell}
                  cellProps={{
                    items: filtered,
                    totalColumns: layout.columnCount,
                    metadata: registryMetadata,
                    layout,
                    activeIndex: focusedIndex,
                    onItemFocus: setFocusedIndex,
                    onOpenApp: openApp,
                  }}
                  overscanCount={2}
                />
              </div>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}
