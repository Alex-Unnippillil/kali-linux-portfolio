import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps, { APP_CATEGORY_ORDER } from '../../apps.config';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid } from 'react-window';
import DelayedTooltip from '../ui/DelayedTooltip';
import AppTooltipContent from '../ui/AppTooltipContent';
import { createRegistryMap, buildAppMetadata } from '../../lib/appRegistry';

const registryMetadata = createRegistryMap(apps);

const getCategoryOrderIndex = (category) => {
  const index = APP_CATEGORY_ORDER.indexOf(category);
  return index === -1 ? APP_CATEGORY_ORDER.length : index;
};

const ALL_CATEGORIES = (() => {
  const unique = new Set();
  apps.forEach((app) => {
    (app.categories ?? []).forEach((category) => {
      unique.add(category);
    });
  });
  return Array.from(unique).sort((a, b) => {
    const indexA = getCategoryOrderIndex(a);
    const indexB = getCategoryOrderIndex(b);
    if (indexA === indexB) {
      return a.localeCompare(b);
    }
    return indexA - indexB;
  });
})();

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
  const [selectedCategories, setSelectedCategories] = useState(
    () => new Set(ALL_CATEGORIES),
  );
  const gridRef = useRef(null);
  const columnCountRef = useRef(1);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const queryMatches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return apps.map((app) => ({ ...app, nodes: app.title }));
    }
    return apps
      .map((app) => {
        const { matched, nodes } = fuzzyHighlight(app.title, trimmed);
        return matched ? { ...app, nodes } : null;
      })
      .filter(Boolean);
  }, [query]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    ALL_CATEGORIES.forEach((category) => counts.set(category, 0));
    queryMatches.forEach((app) => {
      (app.categories ?? []).forEach((category) => {
        if (counts.has(category)) {
          counts.set(category, (counts.get(category) ?? 0) + 1);
        }
      });
    });
    return counts;
  }, [queryMatches]);

  const filtered = useMemo(() => {
    if (selectedCategories.size === ALL_CATEGORIES.length) {
      return queryMatches;
    }
    return queryMatches.filter((app) =>
      (app.categories ?? []).some((category) => selectedCategories.has(category)),
    );
  }, [queryMatches, selectedCategories]);

  const toggleCategory = useCallback((category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const selectAllCategories = useCallback(() => {
    setSelectedCategories(new Set(ALL_CATEGORIES));
  }, []);

  const isAllSelected = selectedCategories.size === ALL_CATEGORIES.length;
  const totalMatches = queryMatches.length;
  const chipBaseClass =
    'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-ubt-blue focus-visible:ring-offset-black/60';
  const countBadgeClass = 'rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold';

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
      if (filtered.length === 0) return;
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
      <div className="mt-4 w-full max-w-5xl px-4">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={selectAllCategories}
            aria-pressed={isAllSelected}
            className={`${chipBaseClass} ${
              isAllSelected
                ? 'bg-ubt-blue/90 border-ubt-blue/80 text-white shadow-sm'
                : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
            }`}
          >
            <span>All</span>
            <span className={countBadgeClass}>{totalMatches}</span>
          </button>
          {ALL_CATEGORIES.map((category) => {
            const isActive = selectedCategories.has(category);
            const count = categoryCounts.get(category) ?? 0;
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={isActive}
                className={`${chipBaseClass} ${
                  isActive
                    ? 'bg-ubt-blue/90 border-ubt-blue/80 text-white shadow-sm'
                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{category}</span>
                <span className={countBadgeClass}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center">
          <input
            className="w-full max-w-md rounded bg-black bg-opacity-20 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-ubt-blue"
            placeholder="Search"
            aria-label="Search apps"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 w-full flex-1 h-[70vh] outline-none" onKeyDown={handleKeyDown}>
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/60">
            No apps match your filters.
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => {
              const layout = getColumnCount(width);
              columnCountRef.current = layout.columnCount;
              const rowCount = Math.ceil(filtered.length / layout.columnCount);
              return (
                <Grid
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
        )}
      </div>
    </div>
  );
}
