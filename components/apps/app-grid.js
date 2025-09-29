import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import DelayedTooltip from '../ui/DelayedTooltip';
import AppTooltipContent from '../ui/AppTooltipContent';
import { createRegistryMap, buildAppMetadata } from '../../lib/appRegistry';
import usePersistentState from '../../hooks/usePersistentState';

const registryMetadata = createRegistryMap(apps);

const DEFAULT_COLUMN_CONFIG = {
  breakpoints: [
    { minWidth: 1280, columns: 8 },
    { minWidth: 1024, columns: 6 },
    { minWidth: 768, columns: 5 },
    { minWidth: 640, columns: 4 },
  ],
  fallbackColumns: 3,
  selectableColumns: [3, 4, 5],
};

const COLUMN_PREF_KEY = 'launcher-grid-column-mode';

const isValidMode = (mode, selectableColumns) =>
  mode === 'auto' || selectableColumns.includes(Number(mode));

const sortBreakpoints = (breakpoints) =>
  [...breakpoints].sort((a, b) => b.minWidth - a.minWidth);

const mergeColumnConfig = (columnConfig = {}) => {
  const breakpoints = columnConfig.breakpoints
    ? sortBreakpoints(columnConfig.breakpoints)
    : sortBreakpoints(DEFAULT_COLUMN_CONFIG.breakpoints);
  const selectableColumns = columnConfig.selectableColumns
    ? [...columnConfig.selectableColumns]
    : [...DEFAULT_COLUMN_CONFIG.selectableColumns];
  const fallbackColumns = columnConfig.fallbackColumns ?? DEFAULT_COLUMN_CONFIG.fallbackColumns;

  return { breakpoints, selectableColumns, fallbackColumns };
};

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

export default function AppGrid({ openApp, columnConfig }) {
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const columnCountRef = useRef(1);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const mergedConfig = useMemo(() => mergeColumnConfig(columnConfig), [columnConfig]);
  const [columnMode, setColumnMode] = usePersistentState(
    COLUMN_PREF_KEY,
    () => 'auto',
    (value) => typeof value === 'string' && isValidMode(value, mergedConfig.selectableColumns),
  );

  useEffect(() => {
    if (!isValidMode(columnMode, mergedConfig.selectableColumns)) {
      setColumnMode('auto');
    }
  }, [columnMode, mergedConfig.selectableColumns, setColumnMode]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  const columnCount = useMemo(() => {
    if (!filtered.length) {
      return mergedConfig.fallbackColumns;
    }
    if (columnMode !== 'auto') {
      return Number(columnMode);
    }
    for (const breakpoint of mergedConfig.breakpoints) {
      if (containerSize.width >= breakpoint.minWidth) {
        return breakpoint.columns;
      }
    }
    return mergedConfig.fallbackColumns;
  }, [columnMode, containerSize.width, filtered.length, mergedConfig]);

  useEffect(() => {
    columnCountRef.current = Math.max(1, columnCount);
  }, [columnCount]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (!filtered.length) return;
      e.preventDefault();
      const colCount = columnCountRef.current;
      let idx = focusedIndex;
      if (e.key === 'ArrowRight') idx = Math.min(idx + 1, filtered.length - 1);
      if (e.key === 'ArrowLeft') idx = Math.max(idx - 1, 0);
      if (e.key === 'ArrowDown') idx = Math.min(idx + colCount, filtered.length - 1);
      if (e.key === 'ArrowUp') idx = Math.max(idx - colCount, 0);
      setFocusedIndex(idx);
      setTimeout(() => {
        const el = document.getElementById('app-' + filtered[idx].id);
        if (el) {
          el.focus();
          el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }, 0);
    },
    [filtered, focusedIndex]
  );

  return (
    <div className="flex flex-col items-center h-full">
      <input
        className="mb-6 mt-4 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search applications"
      />
      <fieldset className="mb-4 flex flex-col items-center text-white/80">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider">Grid columns</legend>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[{ value: 'auto', label: 'Auto' }, ...mergedConfig.selectableColumns.map((count) => ({
            value: String(count),
            label: `${count} columns`,
          }))].map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide transition focus-within:ring-2 focus-within:ring-white/70 ${
                columnMode === option.value
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <input
                type="radio"
                name="launcher-column-mode"
                value={option.value}
                className="sr-only"
                checked={columnMode === option.value}
                aria-label={option.label}
                onChange={(event) => setColumnMode(event.target.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div
        ref={containerRef}
        className="w-full flex-1 h-[70vh] overflow-y-auto px-4 pb-6 outline-none"
        onKeyDown={handleKeyDown}
        style={{ containerType: 'size' }}
        aria-label="All applications"
      >
        <div
          role="grid"
          className="grid w-full gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, columnCount)}, minmax(0, 1fr))`,
            gap: 'clamp(16px, 3cqw, 24px)',
          }}
        >
          {filtered.map((app) => {
            const meta = registryMetadata[app.id] ?? buildAppMetadata(app);
            return (
              <DelayedTooltip key={app.id} content={<AppTooltipContent meta={meta} />}>
                {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
                  <div
                    role="gridcell"
                    ref={ref}
                    className="flex min-h-[112px] items-center justify-center rounded-lg bg-white/0 transition"
                    style={{ padding: 'clamp(12px, 3cqw, 18px)' }}
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
                    />
                  </div>
                )}
              </DelayedTooltip>
            );
          })}
          {!filtered.length && (
            <p className="col-span-full text-center text-sm text-white/70">No applications match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
